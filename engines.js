'use strict';

var Const = require('./constants');
var _ = require('lodash');

function Engine() {
    
}

Engine.prototype._init = function(proxy) {
    this.proxy = proxy;
    this.network_info    = require('./lib/engines/network_info_engine')(proxy);
    this.device_list     = require('./lib/engines/device_list_engine')(proxy);
    this.group_scene     = require('./lib/engines/group_scene_engine')(proxy);
    this.attribute       = require('./lib/engines/attribute_engine')(proxy);
    return this;
};

Engine.prototype.wait_gateway = function(msg) {
    return this.proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value);
};

var engine = new Engine();
_.bindAll(engine, "wait_gateway");

module.exports = {
    getEngine: function() {
        return engine;
    },
    initEngine: function(proxy) {
        engine._init(proxy);
        return engine;
    }
};