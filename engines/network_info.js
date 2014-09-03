'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Protocol = require('../protocol.js');

var network_info = {};

network_info.nwk_send_info_request = function() {
    var msg = new Protocol.NWKMgr.NwkGetLocalDeviceInfoReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('nwk_send_info_request: Sending NWK_INFO_REQ');

    this.si.send_packet(pkt);

    /*
        if (si_send_packet(pkt, (confirmation_processing_cb_t)&nwk_process_info_cnf, NULL) != 0)
        {
            UI_PRINT_LOG("nwk_send_info_request: Error: Could not send msg");
        }

        free(pkt);
    }*/
};

module.exports = function(si) {
    network_info.si = si;
    return network_info;
};