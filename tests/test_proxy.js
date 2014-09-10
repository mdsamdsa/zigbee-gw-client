'use strict';

var GatewayProxy = require('../proxy');
var config = require('../config.js');

var proxy = new GatewayProxy(
    config.get('servers:nwk:host'),
    config.get('servers:nwk:port'),
    config.get('servers:gateway:host'),
    config.get('servers:gateway:port'),
    config.get('servers:ota:host'),
    config.get('servers:ota:port')
);

var engines = require('../engines')(proxy);
var MainStm = require('../machines/main_stm');
var main_stm = new MainStm(proxy, engines);

main_stm.init();
proxy.init();

setTimeout(function() {
    proxy.deinit();
    main_stm.deinit();
}, 8000);