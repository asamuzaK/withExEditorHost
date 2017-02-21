/**
 * native-message.js
 */
"use strict";
{
  /* api */
  const {isString} = require("./common");
  const os = require("os");

  /* constants */
  const BYTE_LEN = 4;
  const CHAR = "utf8";
  const IS_BE = os.endianness() === "BE";

  /* Input */
  class Input {
    /**
     * decode message from buffer
     */
    constructor() {
      this._input;
      this._length;
    }

    /**
     * buffer to message
     * @returns {Array} - message array
     */
    _decoder() {
      let arr = [];
      !this._length && this._input && this._input.length >= BYTE_LEN && (
        this._length = IS_BE && this._input.readUIntBE(0, BYTE_LEN) ||
                       this._input.readUIntLE(0, BYTE_LEN),
        this._input = this._input.slice(BYTE_LEN)
      );
      if (this._length && this._input && this._input.length >= this._length) {
        const buf = this._input.slice(0, this._length);
        arr.push(JSON.parse(buf.toString(CHAR)));
        this._input = this._input.length > this._length &&
                      this._input.slice(this._length) || null;
        this._length = null;
        if (this._input) {
          const cur = this._decoder();
          cur.length && (arr = arr.concat(cur));
        }
      }
      return arr;
    }

    /**
     * decode message
     * @param {string|Buffer} chunk - chunk
     * @returns {?Array} - message array
     */
    decode(chunk) {
      const buf = (isString(chunk) || Buffer.isBuffer(chunk)) &&
                    Buffer.from(chunk);
      let msg = [];
      buf &&
        (this._input = this._input && Buffer.concat([this._input, buf]) || buf);
      this._input && this._input.length >= BYTE_LEN && (msg = this._decoder());
      return msg.length && msg || null;
    }
  }

  /* Output */
  class Output {
    /* encode message to buffer */
    constructor() {
      this._output;
    }

    /**
     * message to buffer
     * @returns {?Buffer} - buffered message
     */
    _encoder() {
      let msg = JSON.stringify(this._output);
      if (isString(msg)) {
        const buf = Buffer.from(msg);
        const len = Buffer.alloc(BYTE_LEN);
        IS_BE && len.writeUIntBE(buf.length, 0, BYTE_LEN) ||
        len.writeUIntLE(buf.length, 0, BYTE_LEN);
        msg = Buffer.concat([len, buf]);
      }
      this._output = null;
      return Buffer.isBuffer(msg) && msg || null;
    }

    /**
     * encode message
     * @param {Object} msg - message
     * @returns {?Buffer} - buffered message
     */
    encode(msg) {
      this._output = msg;
      msg = this._encoder();
      return Buffer.isBuffer(msg) && msg || null;
    }
  }

  module.exports = {
    Input, Output,
  };
}
