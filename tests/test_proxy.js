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

/*var o = {};
Object.defineProperty(o, 'gimmeFive', {
    get: function() {
        return 5;
    },
    configurable: true
});
console.log(o.gimmeFive);
Object.defineProperty(o, 'gimmeFive', {
    get: function() {
        return 6;
    }
});
console.log(o.gimmeFive);
o.gimmeFive = 7;
console.log(o.gimmeFive);*/

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
    proxy.on('GATEWAY:ZIGBEE_GENERIC_RSP_IND', function(msg) {
        console.log((msg.status == Protocol.GatewayMgr.gwStatus_t.STATUS_SUCCESS)?'SUCCESS':'FAIL');
    });
    proxy.on('GATEWAY:GW_GET_GROUP_MEMBERSHIP_RSP_IND', function(msg) {
        console.log('groups: ');
        for(var i=0; i<msg.groupList.length; i++) {
            console.log('g[' + i + '] = ' + msg.groupList[i]);
        }
    });

    main_stm.on('online', function() {
        var msg = new Protocol.GatewayMgr.GwGetGroupMembershipReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;

        /*var msg = new Protocol.GatewayMgr.GwAddGroupReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;
        msg.groupId = 0;
        msg.groupName = 'z';*/

        /*var msg = new Protocol.GatewayMgr.GwRemoveFromGroupReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;
        msg.groupId = 5;*/

        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

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
