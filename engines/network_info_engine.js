'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Const = require('../constants');
var DS = require('../data_structures');
var Protocol = require('../protocol.js');

var network_info = {};

network_info.process_nwk_ready_ind = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND) {
        logger.warn('process_nwk_ready_ind: Expected NWK_ZIGBEE_NWK_READY_IND');
        return;
    }
    logger.info('process_nwk_ready_ind');

    DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
    DS.network_status.nwk_channel = msg.nwkChannel;
    DS.network_status.pan_id = msg.panId;
    DS.network_status.ext_pan_id = msg.extPanId;
    DS.network_status.permit_remaining_time = 0x0;
    DS.network_status.num_pending_attribs = 0x0;

    //ui_refresh_display();
};

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

    return this.si.send_packet(pkt, network_info.process_nwk_info_cnf);
};

network_info.process_nwk_info_cnf = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
        logger.warn('process_nwk_info_cnf: Expected NWK_ZIGBEE_NWK_INFO_CNF');
        return;
    }

    // Update network info structure with received information
    if (msg.status == Protocol.NWKMgr.nwkNetworkStatus_t.NWK_UP) {
        DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
        DS.network_status.nwk_channel = msg.nwkChannel;
        DS.network_status.pan_id = msg.panId;
        DS.network_status.ext_pan_id = msg.extPanId;

        logger.info('process_nwk_info_cnf: Network ready');
    }
    else {
        DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;

        logger.info('process_nwk_info_cnf: Network down');
    }

    //ui_refresh_display();
};

module.exports = function(si) {
    network_info.si = si;
    return network_info;
};