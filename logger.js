'use strict';

var log4js = require('log4js');

function Logger() {
    this.__proto__ = log4js;
    this.getLogger = function(category) {
        return this.__proto__.getLogger.call(log, "zgwc:" + category);
    };
}

var log = new Logger();

module.exports = log;