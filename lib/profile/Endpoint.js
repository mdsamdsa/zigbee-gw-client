'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../logger');
var logger = Logger.getLogger(module_name);

var when = require('when');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Cluster = require('./Cluster');
var profileStore = require('./ProfileStore');
var Protocol = require('../../protocol');
var Engines = require('../../engines');

var engines = Engines.getEngine();

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
    this.clusters = {};

    this.supportGroups = false;
    this.supportScenes = false;

    for(var i = 0; i < simple_descriptor.inputClusters.length; i++) {
        var cluster = new Cluster(this, simple_descriptor.inputClusters[i]);
        if (cluster.name == 'Groups') {
            this.supportGroups = true;
        } else if (cluster.name == 'Scenes') {
            this.supportScenes = true;
        }
        this.clusters[cluster.name] = this.clusters[cluster.clusterId] = cluster;
    }

    this.groups = newGroups(this.supportGroups);
}

util.inherits(Endpoint, EventEmitter);

Endpoint.prototype.getCluster = function(value) {
    return this.clusters[value];
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

Endpoint.prototype._add_group = function(groupId) {
    for(var i = 0; i < this.groups.length; i++)
        if (this.groups[i].groupId == groupId)
            return;
    this.groups.push({
        groupId: groupId,
        scenes: newScenes(this.supportScenes)
    });
};

Endpoint.prototype._add_scene = function(groupId, sceneId) {
    for(var i = 0; i < this.groups.length; i++)
        if (this.groups[i].groupId == groupId)
        {
            for(var j = 0; j < this.groups[i].scenes.length; j++)
                if (this.groups[i].scenes[j].sceneId == sceneId)
                    return;
            this.groups[i].scenes.push({
                sceneId: sceneId
            });
        }
};

Endpoint.prototype.updateGroups = function(groupList) {
    this.groups = newGroups(false);
    for(var i = 0; i < groupList.length; i++) {
        this._add_group(groupList[i]);
    }
};

Endpoint.prototype.updateScenes = function(groupId, sceneList) {
    for(var i = 0; i < this.groups.length; i++) {
        if (this.groups[i].groupId == groupId) {
            this.groups[i].scenes = newScenes(false);
            for(var j = 0; j < sceneList.length; j++) {
                this._add_scene(groupId, sceneList[j]);
            }
        }
    }
};


Endpoint.prototype.addGroup = function(groupId) {
    var found = false;
    for(var i = 0; i < this.groups.length; i++) {
        if (this.groups[i].groupId == groupId) {
            found = true;
            break;
        }
    }
    if (found) {
        return when.resolve(true);
    } else {
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = this.device.ieeeAddress;
        address.endpointId = this.endpointId;

        return when(engines.gw.group_scene.send_add_group_request(address, groupId, ''))
            .then(engines.gw.group_scene.process_add_group_cnf)
            .then(engines.wait_gateway)
            .then(engines.gw.group_scene.process_add_group_rsp_ind)
            .then(function() {
                this._add_group(groupId);
                return true;
            }.bind(this));
    }
};

Endpoint.prototype.removeGroup = function(groupId) {
    var found = false;
    for(var i = 0; i < this.groups.length; i++) {
        if (this.groups[i].groupId == groupId) {
            found = true;
            break;
        }
    }
    if (!found) {
        return when.resolve(true);
    } else {
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = this.device.ieeeAddress;
        address.endpointId = this.endpointId;

        return when(engines.gw.group_scene.send_remove_from_group_request(address, groupId))
            .then(engines.gw.group_scene.process_remove_from_group_cnf)
            .then(engines.wait_gateway)
            .then(engines.gw.group_scene.process_remove_from_group_rsp_ind)
            .then(function() {
                return true;
            });
    }
};

Endpoint.prototype.toString = function() {
  return this.device + ' [Endpoint: ' + this.endpointId + ']';
};

module.exports = Endpoint;