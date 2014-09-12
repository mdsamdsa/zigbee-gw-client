'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var config = require('../config');
var MainStm = require('../machines/main_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol.js');

Profiles.on('ready', function() {
    var proxy = new GatewayProxy(
        config.get('servers:nwk:host'),
        config.get('servers:nwk:port'),
        config.get('servers:gateway:host'),
        config.get('servers:gateway:port'),
        config.get('servers:ota:host'),
        config.get('servers:ota:port')
    );

    var pan = new PAN(proxy);
    var engines = require('../engines')(proxy, pan);
    var main_stm = new MainStm(proxy, pan, engines);

    proxy.on('NWK_MGR:NWK_ZIGBEE_DEVICE_IND', engines.device_list.process_zigbee_device_ind);
    proxy.on('GATEWAY:ZIGBEE_GENERIC_CNF', function(msg) {
       console.log((msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS)?'SUCCESS':'FAIL');
    });

    main_stm.on('online', function() {
        /*var msg = new Protocol.GatewayMgr.GwGetGroupMembershipReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].shortAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[1].endpointId;*/
        /*msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.GROUPCAST;
        msg.dstAddress.groupAddr = 0xfffc;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;*/

        var msg = new Protocol.GatewayMgr.GwAddGroupReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].IEEEAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;
        msg.groupId = 0;
        msg.groupName = '';

        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        var z = Protocol.GatewayMgr.GwGetGroupMembershipReq.decode(msg.toBuffer());

        logger.info('send_get_group_membership_request: Sending GW_GET_GROUP_MEMBERSHIP_REQ');

        return this.proxy.send_packet(pkt);
    });
    main_stm.init();
    proxy.init();

    setTimeout(function() {
        proxy.deinit();
        main_stm.deinit();
        setTimeout(function() {}, 500);
    }, 8000);
});


/*
 150013020802120d080011ec40dd01004b1200280b18002200
 150013020802120D080011EC40DD01004B1200280B18002200
 sent to GATEWAY: len=21, cmd_id=2, subsystem=19
 Raw=15:00:13:02:08:02:12:0D:08:00:11:EC:40:DD:01:00:4B:12:00:28:0B:18:00:22:00
 received from GATEWAY: len=6, cmd_id=0, subsystem=115
 Raw=06:00:73:00:08:00:10:00:18:22
 Calling confirmation callback
 gs_generic_cnf: Received ZIGBEE_GENERIC_CNF
 gs_generic_cnf:  Status SUCCESS.
 received from GATEWAY: len=6, cmd_id=1, subsystem=83
 Raw=06:00:53:01:08:01:10:22:18:00
 sr_process_generic_response_indication: Received GW ZIGBEE_GENERIC_RSP_IND.
 sr_process_generic_response_indication: Status SUCCESS.
 sr_process_generic_response_indication: searching for seq_num=34
 sr_process_generic_response_indication: Total pending attributes 0.
 */