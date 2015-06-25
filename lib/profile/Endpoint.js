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

    //noinspection JSUnresolvedVariable
    for(var i = 0; i < simple_descriptor.inputClusters.length; i++) {
        //noinspection JSUnresolvedVariable
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

Endpoint.prototype._get_group_index = function(groupId) {
    for(var i = 0; i < this.groups.length; i++)
        if (this.groups[i].groupId == groupId)
            return i;
    return -1;
};

Endpoint.prototype._get_scene_index = function(groupId, sceneId) {
    var group;
    if (typeof groupId != 'object') {
        for (var i = 0; i < this.groups.length; i++)
            if (this.groups[i].groupId == groupId) {
                group = this.groups[i];
            }
    } else {
        group = groupId;
    }
    if (group) {
        for (var j = 0; j < group.scenes.length; j++)
            if (group.scenes[j].sceneId == sceneId) {
                return j;
            }
    }
    return -1;
};

Endpoint.prototype._add_group = function(groupId) {
    if (this._get_group_index(groupId) != -1)
        return;
    this.groups.push({
        groupId: groupId,
        scenes: newScenes(this.supportScenes)
    });
};

Endpoint.prototype._remove_group = function(groupId) {
    var ind = this._get_group_index(groupId);
    if (ind != -1)
        this.groups.splice(ind, 1);
};

Endpoint.prototype._add_scene = function(groupId, sceneId) {
    var groupInd = this._get_group_index(groupId);
    if (groupId != -1) {
        var sceneInd = this._get_scene_index(this.groups[groupInd], sceneId);
        if (sceneInd == -1) {
            this.groups[groupInd].scenes.push({
                sceneId: sceneId
            });
        }
    } else {
        logger.warn('_add_scene: group not found');
    }
};

Endpoint.prototype._remove_scene = function(groupId, sceneId) {
    var groupInd = this._get_group_index(groupId);
    if (groupId != -1) {
        var sceneInd = this._get_scene_index(this.groups[groupInd], sceneId);
        if (sceneInd != -1) {
            this.groups[groupInd].scenes.splice(sceneInd, 1);
        }
    } else {
        logger.warn('_remove_scene: group not found');
    }
};

Endpoint.prototype.updateGroups = function(groupList) {
    this.groups = newGroups(false);
    for(var i = 0; i < groupList.length; i++) {
        this._add_group(groupList[i]);
    }
};

Endpoint.prototype.updateScenes = function(groupId, sceneList) {
    var ind = this._get_group_index(groupId);
    if (ind != -1) {
        this.groups[ind].scenes = newScenes(false);
        for(var j = 0; j < sceneList.length; j++) {
            this._add_scene(groupId, sceneList[j]);
        }
    }
};

//noinspection JSUnusedGlobalSymbols
Endpoint.prototype.addGroup = function(groupId) {
    var ind = this._get_group_index(groupId);
    if (ind != -1) {
        return when.resolve(true);
    } else {
        //noinspection JSUnresolvedFunction
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        //noinspection JSUnresolvedVariable
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

//noinspection JSUnusedGlobalSymbols
Endpoint.prototype.removeGroup = function(groupId) {
    var ind = this._get_group_index(groupId);
    if (ind == -1) {
        return when.resolve(true);
    } else {
        //noinspection JSUnresolvedFunction
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        //noinspection JSUnresolvedVariable
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = this.device.ieeeAddress;
        address.endpointId = this.endpointId;

        return when(engines.gw.group_scene.send_remove_from_group_request(address, groupId))
            .then(engines.gw.group_scene.process_remove_from_group_cnf)
            .then(engines.wait_gateway)
            .then(engines.gw.group_scene.process_remove_from_group_rsp_ind)
            .then(function() {
                this._remove_group(groupId);
                return true;
            }.bind(this));
    }
};

//noinspection JSUnusedGlobalSymbols
Endpoint.prototype.storeScene = function(groupId, sceneId) {
    var ind = this._get_scene_index(groupId, sceneId);
    if (ind != -1) {
        return when.resolve(true);
    } else {
        //noinspection JSUnresolvedFunction
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        //noinspection JSUnresolvedVariable
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = this.device.ieeeAddress;
        address.endpointId = this.endpointId;

        return when(engines.gw.group_scene.send_store_scene_request(address, groupId, sceneId))
            .then(engines.gw.group_scene.process_store_scene_cnf)
            .then(engines.wait_gateway)
            .then(engines.gw.group_scene.process_store_scene_rsp_ind)
            .then(function() {
                this._add_scene(groupId, sceneId);
                return true;
            }.bind(this));
    }
};

//noinspection JSUnusedGlobalSymbols
Endpoint.prototype.removeScene = function(groupId, sceneId) {
    var ind = this._get_scene_index(groupId, sceneId);
    if (ind == -1) {
        return when.resolve(true);
    } else {
        //noinspection JSUnresolvedFunction
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        //noinspection JSUnresolvedVariable
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = this.device.ieeeAddress;
        address.endpointId = this.endpointId;

        return when(engines.gw.group_scene.send_remove_scene_request(address, groupId, sceneId))
            .then(engines.gw.group_scene.process_remove_scene_cnf)
            .then(engines.wait_gateway)
            .then(engines.gw.group_scene.process_remove_scene_rsp_ind)
            .then(function() {
                this._remove_scene(groupId, sceneId);
                return true;
            }.bind(this));
    }
};

Endpoint.prototype.toString = function() {
  return this.device + ' [Endpoint: ' + this.endpointId + ']';
};

module.exports = Endpoint;