'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Protocol = require('../../protocol');
var Common = require('../../common');

var group_scene = {};

group_scene.send_get_group_membership_request = function(address) {
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

    return this.proxy.send(pkt);
};

group_scene.process_get_group_membership_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_get_group_membership_cnf', logger);
};

group_scene.process_get_group_membership_rsp_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_GROUP_MEMBERSHIP_RSP_IND) {
        logger.warn('process_get_group_membership_rsp_ind: Expected GW_GET_GROUP_MEMBERSHIP_RSP_IND');
        return when.reject(new Error('process_get_group_membership_rsp_ind: Expected GW_GET_GROUP_MEMBERSHIP_RSP_IND'));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_group_membership_rsp_ind: success');
        var endpoint = group_scene.pan.get_endpoint(msg.srcAddress);
        if (typeof endpoint == 'undefined') {
            logger.info('process_get_group_membership_rsp_ind: endpoint not found');
        } else {
            endpoint.updateGroups(msg.groupList);
        }
    }
    else {
        logger.info('process_get_group_membership_rsp_ind: failure');
        return when.reject(new Error('process_get_group_membership_rsp_ind: status - ' + msg.status));
    }

    return when.resolve(msg);
};

group_scene.send_add_group_request = function(address, groupId, groupName) {
    var msg = new Protocol.GatewayMgr.GwAddGroupReq();
    msg.dstAddress = address;
    msg.groupId = groupId;
    msg.groupName = groupName;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_add_group_request: Sending GW_ADD_GROUP_REQ');

    return this.proxy.send(pkt);
};

group_scene.process_add_group_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_add_group_cnf', logger);
};

group_scene.process_add_group_rsp_ind = function(msg) {
    return Common.process_gateway_generic_rsp_ind(msg, 'process_add_group_rsp_ind', logger);
};

group_scene.send_remove_from_group_request = function(address, groupId) {
    var msg = new Protocol.GatewayMgr.GwRemoveFromGroupReq();
    msg.dstAddress = address;
    msg.groupId = groupId;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_remove_from_group_request: Sending GW_REMOVE_FROM_GROUP_REQ');

    return this.proxy.send(pkt);
};

group_scene.process_remove_from_group_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_remove_from_group_cnf', logger);
};

group_scene.process_remove_from_group_rsp_ind = function(msg) {
    return Common.process_gateway_generic_rsp_ind(msg, 'process_remove_from_group_rsp_ind', logger);
};



group_scene.send_get_scene_membership_request = function(address, groupId) {
    var msg = new Protocol.GatewayMgr.GwGetSceneMembershipReq();
    msg.dstAddress = address;
    msg.groupId = groupId;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_scene_membership_request: Sending GW_GET_SCENE_MEMBERSHIP_REQ');

    return this.proxy.send(pkt);
};

group_scene.process_get_scene_membership_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_get_scene_membership_cnf', logger);
};

group_scene.process_get_scene_membership_rsp_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_SCENE_MEMBERSHIP_RSP_IND) {
        logger.warn('process_get_scene_membership_rsp_ind: Expected GW_GET_SCENE_MEMBERSHIP_RSP_IND');
        return when.reject(new Error('process_get_scene_membership_rsp_ind: Expected GW_GET_SCENE_MEMBERSHIP_RSP_IND'));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_group_membership_rsp_ind: success');
        var endpoint = group_scene.pan.get_endpoint(msg.srcAddress);
        msg.sceneList = Common.byteBuffer_toArray(msg.sceneList);
        if (typeof endpoint == 'undefined') {
            logger.info('process_get_scene_membership_rsp_ind: endpoint not found');
        } else {
            if (typeof endpoint.scenes == 'undefined') {
                endpoint.scenes = [];
            }
            endpoint.updateScenes(msg.groupId, msg.sceneList);
        }
    }
    else {
        logger.info('process_get_group_membership_rsp_ind: failure');
        return when.reject(new Error('process_get_group_membership_rsp_ind: status - ' + msg.status));
    }

    return when.resolve(msg);
};

group_scene.send_recall_scene_request = function(address, groupId, sceneId) {
    var msg = new Protocol.GatewayMgr.GwRecallSceneReq();
    msg.dstAddress = address;
    msg.groupId = groupId;
    msg.sceneId = sceneId;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_recall_scene_request: Sending GW_RECALL_SCENE_REQ');

    return this.proxy.send(pkt);
};

module.exports = function(proxy, pan) {
    group_scene.proxy = proxy;
    group_scene.pan = pan;
    return group_scene;
};