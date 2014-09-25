'use strict';

var path = require('path');

module.exports = function(proxy, pan) {
    var engines = {};
    engines.proxy = proxy;
    engines.pan = pan;
    engines.network_info    = require('./lib/engines/network_info_engine')(proxy, pan);
    engines.device_list     = require('./lib/engines/device_list_engine')(proxy, pan);
    engines.group_scene     = require('./lib/engines/group_scene_engine')(proxy, pan);
    engines.attribute       = require('./lib/engines/attribute_engine')(proxy, pan);
    return engines;
};
