'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var sprintf = require("sprintfjs");
var Long = require("long");

var util = require('util');
var EventEmitter = require('events').EventEmitter;
//var _ = require('lodash');

var Const = require('./../../constants');
var Protocol = require('../../protocol');
var Device = require('./Device');

function PAN() {
    this.network = {
        state: Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE,
        nwk_channel: 0xff,
        pan_id: 0xffff,
        ext_pan_id: new Long(0x00000000, 0x00000000),
        permit_remaining_time: 0
    };
    this.devices = [];
    //_.bindAll(this, "update_network")
}

util.inherits(PAN, EventEmitter);

PAN.prototype._get_index_entry = function(address) {
    for(var i = 0; i < this.devices.length; i++) {
        if (this.devices[i].ieeeAddress.equals(address))
            return i;
    }
    return -1;
};

PAN.prototype.update_network = function(msg) {
    if (typeof msg === 'undefined') {
        this.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE;
    } else {
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
            this.network.state = (msg.status == Protocol.NWKMgr.nwkNetworkStatus_t.NWK_UP) ? Const.NetworkState.ZIGBEE_NETWORK_STATE_READY : Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;
            this.network.nwk_channel = msg.nwkChannel;
            this.network.pan_id = msg.panId;
            this.network.ext_pan_id = msg.extPanId;
            this.network.permit_remaining_time = 0;
        } else if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
            this.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
            this.network.nwk_channel = msg.nwkChannel;
            this.network.pan_id = msg.panId;
            this.network.ext_pan_id = msg.extPanId;
            this.network.permit_remaining_time = 0;
        }
        if (this.network.state == Const.NetworkState.ZIGBEE_NETWORK_STATE_READY) {
            logger.info('update_network: Network ready');
        } else {
            logger.info('update_network: Network initializing');
        }
    }
};

PAN.prototype.update_device = function(dev_info) {
    var index = this._get_index_entry(dev_info.ieeeAddress);

    if (index != -1) {
        logger.info('update_device: Found existing entry');
    } else {
        logger.info('update_device: Adding new entry');
    }
    if (dev_info.deviceStatus == Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED) {
        logger.info('update_device: Device removed');
    }

    if (index == -1) {
        this.devices.push(new Device(this, dev_info));
    } else {
        this.devices[index].update(dev_info);
    }

    logger.info(
        sprintf(
            'update_device: Entry info nwkAddr 0x%04x ieeeAddr 0x%08x%08x manufactureId 0x%04x status %d numEndpoints %d',
            dev_info.networkAddress,
            dev_info.ieeeAddress.high, dev_info.ieeeAddress.low,
            dev_info.manufactureId,
            dev_info.deviceStatus,
            dev_info.simpleDescList.length
        )
    );
};

PAN.prototype.get_endpoint = function(address) {
    if (address.addressType != Protocol.GatewayMgr.gwAddressType_t.UNICAST) {
        return;
    }
    var index = this._get_index_entry(address.ieeeAddr);
    if (index == -1) {
        return;
    }
    var device = this.devices[index];
    for(var i = 0; i < device.endpoints.length; i++) {
        if (device.endpoints[i].endpointId = address.endpointId)
            return device.endpoints[i];
    }
};

module.exports = PAN;