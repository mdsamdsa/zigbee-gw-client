'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../logger');
Logger.configure('./log4js.json', {});
var logger = Logger.getLogger(module_name);

var when = require('when');

var client = require('../client');
var Protocol = require('../protocol');

var timeout = setTimeout(function() {
    client.stop();
}, 60 * 1000);

var cnt = 0;

client.attr_stm.on('done', function() {
    if (cnt++ == 0) {
        logger.info('reset init');
        when(client.engines.nwk.local_device.send_zigbee_system_reset_request(Protocol.NWKMgr.nwkResetMode_t.SOFT_RESET))
            .then(client.engines.nwk.local_device.process_zigbee_system_reset_cnf)
            .then(function() {
                logger.info('reset complete');
            })
            .catch(function (err) {
                logger.error(err);
            })
            .finally(function () {
                client.pan.clear();
                clearTimeout(timeout);
                setTimeout(function() {
                    client.stop();
                }, 10 * 1000);
            });
    }
});

client.start();
