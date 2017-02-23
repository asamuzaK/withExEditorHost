/**
 * common.js
 */
"use strict";
{
  /* constants */
  const TYPE_FROM = 8;
  const TYPE_TO = -1;

  /**
   * throw error
   * @param {!Object} e - Error
   * @throws - Error
   */
  const throwErr = e => {
    throw e;
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * log warn
   * @param {*} msg - message
   * @returns {boolean} - false
   */
  const logWarn = msg => {
    msg && console.warn(msg);
    return false;
  };

  /**
   * log message
   * @param {*} msg - message
   * @returns {*} - message
   */
  const logMsg = msg => {
    msg && console.log(msg);
    return msg;
  };

  /**
   * get type
   * @param {*} o - object to check
   * @returns {string} - type of object
   */
  const getType = o =>
    Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * stringify positive integer
   * @param {number} i - integer
   * @param {boolean} zero - treat 0 as a positive integer
   * @returns {?string} - stringified integer
   */
  const stringifyPositiveInt = (i, zero = false) =>
    Number.isSafeInteger(i) && (zero && i >= 0 || i > 0) && `${i}` || null;

  /**
   * correct the argument
   * @param {string} arg - argument
   * @returns {string} - argument
   */
  const correctArg = arg => {
    if (/^\s*(?:".*"|'.*')\s*$/.test(arg)) {
      arg = arg.trim();
      /^".*\\["\\].*"$/.test(arg) &&
        (arg = arg.replace(/\\"/g, "\"").replace(/\\\\/g, "\\"));
      arg = arg.replace(/^['"]/, "").replace(/["']$/, "");
    } else {
      /^.*\\.*$/.test(arg) && (arg = arg.replace(/\\(?!\\)/g, ""));
      /".*"|'.*'/.test(arg) &&
        (arg = arg.replace(/"([^"]+)*"|'([^']+)*'/g, (m, c1, c2) => c1 || c2));
    }
    return arg;
  };

  /**
   * concat arguments array
   * @param {...(string|Array)} args - arguments
   * @returns {Array} - arguments array
   */
  const concatArgs = (...args) => {
    const reCmd = /(?:^|\s)(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?=\s|$)|(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?:(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*'))*(?:\\ |[^\s])*|(?:[^"'\s\\]|\\[^\s]|\\ )+/g;
    const arr = args.map(arg => {
      isString(arg) && (arg = arg.match(reCmd));
      return Array.isArray(arg) && arg.map(correctArg) || [];
    });
    return arr.length && arr.reduce((a, b) => a.concat(b)) || [];
  };

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @returns {string} - converted value
   */
  const stripHtmlTags = v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "")
            .replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!--.*-->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n")
             .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  module.exports = {
    concatArgs, correctArg, getType, isString, logError, logMsg, logWarn,
    stringifyPositiveInt, stripHtmlTags, throwErr,
  };
}
