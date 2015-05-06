'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');

Profiles.on('ready', function() {
    var proxy = new GatewayProxy(
        config.get('servers:nwk:host'),
        config.get('servers:nwk:port'),
        config.get('servers:gateway:host'),
        config.get('servers:gateway:port'),
        config.get('servers:ota:host'),
        config.get('servers:ota:port')
    );

    var pan = new PAN(proxy);
    var engines = Engines.initEngine(proxy, pan);
    proxy.init();

    proxy.on('connected', function() {
        when(engines.network_info.send_nwk_info_request())
            .then(engines.network_info.process_nwk_info_cnf)
            .then(engines.device_list.send_get_local_device_info_request)
            .then(engines.device_list.process_get_local_device_info_cnf)
            .then(engines.device_list.send_get_device_list_request)
            .then(engines.device_list.process_get_device_list_cnf)
            .catch(function(err) { logger.error(err); })
            .finally(function() {
                clearTimeout(timeout);
                proxy.deinit();
            });
    });

    var timeout = setTimeout(function() {
        proxy.deinit();
        setTimeout(function() {}, 500);
    }, 10000);
});
