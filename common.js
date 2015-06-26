'use strict';

var when = require('when');

var Protocol = require('./protocol');

var Common = {};

Common.packet_max_length = 32;

Common.print_packet_to_log = function(logger, str, pkt, buffer) {
    logger.info(str + 'len=' + pkt.header.len + ', type=' + (pkt.header.subsystem >> 5) +', subsystem=' + (pkt.header.subsystem & 0x1f) + ', cmdId=' + pkt.header.cmdId);
    var hex = buffer.toHex();
    logger.debug('Raw: ' + hex.substr(0, Common.packet_max_length * 2) + ((hex.length > Common.packet_max_length * 2)?'...':''));
};

function ZigbeeGWError (message, status, msg) {
    Error.call(this);
    this.message = message;
    this.name = ZigbeeGWError.name;
    this.status = status;
    this.msg = msg;
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(this, ZigbeeGWError);
    }
}

ZigbeeGWError.prototype = Object.create(Error.prototype);
ZigbeeGWError.prototype.constructor = ZigbeeGWError;

Common.ZigbeeGWError = ZigbeeGWError;

function ZigbeeAttributeError (message, status, msg) {
    Error.call(this);
    this.message = message;
    this.name = ZigbeeAttributeError.name;
    this.status = status;
    this.msg = msg;
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(this, ZigbeeAttributeError);
    }
}

ZigbeeAttributeError.prototype = Object.create(Error.prototype);
ZigbeeAttributeError.prototype.constructor = ZigbeeAttributeError;

Common.ZigbeeAttributeError = ZigbeeAttributeError;

Common.process_gateway_generic_cnf = function(msg, name, logger) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_CNF) {
        logger.warn(name +': Expected ZIGBEE_GENERIC_CNF');
        return when.reject(new Error(name +': Expected ZIGBEE_GENERIC_CNF'));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info(name + ': success');
        logger.info('sequenceNumber: ' + msg.sequenceNumber);
    }
    else {
        logger.info(name + ': failure - status: ' + msg.status);
        return when.reject(new ZigbeeGWError(name + ': ' + Common.status_toString(msg.status), msg.status));
    }

    return when.resolve(msg);
};

Common.process_gateway_generic_rsp_ind = function(msg, name, logger) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_RSP_IND) {
        logger.warn(name + ': Expected ZIGBEE_GENERIC_RSP_IND');
        return when.reject(new Error(name +': Expected ZIGBEE_GENERIC_RSP_IND'));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info(name + ': success');
        logger.info('sequenceNumber: ' + msg.sequenceNumber);
    }
    else {
        logger.info(name + ': failure - status: ' + msg.status);
        return when.reject(new ZigbeeGWError(name + ': ' + Common.status_toString(msg.status), msg.status));
    }

    return when.resolve(msg);
};

Common.process_gateway_custom_cnf = function(msg, cmdId, cmdName, name, logger, func) {
    if (msg.cmdId != cmdId) {
        var str = name +': Expected ' + cmdName;
        logger.warn(str);
        return when.reject(new Error(str));
    }

    if (msg.status) {
        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info(name + ': success');
        }
        else {
            logger.info(name + ': failure - status: ' + msg.status);
            return when.reject(new ZigbeeGWError(name + ': ' + Common.status_toString(msg.status), msg.status));
        }
    }

    if (func) {
        var res = func();
        if (res) {
            return res;
        }
    }

    return when.resolve(msg);
};

var status_string = ['SUCCESS', 'FAILURE', 'BUSY', 'INVALID_PARAMETER', 'TIMEOUT'];

Common.status_toString = function(status) {
    return status_string[status];
};

Common.statusAttribute_toString = function(status) {
    switch(status) {
        case 0x88: return 'READ_ONLY';
        default: throw new Error('TODO: statusAttribute_toString - Unknown status 0x' + dataType.toString(16));
    }
};

Common.list_toString = function(arr) {
    var str = '';
    for(var i=0; i<arr.length; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += arr[i];
    }
    return str;
};

Common.byteBuffer_toArray = function(buffer) {
    var arr = [];
    while(buffer.remaining()) {
        arr.push(buffer.readByte());
    }
    return arr;
};

module.exports = Common;