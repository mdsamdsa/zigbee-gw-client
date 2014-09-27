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

    this.supportGroups = false;
    this.supportScenes = false;

    for(var i = 0; i < simple_descriptor.inputClusters.length; i++) {
        var cluster = new Cluster(this, simple_descriptor.inputClusters[i]);
        this._clusters.push(cluster);
        if (cluster.name == 'Groups') {
            this.supportGroups = true;
        } else if (cluster.name == 'Scenes') {
            this.supportScenes = true;
        }
    }

    this.groups = newGroups(true);
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

function newGroups(needUpdate) {
    var res = [];
    if (typeof needUpdate != 'undefined') {
        res.needUpdate = needUpdate;
    } else {
        res.needUpdate = false;
    }
    return res;
}

function newScenes(needUpdate) {
    var res = [];
    if (typeof needUpdate != 'undefined') {
        res.needUpdate = needUpdate;
    } else {
        res.needUpdate = false;
    }
    return res;
}

Endpoint.prototype.updateGroups = function(groupList) {
    this.groups = newGroups(false);
    for(var i = 0; i < groupList.length; i++) {
        this.groups.push({
            groupId: groupList[i],
            scenes: newScenes(true)
        });
    }
};

Endpoint.prototype.updateScenes = function(groupId, sceneList) {
    for(var i = 0; i < this.groups.length; i++) {
        if (this.groups[i].groupId == groupId) {
            this.groups[i].scenes = newScenes(false);
            for(var j = 0; j < sceneList.length; j++) {
                this.groups[i].scenes.push(sceneList[j]);
            }
        }
    }
};

Endpoint.prototype.toString = function() {
  return this.device + ' [Endpoint: ' + this.endpointId + ']';
};
module.exports = Endpoint;