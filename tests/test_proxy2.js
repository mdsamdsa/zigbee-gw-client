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
    var engines = Engines.initEngine(proxy);
    proxy.init();

    proxy.on('connected', function() {
        when(engines.nwk.network.send_nwk_info_request())
            .then(engines.nwk.network.process_nwk_info_cnf)
            .then(function(msg) {
                pan.updateNetwork(msg);
            })
            .then(engines.nwk.local_device.send_get_local_device_info_request)
            .then(engines.nwk.local_device.process_get_local_device_info_cnf)
            .then(function(msg) {
                pan.updateDevice(msg.deviceInfo);
            })
            .then(engines.device.send_get_device_list_request)
            .then(engines.device.process_get_device_list_cnf)
            .then(function(msg) {
                logger.info('Total Devices: ' + msg.deviceList.length);
                for (var i = 0; i < msg.deviceList.length; i++) {
                    pan.updateDevice(msg.deviceList[i]);
                }
            })
            .catch(function(err) { logger.error(err); })
            .finally(function() {
                clearTimeout(timeout);
                proxy.deInit();
            });
    });

    var timeout = setTimeout(function() {
        proxy.deInit();
        setTimeout(function() {}, 500);
    }, 10000);
});
