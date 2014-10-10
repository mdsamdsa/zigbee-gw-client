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

    // Update network info structure with received information
    if (msg.status == Protocol.NWKMgr.nwkNetworkStatus_t.NWK_UP) {
        network_info.pan.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
        network_info.pan.network.nwk_channel = msg.nwkChannel;
        network_info.pan.network.pan_id = msg.panId;
        network_info.pan.network.ext_pan_id = msg.extPanId;
        network_info.pan.network.permit_remaining_time = 0x0;

        logger.info('process_nwk_info_cnf: Network ready');
    }
    else {
        network_info.pan.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;

        logger.info('process_nwk_info_cnf: Network down');
    }

    return when.resolve(msg);
};

network_info.process_nwk_ready_ind = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
        logger.warn('process_nwk_ready_ind: Expected NWK_ZIGBEE_NWK_READY_IND');
        return false;
    }
    logger.info('process_nwk_ready_ind');

    network_info.pan.network.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
    network_info.pan.network.nwk_channel = msg.nwkChannel;
    network_info.pan.network.pan_id = msg.panId;
    network_info.pan.network.ext_pan_id = msg.extPanId;
    network_info.pan.network.permit_remaining_time = 0x0;

    return true;
};

module.exports = function(proxy, pan) {
    network_info.proxy = proxy;
    network_info.pan = pan;
    return network_info;
};