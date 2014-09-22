'use strict';

var Enum = require('enum');

var Const = {};

Const.ServerID = new Enum({
    SERVER_ID_NWK_MGR:   0,
    SERVER_ID_GATEWAY:   1,
    SERVER_ID_OTA_MGR:   2
});

Const.NetworkState = new Enum({
    ZIGBEE_NETWORK_STATE_UNAVAILABLE: 0,
    ZIGBEE_NETWORK_STATE_INITIALIZING: 1,
    ZIGBEE_NETWORK_STATE_READY: 2
});

Const.Timeouts = new Enum({
    INITIAL_CONFIRMATION_TIMEOUT:       5000,
    STANDARD_CONFIRMATION_TIMEOUT:      1000,
    INIT_STATE_MACHINE_STARTUP_DELAY:   1000,
    ZIGBEE_RESPOND_TIMEOUT:             10000,
    GROUP_STM_NEXT_DELAY:               100,
    GROUP_STM_CICLE_WAIT:               2000,
    SCENE_STM_NEXT_DELAY:               100,
    SCENE_STM_CICLE_WAIT:               2000
});

module.exports = Const;
