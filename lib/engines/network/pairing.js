'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../../logger');
var logger = Logger.getLogger('engine:' + module_name);

var when = require('when');

var Const = require('../../../constants');
var Protocol = require('../../../protocol');
var Common = require('../../../common');

var factory = function(proxy) {
    var engine = {};

    engine.send_set_binding_entry_request = function(srcAddr, clusterId, dstAddr, bindingMode) {
        var msg = new Protocol.NWKMgr.NwkGetNeighborTableReq();
        msg.srcAddr = srcAddr;
        msg.clusterId = clusterId;
        msg.dstAddr = dstAddr;
        msg.bindingMode = bindingMode;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_set_binding_entry_request: Sending NWK_SET_BINDING_ENTRY_REQ');

        return proxy.send(pkt);
    };

    engine.process_set_binding_entry_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_set_binding_entry_cnf', logger);
    };

    engine.process_set_binding_entry_rsp_ind = function (msg) {
        if (msg.cmdId != Protocol.GatewayMgr.gwCmdId_t.NWK_SET_BINDING_ENTRY_RSP_IND) {
            var str = 'process_set_binding_entry_rsp_ind: Expected NWK_SET_BINDING_ENTRY_RSP_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS) {
            logger.info('process_set_binding_entry_rsp_ind: success');
        }
        else {
            logger.info('process_set_binding_entry_rsp_ind: failure');
            return when.reject(new Common.ZigbeeGWError('process_set_binding_entry_rsp_ind: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    return engine;
};

module.exports = factory;