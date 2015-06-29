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

    engine.send_zigbee_system_reset_request = function (mode) {
        var msg = new Protocol.NWKMgr.NwkZigbeeSystemResetReq();
        msg.mode = mode;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_zigbee_system_reset_request: Sending NWK_ZIGBEE_SYSTEM_RESET_REQ');

        return proxy.send(pkt);
    };

    engine.process_zigbee_system_reset_cnf = function (msg) {
        return Common.process_gateway_custom_cnf(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_SYSTEM_RESET_CNF,
            'NWK_ZIGBEE_SYSTEM_RESET_CNF',
            'process_zigbee_system_reset_cnf',
            logger
        );
    };

    engine.send_zigbee_system_self_shutdown_request = function () {
        var msg = new Protocol.NWKMgr.NwkZigbeeSystemSelfShutdownReq();
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_zigbee_system_self_shutdown_request: Sending NWK_ZIGBEE_SYSTEM_SELF_SHUTDOWN_REQ');

        return proxy.send(pkt);
    };

    engine.send_set_zigbee_power_mode_request = function (powerMode) {
        var msg = new Protocol.NWKMgr.NwkSetZigbeePowerModeReq();
        msg.mode = powerMode;
        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.NWKMgr.zStackNwkMgrSysId_t.NWK_SET_ZIGBEE_POWER_MODE_REQ;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_zigbee_system_reset_request: Sending NWK_ZIGBEE_SYSTEM_RESET_REQ');

        return proxy.send(pkt);
    };

    engine.process_set_zigbee_power_mode_cnf = function (msg) {
        return Common.process_gateway_custom_cnf(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_SET_ZIGBEE_POWER_MODE_CNF,
            'NWK_SET_ZIGBEE_POWER_MODE_CNF',
            'process_set_zigbee_power_mode_cnf',
            logger
        );
    };

    engine.send_get_local_device_info_request = function () {
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

        return proxy.send(pkt);
    };

    engine.process_get_local_device_info_cnf = function (msg) {
        return Common.process_gateway_custom_cnf(
            msg,
            Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF,
            'NWK_GET_LOCAL_DEVICE_INFO_CNF',
            'process_get_local_device_info_cnf',
            logger
        );
    };

    return engine;
};

module.exports = factory;