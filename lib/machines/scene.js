'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../logger');
var logger = Logger.getLogger('machine:' + module_name);

var machina = require('machina');
var when = require('when');

var Common = require('../../common');
var Const = require('../../constants');
var Protocol = require('../../protocol');

var STMProto = machina.Fsm.extend({
    problemEpG: undefined,
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
                this.problemEpG = [];
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
                    }.bind(this), Const.Timeouts.SCENE_STM_NEXT_DELAY.value);
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
                    }.bind(this), Const.Timeouts.SCENE_STM_CICLE_WAIT.value);
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
    startUpdate: function(ePG) {
        //noinspection JSPotentiallyInvalidConstructorUsage
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = ePG.endpoint.device.ieeeAddress;
        address.endpointId = ePG.endpoint.endpointId;

        //noinspection JSPotentiallyInvalidUsageOfThis
        when(this._engines.gw.group_scene.send_get_scene_membership_request(address, ePG.groupId))
            .then(this._engines.gw.group_scene.process_get_scene_membership_cnf)
            .then(this._engines.wait_gateway)
            .then(this._engines.gw.group_scene.process_get_scene_membership_rsp_ind)
            .then(function(msg) {
                var endpoint = this._pan.getEndpoint(msg.srcAddress);
                if (typeof endpoint == 'undefined') {
                    logger.warn('endpoint not found');
                } else {
                    endpoint.updateScenes(msg.groupId, msg.sceneList);
                }
                return msg;
            }.bind(this))
            .then(function(msg) {
                this.problemEpG.pop();
                ePG.endpoint.device.updateExchangeStatus(true);
                logger.debug('group: ' + msg.groupId + ' scenes: ' + Common.list_toString(msg.sceneList));
                this.handle('to_check');
            }.bind(this))
            .catch(function(err) {
                ePG.endpoint.device.updateExchangeStatus(false);
                logger.warn('error: ' + err.message);
                this.handle('to_delay');
            }.bind(this));
    },
    getEndpointGroup: function() {
        //noinspection JSPotentiallyInvalidUsageOfThis
        for (var i = 1; i < this._pan.devices.length; i++) {
            //noinspection JSPotentiallyInvalidUsageOfThis
            var device = this._pan.devices[i];
            if (device.errExchCount < 5) {
                for (var j = 0; j < device.endpoints.length; j++) {
                    var endpoint = device.endpoints[j];
                    if (endpoint.supportGroups && endpoint.supportScenes && (!endpoint.groups.needUpdate)) {
                        for (var k = 0; k < endpoint.groups.length; k++) {
                            if (endpoint.groups[k].scenes.needUpdate) {
                                var found = false;
                                for (var m = 0; m < this.problemEpG.length; m++) {
                                    if (this.problemEpG[m].endpoint.device == endpoint.device) {
                                        found = true;
                                    }
                                }
                                if (!found) {
                                    return {endpoint: endpoint, groupId: endpoint.groups[k].groupId};
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});

function SceneSTMFactory() {}

SceneSTMFactory.prototype.create = function(pan, engines, main) {
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
        this.transition('dummy');
    };
    
    stm.prototype.start = function() {
        setImmediate(function() {
            this.handle('to_start')
        }.bind(this));
    };

    return new stm();
};

var factory = new SceneSTMFactory();

module.exports = factory;
