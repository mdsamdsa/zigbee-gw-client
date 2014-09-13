'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Const = require('../constants');
var Protocol = require('../protocol.js');

var group_scene = {};

group_scene.send_get_group_membership_request = function(address, callback) {
    var msg = new Protocol.GatewayMgr.GwGetGroupMembershipReq();
    msg.dstAddress = address;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_group_membership_request: Sending GW_GET_GROUP_MEMBERSHIP_REQ');

    if (typeof callback == 'undefined')
        callback = group_scene.process_get_group_membership_cnf;

    return this.proxy.send_packet(pkt, callback);
};

group_scene.process_get_group_membership_cnf = function(msg) {
    if (typeof msg == 'string') {
        logger.warn('process_get_group_membership_cnf: ' + msg);
        return false;
    }
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_CNF) {
        logger.warn('process_get_group_membership_cnf: Expected ZIGBEE_GENERIC_CNF');
        return false;
    }

    // Update network info structure with received information
    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_group_membership_cnf: success');
    }
    else {
        group_scene.pan.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;

        logger.info('process_get_group_membership_cnf: failure');
    }

    return true;
};

group_scene.process_get_group_membership_rsp_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_GROUP_MEMBERSHIP_RSP_IND) {
        logger.warn('process_get_group_membership_rsp_ind: Expected GW_GET_GROUP_MEMBERSHIP_RSP_IND');
        return false;
    }
    logger.info('process_get_group_membership_rsp_ind');

    return true;
};

module.exports = function(proxy, pan) {
    group_scene.proxy = proxy;
    group_scene.pan = pan;
    return group_scene;
};