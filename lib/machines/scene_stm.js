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

util.inherits(SceneSTM, EventEmitter);

function SceneSTM(proxy, pan, engines, main) {
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
        problemEpG: undefined,
        initialState: 'dummy',
        states : {
            'dummy': {

            },
            'start': {
                _onEnter: function() {
                    logger.info('start');
                    this.problemEpG = [];
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
                    //logger.info('> ' + this.problemEpG.length);
                    var ePG = this.getEndpointGroup();
                    if (typeof ePG != 'undefined') {
                        this.problemEpG.push(ePG);
                        this.startUpdate(ePG);
                        this.transition('update');
                    } else {
                        if (this.problemEpG.length != 0) {
                            this.problemEpG = [];
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
                        }.bind(this), Const.Timeouts.SCENE_STM_NEXT_DELAY.value);
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
                        }.bind(this), Const.Timeouts.SCENE_STM_CICLE_WAIT.value);
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
        startUpdate: function(ePG) {
            //noinspection JSPotentiallyInvalidConstructorUsage
            var address = new Protocol.GatewayMgr.gwAddressStruct_t();
            address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
            address.ieeeAddr = ePG.endpoint.device.ieeeAddress;
            address.endpointId = ePG.endpoint.endpointId;

            //noinspection JSPotentiallyInvalidUsageOfThis
            when(this.engines.group_scene.send_get_scene_membership_request(address, ePG.groupId))
                .then(this.engines.group_scene.process_get_scene_membership_cnf)
                .then(this.engines.wait_gateway)
                .then(this.engines.group_scene.process_get_scene_membership_rsp_ind)
                .then(function(msg) {
                    this.problemEpG.pop();
                    ePG.endpoint.device.update_exchange_status(true);
                    logger.debug('group: ' + msg.groupId + ' scenes: ' + Common.list_toString(msg.sceneList));
                    this.handle('to_check');
                }.bind(this))
                .catch(function(err) {
                    ePG.endpoint.device.update_exchange_status(false);
                    logger.warn('error: ' + err.message);
                    this.handle('to_delay');
                }.bind(this));
        },
        getEndpointGroup: function() {
            //noinspection JSPotentiallyInvalidUsageOfThis
            for(var i = 1; i < this.pan.devices.length; i++) {
                //noinspection JSPotentiallyInvalidUsageOfThis
                var device = this.pan.devices[i];
                if (device.errExchCount < 5) {
                    for (var j = 0; j < device.endpoints.length; j++) {
                        var endpoint = device.endpoints[j];
                        if (endpoint.supportGroups && endpoint.supportScenes && (!endpoint.groups.needUpdate)) {
                            for(var k = 0; k < endpoint.groups.length; k++) {
                                if (endpoint.groups[k].scenes.needUpdate) {
                                    var found = false;
                                    for (var m = 0; m < this.problemEpG.length; m++) {
                                        if (this.problemEpG[m].endpoint.device == endpoint.device) {
                                            found = true;
                                        }
                                    }
                                    if (!found) {
                                        return { endpoint: endpoint, groupId: endpoint.groups[k].groupId };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

SceneSTM.prototype.init = function() {
    this.main.on('offline', function() {
        this.fsm.transition('dummy');
    }.bind(this));
};

SceneSTM.prototype.deinit = function() {
    this.fsm.transition('dummy');
};

module.exports = SceneSTM;