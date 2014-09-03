'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var TcpServerClient = require('../tcp_client');

var nwk_server = new TcpServerClient('NWK_MGR', '192.168.7.2', 12540);
//var nwk_server = new TcpServerClient('NWK_MGR', '192.168.90.28', 2540);

nwk_server.on('error', function(error) {
    //logger.error(error);
});

nwk_server.connect();

setTimeout(nwk_server.disconnect.bind(nwk_server), 17000);

setTimeout(function() {}, 8000);

/*setTimeout(function() {
    nwk_server.port = 2540
    nwk_server.connect(nwk_server);
}, 6000);

setTimeout(nwk_server.disconnect.bind(nwk_server), 11000);*/
