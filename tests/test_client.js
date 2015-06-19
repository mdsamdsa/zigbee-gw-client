'use strict';

var client = require('../client');

client.start();

setTimeout(function() {
    client.stop();
}, 10 * 1000);
