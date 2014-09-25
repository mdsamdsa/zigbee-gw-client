'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var when = require('when');

var Protocol = require('../../protocol');

var attribute = {};

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