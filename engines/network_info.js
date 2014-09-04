'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Const = require('../constants');
var DS = require('../data_structures');
var Protocol = require('../protocol.js');

var network_info = {};

network_info.nwk_send_info_request = function() {
    var msg = new Protocol.NWKMgr.NwkZigbeeNwkInfoReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('nwk_send_info_request: Sending NWK_ZIGBEE_NWK_INFO_REQ');

    this.si.send_packet(pkt, network_info.nwk_process_info_cnf);

    /*
        if (si_send_packet(pkt, (confirmation_processing_cb_t)&nwk_process_info_cnf, NULL) != 0)
        {
            UI_PRINT_LOG("nwk_send_info_request: Error: Could not send msg");
        }

        free(pkt);
    }*/
};

network_info.nwk_process_info_cnf = function(pkt, arg) {
    //NwkZigbeeNwkInfoCnf *msg = NULL;

    if (pkt.header.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF) {
        return;
    }

    logger.info('nwk_process_info_cnf: Received NWK_ZIGBEE_NWK_INFO_CNF');

    try {
        //var msg1 = Protocol.NWKMgr.NwkGetLocalDeviceInfoCnf.decode(pkt.packet);
        var msg = Protocol.NWKMgr.NwkZigbeeNwkInfoCnf.decode(pkt.packet);
    }
    catch(err) {
        logger.warn('nwk_process_info_cnf: Error: Could not unpack msg');
        return;
    }

    logger.info('msg.status = ' + msg.status);

    // Update network info structure with received information
    if (msg.status == Protocol.NWKMgr.nwkNetworkStatus_t.NWK_UP) {
        DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_READY;
        DS.network_status.nwk_channel = msg.nwkChannel;
        DS.network_status.pan_id = msg.panId;
        DS.network_status.ext_pan_id = msg.extPanId;

        logger.info('nwk_process_info_cnf: Network ready');
    }
    else {
        DS.network_status.state = Const.NetworkState.ZIGBEE_NETWORK_STATE_INITIALIZING;
    }
    //ui_refresh_display();
};

module.exports = function(si) {
    network_info.si = si;
    return network_info;
};