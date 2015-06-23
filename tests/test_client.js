'use strict';

var Logger = require('../logger');
Logger.configure('./log4js.json', {});

var client = require('../client');

client.start();

setTimeout(function() {
    client.stop();
}, 10 * 1000);