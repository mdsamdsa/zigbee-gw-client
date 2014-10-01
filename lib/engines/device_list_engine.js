'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var when = require('when');

var Protocol = require('../../protocol');
var Common = require('../../common');

var device_list = {};

var GATEWAY_MANAGEMENT_ENDPOINT = 2;

device_list.gateway_self_addr = {
    ieee_addr: undefined,
    endpoint: undefined,
    groupaddr: undefined
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

    return device_list.proxy.send(pkt);
};

device_list.process_get_local_device_info_cnf = function (msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF) {
        var str = 'process_get_local_device_info_cnf: Expected NWK_GET_LOCAL_DEVICE_INFO_CNF';
        logger.warn(str);
        return when.reject(new Error(str));
    }
    logger.info('process_get_local_device_info_cnf');

    device_list.gateway_self_addr.ieee_addr = msg.deviceInfo.ieeeAddress;
    device_list.gateway_self_addr.endpoint = GATEWAY_MANAGEMENT_ENDPOINT;

    device_list.pan.update_device(msg.deviceInfo);

    return when.resolve(msg);
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

    return device_list.proxy.send(pkt);
};

device_list.process_get_device_list_cnf = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF) {
        var str = 'process_get_device_list_cnf: Expected NWK_GET_DEVICE_LIST_CNF';
        logger.warn(str);
        return when.reject(new Error(str));
    }

    if (msg.status == Protocol.NWKMgr.nwkStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_device_list_cnf: Status SUCCESS.');
        logger.info('process_get_device_list_cnf: Total Devices ' + msg.deviceList.length);

        for (var i = 0; i < msg.deviceList.length; i++) {
            device_list.pan.update_device(msg.deviceList[i]);
        }
    }
    else {
        return when.reject(new Common.ZigbeeGWError('process_get_device_list_cnf: ' + Common.status_toString(msg.status), msg.status));
    }

    return when.resolve(msg);
};

device_list.process_zigbee_device_ind = function(msg) {
    if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_DEVICE_IND) {
        logger.warn('process_zigbee_device_ind: Expected NWK_ZIGBEE_DEVICE_IND');
        return false;
    }
    logger.info('process_zigbee_device_ind');

    /* Update device info in the device list */
    device_list.pan.update_device(msg.deviceInfo);

    return true;
};

module.exports = function(proxy, pan) {
    device_list.proxy = proxy;
    device_list.pan = pan;
    return device_list;
};