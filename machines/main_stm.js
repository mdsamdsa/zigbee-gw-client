'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');

var Const = require('../constants');
var DS = require('../data_structures');

function MainSTM(si) {
    this.si = si;
    this.fsm = new machina.Fsm({
        initialState: 'offline',
        states : {
            'online' : {
                _onEnter: function() {
                  logger.info('online');
                },
                'server.disconnected': function() {
                    this.transition('offline');
                }
            },
            'offline' : {
                _onEnter: function() {
                    logger.info('offline');
                    DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE;
                },
                'server.connected': function() {
                    this.transition('retry');
                }
            },
            'retry': {
                _onEnter: function() {
                    logger.info('retry');
                    setTimeout(
                        function() {
                            this.handle('retry')
                        }.bind(this),
                        Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY
                    );
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
                    logger.info('wait_nwk_info_cnf');
                    if (this.si.Engines.network_info.send_nwk_info_request() < 0) {
                        this.transition('retry');
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
                    logger.info('wait_get_local_device_info_cnf');
                    if (this.si.Engines.device_list.send_get_local_device_info_request() < 0) {
                        this.transition('retry');
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
                    logger.info('wait_get_device_list_cnf');
                    if (this.si.Engines.device_list.send_get_device_list_request() < 0) {
                        this.transition('retry');
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
    this.fsm.si = si;
    this.si.nwk_server.on('connected', function() { this.fsm.handle('server.connected'); }.bind(this));
    this.si.nwk_server.on('disconnected', function() { this.fsm.handle('server.disconnected'); }.bind(this));
    this.si.on('timeout', function() { this.fsm.handle('server.timeout'); }.bind(this));
    this.si.on('NWK_MGR:NWK_ZIGBEE_NWK_INFO_CNF', function() { this.fsm.handle('server.nwk_info_cnf'); }.bind(this));
    this.si.on('NWK_MGR:NWK_GET_LOCAL_DEVICE_INFO_CNF', function() { this.fsm.handle('server.get_local_device_info_cnf'); }.bind(this));
    this.si.on('NWK_MGR:NWK_GET_DEVICE_LIST_CNF', function() { this.fsm.handle('server.get_device_list_cnf'); }.bind(this));
}

MainSTM.prototype.init = function() {

};

MainSTM.prototype.deinit = function() {

};

module.exports = MainSTM;