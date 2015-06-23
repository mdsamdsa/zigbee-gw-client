'use strict';

var log = require('log4js');

var getLogger = log.getLogger;

log.getLogger = function(category) {
    return getLogger.call(log, "zgwc:" + category);
};

module.exports = log;