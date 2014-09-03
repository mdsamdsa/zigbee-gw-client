'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var net = require('net');
var EventEmitter = require('events').EventEmitter;

function TcpServerConnection(name, host, port) {
    this.name = name;
    this.host = host;
    this.port = port;
    this.connected = false;
    this.connectTimeout = 5000;
    this.reconnectDelay = 1000;
}
util.inherits(TcpServerConnection, EventEmitter);

module.exports = TcpServerConnection;

TcpServerConnection.prototype.connect = function() {
    logger.info(this.name + ' connect');
    this.socket = net.connect(this.port, this.host);
    this.socket.setTimeout(this.connectTimeout);
    this.socket.unref();
    this.reconnect = true;

    this.socket.on('connect', function() {
        this.connected = true;
        this.socket.setTimeout(0);
        logger.info(this.name + ' connected');
        this.emit('connected', this);
    }.bind(this));

    this.socket.on('end', function() {
        logger.info(this.name + ' end');
    }.bind(this));

    this.socket.on('close', function(had_error) {
        this.connected = false;
        logger.info(this.name + ' close: ' + had_error);
        this.emit('disconnected', this);
    }.bind(this));

    this.socket.on('timeout', function() {
        logger.info(this.name + ' timeout');
        if (!this.connected) {
            this.socket.destroy();
            this.emit('error', new Error("Connect timeout"));
            setTimeout(this._reconnect.bind(this), this.reconnectDelay);
        }
    }.bind(this));

    this.socket.on('error', function(error) {
        logger.error(this.name + ' error: ' + error);
        if (!this.connected) {
            this.socket.destroy();
            setTimeout(this._reconnect.bind(this), this.reconnectDelay);
        }
        this.emit('error', error);
    }.bind(this));

    process.nextTick(function(){});
};

TcpServerConnection.prototype.disconnect = function() {
    logger.info(this.name + ' disconnect');
    this.reconnect = false;
    this.socket.destroy();
};

TcpServerConnection.prototype._reconnect = function() {
    if (this.reconnect) {
        logger.info(this.name + ' reconnecting');
        this.connect();
    }
};
