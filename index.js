/**
 * index.js
 */
"use strict";
{
  /* api */
  const {
    ChildProcess, CmdArgs, Input, Output,
    convertUriToFilePath, createDir, createFile, getAbsPath,
    getFileNameFromFilePath, getFileTimestamp, isDir, isExecutable, isFile,
    removeDir, readFile,
  } = require("web-ext-native-msg");
  const {isString, throwErr} = require("./modules/common");
  const os = require("os");
  const path = require("path");
  const process = require("process");

  /* constants */
  const {
    EDITOR_CONFIG_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
    HOST, LABEL, LOCAL_FILE_VIEW, PROCESS_CHILD, TMP_FILES, TMP_FILES_PB,
    TMP_FILES_PB_REMOVE, TMP_FILE_CREATE, TMP_FILE_DATA_PORT,
    TMP_FILE_GET, TMP_FILE_RES,
  } = require("./modules/constant");
  const APP = `${process.pid}`;
  const CHAR = "utf8";
  const DIR_HOME = os.homedir();
  const PERM_DIR = 0o700;
  const PERM_FILE = 0o600;
  const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
                 os.tmpdir();
  const TMPDIR_APP = [TMPDIR, LABEL, APP];
  const TMPDIR_FILES = [...TMPDIR_APP, TMP_FILES];
  const TMPDIR_FILES_PB = [...TMPDIR_APP, TMP_FILES_PB];

  /* variables */
  const vars = {
    editorPath: "",
    cmdArgs: [],
    fileAfterCmdArgs: false,
  };

  /* file IDs */
  const fileIds = {
    [TMP_FILES]: new Map(),
    [TMP_FILES_PB]: new Map(),
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
    },
  });

  /**
   * handle rejection
   * @param {*} e - Error or any
   * @returns {boolean} - false
   */
  const handleReject = e => {
    e = (new Output()).encode(hostMsg(e.message, "error"));
    e && process.stdout.write(e);
    return false;
  };

  /* output */
  /**
   * write stdout
   * @param {*} msg - message
   * @returns {?Function} - write message to the Writable stream
   */
  const writeStdout = async msg => {
    msg = await (new Output()).encode(msg);
    return msg && process.stdout.write(msg) || null;
  };

  /**
   * port app status
   * @param {Array} arr - array of temporary directories
   * @returns {Promise.<Array>} - results of each handler
   */
  const portAppStatus = async (arr = []) => {
    const [tmpDir, tmpDirPb] = arr;
    const func = [];
    if (tmpDir && tmpDirPb) {
      func.push(writeStdout(hostMsg(EDITOR_CONFIG_GET, "ready")));
    } else {
      !tmpDir && func.push(writeStdout(
        hostMsg("Failed to create temporary directory.", "warn")
      ));
      !tmpDirPb && func.push(writeStdout(
        hostMsg("Failed to create private temporary directory.", "warn")
      ));
    }
    return Promise.all(func);
  };

  /**
   * port editor config
   * @param {string} data - editor config
   * @param {string} editorConfig - editor config file path
   * @returns {?AsyncFunction} - write stdout
   */
  const portEditorConfig = async (data, editorConfig) => {
    let msg;
    try {
      data = data && JSON.parse(data);
      if (data) {
        const {editorPath} = data;
        const editorName = await getFileNameFromFilePath(editorPath);
        const executable = await isExecutable(editorPath);
        const timestamp = await getFileTimestamp(editorConfig) || 0;
        const items = Object.keys(vars);
        for (const item of items) {
          const obj = data[item];
          switch (item) {
            case "editorPath":
              vars[item] = obj;
              break;
            case "cmdArgs":
              vars[item] = (new CmdArgs(obj)).toArray();
              break;
            case "fileAfterCmdArgs":
              vars[item] = !!obj;
              break;
            default:
          }
        }
        msg = {
          [EDITOR_CONFIG_RES]: {
            editorConfig, editorName, executable,
            [EDITOR_CONFIG_TS]: timestamp,
          },
        };
      }
    } catch (e) {
      msg = hostMsg(e.message, "error");
    }
    return msg && writeStdout(msg) || null;
  };

  /**
   * port file data
   * @param {Object} obj - file data
   * @returns {?AsyncFunction} - write stdout
   */
  const portFileData = async (obj = {}) => {
    const {data} = obj;
    const msg = data && {
      [TMP_FILE_DATA_PORT]: {data},
    };
    return msg && writeStdout(msg) || null;
  };

  /* child process */
  /**
   * spawn child process
   * @param {string} file - file path
   * @param {string} app - app path
   * @returns {ChildProcess|AsyncFunction} - child process / write stdout
   */
  const spawnChildProcess = async (file, app = vars.editorPath) => {
    if (await !isFile(file)) {
      return writeStdout(hostMsg("Given path is not a file.", "warn"));
    }
    if (await !isExecutable(app)) {
      return writeStdout(hostMsg("Application is not executable.", "warn"));
    }
    const args = vars.cmdArgs || [];
    const pos = vars.fileAfterCmdArgs || false;
    const opt = {
      cwd: null,
      encoding: CHAR,
      env: process.env,
    };
    const proc = await (new ChildProcess(app, args, opt)).spawn(file, pos);
    proc.on("error", e => {
      e = (new Output()).encode(e.message);
      e && process.stderr.write(e);
    });
    proc.stderr.on("data", data => {
      if (data) {
        data = (new Output()).encode(hostMsg(data, `${PROCESS_CHILD}_stderr`));
        data && process.stdout.write(data);
      }
    });
    proc.stdout.on("data", data => {
      if (data) {
        data = (new Output()).encode(hostMsg(data, `${PROCESS_CHILD}_stdout`));
        data && process.stdout.write(data);
      }
    });
    return proc;
  };

  /* temporary files */
  /**
   * initialize private temporary directory
   * @param {boolean} bool - remove
   * @returns {?AsyncFunction} - write stdout
   */
  const initPrivateTmpDir = async bool => {
    let msg;
    if (bool) {
      const dir = path.join(...TMPDIR_FILES_PB);
      await removeDir(dir, TMPDIR);
      if (await isDir(dir)) {
        msg = hostMsg("Failed to remove private temporary directory.", "warn");
      } else {
        const dPath = await createDir(TMPDIR_FILES_PB, PERM_DIR);
        fileIds[TMP_FILES_PB].clear();
        dir !== dPath && (
          msg = hostMsg("Failed to create private temporary directory.", "warn")
        );
      }
    }
    return msg && writeStdout(msg) || null;
  };

  /**
   * create temporary file
   * @param {Object} obj - temporary file data object
   * @returns {Object} - temporary file data
   */
  const createTmpFile = async (obj = {}) => {
    const {data, value} = obj;
    let filePath;
    if (data) {
      const {dataId, dir, extType, host, tabId, windowId} = data;
      if (dataId && dir && extType && host && tabId && windowId) {
        const arr = [...TMPDIR_APP, dir, windowId, tabId, host];
        const dPath = arr && await createDir(arr, PERM_DIR);
        const fileId = [windowId, tabId, host, dataId].join("_");
        filePath = dPath === path.join(...arr) && dataId && extType &&
                     await createFile(
                       path.join(dPath, dataId + extType), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE}
                     );
        filePath && dir && fileIds[dir] && fileIds[dir].set(fileId, filePath);
      }
    }
    return data && filePath && {data, filePath} || null;
  };

  /**
   * get temporary file
   * @param {Object} data - temporary file data
   * @returns {?AsyncFunction} - write stdout
   */
  const getTmpFile = async (data = {}) => {
    const {dataId, dir, host, tabId, windowId} = data;
    let msg;
    if (dataId && dir && host && tabId && windowId) {
      const fileId = [windowId, tabId, host, dataId].join("_");
      const filePath = dir && fileIds[dir] && fileIds[dir].get(fileId);
      if (filePath && await isFile(filePath)) {
        const value = await readFile(filePath, {encoding: CHAR, flag: "r"}) ||
                      "";
        data.timestamp = await getFileTimestamp(filePath) || 0;
        msg = {
          [TMP_FILE_RES]: {data, value},
        };
      } else {
        msg = hostMsg("Failed to get temporary file.", "warn");
      }
    }
    return msg && writeStdout(msg) || null;
  };

  /* local files */
  /**
   * get editor config
   * @param {string} filePath - editor config file path
   * @returns {Promise.<Array>} - results of each handler
   */
  const getEditorConfig = async filePath => {
    const func = [];
    let editorConfigPath;
    if (await isString(filePath) && filePath.length) {
      editorConfigPath = await getAbsPath(filePath);
    } else {
      editorConfigPath = path.resolve(path.join(".", EDITOR_CONFIG_FILE));
    }
    if (editorConfigPath && editorConfigPath.startsWith(DIR_HOME) &&
        await isFile(editorConfigPath)) {
      const data = await readFile(editorConfigPath, {
        encoding: CHAR, flag: "r",
      });
      func.push(portEditorConfig(data, editorConfigPath));
    } else {
      func.push(
        writeStdout(hostMsg(`Failed to handle ${editorConfigPath}.`, "warn")),
        writeStdout({[EDITOR_CONFIG_RES]: null})
      );
    }
    return Promise.all(func);
  };

  /**
   * view local file
   * @param {string} uri - local file uri
   * @returns {?AsyncFunction} - spawn child process
   */
  const viewLocalFile = async uri => {
    let func;
    if (await isString(uri)) {
      const {protocol} = new URL(uri);
      if (protocol === "file:") {
        const file = await convertUriToFilePath(uri);
        if (file && isFile(file)) {
          func = spawnChildProcess(file);
        }
      }
    }
    return func || null;
  };

  /* handlers */
  /**
   * handle created temporary file
   * @param {Object} obj - temporary file data
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleCreatedTmpFile = async (obj = {}) => {
    const {filePath} = obj;
    const func = [];
    if (await isFile(filePath)) {
      func.push(spawnChildProcess(filePath), portFileData(obj));
    }
    return Promise.all(func);
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async msg => {
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
            func.push(getTmpFile(obj));
            break;
          case TMP_FILES_PB_REMOVE:
            func.push(initPrivateTmpDir(obj));
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
   * @returns {?Promise.<Array.<Promise>>} - composite a Promise chain
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
    removeDir(path.join(...TMPDIR_APP), TMPDIR);
    msg && process.stdout.write(msg);
  };

  /* process */
  process.on("exit", handleExit);
  process.on("uncaughtException", throwErr);
  process.on("unhandleRejection", handleReject);
  process.stdin.on("data", readStdin);

  /* startup */
  Promise.all([
    createDir(TMPDIR_FILES, PERM_DIR),
    createDir(TMPDIR_FILES_PB, PERM_DIR),
  ]).then(portAppStatus).catch(handleReject);
}
