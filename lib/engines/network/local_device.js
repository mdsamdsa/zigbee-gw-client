'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../../../logger');
var logger = Logger.getLogger('engine:' + module_name);

var when = require('when');

var Const = require('../../../constants');
var Protocol = require('../../../protocol');

var factory = function(proxy) {
    var engine = {};

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
        if (msg.cmdId != Protocol.NWKMgr.nwkMgrCmdId_t.NWK_GET_LOCAL_DEVICE_INFO_CNF) {
            var str = 'process_get_local_device_info_cnf: Expected NWK_GET_LOCAL_DEVICE_INFO_CNF';
            logger.warn(str);
            return when.reject(new Error(str));
        }
        logger.info('process_get_local_device_info_cnf');

        return when.resolve(msg);
    };

    return engine;
};

module.exports = factory;