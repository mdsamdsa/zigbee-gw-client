'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var MainStm = require('../lib/machines/main_stm');
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
    var main_stm = new MainStm(proxy, pan, engines);
    main_stm.on('online', function() {
        clearTimeout(timeout);
        proxy.deinit();
    });

    main_stm.init();
    proxy.init();

    var timeout = setTimeout(function() {
        proxy.deinit();
        setTimeout(function() {}, 500);
    }, 10000);
});
