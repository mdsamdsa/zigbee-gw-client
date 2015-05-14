'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var mainStmFactory = require('../lib/machines/main_stm');
var groupStmFactory = require('../lib/machines/group_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');

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
    var engines = Engines.initEngine(proxy);
    var main_stm = mainStmFactory.create(proxy, pan, engines);
    var group_stm = groupStmFactory.create(pan, engines, main_stm);

    proxy.on('NWK_MGR:NWK_ZIGBEE_DEVICE_IND', engines.device_list.process_zigbee_device_ind);

    main_stm.on('online', function() {
/*        var msg = new Protocol.GatewayMgr.GwGetGroupMembershipReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;

        var msg = new Protocol.GatewayMgr.GwAddGroupReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;
        msg.groupId = 0;
        msg.groupName = 'z';

        var msg = new Protocol.GatewayMgr.GwRemoveFromGroupReq();
        msg.dstAddress = new Protocol.GatewayMgr.gwAddressStruct_t();
        msg.dstAddress.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        msg.dstAddress.ieeeAddr = pan.devices[1].ieeeAddress;
        msg.dstAddress.endpointId = pan.devices[1]._endpoints[0].endpointId;
        msg.groupId = 5;

        var buf = msg.toBuffer();
        var len = buf.length;
        var pkt = {};
        pkt.header = {};
        pkt.header.len = len;
        pkt.header.subsystem = Protocol.GatewayMgr.zStackGwSysId_t.RPC_SYS_PB_GW;
        pkt.header.cmdId = msg.cmdId;
        pkt.packet = buf;

        logger.info('send_get_group_membership_request: Sending GW_GET_GROUP_MEMBERSHIP_REQ');

        return this.proxy.send_packet(pkt);*/

/*        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = pan.devices[1].ieeeAddress;
        address.endpointId = pan.devices[1].endpoints[0].endpointId;
        //address.addressType = Protocol.GatewayMgr.gwAddressType_t.GROUPCAST;
        //address.groupAddr = 0;
        engines.group_scene.send_get_group_membership_request(address, function(msg) {
            if (engines.group_scene.process_get_group_membership_cnf(msg)) {
                proxy.once('GATEWAY:' + msg.sequenceNumber, function(msg) {
                    if (engines.group_scene.process_get_group_membership_rsp_ind(msg)) {
                        logger.info('groups: ');
                        for(var i=0; i<msg.groupList.length; i++) {
                            logger.info('g[' + i + '] = ' + msg.groupList[i]);
                        }
                    }
                });
            }
            engines.group_scene.send_add_group_request(address, 2, '', function(msg) {
               if (engines.group_scene.process_add_group_cnf(msg)) {
                   proxy.once('GATEWAY:' + msg.sequenceNumber, function(msg) {
                       if (engines.group_scene.process_add_group_rsp_ind(msg)) {
                           logger.info('status: ' + msg.status);
                       }
                   });
               }
            });
        });*/

/*        function q_send_get_group_membership_request(address) {
            var deferred = Q.defer();
            var res = engines.group_scene.send_get_group_membership_request(address, function(msg) {
                deferred.resolve(msg);
            });
            if (res < 0) {
                deferred.reject(res);
            }
            return deferred.promise;
        }

        function q_process_get_group_membership_cnf(msg) {
            var deferred = Q.defer();
            if (engines.group_scene.process_get_group_membership_cnf(msg)) {
                var timer = setTimeout(function() { deferred.reject('timeout'); }, 1000);
                proxy.once('GATEWAY:' + msg.sequenceNumber, function(msg) {
                    clearTimeout(timer);
                    deferred.resolve(msg);
                });
            } else {
                deferred.reject();
            }
            return deferred.promise;
        }

        function q_process_get_group_membership_rsp_ind(msg) {
            if (engines.group_scene.process_get_group_membership_rsp_ind(msg)) {
                logger.info('groups: ');
                for (var i = 0; i < msg.groupList.length; i++) {
                    logger.info('g[' + i + '] = ' + msg.groupList[i]);
                }
            }
        }

        var address1 = new Protocol.GatewayMgr.gwAddressStruct_t();
        address1.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address1.ieeeAddr = pan.devices[1].ieeeAddress;
        address1.endpointId = pan.devices[1].endpoints[0].endpointId;
        var address2 = new Protocol.GatewayMgr.gwAddressStruct_t();
        address2.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address2.ieeeAddr = pan.devices[1].ieeeAddress;
        address2.endpointId = pan.devices[1].endpoints[1].endpointId;

        Q.when(q_send_get_group_membership_request(address1))
            .then(q_process_get_group_membership_cnf)
            .then(q_process_get_group_membership_rsp_ind)
            .fail(function(err) { logger.info('err1: ' + err); })
            .then(function() { logger.info('done1');})
            .then(
        Q.when(q_send_get_group_membership_request(address2))
            .then(q_process_get_group_membership_cnf)
            .then(q_process_get_group_membership_rsp_ind)
            .fail(function(err) { logger.info('err2: ' + err); })
            .then(function() { logger.info('done2');}));*/
    });

    main_stm.on('online', function() {
        group_stm.transition('start');
    });

    group_stm.init();
    main_stm.init();
    proxy.init();

    setTimeout(function() {
        proxy.deInit();
        main_stm.deInit();
        setTimeout(function() {}, 500);
    }, 10000);
});
