'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../logger');
Logger.configure('./log4js.json', {});

var client = require('../client');

var timeout = setTimeout(function() {
    client.stop();
}, 120 * 1000);

client.start();
