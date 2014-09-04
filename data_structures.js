'use strict';

var Const = require('./constants');

var data_structures = {};

data_structures.network_status = {
    state: Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE,
    nwk_channel: 0x0,
    pan_id: 0x0,
    ext_pan_id: 0,
    permit_remaining_time: 0x0,
    num_pending_attribs: 0x0
};

module.exports = data_structures;