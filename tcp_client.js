'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var net = require('net');
var EventEmitter = require('events').EventEmitter;
var Dissolve = require('dissolve');
var ByteBuffer = require('bytebuffer');

var Common = require('./common');

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

    this.socket.on('connect', this.socket_connect.bind(this));
    this.socket.on('close', this.socket_close.bind(this));
    this.socket.on('end', this.socket_end.bind(this));
    this.socket.on('timeout', this.socket_timeout.bind(this));
    this.socket.on('error', this.socket_error.bind(this));
    this.socket.on('data', this.socket_data.bind(this));

    this.parser = this._create_parser();

    process.nextTick(function(){});
};

TcpServerConnection.prototype.socket_connect = function() {
    this.connected = true;
    this.socket.setTimeout(0);
    logger.info(this.name + ' connected');
    this.emit('connected', this);
};

TcpServerConnection.prototype.socket_close = function(had_error) {
    this.connected = false;
    logger.info(this.name + ' disconnected' + ((had_error)?' had error':''));
    this.emit('disconnected', this);
};

TcpServerConnection.prototype.socket_end = function() {
    logger.info(this.name + ' end');
};

TcpServerConnection.prototype.socket_timeout = function() {
    logger.info(this.name + ' timeout');
    if (!this.connected) {
        this.socket.destroy();
        this.emit('error', new Error("Connect timeout"));
        if (this.reconnect) {
            setTimeout(this._reconnect.bind(this), this.reconnectDelay);
        }
    }
};

TcpServerConnection.prototype.socket_error = function(error) {
    logger.error(this.name + ' error: ' + error);
    if (!this.connected) {
        this.socket.destroy();
        if (this.reconnect) {
            setTimeout(this._reconnect.bind(this), this.reconnectDelay);
        }
    }
    this.emit('error', error);
};

TcpServerConnection.prototype.socket_data =  function(chunk) {
    this.parser.write(chunk);
};

TcpServerConnection.prototype._create_parser = function() {
    var parser = Dissolve().loop(function() {
        this
            .uint16le('len')
            .uint8('subsystem')
            .uint8('cmdId')
            .buffer('packet', 'len')
            .tap(function() {
                //noinspection JSPotentiallyInvalidUsageOfThis
                this.push(this.vars);
                //noinspection JSPotentiallyInvalidUsageOfThis
                this.vars = {};
            });
    });
    // setup handler for incoming parsed packets
    parser.on('data', this._handleIncomingData.bind(this));
    return parser;
};

TcpServerConnection.prototype._handleIncomingData = function(_pkt) {
    var pkt = {
        header: {
            len: _pkt.len,
            subsystem: _pkt.subsystem,
            cmdId: _pkt.cmdId
        },
        packet: _pkt.packet
    };

    var buffer = new ByteBuffer();
    buffer.littleEndian = true;
    buffer.writeUint16(pkt.header.len)
        .writeUint8(pkt.header.subsystem)
        .writeUint8(pkt.header.cmdId)
        .append(pkt.packet).flip();

    Common.print_packet_to_log(logger, 'received from ' + this.name + ': ', pkt, buffer);
    this.emit('packet', pkt);
};

TcpServerConnection.prototype.send = function(pkt) {
    var buffer = new ByteBuffer();
    buffer.littleEndian = true;
    buffer.writeUint16(pkt.header.len)
        .writeUint8(pkt.header.subsystem)
        .writeUint8(pkt.header.cmdId)
        .append(pkt.packet)
        .flip();

    Common.print_packet_to_log(logger, 'sent to ' + this.name + ': ', pkt, buffer);
    this.socket.write(buffer.toBuffer());
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
