'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var when = require('when');

var Const = require('../../constants');

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
                'servers.disconnected': function() {
                    this.transition('offline');
                }
            },
            'offline': {
                _onEnter: function() {
                    logger.info('offline');
                    this.pan.update_network();
                    this.stm.emit('offline');
                },
                'servers.connected': function() {
                    this.transition('retry');
                }
            },
            'retry': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('retry');
                        setTimeout(
                            function () {
                                this.handle('collect')
                            }.bind(this),
                            Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY.value
                        );
                    }
                },
                'servers.disconnected': function() {
                    this.transition('offline');
                },
                'collect': function() {
                    this.transition('collect');
                }
            },
            'collect': {
                _onEnter: function() {
                    if (this.check_connect()) {
                        logger.info('collect');
                        when(this.engines.network_info.send_nwk_info_request())
                            .then(this.engines.network_info.process_nwk_info_cnf)
                            .then(function(msg) {
                                this.pan.update_network(msg);
                            }.bind(this))
                            .then(this.engines.device_list.send_get_local_device_info_request)
                            .then(this.engines.device_list.process_get_local_device_info_cnf)
                            .then(function(msg) {
                                this.pan.update_device(msg.deviceInfo);
                            }.bind(this))
                            .then(this.engines.device_list.send_get_device_list_request)
                            .then(this.engines.device_list.process_get_device_list_cnf)
                            .then(function(msg) {
                                logger.info('Total Devices: ' + msg.deviceList.length);
                                for (var i = 0; i < msg.deviceList.length; i++) {
                                    this.pan.update_device(msg.deviceList[i]);
                                }
                            }.bind(this))
                            .then(function() {
                                this.handle('online');
                            }.bind(this))
                            .catch(function(err) {
                                logger.warn(err.name + ': ' + err.message);
                                this.handle('retry');
                            }.bind(this));
                    }
                },
                'servers.disconnected': function() {
                    this.transition('offline');
                },
                'online': function() {
                    this.transition('online');
                },
                'retry': function() {
                    this.transition('retry');
                }
            }
        }
    });
}

MainSTM.prototype._check_connect = function() {
    this.fsm.handle('servers.connected');
};

MainSTM.prototype._check_disconnect = function() {
    this.fsm.handle('servers.disconnected');
};

MainSTM.prototype.init = function() {
    this.proxy.on('connected', this._check_connect.bind(this));
    this.proxy.on('disconnected', this._check_disconnect.bind(this));
    this.fsm.transition('offline');
};

MainSTM.prototype.deinit = function() {
    this.fsm.transition('offline');
    this.fsm.transition('dummy');
};

module.exports = MainSTM;