'use strict';

var Const = require('./constants');

function Engine() {
    
}

var _proxy;
var _pan;

Engine.prototype._init = function(proxy, pan) {
    _proxy = proxy;
    _pan = pan;
    this.proxy = proxy;
    this.pan = pan;
    this.network_info    = require('./lib/engines/network_info_engine')(proxy, pan);
    this.device_list     = require('./lib/engines/device_list_engine')(proxy, pan);
    this.group_scene     = require('./lib/engines/group_scene_engine')(proxy, pan);
    this.attribute       = require('./lib/engines/attribute_engine')(proxy, pan);
    return this;
};

Engine.prototype.wait_gateway = function(msg) {
    return _proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value);
};

var engine = new Engine();

module.exports = {
    getEngine: function() {
        return engine;
    },
    initEngine: function(proxy, pan) {
        engine._init(proxy, pan);
        return engine;
    }
};