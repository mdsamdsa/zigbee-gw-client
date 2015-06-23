'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../../logger');
var logger = Logger.getLogger('engine/' + module_name);

var when = require('when');

var Protocol = require('../../../protocol');
var Common = require('../../../common');

var factory = function(proxy) {
    var engine = {};

    engine.send_get_group_membership_request = function (address) {
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

        return proxy.send(pkt);
    };

    engine.process_get_group_membership_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_get_group_membership_cnf', logger);
    };

    engine.process_get_group_membership_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_GROUP_MEMBERSHIP_RSP_IND) {
            var str = 'process_get_group_membership_rsp_ind: Expected GW_GET_GROUP_MEMBERSHIP_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_get_group_membership_rsp_ind: success');
        }
        else {
            logger.info('process_get_group_membership_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_get_group_membership_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_add_group_request = function (address, groupId, groupName) {
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

        return proxy.send(pkt);
    };

    engine.process_add_group_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_add_group_cnf', logger);
    };

    engine.process_add_group_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_add_group_rsp_ind', logger);
    };

    engine.send_remove_from_group_request = function (address, groupId) {
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

        return proxy.send(pkt);
    };

    engine.process_remove_from_group_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_remove_from_group_cnf', logger);
    };

    engine.process_remove_from_group_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_remove_from_group_rsp_ind', logger);
    };

    engine.send_get_scene_membership_request = function (address, groupId) {
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

        return proxy.send(pkt);
    };

    engine.process_get_scene_membership_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_get_scene_membership_cnf', logger);
    };

    engine.process_get_scene_membership_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_SCENE_MEMBERSHIP_RSP_IND) {
            var str = 'process_get_scene_membership_rsp_ind: Expected GW_GET_SCENE_MEMBERSHIP_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            msg.sceneList = Common.byteBuffer_toArray(msg.sceneList);
            logger.info('process_get_scene_membership_rsp_ind: success');
        }
        else {
            logger.info('process_get_scene_membership_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_get_scene_membership_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_store_scene_request = function (address, groupId, sceneId) {
        var msg = new Protocol.GatewayMgr.GwStoreSceneReq();
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

        logger.info('send_store_scene_request: Sending GW_STORE_SCENE_REQ');

        return proxy.send(pkt);
    };

    engine.process_store_scene_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_store_scene_cnf', logger);
    };

    engine.process_store_scene_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_store_scene_rsp_ind', logger);
    };

    engine.send_remove_scene_request = function (address, groupId, sceneId) {
        var msg = new Protocol.GatewayMgr.GwRemoveSceneReq();
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

        logger.info('send_remove_scene_request: Sending GW_REMOVE_SCENE_REQ');

        return proxy.send(pkt);
    };

    engine.process_remove_scene_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_remove_scene_cnf', logger);
    };

    engine.process_remove_scene_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_remove_scene_rsp_ind', logger);
    };

    engine.send_recall_scene_request = function (address, groupId, sceneId) {
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

        return proxy.send(pkt);
    };

    engine.process_recall_scene_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_recall_scene_cnf', logger);
    };

    engine.process_recall_scene_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_recall_scene_rsp_ind', logger);
    };

    return engine;
};

module.exports = factory;