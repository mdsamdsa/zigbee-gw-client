'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');
var util = require('util');
var when = require('when');

var Const = require('../../constants');

//util.inherits(MainSTM, EventEmitter);

var STMProto = machina.Fsm.extend({
    check_connect: function() {
        //noinspection JSPotentiallyInvalidUsageOfThis
        var ready = this._proxy.allServerReady();
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
                    this.emit('online');
                }
            },
            'servers.disconnected': function() {
                this.transition('offline');
            }
        },
        'offline': {
            _onEnter: function() {
                logger.info('offline');
                this._pan.updateNetwork();
                this.emit('offline');
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
                    when(this._engines.network_info.send_nwk_info_request())
                        .then(this._engines.network_info.process_nwk_info_cnf)
                        .then(function(msg) {
                            this._pan.updateNetwork(msg);
                        }.bind(this))
                        .then(this._engines.device_list.send_get_local_device_info_request)
                        .then(this._engines.device_list.process_get_local_device_info_cnf)
                        .then(function(msg) {
                            this._pan.updateDevice(msg.deviceInfo);
                        }.bind(this))
                        .then(this._engines.device_list.send_get_device_list_request)
                        .then(this._engines.device_list.process_get_device_list_cnf)
                        .then(function(msg) {
                            logger.info('Total Devices: ' + msg.deviceList.length);
                            for (var i = 0; i < msg.deviceList.length; i++) {
                                this._pan.updateDevice(msg.deviceList[i]);
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

function MainSTMFactory() {}

MainSTMFactory.prototype.create = function(proxy, pan, engines) {
    var stm =  STMProto.extend({
        '_proxy': proxy,
        '_pan': pan,
        '_engines': engines
    });

    stm.prototype._check_connect = function() {
        this.handle('servers.connected');
    };

    stm.prototype._check_disconnect = function() {
        this.handle('servers.disconnected');
    };

    stm.prototype.init = function() {
        this.on_connected = this._check_connect.bind(this);
        this._proxy.on('connected', this.on_connected);
        this.on_disconnected = this._check_disconnect.bind(this);
        this._proxy.on('disconnected', this.on_disconnected);
        this.transition('offline');
    };

    stm.prototype.deInit = function() {
        this._proxy.removeListener('connected', this.on_connected);
        this._proxy.removeListener('disconnected', this.on_disconnected);
        this.transition('offline');
        this.transition('dummy');
    };

    return new stm();
};

var factory = new MainSTMFactory();

module.exports = factory;