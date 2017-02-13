/**
 * file-util.js
 */
"use strict";
{
  /* api */
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const url = require("url");

  /* constants */
  const CHAR = "utf8";
  const IS_WIN = os.platform() === "win32";
  const MASK_BIT = 0o111;
  const PERM_FILE = 0o666;
  const PERM_DIR = 0o777;
  const SUBST = "index";
  const TMP_DIR = os.tmpdir();

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
   * @returns {Object} - Promise.<?string> file path
   */
  const convUriToFilePath = uri => new Promise(resolve => {
    let file;
    if (isString(uri)) {
      const {protocol, pathname} = url.parse(uri, false, true);
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
    }
    resolve(file || null);
  });

  /**
   * the file is a file
   * @param {string} file - file path
   * @returns {boolean} - result
   */
  const isFile = file =>
    isString(file) && fs.existsSync(file) && fs.statSync(file).isFile();

  /**
   * the file is executable
   * @param {string} file - file path
   * @param {number} mask - mask bit
   * @returns {boolean} - result
   */
  // FIXME: on Windows, fs.statSync(file).mode returns 33206 for `.exe` file,
  // which is 100666 in octal.
  const isExecutable = (file, mask = MASK_BIT) =>
    isFile(file) && (
      !!(fs.statSync(file).mode & mask) || IS_WIN && /\.exe$/.test(file)
    );

  /**
   * the directory is a directory
   * @param {string} dir - directory path
   * @returns {boolean} - result
   */
  const isDir = dir =>
    isString(dir) && fs.existsSync(dir) && fs.statSync(dir).isDirectory();

  /**
   * the directory belongs to a certain directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {boolean} - result
   */
  const isSubDir = (dir, baseDir = TMP_DIR) =>
    isDir(dir) && isDir(baseDir) && dir.startsWith(baseDir);

  /**
   * remove the directory
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {Object} - Promise.<Array.<*>>
   */
  const removeDir = (dir, baseDir = TMP_DIR) => {
    const arr = [];
    if (isSubDir(dir, baseDir)) {
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
      arr.push(Promise.all(func).then(() => fs.rmdirSync(dir)));
    }
    return Promise.all(arr);
  };

  /**
   * remove the directory sync
   * @param {string} dir - directory path
   * @param {string} baseDir - base directory path
   * @returns {void}
   */
  const removeDirSync = (dir, baseDir = TMP_DIR) => {
    if (isSubDir(dir, baseDir)) {
      const files = fs.readdirSync(dir);
      files.length && files.forEach(file => {
        const cur = path.join(dir, file);
        if (fs.lstatSync(cur).isDirectory()) {
          removeDirSync(cur);
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
  const createDir = (arr, mode = PERM_DIR) => new Promise(resolve => {
    let dir;
    if (arr.length) {
      dir = arr.reduce((p, c) => {
        let d;
        p = isString(p) && p || stringifyPositiveInt(p, true);
        if (p) {
          const v = isString(c) && c || stringifyPositiveInt(c, true);
          d = v && path.join(p, v) || p;
          !fs.existsSync(d) && fs.mkdirSync(d, mode);
        }
        return d;
      });
    }
    resolve(dir || null);
  });

  /**
   * create a file
   * @param {string} file - file path
   * @param {string} value - value to write
   * @param {Function} callback - callback when write completes
   * @param {Object} opt - callback option
   * @param {number|string} mode - file permission
   * @param {string} encoding - file encoding
   * @returns {void}
   */
  const createFile = (file, value = "", callback = null, opt = null,
                      mode = PERM_FILE, encoding = CHAR) => {
    isString(file) && fs.writeFile(file, value, {encoding, mode}, e => {
      if (e) {
        throw e;
      }
      callback && callback(file, opt);
    });
  };

  /**
   * read a file
   * @param {string} file - file path
   * @param {Function} callback - callback when read completes
   * @param {Object} opt - callback option
   * @param {string} encoding - file encoding
   * @returns {void}
   */
  const readFile = (file, callback = null, opt = null, encoding = CHAR) => {
    isFile(file) && fs.readFile(file, encoding, (e, value) => {
      if (e) {
        throw e;
      }
      callback && callback(value, opt);
    });
  };

  /**
   * get file timestamp
   * @param {string} file - file path
   * @returns {number} - timestamp
   */
  const getFileTimestamp = file =>
    isString(file) && fs.existsSync(file) &&
    fs.statSync(file).mtime.getTime() || 0;

  module.exports = {
    convUriToFilePath, createDir, createFile, getFileNameFromFilePath,
    getFileTimestamp, isDir, isExecutable, isFile, isSubDir, removeDir,
    removeDirSync, readFile,
  };
}
