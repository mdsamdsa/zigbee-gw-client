'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../../logger');
var logger = Logger.getLogger('engine:' + module_name);

var when = require('when');

var Protocol = require('../../../protocol');
var Common = require('../../../common');
var DataTypes = require('../../profile/DataTypes');

var factory = function(proxy) {
    var engine = {};

    engine.process_attribute_change_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_ATTRIBUTE_CHANGE_IND) {
            var str = 'process_attribute_change_ind: Expected GW_ATTRIBUTE_CHANGE_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_attribute_change_ind');

        return when.resolve(msg);
    };

    engine.send_get_device_attribute_list_request = function (address) {
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

        return proxy.send(pkt);
    };

    engine.process_get_device_attribute_list_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_get_device_attribute_list_cnf', logger);
    };

    engine.process_get_device_attribute_list_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND) {
            var str = 'process_get_device_attribute_list_rsp_ind: Expected GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_get_device_attribute_list_rsp_ind: success');
        }
        else {
            logger.info('process_get_device_attribute_list_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_get_device_attribute_list_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_read_device_attribute_request = function (address, clusterId, attributeList) {
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

        return proxy.send(pkt);
    };

    engine.process_read_device_attribute_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_read_device_attribute_cnf', logger);
    };

    engine.process_read_device_attribute_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_READ_DEVICE_ATTRIBUTE_RSP_IND) {
            var str = 'process_read_device_attribute_rsp_ind: Expected GW_READ_DEVICE_ATTRIBUTE_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        for (var i = 0; i < msg.attributeRecordList.length; i++) {
            var attr = msg.attributeRecordList[i];
            attr.Value = DataTypes.read(attr.attributeValue, attr.attributeType);
        }

        if ((msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) || (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_FAILURE && msg.attributeRecordList.length != 0)) {
            logger.info('process_read_device_attribute_rsp_ind: success');
        }
        else {
            logger.info('process_read_device_attribute_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_read_device_attribute_rsp_ind: ' + Common.status_toString(msg.status), msg.status, msg));
        }

        return when.resolve(msg);
    };

    engine.send_write_device_attribute_request = function (address, clusterId, attributeRecordList) {
        var msg = new Protocol.GatewayMgr.GwWriteDeviceAttributeReq();
        msg.dstAddress = address;
        msg.clusterId = clusterId;
        msg.attributeRecordList = attributeRecordList;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_write_device_attribute_request: Sending GW_WRITE_DEVICE_ATTRIBUTE_REQ');

        return proxy.send(pkt);
    };

    engine.process_write_device_attribute_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_write_device_attribute_cnf', logger);
    };

    engine.process_write_device_attribute_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND) {
            var str = 'process_write_device_attribute_rsp_ind: Expected GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_write_device_attribute_rsp_ind: success');
        }
        else {
            logger.info('process_write_device_attribute_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_write_device_attribute_rsp_ind: ' + Common.status_toString(msg.status), msg.status, msg));
        }

        return when.resolve(msg);
    };

    engine.send_set_attribute_reporting_request = function (address, clusterId) {
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

        return proxy.send(pkt);
    };

    engine.process_set_attribute_reporting_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_set_attribute_reporting_cnf', logger);
    };

    engine.process_set_attribute_reporting_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_SET_ATTRIBUTE_REPORTING_RSP_IND) {
            var str = 'process_set_attribute_reporting_rsp_ind: Expected GW_SET_ATTRIBUTE_REPORTING_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_set_attribute_reporting_rsp_ind: success');
        }
        else {
            logger.info('process_set_attribute_reporting_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_set_attribute_reporting_rsp_ind: ' + Common.status_toString(msg.status), msg.status, msg));
        }

        return when.resolve(msg);
    };

    engine.process_attribute_reporting_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_ATTRIBUTE_REPORTING_IND) {
            var str = 'process_attribute_reporting_ind: Expected GW_ATTRIBUTE_REPORTING_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_attribute_reporting_ind');

        return when.resolve(msg);
    };

    engine.send_zcl_frame_request = function(dstAddress, endpointIdSource, profileId, qualityOfService, securityOptions,
                                             clusterId, frameType, manufacturerSpecificFlag, manufacturerCode,
                                             clientServerDirection, disableDefaultRsp, sequenceNumber, commandId, payload) {
        var msg = new Protocol.GatewayMgr.GwSendZclFrameReq();
        msg.dstAddress = dstAddress;
        msg.endpointIdSource = endpointIdSource;
        msg.profileId = profileId;
        msg.qualityOfService = qualityOfService;
        msg.securityOptions = securityOptions;
        msg.clusterId = clusterId;
        msg.frameType = frameType;
        msg.manufacturerSpecificFlag = manufacturerSpecificFlag;
        msg.clientServerDirection = clientServerDirection;
        msg.disableDefaultRsp = disableDefaultRsp;
        msg.commandId = commandId;
        msg.payload = payload;
        if (typeof manufacturerCode != "undefined") {
            msg.manufacturerCode = manufacturerCode;
        }
        if (typeof sequenceNumber != "undefined") {
            msg.sequenceNumber = sequenceNumber;
        }
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_zcl_frame_request: Sending GW_SEND_ZCL_FRAME_REQ');

        return proxy.send(pkt);
    };

    engine.process_zcl_frame_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_zcl_frame_cnf', logger);
    };

    engine.process_zcl_frame_rsp_ind = function (msg) {
        return Common.process_gateway_generic_rsp_ind(msg, 'process_zcl_frame_rsp_ind', logger);
    };

    engine.process_zcl_frame_receive_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.GW_ZCL_FRAME_RECEIVE_IND) {
            var str = 'process_zcl_frame_receive_ind: Expected GW_ZCL_FRAME_RECEIVE_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_zcl_frame_receive_ind');

        return when.resolve(msg);
    };

    return engine;
};

module.exports = factory;