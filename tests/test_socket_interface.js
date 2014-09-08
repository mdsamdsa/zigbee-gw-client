'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var SocketInterface = require('../socket_interface');

var config = require('../config.js');

var socket_interface = new SocketInterface(
    config.get('servers:nwk:host'),
    config.get('servers:nwk:port'),
    config.get('servers:gateway:host'),
    config.get('servers:gateway:port'),
    config.get('servers:ota:host'),
    config.get('servers:ota:port')
);

socket_interface.init();

setTimeout(socket_interface.deinit.bind(socket_interface),8000);