'use strict';

var Enum = require('enum');

var Const = {};

Const.ServerID = new Enum({
    SI_SERVER_ID_NWK_MGR:   0,
    SI_SERVER_ID_GATEWAY:   1,
    SI_SERVER_ID_OTA:       2
});

Const.NetworkState = new Enum({
    ZIGBEE_NETWORK_STATE_UNAVAILABLE: 0,
    ZIGBEE_NETWORK_STATE_INITIALIZING: 1,
    ZIGBEE_NETWORK_STATE_READY: 2
});

Const.Timeouts = new Enum({
    INITIAL_CONFIRMATION_TIMEOUT:       5000,
    STANDARD_CONFIRMATION_TIMEOUT:      1000,
    INIT_STATE_MACHINE_STARTUP_DELAY:   1000
});

module.exports = Const;