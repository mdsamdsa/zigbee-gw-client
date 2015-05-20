'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger('engine/' + module_name);

var when = require('when');

var Const = require('../../../constants');
var Protocol = require('../../../protocol');
var Common = require('../../../common');

var factory = function(proxy) {
    var engine = {};

    engine.process_zigbee_device_ind = function(msg) {
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_DEVICE_IND) {
            var str = 'process_zigbee_device_ind: Expected NWK_ZIGBEE_DEVICE_IND';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_zigbee_device_ind');

        return when.resolve(msg);
    };

    engine.send_get_device_list_request = function() {
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

        return proxy.send(pkt);
    };

    engine.process_get_device_list_cnf = function(msg) {
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF) {
            var str = 'process_get_device_list_cnf: Expected NWK_GET_DEVICE_LIST_CNF';
            logger.warn(str);
            return when.reject(new Error(str));
        }

        if (msg.status == Protocol.NWKMgr.nwkStatus_t.STATUS_SUCCESS) {
            logger.info('process_get_device_list_cnf: Status SUCCESS.');
        }
        else {
            return when.reject(new Common.ZigbeeGWError('process_get_device_list_cnf: ' + Common.status_toString(msg.status), msg.status));
        }

        return when.resolve(msg);
    };

    engine.send_device_list_maintenance_request = function(address) {
        var msg = new Protocol.NWKMgr.NwkDeviceListMaintenanceReq();
        if (typeof address != 'undefined') {
            msg.dstAddr = address;
        }
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_get_device_list_request: Sending NWK_GET_DEVICE_LIST_REQ');

        return proxy.send(pkt);
    };

    engine.process_device_list_maintenance_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_device_list_maintenance_cnf', logger);
    };

    engine.send_remove_device_request = function(address, leaveMode) {
        var msg = new Protocol.NWKMgr.NwkRemoveDeviceReq();
        msg.dstAddr = address;
        msg.leaveMode = leaveMode;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_remove_device_request: Sending NWK_REMOVE_DEVICE_REQ');

        return proxy.send(pkt);
    };

    engine.process_remove_device_cnf = function (msg) {
        return Common.process_gateway_generic_cnf(msg, 'process_remove_device_cnf', logger);
    };

    return engine;
};

module.exports = factory;