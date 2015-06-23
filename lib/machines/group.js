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
    problemEp: undefined,
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
                this.problemEp = [];
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
                    }.bind(this), Const.Timeouts.GROUP_STM_NEXT_DELAY.value);
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
                    }.bind(this), Const.Timeouts.GROUP_STM_CICLE_WAIT.value);
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
    startUpdate: function(endpoint) {
        //noinspection JSPotentiallyInvalidConstructorUsage
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = endpoint.device.ieeeAddress;
        address.endpointId = endpoint.endpointId;

        //noinspection JSPotentiallyInvalidUsageOfThis
        when(this._engines.gw.group_scene.send_get_group_membership_request(address))
            .then(this._engines.gw.group_scene.process_get_group_membership_cnf)
            .then(this._engines.wait_gateway)
            .then(this._engines.gw.group_scene.process_get_group_membership_rsp_ind)
            .tap(function (msg) {
                var endpoint = this._pan.getEndpoint(msg.srcAddress);
                if (typeof endpoint == 'undefined') {
                    logger.warn('endpoint not found');
                } else {
                    endpoint.updateGroups(msg.groupList);
                }
            }.bind(this))
            .then(function(msg) {
                this.problemEp.pop();
                endpoint.device.updateExchangeStatus(true);
                logger.debug('groups: ' + Common.list_toString(msg.groupList));
                this.handle('to_check');
            }.bind(this))
            .catch(function(err) {
                endpoint.device.updateExchangeStatus(false);
                logger.warn('error: ' + err.message);
                this.handle('to_delay');
            }.bind(this));
    },
    getEndpoint: function() {
        //noinspection JSPotentiallyInvalidUsageOfThis
        for (var i = 1; i < this._pan.devices.length; i++) {
            //noinspection JSPotentiallyInvalidUsageOfThis
            var device = this._pan.devices[i];
            for (var j = 0; j < device.endpoints.length; j++) {
                if (device.endpoints[j].supportGroups && (device.endpoints[j].groups.needUpdate) && (device.errExchCount < 5)) {
                    var found = false;
                    for (var k = 0; k < this.problemEp.length; k++) {
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
        this.transition('dummy');
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