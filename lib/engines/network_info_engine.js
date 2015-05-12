'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var when = require('when');

var Const = require('../../constants');
var Protocol = require('../../protocol');

var network_info = {};

network_info.send_nwk_info_request = function() {
    var msg = new Protocol.NWKMgr.NwkZigbeeNwkInfoReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_nwk_info_request: Sending NWK_ZIGBEE_NWK_INFO_REQ');

    return network_info.proxy.send(pkt);
};

network_info.process_nwk_info_cnf = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
        var str = 'process_nwk_info_cnf: Expected NWK_ZIGBEE_NWK_INFO_CNF';
        logger.warn(str);
        return when.reject(new Error(str));
    }

    return when.resolve(msg);
};

network_info.process_nwk_ready_ind = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
        logger.warn('process_nwk_ready_ind: Expected NWK_ZIGBEE_NWK_READY_IND');
        return false;
    }
    logger.info('process_nwk_ready_ind');

    return when.resolve(msg);
};

module.exports = function(proxy) {
    network_info.proxy = proxy;
    return network_info;
};