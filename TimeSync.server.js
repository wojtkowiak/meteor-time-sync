class TimeSyncCore {

    constructor() {

        this.protocol = new TimeSyncProtocol();
        this.protocol.on(this.protocol.TIME_SYNC_SYNC_NOW, this.syncNow.bind(this));
        this.protocol.on(this.protocol.TIME_SYNC_RESPONSE, Meteor.bindEnvironment(this.processSyncResponse.bind(this)));

        this.options = {};
        this.defaults = {
            maxSampleCount: 10,
            timeDelayBetweenRequests: 0,
            syncInterval: 60000,
            syncSessionGroupsCount: 20,
            initialSyncDelay: 10000,
            maxSkip: 1,
        };

        this.sessions = {};
        this.syncInterval = null;
    }

    configure(options) {
        this.options = this.defaults;
        if (options) {
            _.extend(this.options, options);
        }

        Meteor.onConnection((connection) => {
           // Delay the initial sync.
           Meteor.setTimeout(() => {
               this.syncNow(connection.id);
           }, this.options.initialSyncDelay);

           connection.onClose = () => {
               if (connection.id in this.sessions) {
                   delete this.sessions[connection.id];
               }
           };
        });

        this.syncInterval = Meteor.setInterval(() => {
            const sessions = Object.keys(Meteor.server.sessions);
            const sessionCount = Object.keys(sessions).length;
            let sessionGroups = Math.floor(sessionCount / this.options.syncSessionGroupsCount);
            if (sessionCount % this.options.syncSessionGroupsCount !== 0) sessionGroups += 1;

            const interval = this.options.syncInterval / sessionGroups;
            let groupId = 0;
            while(sessions.length > 0) {
                const sessionsGroup = sessions.splice(0, this.options.syncSessionGroupsCount);
                this.syncAfter(groupId * interval, sessionsGroup);
                groupId += 1;
            }
        }, this.options.syncInterval);
    }

    syncAfter(timeout, sessionIds) {
        Meteor.setTimeout(() => {
            sessionIds.forEach(session => {
                Meteor.defer(() => this.syncNow(session));
            });
        }, timeout);
    }

    syncNow(sessionId) {
        if (!(sessionId in Meteor.server.sessions)) {
            return;
        }

        if (!(sessionId in this.sessions)) {
            this.sessions[sessionId] = {
                packetCount: 0,
                state: 1,
                measurements: [],
                id: 0,
                skip: 0,
                offsets: []
            }
        } else {
            const session = this.sessions[sessionId];
            if (session.state === 1) {
                session.skip += 1;
                if (session.skip <= this.options.maxSkip) {
                    return;
                }
            }

            session.packetCount = 0;
            session.state = 1;
            session.skip = 0;
            session.measurements = [];
            session.offsets = [];
            if (session.id > 100) {
                session.id = 0;
            }
        }
        this.sendRequest(0, this.sessions[sessionId].id, sessionId);
        return true;
    }

    sendRequest(syncId, id, sessionId) {
        this.sessions[sessionId].measurements[syncId] = { serverTimestamp: Date.now() };
        this.protocol.send(this.protocol.TIME_SYNC_REQUEST, [syncId, id], sessionId);
    }

    processSyncResponse(message, sessionId) {
        if (!(sessionId in this.sessions)) return;
        const session = this.sessions[sessionId];
        if (
            session.id !== message.id ||
            !(message.syncId in this.sessions[sessionId].measurements) ||
            message.syncId > this.options.maxSampleCount
        ) {
            return;
        }


        const ping = Date.now() - session.measurements[message.syncId].serverTimestamp;
        session.measurements[message.syncId].ping = ping;

        const offset = Date.now() - (message.timestamp + (ping / 2));
        session.measurements[message.syncId].offset = offset;
        session.offsets.push(offset);
        if (session.packetCount < this.options.maxSampleCount) {
            session.packetCount++;
            if (this.options.timeDelayBetweenRequests !== 0) {
                Meteor.setTimeout(() => {
                    this.sendRequest(session.packetCount, sessionId);
                }, this.options.timeDelayBetweenRequests);
            } else {
                this.sendRequest(session.packetCount, session.id, sessionId);
            }
        } else {
            this.computeOffset(sessionId);
        }
    }

    computeOffset(sessionId) {
        let offsets = this.sessions[sessionId].offsets;

        // Sort offsets from the lowest to highest.
        offsets.sort();

        // Get the median offset.
        let median = offsets[Math.round(offsets.length / 2)];

        // Compute standard deviation.
        let standardDeviation = this.standardDeviation(offsets);

        // Remove all offsets that are higher than the median + standard deviation.
        // Just to filter out for example TCP packets retransmissions.
        offsets = offsets.filter((offset) => { return !(offset > median + standardDeviation); });

        // We get back to idle state.
        this.sessions[sessionId].state = 0;

        // TODO: check the quality of measurement, after lets say 3 measurements discard it if the standard deviation is higher than the average by more than 50%.

        // Send the offset to client
        Meteor.defer(() => { this.protocol.send(this.protocol.TIME_SYNC_OFFSET, this.average(offsets), sessionId); });

        // TODO: store sent offsets to monitor time changes on the client.
    }

    /**
     * http://derickbailey.com/
     *
     * @param values
     * @returns {number}
     * @private
     */
    standardDeviation(values) {
        let avg = this.average(values);
        return Math.sqrt(
            this.average(
                values.map(
                    (value) => {
                        let diff = value - avg;
                        return diff * diff;
                    }
                )
            )
        );
    }

    /**
     * Counts average.
     *
     * @param values
     * @returns {number}
     * @private
     */
    average(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
}

TimeSync = new TimeSyncCore();