'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Const = require('../constants');

util.inherits(MainSTM, EventEmitter);

function MainSTM(proxy, pan, engines) {
    this.proxy = proxy;
    this.pan = pan;
    this.engines = engines;
    //noinspection JSUnusedGlobalSymbols
    this.fsm = new machina.Fsm({
        proxy: proxy,
        engines: engines,
        pan: pan,
        stm: this,
        check_connect: function() {
            //noinspection JSPotentiallyInvalidUsageOfThis
            var ready = this.proxy.all_server_ready();
            if (!ready) {
                this.transition('offline');
            }
            return ready;
        },
        initialState: 'dummy',
        states : {
            'dummy': {

            },
            'online': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('online');
                        this.stm.emit('online');
                    }
                },
                'server.disconnected': function() {
                    this.transition('offline');
                }
            },
            'offline': {
                _onEnter: function() {
                    logger.info('offline');
                    pan.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE;
                    this.stm.emit('offline');
                },
                'server.connected': function() {
                    this.transition('retry');
                }
            },
            'retry': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('retry');
                        setTimeout(
                            function () {
                                this.handle('retry')
                            }.bind(this),
                            Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY.value
                        );
                    }
                },
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'retry': function() {
                    this.transition('wait_nwk_info_cnf');
                }
            },
            'wait_nwk_info_cnf': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('wait_nwk_info_cnf');
                        //noinspection JSPotentiallyInvalidUsageOfThis
                        if (this.engines.network_info.send_nwk_info_request(function(msg) {
                            if (typeof msg == 'string') {
                                this.handle('server.timeout');
                            } else {
                                if (this.engines.network_info.process_nwk_info_cnf(msg)) {
                                    this.handle('server.nwk_info_cnf');
                                } else {
                                    this.handle('server.timeout');
                                }
                            }
                        }.bind(this)) < 0) {
                            this.transition('retry');
                        }
                    }
                },
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    this.transition('retry');
                },
                'server.nwk_info_cnf': function() {
                    this.transition('wait_get_local_device_info_cnf');
                }
            },
            'wait_get_local_device_info_cnf': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('wait_get_local_device_info_cnf');
                        //noinspection JSPotentiallyInvalidUsageOfThis
                        if (this.engines.device_list.send_get_local_device_info_request(function(msg) {
                            if (typeof msg == 'string') {
                                this.handle('server.timeout');
                            } else {
                                if (this.engines.device_list.process_get_local_device_info_cnf(msg)) {
                                    this.handle('server.get_local_device_info_cnf');
                                } else {
                                    this.handle('server.timeout');
                                }
                            }
                        }.bind(this)) < 0) {
                            this.transition('retry');
                        }
                    }
                },
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    this.transition('retry');
                },
                'server.get_local_device_info_cnf': function() {
                    this.transition('wait_get_device_list_cnf');
                }
            },
            'wait_get_device_list_cnf': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('wait_get_device_list_cnf');
                        //noinspection JSPotentiallyInvalidUsageOfThis
                        if (this.engines.device_list.send_get_device_list_request(function(msg) {
                            if (typeof msg == 'string') {
                                this.handle('server.timeout');
                            } else {
                                if (this.engines.device_list.process_get_device_list_cnf(msg)) {
                                    this.handle('server.get_device_list_cnf');
                                } else {
                                    this.handle('server.timeout');
                                }
                            }
                        }.bind(this)) < 0) {
                            this.transition('retry');
                        }
                    }
                },
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    this.transition('retry');
                },
                'server.get_device_list_cnf': function() {
                    this.transition('online');
                }
            }
        }
    });
}

MainSTM.prototype._check_connect = function() {
    if (this.proxy.all_server_ready()) {
        this.fsm.handle('server.connected');
    }
};

MainSTM.prototype._check_disconnect = function() {
    this.fsm.handle('server.disconnected');
};

MainSTM.prototype.init = function() {
    this.proxy.nwk_server.on('connected', this._check_connect.bind(this));
    this.proxy.gateway_server.on('connected', this._check_connect.bind(this));
    this.proxy.ota_server.on('connected', this._check_connect.bind(this));
    this.proxy.nwk_server.on('disconnected', this._check_disconnect.bind(this));
    this.proxy.gateway_server.on('disconnected', this._check_disconnect.bind(this));
    this.proxy.ota_server.on('disconnected', this._check_disconnect.bind(this));
    this.fsm.transition('offline');
};

MainSTM.prototype.deinit = function() {
    this.fsm.transition('dummy');
};

module.exports = MainSTM;