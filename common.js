'use strict';

var Common = {};

Common.packet_max_length = 32;

Common.print_packet_to_log = function(logger, str, pkt, buffer) {
    logger.info(str + 'len=' + pkt.header.len + ', type=' + (pkt.header.subsystem >> 5) +', subsystem=' + (pkt.header.subsystem & 0x1f) + ', cmdId=' + pkt.header.cmdId);
    var hex = buffer.toHex();
    logger.debug('Raw: ' + hex.substr(0, Common.packet_max_length * 2) + ((hex.length > Common.packet_max_length * 2)?'...':''));
};

module.exports = Common;