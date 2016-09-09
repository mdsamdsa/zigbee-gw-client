'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../logger');
var logger = Logger.getLogger(module_name);

var sprintf = require("sprintfjs");
var Long = require("long");

var util = require('util');
var EventEmitter = require('events').EventEmitter;
//var _ = require('lodash');

var Const = require('./../../constants');
var Protocol = require('../../protocol');
var Device = require('./Device');

function PAN(engines) {
    if (engines === undefined || engines === null || typeof(engines)!="object" || engines.__proto__.constructor.name != "Engines")
        throw new Error("engine not defined");
    this.engines = engines;

    this._clear();
    //_.bindAll(this, "updateNetwork")
}

util.inherits(PAN, EventEmitter);

PAN.prototype._get_index_entry = function(address) {
    for(var i = 0; i < this.devices.length; i++) {
        if (this.devices[i].ieeeAddress.equals(address))
            return i;
    }
    return -1;
};

PAN.prototype._clear = function() {
    this.network = {
        state: Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE,
        nwk_channel: 0xff,
        pan_id: 0xffff,
        ext_pan_id: new Long(0x00000000, 0x00000000),
        permit_remaining_time: 0
    };
    this.devices = [];
};

PAN.prototype.clear = function() {
    logger.info('clear');
    this._clear();
};

PAN.prototype.updateNetwork = function(msg) {
    if (typeof msg === 'undefined') {
        this.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE;
    } else {
        if (msg.cmdId == Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
            this.network.state = (msg.networkStatus == Protocol.NWKMgr.nwkNetworkStatus_t.NWK_UP) ? Const.NetworkState.ZIGBEE_NETWORK_STATE_READY : Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;
            this.network.nwk_channel = msg.nwkChannel;
            this.network.pan_id = msg.panId;
            this.network.ext_pan_id = msg.extPanId;
            this.network.permit_remaining_time = 0;
        } else if (msg.cmdId == Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
            this.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
            this.network.nwk_channel = msg.nwkChannel;
            this.network.pan_id = msg.panId;
            this.network.ext_pan_id = msg.extPanId;
            this.network.permit_remaining_time = 0;
        }
        if (this.network.state == Const.NetworkState.ZIGBEE_NETWORK_STATE_READY) {
            logger.info('updateNetwork: Network ready');
            logger.info(
                sprintf(
                    'updateNetwork: Channel 0x%02x PanID 0x%04x ExtPanID 0x%s',
                    this.network.nwk_channel,
                    this.network.pan_id,
                    this.network.ext_pan_id.toString(16)
                )
            );
        } else {
            logger.info('updateNetwork: Network initializing');
        }
    }
};

PAN.prototype.updateDevice = function(dev_info) {
    var index = this._get_index_entry(dev_info.ieeeAddress);

    if (index != -1) {
        logger.info('updateDevice: Found existing entry');
    } else {
        logger.info('updateDevice: Adding new entry');
    }
    if (dev_info.deviceStatus == Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED) {
        logger.info('updateDevice: Device removed');
    }

    if (dev_info.deviceStatus == Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED) {
        if (index != -1) {
            this.devices.splice(index, 1);
        }
    } else {
        if (index == -1) {
            this.devices.push(new Device(this, dev_info));
        } else {
            this.devices[index].update(dev_info);
        }
    }

    logger.info(
        sprintf(
            'updateDevice: Entry info nwkAddr 0x%04x ieeeAddr 0x%s manufactureId 0x%04x status %d numEndpoints %d',
            dev_info.networkAddress,
            dev_info.ieeeAddress.toString(16),
            dev_info.manufactureId,
            dev_info.deviceStatus,
            dev_info.simpleDescList.length
        )
    );
};

PAN.prototype.getDevice = function(address) {
    var ieeeAddr;
    if (typeof(address) == 'object' && address.toString() == '.gwAddressStruct_t') {
        if (address.addressType != Protocol.GatewayMgr.gwAddressType_t.UNICAST) {
            return;
        }
        ieeeAddr = address.ieeeAddr;
    } else if (typeof(address) == 'string') {
        ieeeAddr = Long.fromString(address, true, 16);
    } else if (Long.isLong(address)) {
        ieeeAddr = address;
    }

    if (ieeeAddr) {
        var index = this._get_index_entry(ieeeAddr);
        if (index != -1) {
            return this.devices[index];
        }
    }
};

PAN.prototype.getEndpoint = function(address, endpointId) {
    var ieeeAddr;
    if (typeof(address) == 'object' && address.toString() == '.gwAddressStruct_t') {
        if (address.addressType != Protocol.GatewayMgr.gwAddressType_t.UNICAST) {
            return;
        }
        ieeeAddr = address.ieeeAddr;
        endpointId = address.endpointId;
    } else if (typeof(address) == 'string') {
        ieeeAddr = Long.fromString(address, true, 16);
    }

    if (ieeeAddr) {
        var index = this._get_index_entry(ieeeAddr);
        if (index == -1) {
            return;
        }
        var device = this.devices[index];
        for (var i = 0; i < device.endpoints.length; i++) {
            if (device.endpoints[i].endpointId == endpointId)
                return device.endpoints[i];
        }
    }
};

PAN.prototype.getCluster = function(ieeeAddr, endpointId, clusterId) {
    var index = this._get_index_entry(ieeeAddr);
    if (index == -1) {
        return;
    }
    var device = this.devices[index];
    for (var i = 0; i < device.endpoints.length; i++) {
        if (device.endpoints[i].endpointId == endpointId) {
            var endpoint = device.endpoints[i];
            return endpoint.clusters[clusterId];
        }
    }
};

PAN.prototype.getAttribute = function(ieeeAddr, endpointId, clusterId, attributeId) {
    var index = this._get_index_entry(ieeeAddr);
    if (index == -1) {
        return;
    }
    var device = this.devices[index];
    for (var i = 0; i < device.endpoints.length; i++) {
        if (device.endpoints[i].endpointId == endpointId) {
            var endpoint = device.endpoints[i];
            var cluster =  endpoint.clusters[clusterId];
            if (cluster) {
                return cluster.attributes[attributeId];
            }
        }
    }
};

module.exports = PAN;