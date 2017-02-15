/**
 * index.js
 */
"use strict";
{
  /* api */
  const {Input, Output} = require("./modules/native-message");
  const {
    convUriToFilePath, createDir, createFile, getFileNameFromFilePath,
    getFileTimestamp, isExecutable, isFile, removeDir, removeDirSync, readFile,
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
   * @param {string} file - file path
   * @returns {Object} - Promise.<Object>, ?ChildProcess
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
          stderr = output.encode({
            [HOST]: {
              message: `${stderr}: ${app}`,
              pid: APP,
              status: `${PROCESS_CHILD}_stderr`,
            },
          });
          stderr && process.stdout.write(stderr);
        }
        if (stdout) {
          stdout = output.encode({
            [HOST]: {
              message: `${stdout}: ${app}`,
              pid: APP,
              status: `${PROCESS_CHILD}_stdout`,
            },
          });
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
   * @returns {Object} - Promise.<?boolean>
   */
  const writeStdout = msg => new Promise(resolve => {
    msg = (new Output()).encode(msg);
    resolve(msg && process.stdout.write(msg) || null);
  });

  /**
   * port app status
   * @returns {Object} - Promise.<?boolean>
   */
  const portAppStatus = () => writeStdout({
    [HOST]: {
      message: EDITOR_CONFIG_GET,
      pid: APP,
      status: "ready",
    },
  });

  /**
   * port editor config
   * @param {string} data - editor config
   * @param {string} editorConfig - editor config file path
   * @returns {Object} - Promise.<?boolean>
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
      msg = {
        [HOST]: {
          message: `${e}: ${editorConfig}`,
          pid: APP,
          status: "error",
        },
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
        [TMP_FILE_DATA_PORT]: {filePath, data},
      };
    }
    resolve(msg || null);
  }).then(writeStdout);

  /**
   * port temporary file
   * @param {Object} obj - temporary file data object
   * @returns {Object} - Promise.<?boolean>
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
   * @returns {Object} - ?Promise.<void>
   */
  const removePrivateTmpFiles = bool =>
    !!bool && removeDir(path.join(...DIR_TMP_FILES_PB)).then(() =>
      createDir(DIR_TMP_FILES_PB)
    ) || null;

  /**
   * create temporary file
   * @param {Object} obj - temporary file data object
   * @returns {Object} - ?Promise.<Object> temporary file data
   */
  const createTmpFile = (obj = {}) => new Promise(resolve => {
    const {data, value} = obj;
    let func;
    if (data) {
      const {dir, fileName, host, tabId, windowId} = data;
      const arr = dir && windowId && tabId && host &&
                  [...DIR_TMP, dir, windowId, tabId, host];
      func = arr && fileName && createDir(arr).then(dPath =>
        dPath === path.join(...arr) &&
          createFile(path.join(dPath, fileName), value)
      ).then(filePath => filePath && {filePath, data} || null);
    }
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
   * @param {Object} obj - temporary file data
   * @returns {Object} - Promise.<Object>
   */
  const getTmpFile = (obj = {}) => {
    const {filePath} = obj;
    const arr = [];
    if (filePath) {
      arr.push(appendTimestamp(obj));
      arr.push(readFile(filePath));
    }
    return Promise.all(arr).then(a => {
      let o;
      if (a.length) {
        const [data, value] = a;
        o = {data, value};
      }
      return o || null;
    });
  };

  /* local files */
  /**
   * get editor config
   * @param {string} filePath - editor config file path
   * @returns {Object} - Promise.<*>
   */
  const getEditorConfig = filePath => new Promise(resolve => {
    let func;
    filePath = isString(filePath) && filePath.length && filePath ||
               path.resolve(path.join(".", "editorconfig.json"));
    if (isFile(filePath)) {
      func = readFile(filePath).then(data => portEditorConfig(data, filePath));
    } else {
      const msg = {
        [HOST]: {
          message: `${filePath} is not a file.`,
          pid: APP,
          status: "warn",
        },
        [EDITOR_CONFIG_RES]: null,
      };
      func = writeStdout(msg);
    }
    resolve(func || null);
  });

  /**
   * view local file
   * @param {string} uri - local file uri
   * @returns {Object} - Promise.<Object> ChildProcess
   */
  const viewLocalFile = uri => convUriToFilePath(uri).then(spawnChildProcess);

  /* handlers */
  /**
   * handle created temporary file
   * @param {Object} obj - temporary file data
   * @returns {Object} - Promise.<Array.<*>>
   */
  const handleCreatedTmpFile = (obj = {}) => {
    const {filePath, data} = obj;
    const arr = [];
    if (filePath) {
      arr.push(spawnChildProcess(filePath));
      arr.push(portFileData(filePath, data));
    }
    return Promise.all(arr);
  };

  /**
   * handle message
   * @param {*} msg - message
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
        }
      }
    }
    return Promise.all(func).catch(throwErr);
  };

  /* input */
  const input = new Input();

  /**
   * read stdin
   * @param {string|Buffer} chunk - chunk
   * @returns {void}
   */
  const readStdin = chunk => input.decode(chunk, handleMsg);

  /* exit */
  /**
   * handle exit
   * @param {number} code - exit code
   * @returns {void}
   */
  const handleExit = code => {
    const msg = (new Output()).encode({
      [HOST]: {
        message: `exit ${code || 0}`,
        pid: APP,
        status: "exit",
      },
    });
    removeDirSync(path.join(...DIR_TMP));
    msg && process.stdout.write(msg);
  };

  /**
   * handle unhandled rejection
   * @param {*} e - Error or any
   * @returns {void}
   */
  const unhandledReject = e => {
    e = (new Output()).encode({
      [HOST]: {
        message: e,
        pid: APP,
        status: "error",
      },
    });
    e && process.stdout.write(e);
  };

  /* process */
  process.on("exit", handleExit);
  process.on("uncaughtException", throwErr);
  process.on("unhandledRejection", unhandledReject);
  process.stdin.on("data", readStdin);

  /* startup */
  Promise.all([
    createDir(DIR_TMP_FILES),
    createDir(DIR_TMP_FILES_PB),
  ]).then(portAppStatus).catch(throwErr);
}
