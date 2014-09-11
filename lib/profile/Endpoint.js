'use strict';

var when = require('when');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Cluster = require('./Cluster');
var profileStore = require('./ProfileStore');

module.exports = Endpoint;

function Endpoint(device, simple_descriptor) {
    this.device = device;
    this.profileId = simple_descriptor.profileId;
    this.deviceId = simple_descriptor.deviceId;
    this.endpointId = simple_descriptor.endpointId;
    this.deviceVer = simple_descriptor.deviceVer;

    this.description = profileStore.getDevice(this.profileId, this.deviceId) || {
        name: 'UNKNOWN DEVICE'
    };

    this.name = this.description.name;

    this._clusters = [];
    for (var i = 0; i < simple_descriptor.inputClusters.length; i++) {
        this._clusters.push(new Cluster(this, simple_descriptor.inputClusters[i]));
    }
}

util.inherits(Endpoint, EventEmitter);

/**
 * Returns a promise for the Simple Descriptor for this endpoint.
 * @return {promise}
 */
Endpoint.prototype.simpleDescriptor = function() {
  debug(this, 'simpleDescriptor');

  var descReq = Concentrate()
    .uint16le(this.device.shortAddress) // DstAddr
    .uint16le(this.device.shortAddress) // NWKAddrOfInterest
    .uint8(this.endpointId) // Endpoint
    .result();
  return this.comms
    .request('ZDO_SIMPLE_DESC_REQ', descReq)
    .then(function(response) {
      if (response.data[0] !== 0x00) {
        throw new Error('Failed requesting Simple Descriptor');
      }

      var deferred = when.defer();

      this.once('simpleDescriptor', deferred.resolve);

      return deferred.promise;
    }.bind(this));
};

Endpoint.prototype.inClusters = function() {
  debug(this, 'inClusters');

  return this.simpleDescriptor().then(function(simpleDescriptor) {
    debug(this, 'inClusters', 'Found clusters', simpleDescriptor.inClusters);
    return simpleDescriptor.inClusters.map(function(cid) {
      return new Cluster(this, cid);
    }.bind(this));
  }.bind(this));
};

Endpoint.prototype.toString = function() {
  return this.device + ' [Endpoint: ' + this.endpointId + ']';
};
module.exports = Endpoint;