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

device_list.process_get_device_list_cnf = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF) {
        logger.warn('process_get_device_list_cnf: Expected NWK_GET_DEVICE_LIST_CNF');
        return;
    }

    if (msg.status == Protocol.NWKMgr.nwkStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_device_list_cnf: Status SUCCESS.');
        logger.info('process_get_device_list_cnf: Total Devices ' + msg.deviceList.length);

        for (var i = 0; i < msg.deviceList.length; i++) {
            DS.device_table.update_device_table_entry(msg.deviceList[i]);
        }

        //ui_refresh_display();
    }
    else {
        logger.info('process_get_device_list_cnf: Error: Status FAILURE.');
    }
};

device_list.process_get_local_device_info_cnf = function (msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF) {
        logger.warn('process_get_local_device_info_cnf: Expected NWK_GET_LOCAL_DEVICE_INFO_CNF');
        return;
    }
    logger.info('process_get_local_device_info_cnf');

    device_list.gateway_self_addr.ieee_addr = msg.deviceInfoList.ieeeAddress;
    device_list.gateway_self_addr.endpoint = GATEWAY_MANAGEMENT_ENDPOINT;

    DS.device_table.update_device_table_entry(msg.deviceInfoList);

    //ui_refresh_display();
};

device_list.process_zigbee_device_ind = function(pkt) {
    if (pkt.header.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_DEVICE_IND) {
        return;
    }

    logger.info('process_zigbee_device_ind: Received NWK_ZIGBEE_DEVICE_IND');

    try {
        var msg = Protocol.NWKMgr.NwkZigbeeDeviceInd.decode(pkt.packet);
    }
    catch(err) {
        logger.warn('process_zigbee_device_ind: Error Could not unpack msg');
        return;
    }

    /* Update device info in the device list */

    var index = DS.device_table.get_index_entry(msg.deviceInfo);
    DS.device_table.update_device_table_entry(msg.deviceInfo);

    if (index != -1) {
        logger.info('process_zigbee_device_ind: Found existing entry');
    } else {
        logger.info('process_zigbee_device_ind: Adding new entry');
    }
    if (msg.deviceInfo.deviceStatus == Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED) {
        logger.info('process_zigbee_device_ind: Device removed');
    }

    //ui_refresh_display();
};

device_list.send_get_device_list_request = function() {
    var msg = new Protocol.NWKMgr.NwkGetDeviceListReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_device_list_request: Sending NWK_GET_DEVICE_LIST_REQ');

    return this.si.send_packet(pkt, device_list.process_get_device_list_cnf);
};

device_list.send_get_local_device_info_request = function() {
    var msg = new Protocol.NWKMgr.NwkGetLocalDeviceInfoReq();
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_local_device_info_request: Sending NWK_GET_LOCAL_DEVICE_INFO_REQ');

    return this.si.send_packet(pkt, device_list.process_get_local_device_info_cnf);
};

module.exports = function(si) {
    device_list.si = si;
    return device_list;
};