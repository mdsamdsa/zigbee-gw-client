'use strict';

//var int24 = require('int24');

module.exports = {

    write: function (buffer, data, dataType) {
        switch (dataType) {
            /* No data */
            case 0x00:
                break;
            default:
                throw new Error('TODO: zcl/DataTypes.write - Unknown data type - ', '0x' + dataType.toString(16));
        }
    },

    read: function (buffer, dataType) {
        switch (dataType) {
            /* No data */
            case 0x00:
                return;
            case 0x10:
                return buffer.readUint8() ? true : false;
            case 0x20:
                return buffer.readUint8();
            case 0x21:
                return buffer.readUint16();
            case 0x30:
                return buffer.readUint8();
            case 0x42:
                return buffer.readVString();
            default:
                throw new Error('TODO: zcl/DataTypes.read - Unknown data type 0x' + parseInt(dataType).toString(16));
        }
    }
};

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}