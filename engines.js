'use strict';

var path = require('path');

module.exports = function(si) {
    var engines = {};
    engines.si = si;
    engines.network_info    = require(path.join(__dirname, 'engines/network_info_engine'))(si);
    engines.device_list     = require(path.join(__dirname, 'engines/device_list_engine'))(si);
    return engines;
};
