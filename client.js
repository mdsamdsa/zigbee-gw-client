'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('./logger');
var logger = Logger.getLogger(module_name);

var when = require('when');

var Profiles = require('./lib/profile/ProfileStore');
var GatewayProxy = require('./proxy');
var factoryEngines = require('./engines');
var config = require('./config');
var mainStmFactory = require('./lib/machines/main');
var groupStmFactory = require('./lib/machines/group');
var sceneStmFactory = require('./lib/machines/scene');
var attributeStmFactory = require('./lib/machines/attribute');
var PAN = require('./lib/profile/Pan');
var Protocol = require('./protocol');
var Const = require('./constants');

function ZigbeeGWClient() {

    Profiles.init(__dirname + '/data/profiles', ['ha', 'zll']);

    this.proxy = new GatewayProxy(
        config.get('servers:nwk:host'),
        config.get('servers:nwk:port'),
        config.get('servers:gateway:host'),
        config.get('servers:gateway:port'),
        config.get('servers:ota:host'),
        config.get('servers:ota:port')
    );

    this.engines = factoryEngines(this.proxy);
    this.pan = new PAN(this.engines);
    this.main_stm = mainStmFactory.create(this.proxy, this.pan, this.engines);
    this.group_stm = groupStmFactory.create(this.pan, this.engines, this.main_stm);
    this.scene_stm = sceneStmFactory.create(this.pan, this.engines, this.main_stm);
    this.attr_stm = attributeStmFactory.create(this.pan, this.engines, this.main_stm);

    this.main_stm.on('online', function () {
        this.group_stm.start();
    }.bind(this));
    this.group_stm.on('done', function () {
        this.scene_stm.start();
    }.bind(this));
    this.scene_stm.on('done', function () {
        this.attr_stm.start();
    }.bind(this));

    this.proxy.on('NWK_MGR:NWK_ZIGBEE_DEVICE_IND', function (msg) {
        logger.debug('nwk_mgr:nwk_zigbee_device_ind');
        this.pan.updateDevice(msg.deviceInfo);
        this.group_stm.start();
    }.bind(this));
    
    this.proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function (msg) {
        logger.info(msg);
    });
}

ZigbeeGWClient.prototype.start = function() {
    this.attr_stm.init();
    this.scene_stm.init();
    this.group_stm.init();
    this.main_stm.init();
    this.proxy.init();
};

ZigbeeGWClient.prototype.stop = function() {
    this.proxy.deInit();
    this.main_stm.deInit();
    this.group_stm.deInit();
    this.scene_stm.deInit();
    this.attr_stm.deInit();
};

module.exports = new ZigbeeGWClient();