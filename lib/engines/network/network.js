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
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
            var str = 'process_zigbee_nwk_ready_ind: Expected NWK_ZIGBEE_NWK_READY_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_zigbee_nwk_ready_ind');

        return when.resolve(msg);
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
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
            var str = 'process_zigbee_nwk_info_cnf: Expected NWK_ZIGBEE_NWK_INFO_CNF';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        return when.resolve(msg);
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

        logger.info('send_set_permit_join_request: Sending NwkSetPermitJoinReq');

        return proxy.send(pkt);
    };

    engine.process_set_permit_join_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_set_permit_join_cnf', logger);
    };

    return engine;
};

module.exports = factory;