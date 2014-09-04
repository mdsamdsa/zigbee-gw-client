'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var DS = require('../data_structures');
var Protocol = require('../protocol.js');

var device_list = {};

var GATEWAY_MANAGEMENT_ENDPOINT = 2;

device_list.gateway_self_addr = {
    ieee_addr: undefined,
    endpoint: undefined,
    groupaddr: undefined
};

device_list.device_process_list_response = function(pkt, arg) {
    if (pkt.header.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF) {
        return;
    }

    logger.info('device_process_list_response: Received NWK_GET_DEVICE_LIST_CNF');

    try {
        var msg = Protocol.NWKMgr.NwkGetDeviceListCnf.decode(pkt.packet);
    }
    catch(err) {
        logger.warn('device_process_list_response: Error Could not unpack msg');
        return;
    }

    if (msg.status == Protocol.NWKMgr.nwkStatus_t.STATUS_SUCCESS) {
        logger.info('device_process_list_response: Status SUCCESS.');

        logger.info('device_process_list_response: Total Devices ' + msg.deviceList.length);

        for (var i = 0; i < msg.deviceList.length; i++) {
            DS.device_table.update_device_table_entry(msg.deviceList[i]);
        }

        //ui_refresh_display();
    }
    else {
        logger.info('device_process_list_response: Error: Status FAILURE.');
    }
};

device_list.device_process_local_info_response = function (pkt, arg) {
    if (pkt.header.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF) {
        return;
    }

    logger.info('device_process_local_info_response: Received NWK_GET_LOCAL_DEVICE_INFO_CNF');

    try {
        var msg = Protocol.NWKMgr.NwkGetLocalDeviceInfoCnf.decode(pkt.packet);
    }
    catch(err) {
        logger.warn('device_process_local_info_response: Error Could not unpack msg');
        return;
    }

    device_list.gateway_self_addr.ieee_addr = msg.deviceInfoList.ieeeAddress;
    device_list.gateway_self_addr.endpoint = GATEWAY_MANAGEMENT_ENDPOINT;

    DS.device_table.update_device_table_entry(msg.deviceInfoList);

    //ui_refresh_display();
};

device_list.device_send_list_request = function() {
    var msg = new Protocol.NWKMgr.NwkGetDeviceListReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('device_send_list_request: Sending NWK_GET_DEVICE_LIST_REQ');

    this.si.send_packet(pkt, device_list.device_process_list_response);
};

device_list.device_send_local_info_request = function() {
    var msg = new Protocol.NWKMgr.NwkGetLocalDeviceInfoReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('device_send_local_device_info_request: Sending NWK_GET_LOCAL_DEVICE_INFO_REQ');

    this.si.send_packet(pkt, device_list.device_process_local_info_response);
};

module.exports = function(si) {
    device_list.si = si;
    return device_list;
};