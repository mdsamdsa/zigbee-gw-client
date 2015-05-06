'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var when = require('when');

var Common = require('../../common');
var Const = require('../../constants');
var Protocol = require('../../protocol');

util.inherits(GroupSTM, EventEmitter);

function GroupSTM(proxy, pan, engines, main) {
    this.proxy = proxy;
    this.pan = pan;
    this.engines = engines;
    this.main = main;
    //noinspection JSUnusedGlobalSymbols
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
                    this.resetState();
                    this.handle('to_check');
                },
                'to_check': function() {
                    this.transition('check');
                }
            },
            'done': {
                _onEnter: function() {
                    logger.info('done');
                    this.stm.emit('done');
                }
            },
            'check': {
                _onEnter: function() {
                    logger.info('check');
                    //logger.info('> ' + this.problemEp.length);
                    var endpoint = this.getEndpoint();
                    if (typeof endpoint != 'undefined') {
                        this.problemEp.push(endpoint);
                        this.startUpdate(endpoint);
                        this.transition('update');
                    } else {
                        if (this.problemEp.length != 0) {
                            this.problemEp = [];
                            this.transition('wait');
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
                        }.bind(this), Const.Timeouts.GROUP_STM_NEXT_DELAY.value);
                },
                'to_check': function() {
                    this.transition('check');
                }
            },
            'wait': {
                _onEnter: function() {
                    logger.info('wait');
                    setTimeout(
                        function () {
                            this.handle('to_check');
                        }.bind(this), Const.Timeouts.GROUP_STM_CICLE_WAIT.value);
                },
                'to_check': function() {
                    this.transition('check');
                }
            }
        },
        resetState: function() {
            //noinspection JSPotentiallyInvalidUsageOfThis
            for(var i = 1; i < this.pan.devices.length; i++) {
                //noinspection JSPotentiallyInvalidUsageOfThis
                var device = this.pan.devices[i];
                device.reset_exchange_status();
            }
        },
        startUpdate: function(endpoint) {
            //noinspection JSPotentiallyInvalidConstructorUsage
            var address = new Protocol.GatewayMgr.gwAddressStruct_t();
            address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
            address.ieeeAddr = endpoint.device.ieeeAddress;
            address.endpointId = endpoint.endpointId;

            //noinspection JSPotentiallyInvalidUsageOfThis
            when(this.engines.group_scene.send_get_group_membership_request(address))
                .then(this.engines.group_scene.process_get_group_membership_cnf)
                .then(this.engines.wait_gateway)
                .then(this.engines.group_scene.process_get_group_membership_rsp_ind)
                .then(function(msg) {
                    this.problemEp.pop();
                    endpoint.device.update_exchange_status(true);
                    logger.debug('groups: ' + Common.list_toString(msg.groupList));
                    this.handle('to_check');
                }.bind(this))
                .catch(function(err) {
                    endpoint.device.update_exchange_status(false);
                    logger.warn('error: ' + err.message);
                    this.handle('to_delay');
                }.bind(this));
        },
        getEndpoint: function() {
            //noinspection JSPotentiallyInvalidUsageOfThis
            for(var i = 1; i < this.pan.devices.length; i++) {
                //noinspection JSPotentiallyInvalidUsageOfThis
                var device = this.pan.devices[i];
                for(var j = 0; j < device.endpoints.length; j++) {
                    if (device.endpoints[j].supportGroups && (device.endpoints[j].groups.needUpdate) && (device.errExchCount < 5)) {
                        var found = false;
                        for(var k = 0; k < this.problemEp.length; k++) {
                            if (this.problemEp[k].device == device) {
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