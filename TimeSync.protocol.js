TimeSyncProtocol = class TimeSyncProtocol extends CustomProtocol {

    constructor() {
        super();
        this.TIME_SYNC_REQUEST = 1;
        this.TIME_SYNC_RESPONSE = 2;
        this.TIME_SYNC_SYNC_NOW = 3;
        this.TIME_SYNC_OFFSET = 4;

        this._messages[this.TIME_SYNC_REQUEST] = { fields: [ 'syncId', 'id' ]};
        this._messages[this.TIME_SYNC_RESPONSE] = { fields: [ 'syncId', 'id', 'timestamp' ]};
        this._messages[this.TIME_SYNC_SYNC_NOW] = { fields: [] };
        this._messages[this.TIME_SYNC_OFFSET] = { fields: [ 'timeOffset' ]};

        this.registerProtocol('TimeSyncProtocol');
    }

    encode(messageId, definition, ...payload) {
        let message = {};
        let i = 0;
        for(let data of payload) {
            message[definition.fields[i++]] = data;
        }
        return JSON.stringify(message);
    }

    decode(messageId, definition, message) {
        return JSON.parse(message);
    }

};