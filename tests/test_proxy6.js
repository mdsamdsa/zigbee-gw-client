'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../logger');
Logger.configure('./log4js.json', {});
var logger = Logger.getLogger(module_name);

var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var mainStmFactory = require('../lib/machines/main');
var groupStmFactory = require('../lib/machines/group');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');
var Common = require('../common');

Profiles.init(__dirname + '/../data/profiles', ['ha', 'zll']);

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

function Test(address, groupId) {
    var deferred = when.defer();
    when(engines.gw.group_scene.send_get_scene_membership_request(address, groupId))
        .then(engines.gw.group_scene.process_get_scene_membership_cnf)
        .then(engines.wait_gateway)
        .then(engines.gw.group_scene.process_get_scene_membership_rsp_ind)
        .then(function(msg) {
            logger.debug('scenes: ' + Common.list_toString(msg.sceneList));
            deferred.resolve(msg);
        })
        .catch(function(err) {
            logger.error(err.message);
            deferred.resolve();
        });
    return deferred.promise;
}

function TestRpt(address, clusterId) {
    var deferred = when.defer();
    when(engines.gw.attribute.send_set_attribute_reporting_request(address, clusterId))
        .then(engines.gw.attribute.process_set_attribute_reporting_cnf)
        .then(engines.wait_gateway)
        .then(engines.gw.attribute.process_set_attribute_reporting_rsp_ind)
        .then(function(msg) {
            logger.debug('set attribute reporting success');
            deferred.resolve(msg);
        })
        .catch(function(err) {
            logger.error(err.message);
            deferred.resolve();
        });
    return deferred.promise;
}

group_stm.on('done', function() {
    //noinspection JSPotentiallyInvalidConstructorUsage
    var address = new Protocol.GatewayMgr.gwAddressStruct_t();
    address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
    address.ieeeAddr = pan.devices[1].ieeeAddress;
    address.endpointId = pan.devices[1].endpoints[0].endpointId;
    when(Test(address, 0))
        .then(function() {
            return Test(address, 1);
        })
        .then(function() {
            return Test(address, 2);
        })
        .then(function() {
            return Test(address, 3);
        })
        .then(function() {
            return TestRpt(address, 6);
        })
        .then(function() {
            clearTimeout(timeout);
            proxy.deInit();
        });
});

main_stm.on('online', function() {
    group_stm.start();
});

proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
    logger.info(msg);
});

group_stm.init();
main_stm.init();
proxy.init();

var timeout = setTimeout(function() {
    proxy.deInit();
    setTimeout(function() {}, 500);
}, 20000);