'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Const = require('./constants');
var DS = require('./data_structures');
var TcpServerClient = require('./tcp_client');
var Protocol = require('./protocol.js');

function SocketInterface(nwk_host, nwk_port, gateway_host, gateway_port, ota_host, ota_port) {
    this.nwk_host = nwk_host;
    this.nwk_port = nwk_port;
    this.gateway_host = gateway_host;
    this.gateway_port = gateway_port;
    this.ota_host = ota_host;
    this.ota_port = ota_port;

    this.state = 0;
    this.waiting_for_confirmation = false;

    this.nwk_server = new TcpServerClient('NWK_MGR', this.nwk_host, this.nwk_port);
    this.gateway_server = new TcpServerClient('GATEWAY', this.gateway_host, this.gateway_port);
    this.ota_server = new TcpServerClient('OTA', this.ota_host, this.ota_port);

    this.nwk_server.on('error', this.tcp_server_error);
    this.gateway_server.on('error', this.tcp_server_error);
    this.ota_server.on('error', this.tcp_server_error);

    this.nwk_server.on('connected', this.nwk_server_connected.bind(this));
    this.nwk_server.on('disconnected', this.nwk_server_disconnected.bind(this));
    this.nwk_server.on('packet', this.nwk_server_packet.bind(this));

    this.gateway_server.on('connected', this.gateway_server_connected.bind(this));

    this.ota_server.on('connected', this.ota_server_connected.bind(this));

    this.Engines = require('./engines')(this);
}
util.inherits(SocketInterface, EventEmitter);

SocketInterface.prototype.init = function() {
    logger.info('init');
    this.nwk_server.connect();
    this.gateway_server.connect();
    this.ota_server.connect();
};

SocketInterface.prototype.deinit = function() {
    logger.info('deinit');
    this.nwk_server.disconnect();
    this.gateway_server.disconnect();
    this.ota_server.disconnect();
};

SocketInterface.prototype.tcp_server_error = function(error) {
    logger.info(this.name + ' tcp_server_error: ' + error);
};

SocketInterface.prototype.nwk_server_connected = function() {
    logger.info('nwk_server_connected');
    this.nwk_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
    this.init_state_machine_timer = setTimeout(function() {
        this.init_state_machine(false, null);
    }.bind(this), Const.Timeouts.INIT_STATE_MACHINE_STARTUP_DELAY);
};

SocketInterface.prototype.nwk_server_disconnected = function() {
    logger.info('nwk_server_disconnected');
    clearTimeout(this.init_state_machine_timer);
    this.init_state_machine_timer = undefined;
    this.init_state_machine(false, null);
    DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_UNAVAILABLE;
};

SocketInterface.prototype.nwk_server_packet = function(packet) {
    switch(packet.header.cmdId) {
        case Protocol.NWKMgr.nwkMgrCmdId_t.ZIGBEE_GENERIC_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_SYSTEM_RESET_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_SET_ZIGBEE_POWER_MODE_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_NWK_KEY_CNF:
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF:
            this.confirmation_receive_handler(packet);
            break;
        default:
            Logger.warn('Unsupported incoming command id from nwk manager server (cmd_id ' + packet.header.cmdId + ')');
            break;
    };
};

SocketInterface.prototype.init_state_machine = function() {
    this.init_state_machine(false, null);
};

SocketInterface.prototype.gateway_server_connected = function() {
    logger.info('gateway_server_connected');
    this.gateway_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.ota_server_connected = function() {
    logger.info('ota_server_connected');
    this.ota_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.init_state_machine = function(timed_out, arg) {
    if (!this.nwk_server.connected) {
        this.state = 4;
    }
    else if ((!timed_out) || (this.state == 0)) {
        this.state++;
    }
    logger.info('Init state ' + this.state);
    switch(this.state) {
        case 1:
            if(!this.waiting_for_confirmation) {
                this.Engines.network_info.nwk_send_info_request();
            }
            else{
                this.state = 0;
            }
    }
};

SocketInterface.prototype.get_server = function(index) {
    switch(index) {
        case Const.ServerID.SI_SERVER_ID_NWK_MGR:
            return this.nwk_server;
        case Const.ServerID.SI_SERVER_ID_GATEWAY:
            return this.gateway_server;
        case Const.ServerID.SI_SERVER_ID_OTA:
            return this.ota_server;
        default:
            return undefined;
    }
};

SocketInterface.prototype.is_server_ready = function(index) {
    var server = this.get_server(index);
    if (typeof server == "undefined")
        return false;
    return server.connected;
};

SocketInterface.prototype.send_packet = function(pkt, cb, arg) {
    var server;
    if (pkt.header.subsystem == Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR) {
        server = this.nwk_server;
    } else if (pkt.header.subsystem == Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW) {
        server = this.gateway_server;
    } else if (pkt.header.subsystem == Protocol.OTAMgr.ZStackOTASysIDs.RPC_SYS_PB_OTA_MGR) {
        server = this.ota_server;
    } else {
        logger.warn('Unknown subsystem ID ' + pkt.header.subsystem + ' Following packet discarded: ');
        //ui_print_packet_to_log(pkt, "not sent: ", BOLD);
        return -1;
    }

    if (!server.connected) {
        logger.info('Please wait while connecting to server');
        return -1;
    }

    if (this.waiting_for_confirmation) {
        logger.info('BUSY - please wait for previous operation to complete');
        return -1;
    }

    server.send(pkt);

    this.confirmation_cb = cb;
    this.confirmation_arg = arg;

    logger.info('BUSY');
    this.waiting_for_confirmation = true;

    /*tu_set_timer(&confirmation_wait_timer, server->confirmation_timeout_interval, false, confirmation_timeout_handler, NULL);

    if (server->confirmation_timeout_interval != STANDARD_CONFIRMATION_TIMEOUT)
    {
        server->confirmation_timeout_interval = STANDARD_CONFIRMATION_TIMEOUT;
    }*/

    return 0;
};

SocketInterface.prototype.confirmation_receive_handler = function(pkt) {
    this.waiting_for_confirmation = false;
    //tu_kill_timer(&confirmation_wait_timer);
    //ui_print_status(0, "");

    if (!(typeof this.confirmation_cb ==  "undefined")) {
        //UI_PRINT_LOG("Calling confirmation callback");
        this.confirmation_cb(pkt, this.confirmation_arg);
    }

    /*if (IDLE_CB != NULL)
    {
        IDLE_CB(false, IDLE_CB_ARG);
    }*/
};

module.exports = SocketInterface;