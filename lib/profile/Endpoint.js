'use strict';

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

Endpoint.prototype.getCluster = function(value) {
    var i;
    if (typeof value == 'number') {
        for(i=0; i<this._clusters.length; i++) {
            if (this._clusters[i].clusterId == value) {
                return this._clusters[i]
            }
        }
    } else if (typeof value == 'string') {
        for(i=0; i<this._clusters.length; i++) {
            if (this._clusters[i].name == value) {
                return this._clusters[i]
            }
        }
    }
};

Endpoint.prototype.toString = function() {
  return this.device + ' [Endpoint: ' + this.endpointId + ']';
};
module.exports = Endpoint;