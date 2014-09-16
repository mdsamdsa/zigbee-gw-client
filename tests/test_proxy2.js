'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var config = require('../config');
var MainStm = require('../machines/main_stm');
var GroupStm = require('../machines/group_stm');
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
    var engines = require('../engines')(proxy, pan);
    proxy.init();

    proxy.on('nwk_mgr:connected', function() {
        when.all(
            engines.network_info.send_nwk_info_request()
                .then(engines.network_info.process_nwk_info_cnf)
                .catch(function(err) { logger.error(err); }),
            engines.network_info.send_nwk_info_request()
                .then(engines.network_info.process_nwk_info_cnf)
                .catch(function(err) { logger.error(err); })
        );
    });

    setTimeout(function() {
        proxy.deinit();
        setTimeout(function() {}, 500);
    }, 10000);
});
