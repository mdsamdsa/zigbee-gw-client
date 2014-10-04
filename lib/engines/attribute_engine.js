'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var when = require('when');

var Protocol = require('../../protocol');
var Common = require('../../common');
var DataTypes = require('../profile/DataTypes');

var attribute = {};

attribute.process_attribute_change_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_ATTRIBUTE_CHANGE_IND) {
        logger.warn('process_attribute_change_ind: Expected GW_ATTRIBUTE_CHANGE_IND');
        return false;
    }
    logger.info('process_attribute_change_ind');

    //TODO Update self attribute value

    return true;
};

attribute.send_get_device_attribute_list_request = function(address) {
    var msg = new Protocol.GatewayMgr.GwGetDeviceAttributeListReq();
    msg.dstAddress = address;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_device_attribute_list_request: Sending GW_GET_DEVICE_ATTRIBUTE_LIST_REQ');

    return attribute.proxy.send(pkt);
};

attribute.process_get_device_attribute_list_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_get_device_attribute_list_cnf', logger);
};

attribute.process_get_device_attribute_list_rsp_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND) {
        var str = 'process_get_device_attribute_list_rsp_ind: Expected GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND';
        logger.warn(str);
        return when.reject(new Error(str));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info('process_get_device_attribute_list_rsp_ind: success');
        var endpoint = attribute.pan.get_endpoint(msg.srcAddress);
        if (typeof endpoint == 'undefined') {
            logger.info('process_get_group_membership_rsp_ind: endpoint not found');
        } else {
            //TODO Update attribute list
        }
    }
    else {
        logger.info('process_get_device_attribute_list_rsp_ind: failure');
        return when.reject(new Common.ZigbeeGWError('process_get_device_attribute_list_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
    }

    return when.resolve(msg);
};

attribute.send_read_device_attribute_request = function(address, clusterId, attributeList) {
    var msg = new Protocol.GatewayMgr.GwReadDeviceAttributeReq();
    msg.dstAddress = address;
    msg.clusterId = clusterId;
    msg.attributeList = attributeList;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_read_device_attribute_request: Sending GW_READ_DEVICE_ATTRIBUTE_REQ');

    return attribute.proxy.send(pkt);
};

attribute.process_read_device_attribute_cnf = function(msg) {
    return Common.process_gateway_generic_cnf(msg, 'process_read_device_attribute_cnf', logger);
};

attribute.process_read_device_attribute_rsp_ind = function(msg) {
    if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_READ_DEVICE_ATTRIBUTE_RSP_IND) {
        var str = 'process_read_device_attribute_rsp_ind: Expected GW_READ_DEVICE_ATTRIBUTE_RSP_IND';
        logger.warn(str);
        return when.reject(new Error(str));
    }

    if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
        logger.info('process_read_device_attribute_rsp_ind: success');

        for(var i = 0; i < msg.attributeRecordList.length; i++) {
            var attr = msg.attributeRecordList[i];
            attr.Value = DataTypes.read(attr.attributeValue, attr.attributeType);
        }

        var endpoint = attribute.pan.get_endpoint(msg.srcAddress);
        if (typeof endpoint == 'undefined') {
            logger.info('process_read_device_attribute_rsp_ind: endpoint not found');
        } else {
            //TODO Update attribute value
        }
    }
    else {
        logger.info('process_read_device_attribute_rsp_ind: failure');
        return when.reject(new Common.ZigbeeGWError('process_read_device_attribute_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
    }

    return when.resolve(msg);
};

attribute.send_set_attribute_reporting_request = function(address, clusterId) {
    var msg = new Protocol.GatewayMgr.GwSetAttributeReportingReq();
    msg.dstAddress = address;
    msg.clusterId = clusterId;
    msg.attributeReportList = [];
    //noinspection JSPotentiallyInvalidConstructorUsage
    var rep = new Protocol.GatewayMgr.gwAttributeReport_t();
    msg.attributeReportList.push(rep);
    rep.attributeId = 0;
    rep.attributeType = 16;
    rep.minReportInterval = 15;
    rep.maxReportInterval = 60;
    var buf = msg.toBuffer();
    var len = buf.length;
    var pkt = {};
    pkt.header = {};
    pkt.header.len = len;
    pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
    pkt.header.cmdId = msg.cmdId;
    pkt.packet = buf;

    logger.info('send_get_local_device_info_request: Sending GW_SET_ATTRIBUTE_REPORTING_REQ');

    return attribute.proxy.send(pkt);
};

module.exports = function(proxy, pan) {
    attribute.proxy = proxy;
    attribute.pan = pan;
    return attribute;
};