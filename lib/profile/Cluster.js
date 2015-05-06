'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
log4js.configure('../log4js.json', {});
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

//var packets = require('../zcl/packets');
//var ZNP = require('../znp/constants');
//var ZCL = require('../zcl/constants');

/**
 * Represents a ZCL cluster on a specific endpoint on a device.
 *
 * @param {Endpoint} endpoint
 * @param {Number} clusterId
 */
function ZCLCluster(endpoint, clusterId) {
    this.endpoint = endpoint;
    this.device = this.endpoint.device;

    this.clusterId = clusterId;

    this.description = profileStore.getCluster(clusterId) || {
        name: 'UNKNOWN CLUSTER'
    };

    this.name = this.description.name;

    this.attributes = {};

    if (this.description.attribute) {
        this.description.attribute.forEach(function (attr) {
            var attrId = attr.id;

            this.attributes[attr.name] = this.attributes[attrId] = {
                name: attr.name,
                id: attr.id,
                type: profileStore.getDataType(attr.type),
                read: function () {
                    return this.readAttributes(attrId).then(function (msg) {
                        return msg.attributeRecordList[0].Value;
                    });
                }.bind(this),
                write: function (value) {
                    return this.writeAttributes({id: attrId, value: value}).then(function (msg) {
                        if (msg.attributeWriteErrorList.length == 0)
                            return msg;
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
            this.commands[command.name] = this.commands[commandId] = function (payload) {
                debug(this, 'Sending command', command, command.id, commandId);
                return this.sendClusterSpecificCommand(commandId, payload);
            }.bind(this);
        }.bind(this));
    }

}
util.inherits(ZCLCluster, EventEmitter);

/**
 * Helper method to run a command on this cluster.
 *
 * @param  {Number} commandId The command identifier on this cluster
 * @param  {Buffer} payload The payload of the command
 * @return {Promise} A promise that resolves to a status
 */
ZCLCluster.prototype.sendClusterSpecificCommand = function(commandId, payload) {
  payload = payload || new Buffer(0);

  debug(this, 'Sending cluster specific command', commandId, payload);

  return this.client.sendZCLFrame({
    FrameControl: {
      ClusterSpecific: true
    },
    DeviceShortAddress: this.endpoint.device.shortAddress,
    CommandIdentifier: commandId,
    payload: payload
  }, {
    DstAddr: {
      address: this.endpoint.device.shortAddress
    },
    DstEndpoint: this.endpoint.endpointId,
    ClusterID: this.clusterId,
    Options: {
      ackRequest: true,
      discoverRoute: true
    }
  });

};

/* TODO: Use new sendZCL function
ZCLCluster.prototype.discoverAttributes = function(startAttribute, maxAttributes) {
  var payload = Concentrate()
    .uint16le(startAttribute)
    .uint8(maxAttributes)
    .result();

  debug(true, 'Discovering attributes');

  return this.client.sendZCLFrame(null, this.endpoint.device.shortAddress,
  this.endpoint.endpointId, this.clusterId, false, null, ZCL.GeneralCommands.DiscoverAttributes, payload)
    .then(function(response) {
      var deferred = when.defer();

      var numAttributes = (response.payload.length - 1) / 3;
      var attributes = [];

      Dissolve()
        .uint8('discoveryComplete')
        .loop('attributes', function(end) {
          if (numAttributes) {
            this
              .uint16le('identifier')
              .uint8('dataType')
              .tap(function() {
                attributes.push(this.vars);
                //this.push(this.vars); // XXX: This isn't working, I only get the first attribute?
                //this.vars = {};
              });
            numAttributes--;
          }
          if (!numAttributes) {
            end(true);
          }
        })
        .tap(function() {
          deferred.resolve(attributes);
        })
        .write(response.payload);

      return deferred.promise;
    });
};*/

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

    return when(engines.attribute.send_read_device_attribute_request(address, this.clusterId, attributeIds))
        .then(engines.attribute.process_read_device_attribute_cnf)
        .then(engines.wait_gateway.bind(engines))
        .then(engines.attribute.process_read_device_attribute_rsp_ind);
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


    return when(engines.attribute.send_write_device_attribute_request(address, this.clusterId, attributeRecords))
        .then(engines.attribute.process_write_device_attribute_cnf)
        .then(engines.wait_gateway.bind(engines))
        .then(engines.attribute.process_write_device_attribute_rsp_ind);
};

ZCLCluster.prototype.toString = function() {
  return this.endpoint + ' [Cluster: ' + this.clusterId.toString(16) + ' (' + this.description.name + ')]';
};

module.exports = ZCLCluster;
