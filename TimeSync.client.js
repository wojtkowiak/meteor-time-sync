class TimeSyncCore {

    constructor() {
        this.protocol = new TimeSyncProtocol();

        this.protocol.on(this.protocol.TIME_SYNC_REQUEST, this.respondToSyncRequest.bind(this));
        this.protocol.on(this.protocol.TIME_SYNC_OFFSET, this.processTimeOffset.bind(this));

        this.synced = false;
        this.offset = 0;

        this.timeChangeDetectionInterval = 60000;
        this.timeChangeDetectionStamp = null;
        this.timeChangeDetectionTimer = null;
        this.timeChangeDetectionTreshold = 15;
        this.onSyncCallback = Function.prototype;
        this.onInitialSyncCallback = Function.prototype;
    }

    onSync(callback) {
        if (typeof callback === 'function') {
            this.onSyncCallback = callback;
        }
    }

    onInitialSync(callback) {
        if (typeof callback === 'function') {
            this.onInitialSyncCallback = callback;
        }
    }

    getOffset() {
        return this.offset;
    }

    processTimeOffset(message) {
        this.offset = message.timeOffset;
        if (!this.synced) {
            this.synced = true;
            if (this.onInitialSyncCallback) {
                this.onInitialSyncCallback(this.offset);
            }
        }
        if (this.onSyncCallback) {
            this.onSyncCallback(this.offset)
        }
    }

    /**
     * True if time is synchronized with server.
     * @returns {boolean}
     */
    isSynced() {
        return this.synced;
    }

    /**
     * Returns an unix timestamp like Date.now() but the time is synchronized with server.
     * @returns {number}
     */
    now() {
        return Date.now() + this.offset;
    }

    respondToSyncRequest(message) {
        this.protocol.send(this.protocol.TIME_SYNC_RESPONSE, [ message.syncId, message.id, Date.now() ]);
    }

    syncNow() {
        this.protocol.send(this.protocol.TIME_SYNC_SYNC_NOW);
    }

    /**
     * Start the time change detection.
     * Example: interval = 10000 (10sec), threshold = 10 (%)
     * It will run time sync when the time passed between timer ticks is above 11000 or below 9000 ms so the time was
     * shifted by 1 sec in any direction.
     *
     * @param {number=} interval - how often perform the check (60000 by default)
     * @param {number=} threshold - threshold in % (15% by default)
     */
    startTimeChangeDetection(
        interval = this.timeChangeDetectionInterval,
        threshold = this.timeChangeDetectionTreshold
    ) {
        this.timeChangeDetectionTimer = Meteor.setInterval(() => {
            if (this.timeChangeDetectionStamp) {
                const diff = Date.now() - this.timeChangeDetectionStamp;
                const thresholdInMs = (threshold * this.timeChangeDetectionInterval) / 100;
                if (
                    diff < 0 ||
                    diff > this.timeChangeDetectionInterval + thresholdInMs ||
                    diff < this.timeChangeDetectionInterval - thresholdInMs
                ) {
                    this.syncNow();
                }
            }
            this.timeChangeDetectionStamp = Date.now();

        }, interval);
    }

    stopTimeChangeDetection() {
        Meteor.clearInterval(this.timeChangeDetectionTimer);
        this.timeChangeDetectionStamp = null;
        this.timeChangeDetectionTimer = null;
    }
}

TimeSync = new TimeSyncCore();