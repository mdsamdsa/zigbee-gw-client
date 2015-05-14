'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var mainStmFactory = require('../lib/machines/main');
var groupStmFactory = require('../lib/machines/group');
var sceneStmFactory = require('../lib/machines/scene');
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
    var main_stm = mainStmFactory.create(proxy, pan, engines);
    var group_stm = groupStmFactory.create(pan, engines, main_stm);
    var scene_stm = sceneStmFactory.create(pan, engines, main_stm);

    var timeout = setTimeout(function() {
        proxy.deInit();
    }, 20000);

    main_stm.on('online', function() {
        group_stm.transition('start');
    });
    group_stm.on('done', function() {
        scene_stm.transition('start');
    });
    scene_stm.on('done', function() {
        clearTimeout(timeout);
    });

    proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
        logger.info(msg);
    });

    group_stm.init();
    main_stm.init();
    proxy.init();
});
