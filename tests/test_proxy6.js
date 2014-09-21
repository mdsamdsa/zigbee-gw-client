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
    var engines = require('../engines')(proxy, pan);
    var main_stm = new MainStm(proxy, pan, engines);
    var group_stm = new GroupStm(proxy, pan, engines, main_stm);

    function Test(address, groupId) {
        var deferred = when.defer();
        when(engines.group_scene.send_get_scene_membership_request(address, groupId))
            .then(engines.group_scene.process_get_scene_membership_cnf)
            .then(function(msg) {
                return proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value)
            })
            .then(engines.group_scene.process_get_scene_membership_rsp_ind)
            .then(function(msg) {
                logger.debug('scenes: ' + Common.print_list(msg.sceneList));
                deferred.resolve(msg);
            })
            .catch(function(err) {
                logger.error(err);
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
                console.log('');
/*                setTimeout(function() {
                    when.all([
                        Test(address, 0),
                        Test(address, 1),
                        Test(address, 2),
                        Test(address, 3),
                    ]);
                }, 500);*/
                setTimeout(function() {
                    engines.attribute.send_set_attribute_reporting_request(address, 6)
                }, 2000);
            })
    });

    proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
        logger.info(msg);
    });

    group_stm.init();
    main_stm.init();
    proxy.init();

    setTimeout(function() {
        proxy.deinit();
        setTimeout(function() {}, 500);
    }, 200000);
});
