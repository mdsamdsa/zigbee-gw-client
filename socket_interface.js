'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Const = require('./constants');
var TcpServerClient = require('./tcp_client');
var Protocol = require('./protocol');
var Common = require('./common');

var MsgType = {
    cnf: 1,
    ind: 2
};

function SocketInterface(nwk_host, nwk_port, gateway_host, gateway_port, ota_host, ota_port) {
    this.nwk_host = nwk_host;
    this.nwk_port = nwk_port;
    this.gateway_host = gateway_host;
    this.gateway_port = gateway_port;
    this.ota_host = ota_host;
    this.ota_port = ota_port;

    this.waiting_for_confirmation = false;

    this.nwk_server = new TcpServerClient('NWK_MGR', this.nwk_host, this.nwk_port);
    this.gateway_server = new TcpServerClient('GATEWAY', this.gateway_host, this.gateway_port);
    this.ota_server = new TcpServerClient('OTA_MGR', this.ota_host, this.ota_port);

    this.nwk_server.on('error', this.tcp_server_error);
    this.gateway_server.on('error', this.tcp_server_error);
    this.ota_server.on('error', this.tcp_server_error);

    this.nwk_server.on('connected', this.nwk_server_connected.bind(this));
    this.nwk_server.on('disconnected', this.nwk_server_disconnected.bind(this));
    this.gateway_server.on('connected', this.gateway_server_connected.bind(this));
    this.gateway_server.on('disconnected', this.gateway_server_disconnected.bind(this));
    this.ota_server.on('connected', this.ota_server_connected.bind(this));
    this.ota_server.on('disconnected', this.ota_server_disconnected.bind(this));

    this.nwk_server.on('packet', this.nwk_server_packet.bind(this));
    this.gateway_server.on('packet', this.gateway_server_packet.bind(this));
    this.ota_server.on('packet', this.ota_server_packet.bind(this));

    this.Engines = require('./engines')(this);


    var MainStm = require('./machines/main_stm');
    this.main_stm = new MainStm(this);
}
util.inherits(SocketInterface, EventEmitter);

SocketInterface.prototype.init = function() {
    logger.info('init');
    this.nwk_server.connect();
    this.gateway_server.connect();
    this.ota_server.connect();
    this.main_stm.init();
};

SocketInterface.prototype.deinit = function() {
    logger.info('deinit');
    this.main_stm.deinit();
    this.nwk_server.disconnect();
    this.gateway_server.disconnect();
    this.ota_server.disconnect();
};

SocketInterface.prototype.tcp_server_error = function(error) {
    logger.info(this.name + ' tcp_server_error: ' + error);
};

SocketInterface.prototype.nwk_server_connected = function() {
    logger.info('nwk_server_connected');
    this.nwk_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.nwk_server_disconnected = function() {
    logger.info('nwk_server_disconnected');
};

SocketInterface.prototype.gateway_server_connected = function() {
    logger.info('gateway_server_connected');
    this.gateway_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.gateway_server_disconnected = function() {
    logger.info('gateway_server_disconnected');
};

SocketInterface.prototype.ota_server_connected = function() {
    logger.info('ota_server_connected');
    this.ota_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
};

SocketInterface.prototype.ota_server_disconnected = function() {
    logger.info('ota_server_disconnected');
};

SocketInterface.prototype.nwk_server_packet = function(pkt) {
    var msg_decoder;
    var msg_type;
    var msg_name;
    switch(pkt.header.cmdId) {
        case Protocol.NWKMgr.nwkMgrCmdId_t.ZIGBEE_GENERIC_CNF:
            msg_name = 'ZIGBEE_GENERIC_CNF';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.ZIGBEE_GENERIC_RSP_IND:
            msg_name = 'ZIGBEE_GENERIC_RSP_IND';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeGenericRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_SYSTEM_RESET_CNF:
            msg_name = 'NWK_ZIGBEE_SYSTEM_RESET_CNF';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeSystemResetCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_SET_ZIGBEE_POWER_MODE_CNF:
            msg_name = 'NWK_SET_ZIGBEE_POWER_MODE_CNF';
            msg_decoder = Protocol.NWKMgr.NwkSetZigbeePowerModeCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF:
            msg_name = 'NWK_GET_LOCAL_DEVICE_INFO_CNF';
            msg_decoder = Protocol.NWKMgr.NwkGetLocalDeviceInfoCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_READY_IND:
            msg_name = 'NWK_ZIGBEE_NWK_READY_IND';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeNwkReadyInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_NWK_INFO_CNF:
            msg_name = 'NWK_ZIGBEE_NWK_INFO_CNF';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeNwkInfoCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_NEIGHBOR_TABLE_RSP_IND:
            msg_name = 'NWK_GET_NEIGHBOR_TABLE_RSP_IND';
            msg_decoder = Protocol.NWKMgr.NwkGetNeighborTableRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_ROUTING_TABLE_RSP_IND:
            msg_name = 'NWK_GET_ROUTING_TABLE_RSP_IND';
            msg_decoder = Protocol.NWKMgr.NwkGetRoutingTableRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_NWK_KEY_CNF:
            msg_name = 'NWK_GET_NWK_KEY_CNF';
            msg_decoder = Protocol.NWKMgr.NwkGetNwkKeyCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_ZIGBEE_DEVICE_IND:
            msg_name = 'NWK_ZIGBEE_DEVICE_IND';
            msg_decoder = Protocol.NWKMgr.NwkZigbeeDeviceInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_DEVICE_LIST_CNF:
            msg_name = 'NWK_GET_DEVICE_LIST_CNF';
            msg_decoder = Protocol.NWKMgr.NwkGetDeviceListCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.NWKMgr.nwkMgrCmdId_t.NWK_SET_BINDING_ENTRY_RSP_IND:
            msg_name = 'NWK_SET_BINDING_ENTRY_RSP_IND';
            msg_decoder = Protocol.NWKMgr.NwkSetBindingEntryRspInd;
            msg_type = MsgType.ind;
            break;
        default:
            Logger.warn('Unsupported incoming command id from nwk manager server (cmd_id ' + pkt.header.cmdId + ')');
            return;
    }
    try {
        var msg = msg_decoder.decode(pkt.packet);
    } catch(err) {
        logger.warn('nwk_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('nwk_server_packet: ' + msg_name);

    this.server_message(this.nwk_server, msg, msg_type, msg_name);
};

SocketInterface.prototype.gateway_server_packet = function(pkt) {
    var msg_decoder;
    var msg_type;
    var msg_name;
    switch(pkt.header.cmdId) {
        case Protocol.GatewayMgr.ZIGBEE_GENERIC_CNF:
            msg_name = 'ZIGBEE_GENERIC_CNF';
            msg_decoder = Protocol.GatewayMgr.NwkZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.ZIGBEE_GENERIC_RSP_IND:
            msg_name = 'ZIGBEE_GENERIC_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwZigbeeGenericRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_GET_GROUP_MEMBERSHIP_RSP_IND:
            msg_name = 'GW_GET_GROUP_MEMBERSHIP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetGroupMembershipRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_GET_SCENE_MEMBERSHIP_RSP_IND:
            msg_name = 'GW_GET_SCENE_MEMBERSHIP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetSceneMembershipRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_SLEEPY_DEVICE_CHECK_IN_IND:
            msg_name = 'GW_SLEEPY_DEVICE_CHECK_IN_IND';
            msg_decoder = Protocol.GatewayMgr.GwSleepyDeviceCheckInInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GwAttributeChangeInd:
            msg_name = 'GW_ATTRIBUTE_CHANGE_IND';
            msg_decoder = Protocol.GatewayMgr.NwkZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND:
            msg_name = 'GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetDeviceAttributeListRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_READ_DEVICE_ATTRIBUTE_RSP_IND:
            msg_name = 'GW_READ_DEVICE_ATTRIBUTE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwReadDeviceAttributeRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND:
            msg_name = 'GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwWriteDeviceAttributeRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GW_SET_ATTRIBUTE_REPORTING_RSP_IND:
            msg_name = 'GW_SET_ATTRIBUTE_REPORTING_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwSetAttributeReportingRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GwAttributeReportingInd:
            msg_name = 'GW_ATTRIBUTE_REPORTING_IND';
            msg_decoder = Protocol.GatewayMgr.NwkZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.GwZclFrameReceiveInd:
            msg_name = 'GW_ZCL_FRAME_RECEIVE_IND';
            msg_decoder = Protocol.GatewayMgr.NwkZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        /*case Protocol.GatewayMgr.GW_ALARM_IND:
        case Protocol.GatewayMgr.DEV_ZONE_ENROLLMENT_REQ_IND:
        case Protocol.GatewayMgr.DEV_ZONE_ENROLLMENT_RSP:
        case Protocol.GatewayMgr.DEV_ZONE_STATUS_CHANGE_IND:
        case Protocol.GatewayMgr.DEV_ACE_ARM_REQ_IND:
        case Protocol.GatewayMgr.DEV_ACE_ARM_RSP:
        case Protocol.GatewayMgr.DEV_ACE_BYPASS_IND:
        case Protocol.GatewayMgr.DEV_ACE_EMERGENCY_CONDITION_IND:
        case Protocol.GatewayMgr.DEV_ACE_GET_ZONE_ID_MAP_REQ_IND:
        case Protocol.GatewayMgr.DEV_ACE_GET_ZONE_ID_MAP_RSP:
        case Protocol.GatewayMgr.DEV_ACE_GET_ZONE_INFORMATION_REQ_IND:
        case Protocol.GatewayMgr.DEV_ACE_GET_ZONE_INFORMATION_RSP:*/
        case Protocol.GatewayMgr.DEV_GET_LEVEL_RSP_IND:
            msg_name = 'DEV_GET_LEVEL_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetLevelRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.DEV_GET_ONOFF_STATE_RSP_IND:
            msg_name = 'DEV_GET_ONOFF_STATE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetOnOffStateRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.DEV_GET_COLOR_RSP_IND:
            msg_name = 'DEV_GET_COLOR_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetColorRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.DEV_GET_TEMP_RSP_IND:
            msg_name = 'DEV_GET_TEMP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetTempRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.DEV_GET_POWER_RSP_IND:
            msg_name = 'DEV_GET_POWER_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetPowerRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.DEV_GET_HUMIDITY_RSP_IND:
            msg_name = 'DEV_GET_HUMIDITY_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetHumidityRspInd;
            msg_type = MsgType.cnf;
            break;
        /*case Protocol.GatewayMgr.DEV_SET_DOOR_LOCK_RSP_IND:
        case Protocol.GatewayMgr.DEV_GET_DOOR_LOCK_STATE_RSP_IND:*/
        default:
            Logger.warn('Unsupported incoming command id from gateway server (cmd_id ' + pkt.header.cmdId + ')');
            return;
    }
    try {
        var msg = msg_decoder.decode(pkt.packet);
    } catch(err) {
        logger.warn('gateway_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('gateway_server_packet: ' + msg_name);

    this.server_message(this.gateway_server, msg, msg_type, msg_name);
};

SocketInterface.prototype.ota_server_packet = function(pkt) {
    var msg_decoder;
    var msg_type;
    var msg_name;
    switch(pkt.header.cmdId) {
        case Protocol.OTAMgr.ZIGBEE_GENERIC_CNF:
            msg_name = 'ZIGBEE_GENERIC_CNF';
            msg_decoder = Protocol.GatewayMgr.OtaZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.ZIGBEE_GENERIC_RSP_IND:
            msg_name = 'ZIGBEE_GENERIC_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.OtaZigbeeGenericRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.OTA_UPDATE_ENABLE_CNF:
            msg_name = 'OTA_UPDATE_ENABLE_CNF';
            msg_decoder = Protocol.GatewayMgr.OtaUpdateEnableCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.OTA_UPDATE_DL_FINISHED_IND:
            msg_name = 'OTA_UPDATE_DL_FINISHED_IND';
            msg_decoder = Protocol.GatewayMgr.OtaUpdateDlFinishedInd;
            msg_type = MsgType.cnf;
            break;
        default:
            Logger.warn('Unsupported incoming command id from ota server (cmd_id ' + pkt.header.cmdId + ')');
            return;
    }
    try {
        var msg = msg_decoder.decode(pkt.packet);
    } catch(err) {
        logger.warn('ota_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('ota_server_packet: ' + msg_name);

    this.server_message(this.ota_server, msg, msg_type, msg_name);
};

SocketInterface.prototype.server_message = function(server, msg, msg_type, msg_name) {
    switch (msg_type) {
        case MsgType.cnf:
            this.confirmation_receive_handler(msg);
            logger.debug('emit: ' + server.name + ':' + msg_name);
            this.emit(server.name + ':' + msg_name);
            break;
        case MsgType.ind:
            this.emit(server.name + ':' + msg_name);
            break;
    }
};

SocketInterface.prototype.get_server = function(index) {
    switch(index) {
        case Const.ServerID.SI_SERVER_ID_NWK_MGR:
            return this.nwk_server;
        case Const.ServerID.SI_SERVER_ID_GATEWAY:
            return this.gateway_server;
        case Const.ServerID.SI_SERVER_ID_OTA:
            return this.ota_server;
        default:
            return undefined;
    }
};

SocketInterface.prototype.is_server_ready = function(index) {
    var server = this.get_server(index);
    if (typeof server == "undefined")
        return false;
    return server.connected;
};

SocketInterface.prototype.send_packet = function(pkt, cb_cnf, arg_cnf, cb_timeout, arg_timeout) {
    var server;
    if (pkt.header.subsystem == Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR) {
        server = this.nwk_server;
    } else if (pkt.header.subsystem == Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW) {
        server = this.gateway_server;
    } else if (pkt.header.subsystem == Protocol.OTAMgr.ZStackOTASysIDs.RPC_SYS_PB_OTA_MGR) {
        server = this.ota_server;
    } else {
        logger.warn('Unknown subsystem ID ' + pkt.header.subsystem + ' Following packet discarded: ');
        Common.print_packet_to_log(logger, 'not sent: ', pkt);
        return -1;
    }

    if (!server.connected) {
        logger.info('Please wait while connecting to server');
        return -2;
    }

    if (this.waiting_for_confirmation) {
        logger.info('BUSY - please wait for previous operation to complete');
        return -3;
    }

    server.send(pkt);

    this.confirmation_processing_cb_cnf = cb_cnf;
    this.confirmation_processing_arg_cnf = arg_cnf;
    this.confirmation_processing_cb_timeout = cb_timeout;
    this.confirmation_processing_arg_timeout = arg_timeout;

    //ui_print_status(0, "BUSY");
    this.waiting_for_confirmation = true;

    this.confirmation_wait_timer = setTimeout(
        this.confirmation_timeout_handler.bind(this),
        server.confirmation_timeout_interval.value);

    if (server.confirmation_timeout_interval != Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT) {
        server.confirmation_timeout_interval = Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT;
    }

    return 0;
};

SocketInterface.prototype.confirmation_receive_handler = function(msg) {
    this.waiting_for_confirmation = false;
    clearTimeout(this.confirmation_wait_timer);
    //ui_print_status(0, "");

    if (!(typeof this.confirmation_processing_cb_cnf ==  "undefined")) {
        logger.info('Calling confirmation callback');
        this.confirmation_processing_cb_cnf(msg, this.confirmation_processing_arg_cnf);
    }

    this.confirmation_processing_cb_cnf = undefined;
    this.confirmation_processing_cb_timeout = undefined;
};

SocketInterface.prototype.confirmation_timeout_handler = function() {
    this.waiting_for_confirmation = false;

    logger.warn('TIMEOUT waiting for confirmation');
    //ui_print_status(UI_STATUS_NOTIFICATION_TIMEOUT, "Operation timed out");

    if (!(typeof this.confirmation_processing_cb_timeout ==  "undefined")) {
        logger.info('Calling timeout callback');
        this.confirmation_processing_cb_timeout(this.confirmation_processing_arg_timeout);
    }

    this.confirmation_processing_cb_cnf = undefined;
    this.confirmation_processing_cb_timeout = undefined;

    logger.debug('emit: timeout');
    this.emit('timeout');
};

module.exports = SocketInterface;