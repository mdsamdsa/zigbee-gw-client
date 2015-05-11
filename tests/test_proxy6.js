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
var GroupStm = require('../lib/machines/group_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');
var Common = require('../common');

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
    var group_stm = new GroupStm(proxy, pan, engines, main_stm);

    function Test(address, groupId) {
        var deferred = when.defer();
        when(engines.group_scene.send_get_scene_membership_request(address, groupId))
            .then(engines.group_scene.process_get_scene_membership_cnf)
            .then(engines.wait_gateway)
            .then(engines.group_scene.process_get_scene_membership_rsp_ind)
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
        when(engines.attribute.send_set_attribute_reporting_request(address, clusterId))
            .then(engines.attribute.process_set_attribute_reporting_cnf)
            .then(engines.wait_gateway)
            .then(engines.attribute.process_set_attribute_reporting_rsp_ind)
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
                proxy.deinit();
            });
    });

    proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
        logger.info(msg);
    });

    group_stm.init();
    main_stm.init();
    proxy.init();

    var timeout = setTimeout(function() {
        proxy.deinit();
        setTimeout(function() {}, 500);
    }, 20000);
});
