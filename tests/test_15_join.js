'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var Logger = require('../logger');
Logger.configure('./log4js.json', {});
var logger = Logger.getLogger(module_name);

var when = require('when');

var Protocol = require('../protocol');
var client = require('../client');

var timeout = setTimeout(function() {
    client.stop();
}, 120 * 1000);

var join = false;
client.attr_stm.on('done', function () {
    if (!join) {
        join = true;
        when(client.engines.nwk.network.send_set_permit_join_request(Protocol.NWKMgr.nwkPermitJoinType_t.PERMIT_NETWORK, 120))
            .then(client.engines.nwk.network.process_set_permit_join_cnf)
            .tap(function (msg) {
                logger.debug("Join permitted");
            })
            .catch(function (err) {
                logger.error(err.message);
            });
    }
});

client.start();
