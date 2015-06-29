'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../../logger');
var logger = Logger.getLogger('engine:' + module_name);

var when = require('when');

var Const = require('../../../constants');
var Protocol = require('../../../protocol');
var Common = require('../../../common');

var factory = function(proxy) {
    var engine = {};

    engine.process_zigbee_nwk_ready_ind = function(msg) {
        return Common.process_gateway_custom_ind(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND,
            'NWK_ZIGBEE_NWK_READY_IND',
            'process_zigbee_nwk_ready_ind',
            logger
        );
    };

    engine.send_zigbee_nwk_info_request = function() {
        var msg = new Protocol.NWKMgr.NwkZigbeeNwkInfoReq();
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_zigbee_nwk_info_request: Sending NWK_ZIGBEE_NWK_INFO_REQ');

        return proxy.send(pkt);
    };

    engine.process_zigbee_nwk_info_cnf = function(msg) {
        return Common.process_gateway_custom_cnf(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF,
            'NWK_ZIGBEE_NWK_INFO_CNF',
            'process_zigbee_nwk_info_cnf',
            logger
        );
    };

    engine.send_set_permit_join_request = function(joinType, joinTime) {
        var msg = new Protocol.NWKMgr.NwkSetPermitJoinReq();
        msg.permitJoin = joinType;
        msg.permitJoinTime = joinTime;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_set_permit_join_request: Sending NWK_SET_PERMIT_JOIN_REQ');

        return proxy.send(pkt);
    };

    engine.process_set_permit_join_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_set_permit_join_cnf', logger);
    };

    engine.send_manage_periodic_mto_route_request = function(mode) {
        var msg = new Protocol.NWKMgr.NwkManagePeriodicMtoRouteReq();
        msg.mode = mode;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_manage_periodic_mto_route_request: Sending NWK_MANAGE_PERIODIC_MTO_ROUTE_REQ');

        return proxy.send(pkt);
    };

    engine.process_manage_periodic_mto_route_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_manage_periodic_mto_route_cnf', logger);
    };

    engine.send_get_neighbor_table_request = function(dstAddr, startIndex) {
        var msg = new Protocol.NWKMgr.NwkGetNeighborTableReq();
        msg.dstAddr = dstAddr;
        msg.startIndex = startIndex;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_get_neighbor_table_request: Sending NWK_GET_NEIGHBOR_TABLE_REQ');

        return proxy.send(pkt);
    };

    engine.process_get_neighbor_table_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_manage_periodic_mto_route_cnf', logger);
    };

    engine.process_get_neighbor_table_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.NWK_GET_NEIGHBOR_TABLE_RSP_IND) {
            var str = 'process_get_neighbor_table_rsp_ind: Expected NWK_GET_NEIGHBOR_TABLE_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_get_neighbor_table_rsp_ind: success');
        }
        else {
            logger.info('process_get_neighbor_table_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_get_neighbor_table_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_get_routing_table_request = function(dstAddr, startIndex) {
        var msg = new Protocol.NWKMgr.NwkGetRoutingTableReq();
        msg.dstAddr = dstAddr;
        msg.startIndex = startIndex;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_get_routing_table_request: Sending NWK_GET_ROUTING_TABLE_REQ');

        return proxy.send(pkt);
    };

    engine.process_get_routing_table_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_get_routing_table_cnf', logger);
    };

    engine.process_get_routing_table_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.NWK_GET_ROUTING_TABLE_RSP_IND) {
            var str = 'process_get_routing_table_rsp_ind: Expected NWK_GET_ROUTING_TABLE_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_get_routing_table_rsp_ind: success');
        }
        else {
            logger.info('process_get_routing_table_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_get_routing_table_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_change_nwk_key_request = function(newKey) {
        var msg = new Protocol.NWKMgr.NwkChangeNwkKeyReq();
        if (newKey) {
            msg.newKey = newKey;
        }
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_change_nwk_key_request: Sending NWK_CHANGE_NWK_KEY_REQ');

        return proxy.send(pkt);
    };

    engine.process_change_nwk_key_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_change_nwk_key_cnf', logger);
    };

    engine.send_get_nwk_key_request = function() {
        var msg = new Protocol.NWKMgr.NwkGetNwkKeyReq();
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_get_nwk_key_request: Sending NWK_GET_NWK_KEY_REQ');

        return proxy.send(pkt);
    };

    engine.process_get_nwk_key_cnf = function(msg) {
        return Common.process_gateway_custom_cnf(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_NWK_KEY_CNF,
            'NWK_GET_NWK_KEY_CNF',
            'process_get_nwk_key_cnf',
            logger
        );
    };

    return engine;
};

module.exports = factory;