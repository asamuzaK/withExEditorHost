/**
 * index.js
 */
"use strict";
{
  /* api */
  const {Input, Output} = require("./modules/native-message");
  const {concatArgs, isString, throwErr} = require("./modules/common");
  const {
    convUriToFilePath, createDir, createFile, getFileNameFromFilePath,
    getFileTimestamp, isDir, isExecutable, isFile, removeDir, readFile,
  } = require("./modules/file-util");
  const {execFile} = require("child_process");
  const os = require("os");
  const path = require("path");
  const process = require("process");

  /* constants */
  const {
    EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, HOST, LABEL, LOCAL_FILE_VIEW,
    PROCESS_CHILD, TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE,
    TMP_FILE_CREATE, TMP_FILE_DATA_PORT, TMP_FILE_GET, TMP_FILE_RES,
  } = require("./modules/constant");
  const APP = `${process.pid}`;
  const CHAR = "utf8";
  const CMD_ARGS = "cmdArgs";
  const DIR_TMP = [os.tmpdir(), LABEL, APP];
  const DIR_TMP_FILES = [...DIR_TMP, TMP_FILES];
  const DIR_TMP_FILES_PB = [...DIR_TMP, TMP_FILES_PB];
  const EDITOR_PATH = "editorPath";
  const FILE_AFTER_ARGS = "fileAfterCmdArgs";

  /* variables */
  const vars = {
    [CMD_ARGS]: [],
    [EDITOR_PATH]: "",
    [FILE_AFTER_ARGS]: false,
  };

  /**
   * host message
   * @param {*} message - message
   * @param {string} status - status
   * @returns {Object} - host message object
   */
  const hostMsg = (message, status) => ({
    [HOST]: {
      message, status,
      pid: APP,
    },
  });

  /**
   * handle rejection
   * @param {*} e - Error or any
   * @returns {boolean} - false
   */
  const handleReject = e => {
    e = (new Output()).encode(hostMsg(e, "error"));
    e && process.stdout.write(e);
    return false;
  };

  /* child process */
  /**
   * spawn child process
   * @param {string} file - file path
   * @returns {Object} - Promise.<?ChildProcess>
   */
  const spawnChildProcess = file => new Promise(resolve => {
    const app = vars[EDITOR_PATH];
    const pos = vars[FILE_AFTER_ARGS] || false;
    let args = vars[CMD_ARGS] || [], proc;
    if (isFile(file) && isExecutable(app)) {
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
        if (e) {
          e = output.encode(e);
          e && process.stderr.write(e);
        }
        if (stderr) {
          stderr = output.encode(
            hostMsg(`${stderr}: ${app}`, `${PROCESS_CHILD}_stderr`)
          );
          stderr && process.stdout.write(stderr);
        }
        if (stdout) {
          stdout = output.encode(
            hostMsg(`${stdout}: ${app}`, `${PROCESS_CHILD}_stdout`)
          );
          stdout && process.stdout.write(stdout);
        }
      });
    }
    resolve(proc || null);
  });

  /* output */
  /**
   * write stdout
   * @param {*} msg - message
   * @returns {Object} - Promise.<?Function>
   */
  const writeStdout = msg => new Promise(resolve => {
    msg = (new Output()).encode(msg);
    resolve(msg && process.stdout.write(msg) || null);
  });

  /**
   * port app status
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const portAppStatus = () => writeStdout(hostMsg(EDITOR_CONFIG_GET, "ready"));

  /**
   * port editor config
   * @param {string} data - editor config
   * @param {string} editorConfig - editor config file path
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const portEditorConfig = (data, editorConfig) => new Promise(resolve => {
    let msg;
    try {
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
          [EDITOR_CONFIG_RES]: {
            editorConfig, editorName, editorPath, executable,
          },
        };
      }
    } catch (e) {
      msg = hostMsg(`${e}: ${editorConfig}`, "error");
    }
    resolve(msg || null);
  }).then(writeStdout);

  /**
   * port file data
   * @param {string} filePath - file path
   * @param {Object} data - file data
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const portFileData = (filePath, data = {}) => new Promise(resolve => {
    let msg;
    if (isString(filePath)) {
      data.filePath = filePath;
      msg = {
        [TMP_FILE_DATA_PORT]: {filePath, data},
      };
    }
    resolve(msg || null);
  }).then(writeStdout);

  /**
   * port temporary file
   * @param {Object} obj - temporary file data object
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const portTmpFile = (obj = {}) => new Promise(resolve => {
    const msg = Object.keys(obj).length && {
      [TMP_FILE_RES]: obj,
    };
    resolve(msg || null);
  }).then(writeStdout);

  /* temporary files */
  /**
   * remove private temporary files
   * @param {boolean} bool - remove
   * @returns {void} - Promise.<void>
   */
  const removePrivateTmpFiles = bool => new Promise(resolve => {
    if (bool) {
      const dir = path.join(...DIR_TMP_FILES_PB);
      removeDir(dir);
      !isDir(dir) && createDir(DIR_TMP_FILES_PB);
    }
    resolve();
  });

  /**
   * create temporary file
   * @param {Object} obj - temporary file data object
   * @returns {Object} - Promise.<Object>, temporary file data
   */
  const createTmpFile = (obj = {}) => new Promise(resolve => {
    const {data, value} = obj;
    let filePath;
    if (data) {
      const {dir, fileName, host, tabId, windowId} = data;
      const arr = dir && windowId && tabId && host &&
                    [...DIR_TMP, dir, windowId, tabId, host];
      const dPath = arr && createDir(arr);
      filePath = dPath === path.join(...arr) &&
                   createFile(path.join(dPath, fileName), value);
    }
    resolve(data && filePath && {data, filePath} || null);
  });

  /**
   * append file timestamp
   * @param {Object} data - temporary file data
   * @returns {Object} - Promise.<Object>, temporary file data
   */
  const appendTimestamp = (data = {}) => new Promise(resolve => {
    const {filePath} = data;
    data.timestamp = filePath && getFileTimestamp(filePath) || 0;
    resolve(data);
  });

  /**
   * extract temporary file data
   * @param {Array} arr - array containing temporary file data and value
   * @returns {Object} - Promise.<Object>, temporary file data object
   */
  const extractTmpFileData = (arr = []) => new Promise(resolve => {
    let obj;
    if (Array.isArray(arr) && arr.length) {
      const [data, value] = arr;
      obj = {data, value};
    }
    resolve(obj || null);
  });

  /**
   * get temporary file
   * @param {Object} obj - temporary file data
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const getTmpFile = (obj = {}) => {
    const {filePath} = obj;
    const func = [];
    if (filePath) {
      func.push(appendTimestamp(obj));
      func.push(readFile(filePath));
    }
    return Promise.all(func).then(extractTmpFileData);
  };

  /* local files */
  /**
   * get editor config
   * @param {string} filePath - editor config file path
   * @returns {Object} - Promise.<Array>
   */
  const getEditorConfig = filePath => {
    const func = [];
    filePath = isString(filePath) && filePath.length && filePath ||
               path.resolve(path.join(".", "editorconfig.json"));
    if (isFile(filePath)) {
      func.push(
        readFile(filePath).then(data => portEditorConfig(data, filePath))
      );
    } else {
      func.push(writeStdout(hostMsg(`${filePath} is not a file.`, "warn")));
      func.push(writeStdout({[EDITOR_CONFIG_RES]: null}));
    }
    return Promise.all(func);
  };

  /**
   * view local file
   * @param {string} uri - local file uri
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const viewLocalFile = uri => convUriToFilePath(uri).then(spawnChildProcess);

  /* handlers */
  /**
   * handle created temporary file
   * @param {Object} obj - temporary file data
   * @returns {Object} - Promise.<Array>
   */
  const handleCreatedTmpFile = (obj = {}) => {
    const {filePath, data} = obj;
    const func = [];
    if (filePath) {
      func.push(spawnChildProcess(filePath));
      func.push(portFileData(filePath, data));
    }
    return Promise.all(func);
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Object} - Promise.<Array>
   */
  const handleMsg = msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case EDITOR_CONFIG_GET:
            func.push(getEditorConfig(obj));
            break;
          case LOCAL_FILE_VIEW:
            func.push(viewLocalFile(obj));
            break;
          case TMP_FILE_CREATE:
            func.push(createTmpFile(obj).then(handleCreatedTmpFile));
            break;
          case TMP_FILE_GET:
            func.push(getTmpFile(obj).then(portTmpFile));
            break;
          case TMP_FILES_PB_REMOVE:
            func.push(removePrivateTmpFiles(obj));
            break;
          default:
            func.push(
              writeStdout(hostMsg(`No handler found for ${item}.`, "warn"))
            );
        }
      }
    } else {
      func.push(writeStdout(hostMsg(`No handler found for ${msg}.`, "warn")));
    }
    return Promise.all(func);
  };

  /* input */
  const input = new Input();

  /**
   * read stdin
   * @param {string|Buffer} chunk - chunk
   * @returns {Object} - ?Promise.<Array>
   */
  const readStdin = chunk => {
    const arr = input.decode(chunk);
    const func = [];
    Array.isArray(arr) && arr.length && arr.forEach(msg => {
      msg && func.push(handleMsg(msg));
    });
    return func.length && Promise.all(func).catch(handleReject) || null;
  };

  /* exit */
  /**
   * handle exit
   * @param {number} code - exit code
   * @returns {void}
   */
  const handleExit = code => {
    const msg = (new Output()).encode(hostMsg(`exit ${code || 0}`, "exit"));
    removeDir(path.join(...DIR_TMP));
    msg && process.stdout.write(msg);
  };

  /* process */
  process.on("exit", handleExit);
  process.on("uncaughtException", throwErr);
  process.on("unhandleRejection", handleReject);
  process.stdin.on("data", readStdin);

  /* startup */
  Promise.all([
    createDir(DIR_TMP_FILES),
    createDir(DIR_TMP_FILES_PB),
  ]).then(portAppStatus).catch(handleReject);
}
