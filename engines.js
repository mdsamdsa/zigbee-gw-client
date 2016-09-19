'use strict';

var Const = require('./constants');
var _ = require('lodash');

function Engines()
{
}

var factory = function(proxy) {
    var engines = new Engines();

    engines.nwk = {};
    engines.nwk.local_device = require('./lib/engines/network/local_device')(proxy);
    engines.nwk.network      = require('./lib/engines/network/network')(proxy);
    engines.nwk.device       = require('./lib/engines/network/network_device')(proxy);
    engines.nwk.pairing      = require('./lib/engines/network/pairing')(proxy);

    engines.gw = {};
    engines.gw.group_scene   = require('./lib/engines/gateway/group_scene')(proxy);
    engines.gw.attribute     = require('./lib/engines/gateway/attribute')(proxy);

    engines.wait_gateway = function(msg) {
        return proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value);
    };

    _.bindAll(engines, "wait_gateway");

    return engines;
};

module.exports = factory;
