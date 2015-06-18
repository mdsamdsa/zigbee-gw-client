'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var when = require('when');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var profileStore = require('./ProfileStore');
var Protocol = require('../../protocol');
var Common = require('../../common');
var Engines = require('../../engines');
var DataTypes = require('../profile/DataTypes');

var engines = Engines.getEngine();

function ZCLCluster(endpoint, clusterId) {
    this.endpoint = endpoint;
    this.clusterId = clusterId;

    this.description = profileStore.getCluster(clusterId) || {
        name: 'UNKNOWN CLUSTER'
    };

    this.name = this.description.name;
    this.needUpdate = true;

    this.attributes = {};

    if (this.description.attribute) {
        this.description.attribute.forEach(function (attr) {
            var attrId = attr.id;

            var attribute = this.attributes[attr.name] = this.attributes[attrId] = {
                id: attr.id,
                name: attr.name,
                description: attr,
                type: profileStore.getDataType(attr.type),
                value: undefined,

                read: function () {
                    if (attr.access == "w")
                        return when.reject(new Common.ZigbeeAttributeError('attribute ' + this.attributes[attrId].name +  ' write only'));
                    return this.readAttributes(attrId).then(function (msg) {
                        attribute.value = msg.attributeRecordList[0].Value;
                        return attribute.value;
                    });
                }.bind(this),
                write: function (value) {
                    if (attr.access == "r")
                        return when.reject(new Common.ZigbeeAttributeError('attribute ' + this.attributes[attrId].name +  ' read only'));
                    return this.writeAttributes({id: attrId, value: value}).then(function (msg) {
                        if (msg.attributeWriteErrorList.length == 0) {
                            attribute.value = value;
                            return msg;
                        }
                        var status = msg.attributeWriteErrorList[0].status;
                        return when.reject(new Common.ZigbeeAttributeError('write attribute ' + this.attributes[attrId].name +  ': ' + Common.statusAttribute_toString(status), status, msg));
                    }.bind(this));
                }.bind(this)

            };
        }.bind(this));
    }

    this.commands = {};

    if (this.description.command) {
        this.description.command.forEach(function (command) {
            var commandId = command.id;
            var commandFunc = function (payload) {
                return this.sendClusterSpecificCommand(commandId, payload);
            }.bind(this);
            commandFunc.description = command;
            this.commands[command.name] = this.commands[commandId] = commandFunc;
        }.bind(this));
    }

}

util.inherits(ZCLCluster, EventEmitter);

ZCLCluster.prototype.updateAttributes = function(attributeRecordList) {
    for (var i = 0; i < attributeRecordList.length; i++) {
        var attributeRecord = attributeRecordList[i];
        this.attributes[attributeRecord.attributeId].value = attributeRecord.Value;
    }
    this.needUpdate = false;
};

ZCLCluster.prototype.sendClusterSpecificCommand = function(commandId, payload) {
    payload = payload || new Buffer(0);

    var address = new Protocol.GatewayMgr.gwAddressStruct_t();
    address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
    address.ieeeAddr = this.endpoint.device.ieeeAddress;
    address.endpointId = this.endpoint.endpointId;

    var endpointIdSource = 2;
    var profileId = 0x0104;
    var qualityOfService = Protocol.GatewayMgr.gwQualityOfService_t.APS_NOT_ACK;
    var securityOptions = Protocol.GatewayMgr.gwSecurityOptions_t.APS_SECURITY_DISABLED;
    var frameType = Protocol.GatewayMgr.gwFrameType_t.FRAME_CLUSTER_SPECIFIC;
    var manufacturerSpecificFlag = Protocol.GatewayMgr.gwMfrSpecificFlag_t.NON_MFR_SPECIFIC;
    var manufacturerCode = undefined;
    var clientServerDirection = Protocol.GatewayMgr.gwClientServerDir_t.CLIENT_TO_SERVER;
    var disableDefaultRsp = Protocol.GatewayMgr.gwDisableDefaultRsp_t.DEFAULT_RSP_ENABLED;
    var sequenceNumber = undefined;
    return when(engines.gw.attribute.send_zcl_frame_request(address, endpointIdSource, profileId, qualityOfService,
        securityOptions, this.clusterId, frameType, manufacturerSpecificFlag, manufacturerCode, clientServerDirection,
        disableDefaultRsp, sequenceNumber, commandId, payload))
        .then(engines.gw.attribute.process_zcl_frame_cnf)
        .then(engines.wait_gateway)
        .then(engines.gw.attribute.process_zcl_frame_rsp_ind);
};

ZCLCluster.prototype.readAttributes = function() {
    var attributeIds = Array.prototype.slice.call(arguments).map(function(id) {
        if (id.id) { // It's an attribute object
            return id.id;
        } else if (typeof id === 'string') { // It's an attribute name
            return this.attributes[id].id;
        } else {
            return id;
        }
    }.bind(this));

    //noinspection JSPotentiallyInvalidConstructorUsage
    var address = new Protocol.GatewayMgr.gwAddressStruct_t();
    address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
    address.ieeeAddr = this.endpoint.device.ieeeAddress;
    address.endpointId = this.endpoint.endpointId;

    return when(engines.gw.attribute.send_read_device_attribute_request(address, this.clusterId, attributeIds))
        .then(engines.gw.attribute.process_read_device_attribute_cnf)
        .then(engines.wait_gateway)
        .then(engines.gw.attribute.process_read_device_attribute_rsp_ind);
};

ZCLCluster.prototype.writeAttributes = function() {
    var attributeIds = Array.prototype.slice.call(arguments).map(function(pair) {
        if (typeof pair.id === 'string') { // It's an attribute name
            return {id: this.attributes[pair.id].id, value: pair.value };
        } else {
            return pair;
        }
    }.bind(this));

    //noinspection JSPotentiallyInvalidConstructorUsage
    var address = new Protocol.GatewayMgr.gwAddressStruct_t();
    address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
    address.ieeeAddr = this.endpoint.device.ieeeAddress;
    address.endpointId = this.endpoint.endpointId;

    var attributeRecords = attributeIds.map(function(pair) {
        var attributeRecord = new Protocol.GatewayMgr.gwAttributeRecord_t();
        attributeRecord.attributeId = pair.id;
        attributeRecord.attributeType = this.attributes[pair.id].type.id;
        attributeRecord.attributeValue = DataTypes.write(pair.value, attributeRecord.attributeType);
        return attributeRecord;
    }.bind(this));


    return when(engines.gw.attribute.send_write_device_attribute_request(address, this.clusterId, attributeRecords))
        .then(engines.gw.attribute.process_write_device_attribute_cnf)
        .then(engines.wait_gateway)
        .then(engines.gw.attribute.process_write_device_attribute_rsp_ind);
};

ZCLCluster.prototype.toString = function() {
  return this.endpoint + ' [Cluster: ' + this.clusterId.toString(16) + ' (' + this.description.name + ')]';
};

module.exports = ZCLCluster;
