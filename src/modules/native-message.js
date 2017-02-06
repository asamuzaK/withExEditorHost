/**
 * native-message.js
 */
"use strict";
{
  /* api */
  const os = require("os");
  const process = require("process");

  /* constants */
  const BYTE_LEN = 4;
  const CHAR = "utf8";
  const IS_BE = os.endianness() === "BE";

  /**
   * is function
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isFunction = o => typeof o === "function";

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

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
     * decode message
     * @returns {Array} - message array
     */
    _decodeMessage() {
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
          const cur = this._decodeMessage();
          cur.length && (arr = arr.concat(cur));
        }
      }
      return arr;
    }

    /**
     * read input
     * @param {string|Buffer} chunk - chunk
     * @param {Function} callback - callback
     * @returns {void}
     */
    read(chunk, callback) {
      const buf = (isString(chunk) || Buffer.isBuffer(chunk)) &&
                    Buffer.from(chunk);
      buf &&
        (this._input = this._input && Buffer.concat([this._input, buf]) || buf);
      if (callback) {
        const arr = this._decodeMessage();
        arr.length && arr.forEach(a => a && callback(a));
      }
    }
  }

  /* Output */
  class Output {
    /* encode message to buffer */
    constructor() {
      this._output;
    }

    /**
     * encode message
     * @returns {?Buffer} - buffered message
     */
    _encodeMessage() {
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
     * write output
     * @param {Object} msg - message
     * @returns {?Buffer} - buffered message
     */
    write(msg) {
      this._output = msg;
      msg = this._encodeMessage();
      return Buffer.isBuffer(msg) && msg || null;
    }
  }

  module.exports = {
    Input, Output,
  };
}
