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
var sceneStmFactory = require('../lib/machines/scene');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');

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
var scene_stm = sceneStmFactory.create(pan, engines, main_stm);

function sequence(arr, arg1, arg2, arg3) {
    var deferred = when.defer();
    function _sequence() {
        if (arr.length != 0) {
            var task = arr.shift();
            var promise = task.call(this, arg1, arg2, arg3);
            when(promise).finally(_sequence);
        } else {
            deferred.resolve(true);
        }
    }
    _sequence();
    return deferred.promise;
}

function test_group_scene() {
    if (pan.devices.length == 1) {
        logger.error('Device for test not found');
        return;
    }
    //noinspection JSPotentiallyInvalidConstructorUsage
    var address = new Protocol.GatewayMgr.gwAddressStruct_t();
    address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
    address.ieeeAddr = pan.devices[1].ieeeAddress;
    address.endpointId = pan.devices[1].endpoints[0].endpointId;
    var groupId = 10;
    var sceneId = 2;
    var tasks = [
        function(address, groupId) {
            return when(engines.gw.group_scene.send_add_group_request(address, groupId, ''))
                .then(engines.gw.group_scene.process_add_group_cnf)
                .then(engines.wait_gateway)
                .then(engines.gw.group_scene.process_add_group_rsp_ind)
                .then(function() {
                    logger.debug('group added succesfull');
                })
                .catch(function(err) {
                    logger.warn('group added failure: ' + err);
                });
        },
        function(address, groupId, sceneId) {
            return when(engines.gw.group_scene.send_store_scene_request(address, groupId, sceneId))
                .then(engines.gw.group_scene.process_store_scene_cnf)
                .then(engines.wait_gateway)
                .then(engines.gw.group_scene.process_store_scene_rsp_ind)
                .then(function() {
                    logger.debug('scene stored succesfull');
                })
                .catch(function(err) {
                    logger.warn('scene stored failure: ' + err);
                });
        },
        function(address, groupId, sceneId) {
            return when(engines.gw.group_scene.send_remove_scene_request(address, groupId, sceneId))
                .then(engines.gw.group_scene.process_remove_scene_cnf)
                .then(engines.wait_gateway)
                .then(engines.gw.group_scene.process_remove_scene_rsp_ind)
                .then(function() {
                    logger.debug('scene removed succesfull');
                })
                .catch(function(err) {
                    logger.warn('scene removed failure: ' + err);
                });
        },
        function(address, groupId) {
            return when(engines.gw.group_scene.send_remove_from_group_request(address, groupId))
                .then(engines.gw.group_scene.process_remove_from_group_cnf)
                .then(engines.wait_gateway)
                .then(engines.gw.group_scene.process_remove_from_group_rsp_ind)
                .then(function() {
                    logger.debug('group removed succesfull');
                })
                .catch(function(err) {
                    logger.warn('group removed failure: ' + err);
                });
        }
    ];
    sequence(tasks, address, groupId, sceneId).then(function() {
        clearTimeout(timer);
    });
}

var timer = setTimeout(function() {
    proxy.deInit();
}, 40000);

main_stm.on('online', function() {
    group_stm.start();
});
group_stm.on('done', function() {
    scene_stm.start();
});
scene_stm.on('done', function() {
    test_group_scene();
});

proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
    logger.info(msg);
});

scene_stm.init();
group_stm.init();
main_stm.init();
proxy.init();