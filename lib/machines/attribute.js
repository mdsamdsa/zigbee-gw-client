'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger('machine/' + module_name);
var machina = require('machina');
var when = require('when');

var Common = require('../../common');
var Const = require('../../constants');
var Protocol = require('../../protocol');

var STMProto = machina.Fsm.extend({
    problemCl: undefined,
    initialState: 'dummy',
    states: {
        'dummy': {},
        'ready': {
            'to_start': function() {
                this.transition('start');
            }
        },
        'start': {
            _onEnter: function() {
                logger.info('start');
                this.problemCl = [];
                this.resetState();
                this.handle('to_check');
            },
            'to_check': function() {
                this.transition('check');
            }
        },
        'check': {
            _onEnter: function() {
                logger.debug('check');
                var cluster = this.getCluster();
                if (typeof cluster != 'undefined') {
                    this.problemCl.push(cluster);
                    this.startUpdate(cluster);
                    this.transition('update');
                } else {
                    if (this.problemCl.length != 0) {
                        this.problemCl = [];
                        this.transition('wait');
                    } else {
                        logger.info('done');
                        this.emit('done');
                        this.transition('ready');
                    }
                }
            }
        },
        'update': {
            _onEnter: function() {
                logger.debug('update');
            },
            'to_delay': function() {
                this.transition('delay');
            },
            'to_check': function() {
                this.transition('check');
            }
        },
        'delay': {
            _onEnter: function() {
                logger.debug('delay');
                setTimeout(
                    function() {
                        this.handle('to_check');
                    }.bind(this), Const.Timeouts.ATTRIBUTE_STM_NEXT_DELAY.value);
            },
            'to_check': function() {
                this.transition('check');
            }
        },
        'wait': {
            _onEnter: function() {
                logger.debug('wait');
                setTimeout(
                    function() {
                        this.handle('to_check');
                    }.bind(this), Const.Timeouts.ATTRIBUTE_STM_CICLE_WAIT.value);
            },
            'to_check': function() {
                this.transition('check');
            }
        }
    },
    resetState: function() {
        //noinspection JSPotentiallyInvalidUsageOfThis
        for (var i = 1; i < this._pan.devices.length; i++) {
            //noinspection JSPotentiallyInvalidUsageOfThis
            var device = this._pan.devices[i];
            device.resetExchangeStatus();
        }
    },
    startUpdate: function(cluster) {
        //noinspection JSPotentiallyInvalidConstructorUsage
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = cluster.endpoint.device.ieeeAddress;
        address.endpointId = cluster.endpoint.endpointId;
        var attributeList = [];
        for (var key in cluster.attributes) {
            if (cluster.attributes.hasOwnProperty(key) && !isNaN(parseInt(key))) {
                var attribute = cluster.attributes[key];
                attributeList.push(attribute.attributeId)
            }
        }
        if (attributeList.length == 0) {
            cluster.updateAttributes([]);
            this.problemCl.pop();
            setImmediate(function() {
                this.handle('to_check');
            }.bind(this));
            return;
        }

        when(this._engines.gw.attribute.send_read_device_attribute_request(address, cluster.clusterId, attributeList))
            .then(this._engines.gw.attribute.process_read_device_attribute_cnf)
            .then(this._engines.wait_gateway)
            .then(this._engines.gw.attribute.process_read_device_attribute_rsp_ind)
            .tap(function(msg) {
                cluster.updateAttributes(msg.attributeRecordList);
            }.bind(this))
            .then(function(msg) {
                this.problemCl.pop();
                cluster.endpoint.device.updateExchangeStatus(true);
                logger.debug('attributes value for cluster ' + cluster.name + ' count: ' + msg.attributeRecordList.length);
                this.handle('to_check');
            }.bind(this))
            .catch(function(err) {
                cluster.endpoint.device.updateExchangeStatus(false);
                logger.warn('error: ' + err.message);
                this.handle('to_delay');
            }.bind(this));
    },
    getCluster: function() {
        //noinspection JSPotentiallyInvalidUsageOfThis
        for (var i = 1; i < this._pan.devices.length; i++) {
            //noinspection JSPotentiallyInvalidUsageOfThis
            var device = this._pan.devices[i];
            if (device.errExchCount < 5) {
                for (var j = 0; j < device.endpoints.length; j++) {
                    var endpoint = device.endpoints[j];
                    for (var key in endpoint.clusters) {
                        if (endpoint.clusters.hasOwnProperty(key) && !isNaN(parseInt(key))) {
                            var cluster = endpoint.clusters[key];
                            if (cluster.needUpdate) {
                                var found = false;
                                for (var m = 0; m < this.problemCl.length; m++) {
                                    if (this.problemCl[m].endpoint.device == endpoint.device) {
                                        found = true;
                                    }
                                }
                                if (!found) {
                                    return cluster;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});

function GroupSTMFactory() {}

GroupSTMFactory.prototype.create = function(pan, engines, main) {
    var stm = STMProto.extend({
        '_pan': pan,
        '_engines': engines
    });

    stm.prototype.init = function() {
        this.on_online = function() { this.transition('ready'); }.bind(this);
        main.on('online', this.on_online);
        this.on_offline = function() { this.transition('dummy'); }.bind(this);
        main.on('offline', this.on_offline);
    };

    stm.prototype.deInit = function() {
        main.off('online', this.on_online);
        main.off('offline', this.on_offline);
        this.off('dummy');
    };

    stm.prototype.start = function() {
        setImmediate(function() {
            this.handle('to_start')
        }.bind(this));
    };

    return new stm();
};

var factory = new GroupSTMFactory();

module.exports = factory;