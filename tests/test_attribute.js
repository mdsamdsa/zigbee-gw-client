'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
log4js.configure('../log4js.json', {});
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var MainStm = require('../lib/machines/main_stm');
var GroupStm = require('../lib/machines/group_stm');
var SceneStm = require('../lib/machines/scene_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');

function Gen(pan) {
    var tasks = [];
    var device = pan.devices[1];
    for(var i = 0; i < device.endpoints.length; i++) {
        var endpoint = device.endpoints[i];
        for(var j = 0; j < endpoint.clusters.length; j++) {
            var cluster = endpoint.clusters[j];
            for (var key in cluster.attributes) {
                if (cluster.attributes.hasOwnProperty(key) && !isNaN(parseInt(key))) {
                    var attribute = cluster.attributes[key];
                    tasks.push(function () {
                        return when(this.attribute.read())
                            .then(function (val) {
                                logger.debug('device: ', this.id, ' endpoint: ', this.endpoint.endpointId, ' cluster: ', this.cluster.name, 'attribute: ', this.attribute.name, ' value: ', val);
                            }.bind(this))
                            .catch(function (err) {
                                logger.warn('device: ', this.id, ' endpoint: ', this.endpoint.endpointId, ' cluster: ', this.cluster.name, 'attribute: ', this.attribute.name, 'error: ' + err);
                            }.bind(this))
                    }.bind({id: 1, device: device, endpoint: endpoint, cluster: cluster, attribute: attribute}));
                }
            }
        }
    }
    return tasks;
}

function Gen2(pan) {
    var tasks = [];
    var device = pan.devices[1];
    for(var i = 0; i < device.endpoints.length; i++) {
        var endpoint = device.endpoints[i];
        //noinspection JSPotentiallyInvalidConstructorUsage
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = device.ieeeAddress;
        address.endpointId = endpoint.endpointId;

        for(var j = 0; j < endpoint.clusters.length; j++) {
            var cluster = endpoint.clusters[j];
            var clusterId = cluster.clusterId;
            var attributeList = [];
            for (var key in cluster.attributes) {
                if (cluster.attributes.hasOwnProperty(key) && !isNaN(parseInt(key))) {
                    var attribute = cluster.attributes[key];
                    attributeList.push(attribute.id)
                }
            }
            if (attributeList.length != 0) {
                tasks.push(function () {
                    var engines = Engines.getEngine();
                    logger.debug('get attributes value for cluster ' + this.cluster.name + ' count: ' + this.attributeList.length);
                    return when(engines.attribute.send_read_device_attribute_request(this.address, this.clusterId, this.attributeList))
                        .then(engines.attribute.process_read_device_attribute_cnf)
                        .then(engines.wait_gateway)
                        .then(engines.attribute.process_read_device_attribute_rsp_ind)
                        .then(function (msg) {
                            logger.debug('get attributes value for cluster ' + this.cluster.name + ' successful' + ' count: ' + msg.attributeRecordList.length);
                        }.bind(this))
                        .catch(function (err) {
                            if (err.constructor.name == 'ZigbeeGWError' && err.msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_FAILURE && err.msg.attributeRecordList.length != 0) {
                                logger.debug('get attributes value for cluster ' + this.cluster.name + ' successful' + ' count: ' + err.msg.attributeRecordList.length);
                            } else {
                                logger.warn('get attributes value for cluster ' + this.cluster.name + ' failure: ' + err);
                            }
                        }.bind(this));
                }.bind({address: address, clusterId: clusterId, attributeList: attributeList, cluster: cluster}));
            }
        }

        if (i == 0) {
            var clusterId1 = 6;
            var attributeList1 = [1];
            tasks.push(function () {
                var engines = Engines.getEngine();
                logger.debug('get attributes value for cluster ' + 'Test' + ' count: ' + this.attributeList.length);
                return when(engines.attribute.send_read_device_attribute_request(this.address, this.clusterId, this.attributeList))
                    .then(engines.attribute.process_read_device_attribute_cnf)
                    .then(engines.wait_gateway)
                    .then(engines.attribute.process_read_device_attribute_rsp_ind)
                    .then(function (msg) {
                        logger.debug('get attributes value for cluster ' + 'Test' + ' successful' + ' count: ' + msg.attributeRecordList.length);
                    }.bind(this))
                    .catch(function (err) {
                        logger.warn('get attributes value for cluster ' + 'Test' + ' failure: ' + err);
                    }.bind(this));
            }.bind({address: address, clusterId: clusterId1, attributeList: attributeList1}));
        }
    }
    return tasks;
}

Profiles.on('ready', function() {
    var proxy = new GatewayProxy(
        config.get('servers:nwk:host'),
        config.get('servers:nwk:port'),
        config.get('servers:gateway:host'),
        config.get('servers:gateway:port'),
        config.get('servers:ota:host'),
        config.get('servers:ota:port')
    );

    var pan = new PAN();
    var engines = Engines.initEngine(proxy, pan);
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

    function test_attribute() {
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
                    .then(engines.wait_gateway)
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
                    .then(engines.wait_gateway)
                    .then(engines.attribute.process_read_device_attribute_rsp_ind)
                    .then(function() {
                        logger.debug('get attribute value successful');
                    })
                    .catch(function(err) {
                        logger.warn('get attribute value failure: ' + err);
                    });
            },
            function() {
                return when(pan.devices[1].endpoints[0].getCluster('On/Off').attributes['OnOff'].read())
                    .then(function(val) {
                        logger.debug('get OnOff attribute of On/Off cluster successful: ' + val);
                    })
                    .catch(function(err) {
                        logger.warn('get OnOff attribute of On/Off cluster failure: ' + err);
                    });
            },
            function() {
                return when(pan.devices[1].endpoints[0].getCluster('On/Off').attributes['OnOff'].write(true))
                    .then(function(val) {
                        logger.debug('set OnOff attribute of On/Off cluster successful: ' + val);
                    })
                    .catch(function(err) {
                        logger.warn('set OnOff attribute of On/Off cluster failure: ' + err);
                    });
            }
        ];

        tasks = tasks.concat(Gen(pan));
        tasks = tasks.concat(Gen2(pan));
        sequence(tasks).then(function() {
            clearTimeout(timer);
            proxy.deinit();
        });
    }

    var timer = setTimeout(function() {
        proxy.deinit();
    }, 40000);

    group_stm.on('done', function() {
        scene_stm.fsm.transition('start');
    });
    scene_stm.on('done', function() {
        test_attribute();
    });

    proxy.on('GATEWAY:GW_SET_ATTRIBUTE_REPORTING_RSP_IND', function(msg) {
        logger.info(msg);
    });

    group_stm.init();
    main_stm.init();
    proxy.init();
});