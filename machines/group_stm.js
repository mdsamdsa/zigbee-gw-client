'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Common = require('../common');
var Const = require('../constants');
var Protocol = require('../protocol');

util.inherits(GroupSTM, EventEmitter);

function GroupSTM(proxy, pan, engines, main) {
    this.proxy = proxy;
    this.pan = pan;
    this.engines = engines;
    this.main = main;
    this.fsm = new machina.Fsm({
        proxy: proxy,
        engines: engines,
        pan: pan,
        stm: this,
        problemEp: undefined,
        initialState: 'dummy',
        states : {
            'dummy': {

            },
            'start': {
                _onEnter: function() {
                    logger.info('start');
                    this.problemEp = [];
                    this.handle('to_check');
                },
                'to_check': function() {
                    this.transition('check');
                }
            },
            'done': {
                _onEnter: function() {
                    logger.info('done');
                }
            },
            'check': {
                _onEnter: function() {
                    logger.info('check');
                    //logger.info('> ' + this.problemEp.length);
                    var endpoint = this.getEndpoint();
                    if (typeof endpoint != 'undefined') {
                        this.problemEp.push(endpoint);
                        if (this.startUpdate(endpoint) == 0) {
                            this.transition('update')
                        } else {
                            this.transition('delay');
                        }
                    } else {
                        if (this.problemEp.length != 0) {
                            this.problemEp = [];
                            this.transition('delay');
                        } else {
                            this.transition('done');
                        }
                    }
                }
            },
            'update': {
                _onEnter: function() {
                    logger.info('update');
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
                    logger.info('delay');
                    setTimeout(
                        function () {
                            this.handle('to_check');
                        }.bind(this), 100);
                },
                'to_check': function() {
                    this.transition('check');
                }
            }
        },
        startUpdate: function(endpoint) {
            //noinspection JSPotentiallyInvalidConstructorUsage
            var address = new Protocol.GatewayMgr.gwAddressStruct_t();
            address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
            address.ieeeAddr = endpoint.device.ieeeAddress;
            address.endpointId = endpoint.endpointId;
            //noinspection JSPotentiallyInvalidUsageOfThis
            return this.engines.group_scene.send_get_group_membership_request(address, function(msg) {
                if (this.engines.group_scene.process_get_group_membership_cnf(msg)) {
                    var timer = setTimeout(
                        function() {
                            logger.info('GATEWAY:' + msg.sequenceNumber + ' TIMEOUT');
                            this.proxy.removeAllListeners('GATEWAY:' + msg.sequenceNumber);
                            this.handle('to_delay');
                        }.bind(this), Const.Timeouts.ZIGBEE_RESPOND_TIMEOUT.value);
                    this.proxy.once('GATEWAY:' + msg.sequenceNumber, function(msg) {
                        clearTimeout(timer);
                        if (this.engines.group_scene.process_get_group_membership_rsp_ind(msg)) {
                            this.problemEp.pop();
                            logger.info('groups: ' + Common.print_list(msg.groupList));
                            this.handle('to_check');
                        }
                    }.bind(this));
                } else {
                    this.handle('to_delay');
                }
            }.bind(this));
        },
        getEndpoint: function() {
            //noinspection JSPotentiallyInvalidUsageOfThis
            for(var i = 1; i < this.pan.devices.length; i++) {
                //noinspection JSPotentiallyInvalidUsageOfThis
                var device = this.pan.devices[i];
                for(var j = 0; j < device.endpoints.length; j++) {
                    //TODO typeof groups
                    if (device.endpoints[j].getCluster('Groups') && (typeof device.endpoints[j].groups == 'undefined')) {
                        var found = false;
                        for(var k = 0; k < this.problemEp.length; k++) {
                            if (this.problemEp[k] == device.endpoints[j]) {
                                found = true;
                            }
                        }
                        if (!found) {
                            return device.endpoints[j];
                        }
                    }
                }
            }
        }
    });
}

GroupSTM.prototype.init = function() {
    this.main.on('online', function() {
        this.fsm.transition('start');
    }.bind(this));
    this.main.on('offline', function() {
        this.fsm.transition('dummy');
    }.bind(this));
};

GroupSTM.prototype.deinit = function() {
    this.fsm.transition('dummy');
};

module.exports = GroupSTM;