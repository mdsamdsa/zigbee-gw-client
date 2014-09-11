'use strict';

var Profiles = require('../lib/profile/ProfileStore');
var GatewayProxy = require('../proxy');
var config = require('../config');
var MainStm = require('../machines/main_stm');
var PAN = require('../lib/profile/Pan');

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
    main_stm.init();
    proxy.init();

    setTimeout(function () {
        proxy.deinit();
        main_stm.deinit();
    }, 8000);
});