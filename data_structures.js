'use strict';

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