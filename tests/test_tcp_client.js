'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
log4js.configure('./log4js.json', {});
var logger = log4js.getLogger(module_name);
var TcpServerClient = require('../tcp_client');
var config = require('../config');

var nwk_server = new TcpServerClient('NWK_MGR', config.get('servers:nwk:host'), config.get('servers:nwk:port'));

nwk_server.connect();

setTimeout(nwk_server.disconnect.bind(nwk_server), 6000);
