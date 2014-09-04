'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var sprintf = require("sprintfjs");

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

data_structures.device_table = new DeviceTable();

function DeviceTable() {
    this.table = [];
}

DeviceTable.prototype.get_index_entry = function(dev_info) {
    for(var i = 0; i < this.table.length; i++) {
        if (this.table[i].ieee_addr == dev_info.ieeeAddress)
            return i;
    }
    return -1;
};

DeviceTable.prototype.update_device_table_entry = function(dev_info) {
    var i = this.get_index_entry(dev_info);
    if (i == -1) {
        this.table.push(dev_info);
    } else {
        this.table[i] = dev_info;
    }

    logger.info(
        sprintf(
            'update_device_table_entry: Adding/Updating entry info nwkAddr 0x%04x ieeeAddr 0x%08x%08x manufactureId 0x%04x status %d numEndpoints %d',
            dev_info.networkAddress,
            dev_info.ieeeAddress.high, dev_info.ieeeAddress.low,
            dev_info.manufactureId,
            dev_info.deviceStatus,
            dev_info.simpleDescList.length
        )
    );
};

module.exports = data_structures;