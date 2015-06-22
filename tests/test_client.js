'use strict';

var log4js = require('log4js');
log4js.configure('../log4js.json', {});

var client = require('../client');

client.start();

setTimeout(function() {
    client.stop();
}, 10 * 1000);
