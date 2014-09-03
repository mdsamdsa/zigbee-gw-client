'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var INITIAL_CONFIRMATION_TIMEOUT = 5000;
//var STANDARD_CONFIRMATION_TIMEOUT = 1000;
var INIT_STATE_MACHINE_STARTUP_DELAY = 1000;

var ZIGBEE_NETWORK_STATE_UNAVAILABLE = 0;
//#define ZIGBEE_NETWORK_STATE_INITIALIZING 1
//#define ZIGBEE_NETWORK_STATE_READY        2

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var TcpServerClient = require('./tcp_client');
var DS = require('./data_structures');

function SocketInterface(nwk_host, nwk_port, gateway_host, gateway_port, ota_host, ota_port) {
    this.nwk_host = nwk_host;
    this.nwk_port = nwk_port;
    this.gateway_host = gateway_host;
    this.gateway_port = gateway_port;
    this.ota_host = ota_host;
    this.ota_port = ota_port;

    this.state = 0;

    this.nwk_server = new TcpServerClient('NWK_MGR', this.nwk_host, this.nwk_port);
    this.gateway_server = new TcpServerClient('GATEWAY', this.gateway_host, this.gateway_port);
    this.ota_server = new TcpServerClient('OTA', this.ota_host, this.ota_port);

    this.nwk_server.on('error', this.tcp_server_error);
    this.gateway_server.on('error', this.tcp_server_error);
    this.ota_server.on('error', this.tcp_server_error);

    this.nwk_server.on('connected', this.nwk_server_connected.bind(this));
    this.nwk_server.on('disconnected', this.nwk_server_disconnected.bind(this));
    this.gateway_server.on('connected', this.gateway_server_connected.bind(this));
    this.ota_server.on('connected', this.ota_server_connected.bind(this));
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
    this.nwk_server.confirmation_timeout_interval = INITIAL_CONFIRMATION_TIMEOUT;
    this.init_state_machine_timer = setTimeout(function() {
        this.init_state_machine();
    }.bind(this), INIT_STATE_MACHINE_STARTUP_DELAY);
};

SocketInterface.prototype.nwk_server_disconnected = function() {
    logger.info('nwk_server_disconnected');
    clearTimeout(this.init_state_machine_timer);
    this.init_state_machine_timer = undefined;
    this.init_state_machine(false, null);
    DS.network_status.state = ZIGBEE_NETWORK_STATE_UNAVAILABLE;
};

SocketInterface.prototype.init_state_machine = function() {
    this.init_state_machine(false, null);
};

SocketInterface.prototype.gateway_server_connected = function() {
    logger.info('gateway_server_connected');
    this.gateway_server.confirmation_timeout_interval = INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.ota_server_connected = function() {
    logger.info('ota_server_connected');
    this.ota_server.confirmation_timeout_interval = INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.init_state_machine = function(timed_out, arg) {
    if (!this.nwk_server.connected)
    {
        this.state = 4;
    }
    else if ((!timed_out) || (this.state == 0))
    {
        this.state++;
    }
    logger.info('Init state ' + this.state);
};

module.exports = SocketInterface;