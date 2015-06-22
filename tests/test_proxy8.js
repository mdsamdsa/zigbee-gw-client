'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
log4js.configure('./log4js.json', {});
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var mainStmFactory = require('../lib/machines/main');
var groupStmFactory = require('../lib/machines/group');
var sceneStmFactory = require('../lib/machines/scene');
var attributeStmFactory = require('../lib/machines/attribute');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');

Profiles.init(__dirname + '/../data/profiles', ['ha', 'zll']);

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
var scene_stm = sceneStmFactory.create(pan, engines, main_stm);
var attr_stm = attributeStmFactory.create(pan, engines, main_stm);

var timeout = setTimeout(function() {
    proxy.deInit();
}, 60000);

main_stm.on('online', function() {
    group_stm.start();
});
group_stm.on('done', function() {
    scene_stm.start();
});
scene_stm.on('done', function() {
    attr_stm.start();
});
attr_stm.on('done', function() {
    when(engines.nwk.network.send_set_permit_join_request(Protocol.NWKMgr.nwkPermitJoinType_t.PERMIT_NETWORK, 60))
        .then(engines.nwk.network.process_set_permit_join_cnf)
        .tap(function(msg) {

        })
        /*.then(engines.nwk.device.send_device_list_maintenance_request())
        .then(engines.nwk.device.process_device_list_maintenance_cnf)
        .tap(function(msg) {

        })*/
        .then(function() {
            if (pan.devices.length >= 3) {
                var address = new Protocol.GatewayMgr.gwAddressStruct_t();
                address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
                address.ieeeAddr = pan.devices[1].ieeeAddress;
                return engines.nwk.device.send_remove_device_request(address, Protocol.NWKMgr.nwkLeaveMode_t.LEAVE)
            }
        })
        .then(engines.nwk.network.process_remove_device_cnf)
        .tap(function(msg) {

        })
        .catch(function(err) {
            logger.error(err.message);
        })
        .finally(function() {
            clearTimeout(timeout);
            /*setTimeout(function() {
                if (pan.devices.length >= 2) {
                    var device = pan.devices[1];
                    for (var i = 0; i < device.endpoints.length; i++) {
                        for (var j = 0; j < device.endpoints[i].groups.length; j++) {
                            device.endpoints[i].groups[j].needUpdate = true;
                        }
                        for (var k = 0; k < device.endpoints[i].clusters.length; k++) {
                            device.endpoints[i].clusters[k].needUpdate = true;
                        }
                    }
                }
                group_stm.start();
            }, 5000);*/
        });
});

proxy.on("NWK_MGR:NWK_ZIGBEE_DEVICE_IND", function(msg) {
    var str;
    switch (msg.deviceInfo.deviceStatus) {
        case Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_OFF_LINE: str = "offline"; break;
        case Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_ON_LINE:  str = "online"; break;
        case Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED:  str = "removed"; break;
        default: str = "" + msg.deviceInfo.deviceStatus; break;
    }
    logger.info("device ind status: " + str);
    pan.updateDevice(msg.deviceInfo);
    if (msg.deviceInfo.deviceStatus != Protocol.NWKMgr.nwkDeviceStatus_t.DEVICE_REMOVED) {
        group_stm.start();
    }
});

attr_stm.init();
scene_stm.init();
group_stm.init();
main_stm.init();
proxy.init();