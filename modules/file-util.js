/**
 * file-util.js
 */
"use strict";
{
  /* api */
  const {URL} = require("url");
  const {getType, isString, stringifyPositiveInt} = require("./common");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");

  /* constants */
  const DIR_HOME = os.homedir();
  const IS_WIN = os.platform() === "win32";
  const MASK_BIT = 0o111;
  const PERM_DIR = 0o777;
  const PERM_FILE = 0o666;
  const SUBST = "index";

  /**
   * get file name from native file path
   * @param {string} file - file path
   * @param {string} subst - substitute file name
   * @returns {string} - file name
   */
  const getFileNameFromFilePath = (file, subst = SUBST) => {
    const name = isString(file) &&
                   /^([^.]+)(?:\..+)?$/.exec(path.basename(file));
    return name && name[1] || subst;
  };

  /**
   * convert URI to native file path
   * @param {string} uri - URI
   * @returns {?string} - file path
   */
  const convUriToFilePath = uri => {
    if (!isString(uri)) {
      throw new TypeError(`Expected String but got ${getType(uri)}.`);
    }
    const {protocol, pathname} = new URL(uri);
    let file;
    if (protocol === "file:" && pathname) {
      if (IS_WIN) {
        const arr = pathname.split("/");
        file = arr.reduce((p, c) =>
          p && path.join(p, decodeURIComponent(c)) || decodeURIComponent(c)
        );
      } else {
        file = decodeURIComponent(pathname);
      }
    }
    return file || null;
  };

  /**
   * get absolute path
   * @param {string} file - file path
   * @returns {?string} - absolute file path
   */
  const getAbsPath = file => {
    let abs;
    if (isString(file)) {
      file = path.normalize(file);
      file.startsWith("~") && (file = file.replace(/^~/, DIR_HOME));
      !path.isAbsolute(file) && (file = path.resolve(file));
      abs = file;
    }
    return abs || null;
  };

  /**
   * get stat
   * @param {string} file - file path
   * @returns {Object} - file stat
   */
  const getStat = file =>
    isString(file) && fs.existsSync(file) && fs.statSync(file) || null;

  /**
   * the directory is a directory
   * @param {string} dir - directory path
   * @returns {boolean} - result
   */
  const isDir = dir => {
    const stat = getStat(dir);
    return stat && stat.isDirectory() || false;
  };

  /**
   * the directory is a subdirectory of a certain directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {boolean} - result
   */
  const isSubDir = (dir, baseDir) =>
    isDir(dir) && isDir(baseDir) && dir.startsWith(baseDir);

  /**
   * the file is a file
   * @param {string} file - file path
   * @returns {boolean} - result
   */
  const isFile = file => {
    const stat = getStat(file);
    return stat && stat.isFile() || false;
  };

  /**
   * the file is executable
   * NOTE: On Windows, fs.statSync(file).mode returns 33206 for executable
   * files like `.exe`, which is 100666 in octal.
   * @param {string} file - file path
   * @param {number} mask - mask bit
   * @returns {boolean} - result
   */
  const isExecutable = (file, mask = MASK_BIT) => {
    const stat = getStat(file);
    return stat && (
      !!(stat.mode & mask) || IS_WIN && /\.(?:bat|cmd|exe|ps1|wsh)$/i.test(file)
    ) || false;
  };

  /**
   * get file timestamp
   * @param {string} file - file path
   * @returns {number} - timestamp
   */
  const getFileTimestamp = file => {
    const stat = getStat(file);
    return stat && stat.mtime.getTime() || 0;
  };

  /**
   * remove the directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {void}
   */
  const removeDir = (dir, baseDir) => {
    if (!isSubDir(dir, baseDir)) {
      throw new Error(`${dir} is not a subdirectory of ${baseDir}.`);
    }
    const files = fs.readdirSync(dir);
    files.length && files.forEach(file => {
      const cur = path.join(dir, file);
      if (fs.lstatSync(cur).isDirectory()) {
        removeDir(cur, baseDir);
      } else {
        fs.unlinkSync(cur);
      }
    });
    fs.rmdirSync(dir);
  };

  /**
   * create a directory
   * @param {Array} arr - directory array
   * @param {string|number} mode - permission
   * @returns {?string} - directory path
   */
  const createDir = (arr, mode = PERM_DIR) => {
    if (!Array.isArray(arr)) {
      throw new TypeError(`Expected Array but got ${getType(arr)}.`);
    }
    const dir = arr.length && arr.reduce((p, c) => {
      let d;
      p = isString(p) && p || stringifyPositiveInt(p, true);
      if (p) {
        const v = isString(c) && c || stringifyPositiveInt(c, true);
        d = v && path.join(p, v) || p;
        !fs.existsSync(d) && fs.mkdirSync(d, mode);
      }
      return d;
    });
    return isDir(dir) && dir || null;
  };

  /**
   * create a file
   * @param {string} file - file path
   * @param {string|Buffer|Uint8Array} value - value to write
   * @param {Object} opt - option
   * @param {string} [opt.encoding] - encoding
   * @param {string} [opt.flag] - flag
   * @param {number|string} [opt.mode] - file permission
   * @returns {?string} - file path
   */
  const createFile = (file, value,
                      opt = {encoding: null, flag: "w", mode: PERM_FILE}) => {
    if (!isString(file)) {
      throw new TypeError(`Expected String but got ${getType(file)}.`);
    }
    if (!isString(value) && !Buffer.isBuffer(value) &&
        !(value instanceof Uint8Array)) {
      throw new TypeError(
        `Expected String, Buffer, Uint8Array but got ${getType(value)}.`
      );
    }
    fs.writeFileSync(file, value, opt);
    return isFile(file) && file || null;
  };

  /**
   * read a file
   * @param {string} file - file path
   * @param {Object} opt - option
   * @param {string} [opt.encoding] - encoding
   * @param {string} [opt.flag] - flag
   * @returns {string|Buffer} - file content
   */
  const readFile = (file, opt = {encoding: null, flag: "r"}) => {
    if (!isFile(file)) {
      throw new Error(`${file} is not a file.`);
    }
    const value = fs.readFileSync(file, opt);
    return value;
  };

  module.exports = {
    convUriToFilePath, createDir, createFile, getAbsPath,
    getFileNameFromFilePath, getFileTimestamp, getStat, isDir,
    isExecutable, isFile, isSubDir, removeDir, readFile,
  };
}
