'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var when = require('when');

var Const = require('./constants');
var TcpServerClient = require('./tcp_client');
var Protocol = require('./protocol');
var Common = require('./common');

var MsgType = {
    cnf: 1,
    ind: 2
};

function GatewayProxy(nwk_host, nwk_port, gateway_host, gateway_port, ota_host, ota_port) {
    this.nwk_host = nwk_host;
    this.nwk_port = nwk_port;
    this.gateway_host = gateway_host;
    this.gateway_port = gateway_port;
    this.ota_host = ota_host;
    this.ota_port = ota_port;

    this._waiting_for_confirmation = false;

    this._nwk_server = new TcpServerClient('NWK_MGR', this.nwk_host, this.nwk_port);
    this._gateway_server = new TcpServerClient('GATEWAY', this.gateway_host, this.gateway_port);
    this._ota_server = new TcpServerClient('OTA_MGR', this.ota_host, this.ota_port);

    this._nwk_server.on('error', this._tcp_server_error);
    this._gateway_server.on('error', this._tcp_server_error);
    this._ota_server.on('error', this._tcp_server_error);

    this._nwk_server.on('connected', this._nwk_server_connected.bind(this));
    this._nwk_server.on('disconnected', this._nwk_server_disconnected.bind(this));
    this._gateway_server.on('connected', this._gateway_server_connected.bind(this));
    this._gateway_server.on('disconnected', this._gateway_server_disconnected.bind(this));
    this._ota_server.on('connected', this._ota_server_connected.bind(this));
    this._ota_server.on('disconnected', this._ota_server_disconnected.bind(this));

    this._nwk_server.on('packet', this._nwk_server_packet.bind(this));
    this._gateway_server.on('packet', this._gateway_server_packet.bind(this));
    this._ota_server.on('packet', this._ota_server_packet.bind(this));

    this._pkts = [];
}
util.inherits(GatewayProxy, EventEmitter);

GatewayProxy.prototype.init = function() {
    logger.info('init');
    this._nwk_server.connect();
    this._gateway_server.connect();
    this._ota_server.connect();
};

GatewayProxy.prototype.deinit = function() {
    logger.info('deinit');
    this._nwk_server.disconnect();
    this._gateway_server.disconnect();
    this._ota_server.disconnect();
    clearTimeout(this._confirmation_wait_timer);
    this._confirmation_wait_timer = undefined;
};

GatewayProxy.prototype._tcp_server_error = function(error) {
    logger.info(this.name + '_tcp_server_errorr: ' + error);
};

GatewayProxy.prototype._nwk_server_connected = function() {
    logger.info('_nwk_server_connected');
    this._nwk_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
    this.emit('nwk_mgr:connected');
};

GatewayProxy.prototype._nwk_server_disconnected = function() {
    logger.info('_nwk_server_disconnected');
    this.emit('nwk_mgr:disconnected');
};

GatewayProxy.prototype._gateway_server_connected = function() {
    logger.info('_gateway_server_connected');
    this._gateway_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
    this.emit('gateway:connected');
};

GatewayProxy.prototype._gateway_server_disconnected = function() {
    logger.info('_gateway_server_disconnected');
    this.emit('gateway:disconnected');
};

GatewayProxy.prototype._ota_server_connected = function() {
    logger.info('_ota_server_connected');
    this._ota_server.confirmation_timeout_interval = Const.Timeouts.INITIAL_CONFIRMATION_TIMEOUT;
    this.emit('ota_mgr:connected');
};

GatewayProxy.prototype._ota_server_disconnected = function() {
    logger.info('_ota_server_disconnected');
    this.emit('ota_mgr:disconnected');
};

GatewayProxy.prototype._nwk_server_packet = function(pkt) {
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
            //msg_type = MsgType.cnf;
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
        logger.warn('_nwk_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('_nwk_server_packet: ' + msg_name);

    this._server_message(this._nwk_server, msg, msg_type, msg_name);
};

GatewayProxy.prototype._gateway_server_packet = function(pkt) {
    var msg_decoder;
    var msg_type;
    var msg_name;
    switch(pkt.header.cmdId) {
        case Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_CNF:
            msg_name = 'ZIGBEE_GENERIC_CNF';
            msg_decoder = Protocol.GatewayMgr.GwZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.ZIGBEE_GENERIC_RSP_IND:
            msg_name = 'ZIGBEE_GENERIC_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwZigbeeGenericRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_GET_GROUP_MEMBERSHIP_RSP_IND:
            msg_name = 'GW_GET_GROUP_MEMBERSHIP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetGroupMembershipRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_GET_SCENE_MEMBERSHIP_RSP_IND:
            msg_name = 'GW_GET_SCENE_MEMBERSHIP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetSceneMembershipRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_SLEEPY_DEVICE_CHECK_IN_IND:
            msg_name = 'GW_SLEEPY_DEVICE_CHECK_IN_IND';
            msg_decoder = Protocol.GatewayMgr.GwSleepyDeviceCheckInInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_ATTRIBUTE_CHANGE_IND:
            msg_name = 'GW_ATTRIBUTE_CHANGE_IND';
            msg_decoder = Protocol.GatewayMgr.GwAttributeChangeInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND:
            msg_name = 'GW_GET_DEVICE_ATTRIBUTE_LIST_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwGetDeviceAttributeListRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_READ_DEVICE_ATTRIBUTE_RSP_IND:
            msg_name = 'GW_READ_DEVICE_ATTRIBUTE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwReadDeviceAttributeRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND:
            msg_name = 'GW_WRITE_DEVICE_ATTRIBUTE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwWriteDeviceAttributeRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_SET_ATTRIBUTE_REPORTING_RSP_IND:
            msg_name = 'GW_SET_ATTRIBUTE_REPORTING_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.GwSetAttributeReportingRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_ATTRIBUTE_REPORTING_IND:
            msg_name = 'GW_ATTRIBUTE_REPORTING_IND';
            msg_decoder = Protocol.GatewayMgr.GwAttributeReportingInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.GW_ZCL_FRAME_RECEIVE_IND:
            msg_name = 'GW_ZCL_FRAME_RECEIVE_IND';
            msg_decoder = Protocol.GatewayMgr.GwZclFrameReceiveInd;
            msg_type = MsgType.ind;
            break;
        /*case Protocol.GatewayMgr.gwCmdId_t.GW_ALARM_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ZONE_ENROLLMENT_REQ_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ZONE_ENROLLMENT_RSP:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ZONE_STATUS_CHANGE_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_ARM_REQ_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_ARM_RSP:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_BYPASS_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_EMERGENCY_CONDITION_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_GET_ZONE_ID_MAP_REQ_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_GET_ZONE_ID_MAP_RSP:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_GET_ZONE_INFORMATION_REQ_IND:
        case Protocol.GatewayMgr.gwCmdId_t.DEV_ACE_GET_ZONE_INFORMATION_RSP:*/
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_LEVEL_RSP_IND:
            msg_name = 'DEV_GET_LEVEL_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetLevelRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_ONOFF_STATE_RSP_IND:
            msg_name = 'DEV_GET_ONOFF_STATE_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetOnOffStateRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_COLOR_RSP_IND:
            msg_name = 'DEV_GET_COLOR_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetColorRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_TEMP_RSP_IND:
            msg_name = 'DEV_GET_TEMP_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetTempRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_POWER_RSP_IND:
            msg_name = 'DEV_GET_POWER_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetPowerRspInd;
            msg_type = MsgType.ind;
            break;
        case Protocol.GatewayMgr.gwCmdId_t.DEV_GET_HUMIDITY_RSP_IND:
            msg_name = 'DEV_GET_HUMIDITY_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.DevGetHumidityRspInd;
            msg_type = MsgType.ind;
            break;
        /*case Protocol.GatewayMgr.gwCmdId_t.DEV_SET_DOOR_LOCK_RSP_IND:
        case Protocol.GatewayMgr.DEV_GET_DOOR_LOCK_STATE_RSP_IND:*/
        default:
            logger.warn('Unsupported incoming command id from gateway server (cmd_id ' + pkt.header.cmdId + ')');
            return;
    }
    try {
        var msg = msg_decoder.decode(pkt.packet);
    } catch(err) {
        logger.warn('_gateway_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('_gateway_server_packet: ' + msg_name);

    this._server_message(this._gateway_server, msg, msg_type, msg_name);
};

GatewayProxy.prototype._ota_server_packet = function(pkt) {
    var msg_decoder;
    var msg_type;
    var msg_name;
    switch(pkt.header.cmdId) {
        case Protocol.OTAMgr.otaMgrCmdId_t.ZIGBEE_GENERIC_CNF:
            msg_name = 'ZIGBEE_GENERIC_CNF';
            msg_decoder = Protocol.GatewayMgr.OtaZigbeeGenericCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.otaMgrCmdId_t.ZIGBEE_GENERIC_RSP_IND:
            msg_name = 'ZIGBEE_GENERIC_RSP_IND';
            msg_decoder = Protocol.GatewayMgr.OtaZigbeeGenericRspInd;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.otaMgrCmdId_t.OTA_UPDATE_ENABLE_CNF:
            msg_name = 'OTA_UPDATE_ENABLE_CNF';
            msg_decoder = Protocol.GatewayMgr.OtaUpdateEnableCnf;
            msg_type = MsgType.cnf;
            break;
        case Protocol.OTAMgr.otaMgrCmdId_t.OTA_UPDATE_DL_FINISHED_IND:
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
        logger.warn('_ota_server_packet: Error: Could not unpack msg (cmdId: ' + msg_name +')');
        return;
    }
    logger.info('_ota_server_packet: ' + msg_name);

    this._server_message(this._ota_server, msg, msg_type, msg_name);
};

GatewayProxy.prototype._server_message = function(server, msg, msg_type, msg_name) {
    switch (msg_type) {
        case MsgType.cnf:
            this._confirmation_receive_handler(msg);
            logger.debug('emit: ' + server.name + ':' + msg_name);
            this.emit(server.name + ':' + msg_name, msg);
            this._try_send();
            break;
        case MsgType.ind:
            if (typeof msg.sequenceNumber == 'number') {
                logger.debug('emit: ' + server.name + ':' + msg.sequenceNumber);
                this.emit(server.name + ':' + msg.sequenceNumber, msg);
            }
            logger.debug('emit: ' + server.name + ':' + msg_name);
            this.emit(server.name + ':' + msg_name, msg);
            break;
    }
};

/*GatewayProxy.prototype.get_server = function(index) {
    switch(index) {
        case Const.ServerID.SERVER_ID_NWK_MGR:
            return this.nwk_server;
        case Const.ServerID.SERVER_ID_GATEWAY:
            return this.gateway_server;
        case Const.ServerID.SERVER_ID_OTA_MGR:
            return this.ota_server;
        default:
            return undefined;
    }
};

GatewayProxy.prototype.is_server_ready = function(index) {
    var server = this.get_server(index);
    if (typeof server == "undefined")
        return false;
    return server.connected;
};*/

GatewayProxy.prototype.all_server_ready = function() {
  return this._nwk_server.connected && this._gateway_server.connected && this._ota_server.connected;
};

GatewayProxy.prototype.send = function(pkt) {
    var deferred = new when.defer();
    this._pkts.push({
        pkt: pkt,
        deferred: deferred
    });
    this._try_send();
    return deferred.promise;
};

GatewayProxy.prototype._try_send = function() {
    if ((!this._waiting_for_confirmation) && (this._pkts.length != 0)) {
        var server,
            packet = this._pkts.shift(),
            pkt = packet.pkt;
        if (pkt.header.subsystem == Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR) {
            server = this._nwk_server;
        } else if (pkt.header.subsystem == Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW) {
            server = this._gateway_server;
        } else if (pkt.header.subsystem == Protocol.OTAMgr.ZStackOTASysIDs.RPC_SYS_PB_OTA_MGR) {
            server = this._ota_server;
        } else {
            logger.warn('Unknown subsystem ID ' + pkt.header.subsystem + ' Following packet discarded: ');
            Common.print_packet_to_log(logger, 'not sent: ', pkt);
            pkt.deferred.reject(new Error('Unknown subsystem ID'));
            return;
        }

        if (!server.connected) {
            logger.info('Please wait while connecting to server');
            pkt.deferred.reject(new Error('Not connecting to server'));
            return;
        }

        this._waiting_for_confirmation = true;
        this._pkts.unshift(packet);
        server.send(pkt);

        this._confirmation_wait_timer = setTimeout(
            this._confirmation_timeout_handler.bind(this),
            server.confirmation_timeout_interval.value);

        if (server.confirmation_timeout_interval != Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT) {
            server.confirmation_timeout_interval = Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT;
        }
    }
};

GatewayProxy.prototype._confirmation_receive_handler = function(msg) {
    this._waiting_for_confirmation = false;
    clearTimeout(this._confirmation_wait_timer);
    this._confirmation_wait_timer = undefined;

    if (this._pkts.length > 0) {
        logger.info('Calling confirmation callback');
        var packet = this._pkts.shift();
        packet.deferred.resolve(msg);
    }else {
        logger.error('Callback not defined');
    }
};

GatewayProxy.prototype._confirmation_timeout_handler = function() {
    this._waiting_for_confirmation = false;
    this._confirmation_wait_timer = undefined;

    logger.warn('TIMEOUT waiting for confirmation');

    if (this._pkts.length > 0) {
        logger.info('Calling confirmation callback');
        var pkt = this._pkts.shift();
        pkt.deferred.resolve(new when.TimeoutError('Timed out'));
    }else {
        logger.error('Callback not defined');
    }

    logger.debug('emit: timeout');
    this.emit('timeout');
};

/*GatewayProxy.prototype.send_packet = function(pkt, cb_cnf, arg_cnf) {
    var server;
    if (pkt.header.subsystem == Protocol.NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR) {
        server = this._nwk_server;
    } else if (pkt.header.subsystem == Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW) {
        server = this._gateway_server;
    } else if (pkt.header.subsystem == Protocol.OTAMgr.ZStackOTASysIDs.RPC_SYS_PB_OTA_MGR) {
        server = this._ota_server;
    } else {
        logger.warn('Unknown subsystem ID ' + pkt.header.subsystem + ' Following packet discarded: ');
        Common.print_packet_to_log(logger, 'not sent: ', pkt);
        return -1;
    }

    if (!server.connected) {
        logger.info('Please wait while connecting to server');
        return -2;
    }

    if (this._waiting_for_confirmation) {
        logger.info('BUSY - please wait for previous operation to complete');
        return -3;
    }

    server.send(pkt);

    this._confirmation_processing_cb_cnf = cb_cnf;
    this._confirmation_processing_arg_cnf = arg_cnf;

    //ui_print_status(0, "BUSY");
    this._waiting_for_confirmation = true;

    this._confirmation_wait_timer = setTimeout(
        this._confirmation_timeout_handler.bind(this),
        server.confirmation_timeout_interval.value);

    if (server.confirmation_timeout_interval != Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT) {
        server.confirmation_timeout_interval = Const.Timeouts.STANDARD_CONFIRMATION_TIMEOUT;
    }

    return 0;
};

GatewayProxy.prototype._confirmation_receive_handler = function(msg) {
    this._waiting_for_confirmation = false;
    clearTimeout(this._confirmation_wait_timer);
    this._confirmation_wait_timer = undefined;
    //ui_print_status(0, "");

    if (!(typeof this._confirmation_processing_cb_cnf ==  'undefined')) {
        logger.info('Calling confirmation callback');
        this._confirmation_processing_cb_cnf(msg, this._confirmation_processing_arg_cnf);
    } else {
        logger.info('Callback not defined');
    }
};

GatewayProxy.prototype._confirmation_timeout_handler = function() {
    this._waiting_for_confirmation = false;
    this._confirmation_wait_timer = undefined;

    logger.warn('TIMEOUT waiting for confirmation');
    //ui_print_status(UI_STATUS_NOTIFICATION_TIMEOUT, "Operation timed out");

    if (!(typeof this._confirmation_processing_cb_cnf ==  'undefined')) {
        logger.info('Calling timeout callback');
        this._confirmation_processing_cb_cnf('timeout', this._confirmation_processing_arg_cnf);
    }

    logger.debug('emit: timeout');
    this.emit('timeout');
};*/

module.exports = GatewayProxy;