'use strict';

var path = require('path');

module.exports = function(proxy, pan) {
    var engines = {};
    engines.proxy = proxy;
    engines.pan = pan;
    engines.network_info    = require(path.join(__dirname, 'engines/network_info_engine'))(proxy, pan);
    engines.device_list     = require(path.join(__dirname, 'engines/device_list_engine'))(proxy, pan);
    return engines;
};
