'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var SocketInterface = require('../socket_interface');

var socket_interface = new SocketInterface('192.168.90.28', 2540, 2541, 2525);

socket_interface.init();

setTimeout(socket_interface.deinit.bind(socket_interface),3000);