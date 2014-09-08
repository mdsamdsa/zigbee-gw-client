'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var machina = require('machina');

var Const = require('../constants');
var DS = require('../data_structures');
var Protocol = require('../protocol.js');

function MainSTM(si) {
    this.si = si;
    this.fsm = new machina.Fsm({
        initialState: "offline",
        states : {
            'online' : {
                _onEnter: function() {
                  logger.info('online')
                },
                'server.disconnected': function() {
                    this.transition('offline');
                }
            },
            'offline' : {
                'server.connected': function() {
                    setTimeout(
                        function() {
                            this.si.Engines.network_info.send_nwk_info_request();
                        }.bind(this),
                        Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY
                    );
                    this.transition('wait_nwk_info_cnf');
                }
            },
            'wait_nwk_info_cnf': {
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    setTimeout(
                        function() {
                            this.si.Engines.network_info.send_nwk_info_request();
                        }.bind(this),
                        Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY
                    );
                },
                'server.nwk_info_cnf': function() {
                    this.si.Engines.device_list.send_get_local_device_info_request();
                    this.transition('wait_get_local_device_info_cnf');
                }
            },
            'wait_get_local_device_info_cnf': {
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    this.si.Engines.device_list.send_get_local_device_info_request();
                },
                'server.get_local_device_info_cnf': function() {
                    this.si.Engines.device_list.send_get_device_list_request();
                    this.transition('wait_get_device_list_cnf');
                }
            },
            'wait_get_device_list_cnf': {
                'server.disconnected': function() {
                    this.transition('offline');
                },
                'server.timeout': function() {
                    this.si.Engines.device_list.send_get_device_list_request();
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

MainSTM.prototype.nwk_connected = function() {
    logger.info('nwk_connected');
};

MainSTM.prototype.nwk_disconnected = function() {
    logger.info('nwk_disconnected');
};

module.exports = MainSTM;