/**
 * index.js
 */
"use strict";
/* api */
const {
  ChildProcess, CmdArgs, Input, Output, Setup,
  convertUriToFilePath, createDirectory, createFile,
  getFileNameFromFilePath, getFileTimestamp, isDir, isExecutable, isFile,
  removeDir, removeDirectory, readFile,
} = require("web-ext-native-msg");
const {URL} = require("url");
const {
  promises: {
    compareSemVer,
  },
} = require("semver-parser");
const {isObjectNotEmpty, isString} = require("./common");
const {handleSetupCallback} = require("./setup");
const {version: hostVersion} = require("../package.json");
const {watch} = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");

/* constants */
const {
  EDITOR_CONFIG_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
  EXT_CHROME_ID, EXT_WEB_ID, FILE_WATCH, HOST, HOST_DESC, HOST_VERSION,
  HOST_VERSION_CHECK, LABEL, LOCAL_FILE_VIEW, MODE_EDIT, PROCESS_CHILD,
  TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_RES,
} = require("./constant");
const APP = `${process.pid}`;
const CHAR = "utf8";
const FILE_NOT_FOUND_TIMESTAMP = -1;
const PERM_DIR = 0o700;
const PERM_FILE = 0o600;
const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
               os.tmpdir();
const TMPDIR_APP = path.resolve(path.join(TMPDIR, LABEL, APP));
const TMPDIR_FILES = path.join(TMPDIR_APP, TMP_FILES);
const TMPDIR_FILES_PB = path.join(TMPDIR_APP, TMP_FILES_PB);

/* editor config */
const editorConfig = {
  editorPath: "",
  cmdArgs: [],
};

/* output */
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
  let msg;
  if (e) {
    if (e.message) {
      msg = (new Output()).encode(e.message);
    } else {
      msg = (new Output()).encode(e);
    }
  } else {
    msg = (new Output()).encode("unknown error.");
  }
  process.stderr.write(msg);
  return false;
};

/**
 * write stderr
 * @param {*} msg - message
 * @returns {?Function} - write message to the Writable stream
 */
const writeStderr = async msg => {
  let func;
  msg = (new Output()).encode(msg);
  if (msg) {
    func = process.stderr.write(msg);
  }
  return func || null;
};

/**
 * write stdout
 * @param {*} msg - message
 * @returns {?Function} - write message to the Writable stream
 */
const writeStdout = async msg => {
  let func;
  msg = (new Output()).encode(msg);
  if (msg) {
    func = process.stdout.write(msg);
  }
  return func || null;
};

/**
 * export app status
 * @returns {AsyncFunction} - writeStdout()
 */
const exportAppStatus = async () =>
  writeStdout(hostMsg(EDITOR_CONFIG_GET, "ready"));

/**
 * export editor config
 * @param {string} data - editor config
 * @param {string} editorConfigPath - editor config file path
 * @returns {?AsyncFunction} - writeStdout() / writeStderr()
 */
const exportEditorConfig = async (data, editorConfigPath) => {
  let func;
  try {
    data = data && JSON.parse(data);
    if (data) {
      const {editorPath} = data;
      const editorName = await getFileNameFromFilePath(editorPath);
      const executable = isExecutable(editorPath);
      const timestamp = await getFileTimestamp(editorConfigPath);
      const keys = Object.keys(editorConfig);
      for (const key of keys) {
        const value = data[key];
        if (key === "editorPath") {
          editorConfig[key] = value;
        }
        if (key === "cmdArgs") {
          editorConfig[key] = (new CmdArgs(value)).toArray();
        }
      }
      const msg = {
        [EDITOR_CONFIG_RES]: {
          editorName, executable,
          [EDITOR_CONFIG_TS]: timestamp,
        },
      };
      func = writeStdout(msg);
    }
  } catch (e) {
    func = writeStderr(hostMsg(e.message, "error"));
  }
  return func || null;
};

/**
 * export file data
 * @param {Object} obj - file data
 * @returns {?AsyncFunction} - writeStdout()
 */
const exportFileData = async (obj = {}) => {
  const {data} = obj;
  let func;
  if (isObjectNotEmpty(data)) {
    const msg = {
      [TMP_FILE_DATA_PORT]: {data},
    };
    func = writeStdout(msg);
  }
  return func || null;
};

/* export host version
 * @param {string} minVer - required min version
 * @returns {?AsyncFunction} - writeStdout()
 */
const exportHostVersion = async minVer => {
  let func;
  if (isString(minVer)) {
    const result = await compareSemVer(hostVersion, minVer);
    const msg = {
      [HOST_VERSION]: {
        result,
      },
    };
    func = writeStdout(msg);
  }
  return func || null;
};

/* child process */
/**
 * handle child process error
 * @param {!Object} e - Error
 * @returns {void}
 */
const handleChildProcessErr = e => {
  if (e) {
    let msg;
    if (e.message) {
      msg = (new Output()).encode(e.message);
    } else {
      msg = (new Output()).encode(e);
    }
    process.stderr.write(msg);
  }
};

/**
 * handle child process stderr
 * @param {*} data - data
 * @returns {void}
 */
const handleChildProcessStderr = data => {
  if (data) {
    const msg = (new Output()).encode(data.toString());
    process.stderr.write(msg);
  }
};

/**
 * handle child process stdout
 * @param {*} data - data
 * @returns {void}
 */
const handleChildProcessStdout = data => {
  if (data) {
    const msg = (new Output()).encode(
      hostMsg(data.toString(), `${PROCESS_CHILD}_stdout`)
    );
    process.stdout.write(msg);
  }
};

/**
 * spawn child process
 * @param {string} file - file path
 * @param {string} app - app path
 * @returns {ChildProcess|AsyncFunction} - child process / writeStderr()
 */
const spawnChildProcess = async (file, app = editorConfig.editorPath) => {
  if (!isFile(file)) {
    return writeStderr(hostMsg(`No such file: ${file}`, "warn"));
  }
  if (!isExecutable(app)) {
    return writeStderr(hostMsg("Application is not executable.", "warn"));
  }
  const args = (new CmdArgs(editorConfig.cmdArgs)).toArray();
  const opt = {
    cwd: null,
    encoding: CHAR,
    env: process.env,
  };
  const proc = await (new ChildProcess(app, args, opt)).spawn(file, true);
  proc.on("error", handleChildProcessErr);
  proc.stderr.on("data", handleChildProcessStderr);
  proc.stdout.on("data", handleChildProcessStdout);
  return proc;
};

/* file map */
const fileMap = {
  [FILE_WATCH]: new Map(),
  [TMP_FILES]: new Map(),
  [TMP_FILES_PB]: new Map(),
};

/**
 * delete key from fileMap
 * @param {string} prop - fileMap property
 * @param {string} key - key
 * @returns {boolean} - result, true if deleted
 */
const deleteKeyFromFileMap = async (prop, key) => {
  let bool;
  if (isString(prop) && fileMap[prop] &&
      isString(key) && fileMap[prop].has(key)) {
    bool = fileMap[prop].delete(key);
  }
  return !!bool;
};

/**
 * unwatch file
 * @param {string} key - key
 * @param {Object} [fsWatcher] - fs.FSWatcher
 * @returns {void}
 */
const unwatchFile = async (key, fsWatcher) => {
  if (isString(key)) {
    if (!fsWatcher) {
      fsWatcher = fileMap[FILE_WATCH].get(key);
    }
    fsWatcher && fsWatcher.close();
    await deleteKeyFromFileMap(FILE_WATCH, key);
  }
};

/* temporary files */
/**
 * initialize private temporary directory
 * @param {boolean} bool - remove
 * @returns {void}
 */
const initPrivateTmpDir = async bool => {
  if (bool) {
    fileMap[TMP_FILES_PB].clear();
    await removeDirectory(TMPDIR_FILES_PB, TMPDIR);
    await createDirectory(TMPDIR_FILES_PB, PERM_DIR);
  }
};

/**
 * get temporary file from file data
 * @param {Object} data - temporary file data
 * @returns {Promise.<Array>} - results of each handler
 */
const getTmpFileFromFileData = async (data = {}) => {
  const {dataId, dir, host, tabId, windowId} = data;
  const func = [];
  let msg;
  if (dataId && dir && host && tabId && windowId && fileMap[dir]) {
    const fileId = [windowId, tabId, host, dataId].join("_");
    if (fileMap[dir].has(fileId)) {
      const {filePath} = fileMap[dir].get(fileId);
      if (isFile(filePath)) {
        const value = await readFile(filePath, {encoding: CHAR, flag: "r"});
        data.timestamp = await getFileTimestamp(filePath);
        msg = {
          [TMP_FILE_RES]: {data, value},
        };
        func.push(writeStdout(msg));
      } else {
        fileMap[dir].delete(fileId);
      }
    }
  }
  if (!msg) {
    data.timestamp = FILE_NOT_FOUND_TIMESTAMP;
    msg = {
      [TMP_FILE_DATA_REMOVE]: {data},
    };
    func.push(writeStdout(msg));
    if (dataId) {
      func.push(writeStderr(
        hostMsg(`Failed to get temporary file. ID: ${dataId}`, "warn")
      ));
    }
  }
  return Promise.all(func);
};

/**
 * get file ID from file path
 * @param {string} filePath - file path
 * @returns {?string} - file ID
 */
const getFileIdFromFilePath = async filePath => {
  let fileId;
  if (isString(filePath)) {
    const {dir, name} = path.parse(filePath);
    if (dir.startsWith(TMPDIR_APP)) {
      const [, , windowId, tabId, host] =
        dir.replace(TMPDIR_APP, "").split(path.sep);
      if (windowId && tabId && host && name) {
        fileId = [windowId, tabId, host, name].join("_");
      }
    }
  }
  return fileId || null;
};

/**
 * create tmp file res message
 * @param {string} key - key
 * @returns {?AsyncFunction} - writeStdout()
 */
const createTmpFileResMsg = async key => {
  let func;
  if (isString(key) && isFile(key)) {
    const fileId = await getFileIdFromFilePath(key);
    if (fileId) {
      const obj = fileMap[TMP_FILES].get(fileId);
      if (obj) {
        const {data} = obj;
        if (data) {
          const value =
            await readFile(key, {encoding: CHAR, flag: "r"}) || "";
          data.timestamp = await getFileTimestamp(key);
          func = writeStdout({
            [TMP_FILE_RES]: {
              data, value,
            },
          });
        }
      }
    }
  }
  return func || null;
};

/**
 * get temporary file from given file name
 * @param {string} evtType - event type
 * @param {string} fileName - file name
 * @returns {Promise.<Array>} - results of each handler
 */
const getTmpFileFromWatcherFileName = async (evtType, fileName) => {
  const func = [];
  if (evtType === "change" && isString(fileName)) {
    fileMap[FILE_WATCH].forEach((fsWatcher, key) => {
      if (isString(key) && key.endsWith(fileName)) {
        if (isFile(key)) {
          func.push(createTmpFileResMsg(key));
        } else {
          func.push(unwatchFile(key, fsWatcher));
        }
      }
    });
  }
  return Promise.all(func);
};

/**
 * watch temporary file
 * @param {string} evtType - event type
 * @param {string} fileName - file name
 * @returns {AsyncFunction} - getTempFileFromFileName()
 */
const watchTmpFile = (evtType, fileName) =>
  getTmpFileFromWatcherFileName(evtType, fileName).catch(handleReject);

/**
 * create temporary file
 * @param {Object} obj - temporary file data object
 * @returns {Object} - temporary file data
 */
const createTmpFile = async (obj = {}) => {
  const {data, value} = obj;
  let filePath;
  if (data) {
    const {
      dataId, dir, extType, host, incognito, mode, syncAuto, tabId,
      windowId,
    } = data;
    if (dataId && dir && extType && host && tabId && windowId) {
      const dirPath = await createDirectory(
        path.join(TMPDIR_APP, dir, windowId, tabId, host), PERM_DIR
      );
      const fileId = [windowId, tabId, host, dataId].join("_");
      const fileName = dataId && encodeURIComponent(dataId);
      filePath = dirPath && fileName && extType &&
        await createFile(path.join(dirPath, fileName + extType), value,
                         {encoding: CHAR, flag: "w", mode: PERM_FILE});
      filePath && dir && fileMap[dir] &&
        fileMap[dir].set(fileId, {data, filePath});
      if (!incognito && mode === MODE_EDIT && syncAuto) {
        const opt = {
          persistent: true,
          recursive: false,
          encoding: CHAR,
        };
        fileMap[FILE_WATCH].set(filePath, watch(filePath, opt, watchTmpFile));
      } else {
        try {
          fileMap[FILE_WATCH].has(filePath) && await unwatchFile(filePath);
        } catch (e) {
          await writeStderr(hostMsg(e.message, "error"));
        }
      }
    }
  }
  return {
    data, filePath,
  };
};

/**
 * remove temporary file data
 * @param {Object} data - temporary file data
 * @returns {Promise.<Array>} - results of each handler
 */
const removeTmpFileData = async (data = {}) => {
  const {dataId, dir, host, tabId, windowId} = data;
  const func = [];
  if (dir && fileMap[dir]) {
    if (dataId) {
      const fileId = [windowId, tabId, host, dataId].join("_");
      if (fileMap[dir].has(fileId)) {
        const {filePath} = fileMap[dir].get(fileId);
        if (fileMap[FILE_WATCH].has(filePath)) {
          func.push(unwatchFile(filePath));
        } else {
          func.push(deleteKeyFromFileMap(dir, fileId));
        }
      }
    } else {
      const keyPart = host && [windowId, tabId, host].join("_") ||
                      `${[windowId, tabId].join("_")}_`;
      fileMap[dir].forEach((value, key) => {
        if (key.startsWith(keyPart)) {
          const {filePath} = value;
          if (fileMap[FILE_WATCH].has(filePath)) {
            func.push(unwatchFile(filePath));
          } else {
            func.push(deleteKeyFromFileMap(dir, key));
          }
        }
      });
    }
  }
  return Promise.all(func);
};

/* local files */
/**
 * get editor config
 * @param {string} editorConfigPath - editor config file path
 * @returns {Promise.<Array>} - results of each handler
 */
const getEditorConfig = async editorConfigPath => {
  const func = [];
  if (isFile(editorConfigPath)) {
    const data = await readFile(editorConfigPath, {
      encoding: CHAR, flag: "r",
    });
    func.push(exportEditorConfig(data, editorConfigPath));
  } else {
    func.push(
      writeStderr(hostMsg(`No such file: ${editorConfigPath}`, "warn")),
      writeStdout({[EDITOR_CONFIG_RES]: null}),
    );
  }
  return Promise.all(func);
};

/**
 * view local file
 * @param {string} uri - local file uri
 * @returns {?AsyncFunction} - spawnChildProcess() / writeStderr()
 */
const viewLocalFile = async uri => {
  let func;
  if (isString(uri)) {
    try {
      const {protocol} = new URL(uri);
      if (protocol === "file:") {
        const file = await convertUriToFilePath(uri);
        if (file && isFile(file)) {
          func = spawnChildProcess(file);
        }
      }
    } catch (e) {
      func = writeStderr(hostMsg(`Failed to handle ${uri}.`, "warn"));
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
  if (isFile(filePath)) {
    func.push(spawnChildProcess(filePath), exportFileData(obj));
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
  const items = isObjectNotEmpty(msg) && Object.entries(msg);
  if (items) {
    for (const [key, value] of items) {
      switch (key) {
        case EDITOR_CONFIG_GET: {
          const editorConfigPath =
            path.resolve(path.join(".", EDITOR_CONFIG_FILE));
          func.push(getEditorConfig(editorConfigPath));
          break;
        }
        case HOST_VERSION_CHECK:
          func.push(exportHostVersion(value));
          break;
        case LOCAL_FILE_VIEW:
          func.push(viewLocalFile(value));
          break;
        case TMP_FILE_CREATE:
          func.push(createTmpFile(value).then(handleCreatedTmpFile));
          break;
        case TMP_FILE_DATA_REMOVE:
          func.push(removeTmpFileData(value));
          break;
        case TMP_FILE_GET:
          func.push(getTmpFileFromFileData(value));
          break;
        case TMP_FILES_PB_REMOVE:
          func.push(initPrivateTmpDir(value));
          break;
        default:
          func.push(
            writeStderr(hostMsg(`No handler found for ${key}.`, "warn"))
          );
      }
    }
  } else {
    func.push(writeStderr(hostMsg(`No handler found for ${msg}.`, "warn")));
  }
  return Promise.all(func);
};

/* input */
const input = new Input();

/**
 * read stdin
 * @param {string|Buffer} chunk - chunk
 * @returns {?AsyncFunction} - Promise chain
 */
const readStdin = chunk => {
  const func = [];
  const arr = input.decode(chunk);
  if (Array.isArray(arr) && arr.length) {
    for (const msg of arr) {
      msg && func.push(handleMsg(msg));
    }
  }
  return func.length && Promise.all(func).catch(handleReject) || null;
};

/**
 * run setup
 * @param {Object} cmdOpts - cmd options
 * @returns {Function} - setup.run()
 */
const runSetup = (cmdOpts = {}) => {
  const {browser, configPath, overwriteConfig} = cmdOpts;
  const opt = {
    hostDescription: HOST_DESC,
    hostName: HOST,
    chromeExtensionIds: [EXT_CHROME_ID],
    webExtensionIds: [EXT_WEB_ID],
    callback: handleSetupCallback,
  };
  const setup = new Setup(opt);
  if (isString(browser) && browser.length) {
    setup.browser = browser.trim();
  }
  if (isString(configPath) && configPath.length) {
    setup.configPath = configPath.trim();
  }
  if (overwriteConfig) {
    setup.overwriteConfig = !!overwriteConfig;
  }
  return setup.run();
};

/**
 * handle exit
 * @param {number} code - exit code
 * @returns {void}
 */
const handleExit = code => {
  const msg = (new Output()).encode(hostMsg(`exit ${code || 0}`, "exit"));
  if (isDir(TMPDIR_APP)) {
    removeDir(TMPDIR_APP, TMPDIR);
  }
  msg && process.stdout.write(msg);
};

/**
 * handle startup
 * @returns {AsyncFunction} - Promise chain
 */
const startup = () => Promise.all([
  createDirectory(TMPDIR_FILES, PERM_DIR),
  createDirectory(TMPDIR_FILES_PB, PERM_DIR),
]).then(exportAppStatus).catch(handleReject);

module.exports = {
  editorConfig, fileMap,
  createTmpFile, createTmpFileResMsg, deleteKeyFromFileMap,
  exportAppStatus, exportEditorConfig, exportFileData, exportHostVersion,
  getEditorConfig, getFileIdFromFilePath, getTmpFileFromFileData,
  getTmpFileFromWatcherFileName,
  handleChildProcessErr, handleChildProcessStderr, handleChildProcessStdout,
  handleCreatedTmpFile, handleExit, handleMsg, handleReject, hostMsg,
  initPrivateTmpDir, readStdin, removeTmpFileData, runSetup, spawnChildProcess,
  startup, unwatchFile, viewLocalFile, watchTmpFile, writeStderr, writeStdout,
};
