'use strict';

var path = require('path');

module.exports = function(proxy) {
    var engines = {};
    engines.proxy = proxy;
    engines.network_info    = require(path.join(__dirname, 'engines/network_info_engine'))(proxy);
    engines.device_list     = require(path.join(__dirname, 'engines/device_list_engine'))(proxy);
    return engines;
};
