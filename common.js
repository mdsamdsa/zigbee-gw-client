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
        logger.info(name + ': failure');
    }

    return when.resolve(msg);
};


Common.process_gateway_generic_rsp_ind = function(msg, name, logger) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_RSP_IND) {
        logger.warn(name + ': Expected ZIGBEE_GENERIC_RSP_IND');
        return when.reject(new Error(name +': Expected ZIGBEE_GENERIC_RSP_IND'));
    }
    logger.info(name);

    return when.resolve(msg);
};

Common.print_list = function(arr) {
    var str = '';
    for(var i=0; i<arr.length; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += arr[i];
    }
    return str;
};

module.exports = Common;