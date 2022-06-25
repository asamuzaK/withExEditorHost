/**
 * common.js
 */

/* constants */
const TYPE_FROM = 8;
const TYPE_TO = -1;

/**
 * throw error
 *
 * @param {!object} e - Error
 * @throws - Error
 */
export const throwErr = e => {
  throw e;
};

/**
 * log error
 *
 * @param {!object} e - Error
 * @returns {boolean} - false
 */
export const logErr = e => {
  console.error(e);
  return false;
};

/**
 * log warn
 *
 * @param {*} msg - message
 * @returns {boolean} - false
 */
export const logWarn = msg => {
  if (msg) {
    console.warn(msg);
  }
  return false;
};

/**
 * log message
 *
 * @param {*} msg - message
 * @returns {*} - message
 */
export const logMsg = msg => {
  if (msg) {
    console.log(msg);
  }
  return msg;
};

/**
 * get type
 *
 * @param {*} o - object to check
 * @returns {string} - type of object
 */
export const getType = o =>
  Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

/**
 * is object, and not an empty object
 *
 * @param {*} o - object to check;
 * @returns {boolean} - result
 */
export const isObjectNotEmpty = o => {
  const items = /Object/i.test(getType(o)) && Object.keys(o);
  return !!(items?.length);
};

/**
 * is string
 *
 * @param {*} o - object to check
 * @returns {boolean} - result
 */
export const isString = o => typeof o === 'string' || o instanceof String;

/**
 * escape matching char
 *
 * @param {string} str - argument
 * @param {RegExp} re - RegExp
 * @returns {?string} - string
 */
export const escapeChar = (str, re) =>
  isString(str) && re?.global ? str.replace(re, (m, c) => `\\${c}`) : null;

/**
 * quote arg
 *
 * @param {string} arg - argument
 * @returns {string} - argument
 */
export const quoteArg = arg => {
  if (isString(arg) && arg.includes(' ')) {
    arg = `"${escapeChar(arg, /(")/g)}"`;
  }
  return arg;
};
