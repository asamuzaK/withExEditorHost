/**
 * index.js
 */
"use strict";
{
  /* api */
  const {Input, Output} = require("./modules/native-message");
  const {
    convUriToFilePath, createDir, createFile, getFileNameFromFilePath,
    getFileTimestamp, isExecutable, removeDir, removeDirSync, readFile,
  } = require("./modules/file-util");
  const {execFile} = require("child_process");
  const os = require("os");
  const path = require("path");
  const process = require("process");

  /* constants */
  const {
    CMD_ARGS, CMD_BEFORE_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES,
    EDITOR_PATH, LABEL, LABEL_HOST, LOCAL_FILE_VIEW, PORT_FILE_DATA,
    PROCESS_CHILD, SYNC_TEXT, TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE,
    TMP_FILE_CREATE, TMP_FILE_GET,
  } = require("./modules/constant");
  const APP = `${process.pid}`;
  const CHAR = "utf8";
  const DIR_TMP = [os.tmpdir(), LABEL, APP];
  const DIR_TMP_FILES = [...DIR_TMP, TMP_FILES];
  const DIR_TMP_FILES_PB = [...DIR_TMP, TMP_FILES_PB];

  /* variables */
  const vars = {
    [CMD_ARGS]: [],
    [CMD_BEFORE_FILE]: false,
    [EDITOR_PATH]: "",
  };

  /**
   * throw error
   * @param {!Object} e - Error
   * @throws - Error
   */
  const throwErr = e => {
    throw e;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

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

  /* child process */
  /**
   * spawn child process
   * @param {string} app - application path
   * @param {string} file - file path
   * @param {Array|string} args - command arguments
   * @param {boolean} pos - put command arguments before file path
   * @returns {Object} - Promise.<Object>, ?ChildProcess
   */
  const spawnChildProcess = (app, file = "", args = [], pos = false) =>
    new Promise(resolve => {
      let proc;
      if (isExecutable(app)) {
        const argA = pos && args || [file.replace(/\\/g, "\\\\")];
        const argB = pos && [file.replace(/\\/g, "\\\\")] || args;
        const opt = {
          cwd: null,
          encoding: CHAR,
          env: process.env,
        };
        args = concatArgs(argA, argB);
        proc = execFile(app, args, opt, (e, stdout, stderr) => {
          const output = new Output();
          let msg;
          if (e) {
            msg = output.write(e);
            msg && process.stderr.write(msg);
          }
          if (stderr) {
            msg = output.write({
              [LABEL_HOST]: {
                message: stderr,
                pid: APP,
                status: `${PROCESS_CHILD}_stderr`,
              },
            });
            msg && process.stdout.write(msg);
          }
          if (stdout) {
            msg = output.write({
              [LABEL_HOST]: {
                message: stdout,
                pid: APP,
                status: `${PROCESS_CHILD}_stdout`,
              },
            });
            msg && process.stdout.write(msg);
          }
        });
      }
      resolve(proc || null);
    });

  /* temporary files */
  /**
   * remove private temporary files
   * @param {boolean} bool - remove
   * @returns {Object} - ?Promise.<void>
   */
  const removePrivateTmpFiles = bool =>
    !!bool && removeDir(path.join(...DIR_TMP_FILES_PB)).then(() =>
      createDir(DIR_TMP_FILES_PB)
    );

  /**
   * create temporary file
   * @param {Object} obj - temporary file data object
   * @param {Function} callback - callback
   * @returns {Object} - Promise.<Object>
   */
  const createTmpFile = (obj = {}, callback = null) => new Promise(resolve => {
    const {data, value} = obj;
    const {dir, fileName, host, tabId, windowId} = data;
    const arr = dir && windowId && tabId && host &&
                [...DIR_TMP, dir, windowId, tabId, host];
    const func = arr && fileName && createDir(arr).then(dPath =>
      dPath === path.join(...arr) &&
      createFile(path.join(dPath, fileName), value, callback, data) || null
    );
    resolve(func || null);
  });

  /**
   * append file timestamp
   * @param {Object} data - temporary file data
   * @returns {Object} - Promise.<Object>, temporary file data
   */
  const appendTimestamp = (data = {}) => new Promise(resolve => {
    const {filePath} = data;
    const timestamp = filePath && getFileTimestamp(filePath);
    data.timestamp = timestamp || 0;
    resolve(data);
  });

  /**
   * get temporary file
   * @param {Object} data - temporary file data
   * @param {Function} callback - callback
   * @returns {Object} - Promise.<void>
   */
  const getTmpFile = (data = {}, callback = null) => new Promise(resolve => {
    const {filePath} = data;
    resolve(filePath && readFile(filePath, callback, data) || null);
  });

  /* native messaging */
  /**
   * write stdout
   * @param {*} msg - message
   * @returns {Object} - Promise.<?boolean>
   */
  const writeStdout = msg => new Promise(resolve => {
    const outputMsg = (new Output()).write(msg);
    resolve(outputMsg && process.stdout.write(outputMsg) || null);
  });

  /**
   * port app status
   * @returns {Object} - Promise.<?boolean>
   */
  const portAppStatus = () => writeStdout({
    [LABEL_HOST]: {
      message: EDITOR_CONFIG_GET,
      pid: APP,
      status: "ready",
    },
  });

  /**
   * port editor config
   * @param {string} data - editor config
   * @returns {Object} - Promise.<?boolean>
   */
  const portEditorConfig = data => new Promise(resolve => {
    let msg;
    data = data && JSON.parse(data);
    if (data) {
      const {editorPath} = data;
      const editorName = getFileNameFromFilePath(editorPath);
      const executable = isExecutable(editorPath);
      const items = Object.keys(data);
      if (items.length) {
        for (const item of items) {
          vars[item] = data[item];
        }
      }
      msg = {
        [EDITOR_CONFIG_RES]: {editorName, editorPath, executable},
      };
    }
    resolve(msg || null);
  }).then(writeStdout);

  /**
   * port file data
   * @param {string} filePath - file path
   * @param {Object} data - file data
   * @returns {Object} - Promise.<?boolean>
   */
  const portFileData = (filePath, data = {}) => new Promise(resolve => {
    let msg;
    if (isString(filePath)) {
      data.filePath = filePath;
      msg = {
        [PORT_FILE_DATA]: {filePath, data},
      };
    }
    resolve(msg || null);
  }).then(writeStdout);

  /**
   * port sync text
   * @param {Object} value - text
   * @param {Object} data - file data
   * @returns {Object} - Promise.<?boolean>
   */
  const portSyncText = (value, data) => new Promise(resolve => {
    let msg;
    if (value && data) {
      const {dataId, tabId} = data;
      msg = {
        [SYNC_TEXT]: {data, dataId, tabId, value},
      };
    }
    resolve(msg || null);
  }).then(writeStdout).catch(throwErr);

  /**
   * handle created temporary file
   * @param {string} filePath - file path
   * @param {Object} data - file data
   * @returns {Object} - Promise.<Array.<*>>
   */
  const handleCreatedTmpFile = (filePath, data = {}) => Promise.all([
    spawnChildProcess(
      vars[EDITOR_PATH], filePath, vars[CMD_ARGS], vars[CMD_BEFORE_FILE]
    ),
    portFileData(filePath, data),
  ]).catch(throwErr);

  /**
   * handle message
   * @param {Array} msg - message
   * @returns {Object} - Promise.<Array<*>>
   */
  const handleMsg = msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case EDITOR_CONFIG_GET:
            func.push(readFile(obj, portEditorConfig));
            break;
          case LOCAL_FILE_VIEW:
            func.push(convUriToFilePath(obj.uri).then(spawnChildProcess));
            break;
          case TMP_FILE_CREATE:
            func.push(createTmpFile(obj, handleCreatedTmpFile));
            break;
          case TMP_FILE_GET:
            func.push(appendTimestamp(obj).then(data =>
              getTmpFile(data, portSyncText)
            ));
            break;
          case TMP_FILES_PB_REMOVE:
            func.push(removePrivateTmpFiles(obj));
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /* input */
  const input = new Input();

  /**
   * read stdin
   * @param {string|Buffer} chunk - chunk
   * @returns {void}
   */
  const readStdin = chunk => input.read(chunk, handleMsg);

  /* exit */
  /**
   * handle exit
   * @param {number} code - exit code
   * @returns {void}
   */
  const handleExit = code => {
    const msg = (new Output()).write({
      [LABEL_HOST]: {
        message: code || 0,
        pid: APP,
        status: "exit",
      },
    });
    removeDirSync(path.join(...DIR_TMP));
    msg && process.stdout.write(msg);
  };

  /* process */
  process.on("exit", handleExit);
  process.on("uncaughtException", throwErr);
  process.stdin.on("data", readStdin);

  /* startup */
  Promise.all([
    createDir(DIR_TMP_FILES),
    createDir(DIR_TMP_FILES_PB),
  ]).then(portAppStatus).catch(throwErr);
}
