'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
log4js.configure('../log4js.json', {});
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var config = require('../config');
var MainStm = require('../lib/machines/main_stm');
var GroupStm = require('../lib/machines/group_stm');
var SceneStm = require('../lib/machines/scene_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');

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
    var scene_stm = new SceneStm(proxy, pan, engines, main_stm);

    function sequence(arr) {
        var deferred = when.defer();
        function _sequence() {
            if (arr.length != 0) {
                var task = arr.shift();
                var promise = task.call(this);
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
        var clusterId = pan.devices[1].endpoints[0].getCluster('On/Off').clusterId;
        var attributeList = [0];
        var tasks = [
            function() {
                return when(engines.attribute.send_get_device_attribute_list_request(address))
                    .then(engines.attribute.process_get_device_attribute_list_cnf)
                    .then(function(msg) {
                        return proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value)
                    }.bind(this))
                    .then(engines.attribute.process_get_device_attribute_list_rsp_ind)
                    .then(function() {
                        logger.debug('get attribute list succesfull');
                    })
                    .catch(function(err) {
                        logger.warn('get attribute list failure: ' + err);
                    });
            },
            function() {
                return when(engines.attribute.send_read_device_attribute_request(address, clusterId, attributeList))
                    .then(engines.attribute.process_read_device_attribute_cnf)
                    .then(function(msg) {
                        return proxy.wait('GATEWAY', msg.sequenceNumber, Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value)
                    }.bind(this))
                    .then(engines.attribute.process_read_device_attribute_rsp_ind)
                    .then(function() {
                        logger.debug('get attribute value succesfull');
                    })
                    .catch(function(err) {
                        logger.warn('get attribute value failure: ' + err);
                    });
            }/*,
            function() {
                return pan.devices[1].endpoints[0].getCluster('On/Off').attributes['OnOff'].read();
            }*/
        ];
        sequence(tasks).then(function() {
            clearTimeout(timer);
        });
    }

    var timer = setTimeout(function() {
        proxy.deinit();
    }, 40000);

    group_stm.on('done', function() {
        scene_stm.fsm.transition('start');
    });
    scene_stm.on('done', function() {
        test_group_scene();
    });

    proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
        logger.info(msg);
    });

    group_stm.init();
    main_stm.init();
    proxy.init();
});