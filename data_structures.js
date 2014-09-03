'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var data_structures = {};

data_structures.network_status = {
    channel: 0,
    pan_id: 0,
    ext_pan_id: 0,
    state: 0
};

/*typedef struct {
    int state;
    uint32_t nwk_channel;
    uint32_t pan_id;
    uint64_t ext_pan_id;
    uint8_t permit_remaining_time;
    uint8_t num_pending_attribs;
} network_info_t;*/

module.exports = data_structures;