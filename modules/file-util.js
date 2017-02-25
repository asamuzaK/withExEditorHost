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
  const CHAR = "utf8";
  const DIR_TMP = os.tmpdir();
  const IS_WIN = os.platform() === "win32";
  const MASK_BIT = 0o111;
  const PERM_FILE = 0o666;
  const PERM_DIR = 0o777;
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
   * @returns {Object} - Promise.<?string>, file path
   */
  const convUriToFilePath = async uri => {
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
   * get stat
   * @param {string} file - file path
   * @returns {Object} - Promise.<Object>, file stat
   */
  const getStat = async file =>
    isString(file) && fs.existsSync(file) && fs.statSync(file) || null;

  /**
   * get stat, sync
   * @param {string} file - file path
   * @returns {Object} - file stat
   */
  const getStatSync = file =>
    isString(file) && fs.existsSync(file) && fs.statSync(file) || null;

  /**
   * the directory is a directory
   * @param {string} dir - directory path
   * @returns {Object} - Promise.<boolean>, result
   */
  const isDir = async dir =>
    getStat(dir).then(stat => stat && stat.isDirectory() || false);

  /**
   * the directory is a directory, sync
   * @param {string} dir - directory path
   * @returns {boolean} - result
   */
  const isDirSync = dir => {
    const stat = getStatSync(dir);
    return stat && stat.isDirectory() || false;
  };

  /**
   * the directory is a subdirectory of a certain directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {Object} - Promose.<boolean>, result
   */
  const isSubDir = async (dir, baseDir = DIR_TMP) => {
    const arr = await Promise.all([
      isDir(dir),
      isDir(baseDir),
    ]);
    return arr.every(i => !!i) && dir.startsWith(baseDir);
  };

  /**
   * the directory is a subdirectory of a certain directory, sync
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {boolean} - result
   */
  const isSubDirSync = (dir, baseDir = DIR_TMP) =>
    isDirSync(dir) && isDirSync(baseDir) && dir.startsWith(baseDir);

  /**
   * the file is a file
   * @param {string} file - file path
   * @returns {Object} - Promise.<boolean>, result
   */
  const isFile = async file =>
    getStat(file).then(stat => stat && stat.isFile() || false);

  /**
   * the file is a file, sync
   * @param {string} file - file path
   * @returns {boolean} - result
   */
  const isFileSync = file => {
    const stat = getStatSync(file);
    return stat && stat.isFile() || false;
  };

  /**
   * the file is executable
   * NOTE: On Windows, fs.statSync(file).mode returns 33206 for executable
   * files like `.exe`, which is 100666 in octal.
   * @param {string} file - file path
   * @param {number} mask - mask bit
   * @returns {Object} - Promise.<boolean>, result
   */
  const isExecutable = async (file, mask = MASK_BIT) =>
    getStat(file).then(stat =>
      stat && (
        !!(stat.mode & mask) ||
        IS_WIN && /\.(?:bat|cmd|exe|ps1|wsh)$/i.test(file)
      ) || false
    );

  /**
   * the file is executable, sync
   * NOTE: On Windows, fs.statSync(file).mode returns 33206 for executable
   * files like `.exe`, which is 100666 in octal.
   * @param {string} file - file path
   * @param {number} mask - mask bit
   * @returns {boolean} - result
   */
  const isExecutableSync = (file, mask = MASK_BIT) => {
    const stat = getStatSync(file);
    return stat && (
      !!(stat.mode & mask) || IS_WIN && /\.(?:bat|cmd|exe|ps1|wsh)$/i.test(file)
    ) || false;
  };

  /**
   * get file timestamp
   * @param {string} file - file path
   * @returns {Object} - Promise.<number>, timestamp
   */
  const getFileTimestamp = async file =>
    getStat(file).then(stat => stat && stat.mtime.getTime() || 0);

  /**
   * get file timestamp, sync
   * @param {string} file - file path
   * @returns {number} - timestamp
   */
  const getFileTimestampSync = file => {
    const stat = getStatSync(file);
    return stat && stat.mtime.getTime() || 0;
  };

  /**
   * remove the directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {Object} - Promise.<Function>
   */
  const removeDir = async (dir, baseDir = DIR_TMP) => {
    if (await !isSubDir(dir, baseDir)) {
      throw new Error(`${dir} is not a subdirectory of ${baseDir}.`);
    }
    const files = fs.readdirSync(dir);
    const func = [];
    files.length && files.forEach(file => {
      const cur = path.join(dir, file);
      if (fs.lstatSync(cur).isDirectory()) {
        func.push(removeDir(cur, baseDir));
      } else {
        func.push(fs.unlinkSync(cur));
      }
    });
    await Promise.all(func);
    return fs.rmdirSync(dir);
  };

  /**
   * remove the directory sync
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {void}
   */
  const removeDirSync = (dir, baseDir = DIR_TMP) => {
    if (isSubDirSync(dir, baseDir)) {
      const files = fs.readdirSync(dir);
      files.length && files.forEach(file => {
        const cur = path.join(dir, file);
        if (fs.lstatSync(cur).isDirectory()) {
          removeDirSync(cur, baseDir);
        } else {
          fs.unlinkSync(cur);
        }
      });
      fs.rmdirSync(dir);
    }
  };

  /**
   * create a directory
   * @param {Array} arr - directory array
   * @param {string|number} mode - permission
   * @returns {Object} - Promise.<?string>, directory path
   */
  const createDir = async (arr, mode = PERM_DIR) => {
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
    return isDirSync(dir) && dir || null;
  };

  /**
   * create a file
   * @param {string} file - file path
   * @param {string|Buffer|Uint8Array} value - value to write
   * @param {Object} opt - option
   * @param {string} [opt.encoding] - encoding, note that default is not `null`
   * @param {string} [opt.flag] - flag
   * @param {number|string} [opt.mode] - file permission
   * @returns {Object} - Promise.<?string>, file path
   */
  const createFile = async (
    file, value, opt = {encoding: CHAR, flag: "w", mode: PERM_FILE}
  ) => {
    if (!isString(file)) {
      throw new TypeError(`Expected String but got ${getType(file)}.`);
    }
    if (!isString(value) && !Buffer.isBuffer(value) &&
        !(value instanceof Uint8Array)) {
      throw new TypeError(
        `Expected String, Buffer, Uint8Array but got ${getType(value)}.`
      );
    }
    await fs.writeFileSync(file, value, opt);
    return isFileSync(file) && file || null;
  };

  /**
   * read a file
   * @param {string} file - file path
   * @param {Object} opt - option
   * @param {string} [opt.encoding] - encoding, note that default is not `null`
   * @param {string} [opt.flag] - flag
   * @returns {Object} - Promise.<string|Buffer>, file content
   */
  const readFile = async (file, opt = {encoding: CHAR, flag: "r"}) => {
    if (await !isFile(file)) {
      throw new Error(`${file} is not a file.`);
    }
    const value = await fs.readFileSync(file, opt);
    return value;
  };

  module.exports = {
    convUriToFilePath, createDir, createFile, getFileNameFromFilePath,
    getFileTimestamp, getStat, isDir, isExecutable, isFile, isSubDir, removeDir,
    removeDirSync, readFile,
  };
}
