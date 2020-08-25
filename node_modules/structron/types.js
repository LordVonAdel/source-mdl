/**
 * Inbuilt types
 */

module.exports = {
  /* 
   * Signed 4 byte LE Integer 
   */
  INT: {
    read(buffer, offset) {
      return buffer.readInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Unsigned 4 byte LE integer
   */
  UINT: {
    read(buffer, offset) {
      return buffer.readUInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Signed 16 bit LE integer
   */
  SHORT: {
    read(buffer, offset) {
      return buffer.readInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * Unsigned 16 bit LE integer
   */
  USHORT: {
    read(buffer, offset) {
      return buffer.readUInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * 4 Byte LE float
   */
  FLOAT: {
    read(buffer, offset) {
      return buffer.readFloatLE(offset)
    },
    SIZE: 4
  },

  /**
   * 1 Byte char
   */
  CHAR: {
    read(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * Unsigned 8 bit int
   */
  BYTE: {
    read(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * String with fixed Length
   * @param {Number} length Length to read
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  STRING(length, encoding = "ascii") {
    return {
      read(buffer, offset) {
        return buffer.toString(encoding, offset, offset + length).replace(/\0/g, '');
      },
      SIZE: length
    }
  },

  /**
   * Null terminated string. Don't use this type in a struct. Only as reference!
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  NULL_TERMINATED_STRING(encoding = "ascii") {
    return {
      read(buffer, offset, report = null) {
        let len = 0;
        while (buffer.readUInt8(offset + len) != 0) {
          len++;
        }

        // Also report last byte as used information
        if (report) {
          report.markAreaAsRead(offset, len + 1)
        }

        return buffer.toString(encoding, offset, offset + len);
      },
      SIZE: NaN
    }
  },

  /**
   * Skips a given amount of bytes
   * @param {Number} length Number of bytes to skip
   */
  SKIP(length) {
    return {
      read() { return null },
      SIZE: length
    }
  }
}