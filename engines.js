'use strict';

var Const = require('./constants');
var _ = require('lodash');

function Engine() {
    
}

Engine.prototype._init = function(proxy) {
    this.proxy = proxy;
    this.nwk = {};
    this.nwk.local_device = require('./lib/engines/network/local_device')(proxy);
    this.nwk.network      = require('./lib/engines/network/network')(proxy);
    this.nwk.device       = require('./lib/engines/network/network_device')(proxy);
    this.gw = {};
    this.gw.group_scene   = require('./lib/engines/gateway/group_scene')(proxy);
    this.gw.attribute     = require('./lib/engines/gateway/attribute')(proxy);
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