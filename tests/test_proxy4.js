'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);
var when = require('when');

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var Engines = require('../engines');
var config = require('../config');
var MainStm = require('../lib/machines/main_stm');
var PAN = require('../lib/profile/Pan');
var Protocol = require('../protocol');
var Const = require('../constants');
var Common = require('../common');

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
    var engines = Engines.initEngine(proxy, pan);
    var main_stm = new MainStm(proxy, pan, engines);

    main_stm.on('online', function() {
        //noinspection JSPotentiallyInvalidConstructorUsage
        var address = new Protocol.GatewayMgr.gwAddressStruct_t();
        address.addressType = Protocol.GatewayMgr.gwAddressType_t.UNICAST;
        address.ieeeAddr = pan.devices[1].ieeeAddress;
        address.endpointId = pan.devices[1].endpoints[0].endpointId;
        when(engines.group_scene.send_get_group_membership_request(address))
            .then(engines.group_scene.process_get_group_membership_cnf)
            .then(engines.wait_gateway)
            .then(engines.group_scene.process_get_group_membership_rsp_ind)
            .then(function(msg) {
                var endpoint = pan.get_endpoint(msg.srcAddress);
                if (typeof endpoint == 'undefined') {
                    logger.warn('endpoint not found');
                } else {
                    endpoint.updateGroups(msg.groupList);
                }
                return when.resolve(msg);
            })
            .then(function(msg) {
                logger.debug('groups: ' + Common.list_toString(msg.groupList));
            })
            .catch(function(err) { logger.error(err); })
            .finally(function() {
                clearTimeout(timeout);
                proxy.deinit();
            });
    });

    main_stm.init();
    proxy.init();

    var timeout = setTimeout(function() {
        proxy.deinit();
    }, 10000);
});
