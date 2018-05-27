/**
 * index.js
 */
"use strict";
/* api */
const {
  ChildProcess, CmdArgs, Input, Output, Setup,
  convertUriToFilePath, createDir, createFile, getFileNameFromFilePath,
  getFileTimestamp, isDir, isExecutable, isFile, removeDir, readFile,
} = require("web-ext-native-msg");
const {URL} = require("url");
const {compareSemVer} = require("semver-parser");
const {isString, throwErr} = require("./modules/common");
const {handleSetupCallback} = require("./modules/setup");
const {version: hostVersion} = require("./package.json");
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
} = require("./modules/constant");
const APP = `${process.pid}`;
const CHAR = "utf8";
const FILE_NOT_FOUND_TIMESTAMP = -1;
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
 * @returns {void}
 */
const deleteKeyFromFileMap = async (prop, key) =>
  isString(prop) && fileMap[prop] &&
  isString(key) && fileMap[prop].has(key) &&
    fileMap[prop].delete(key);

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
          editorName, executable,
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

/* port host version
 * @param {string} minVer - required min version
 * @returns {?AsyncFunction} - write stdout
 */
const portHostVersion = async minVer => {
  let msg;
  if (await isString(minVer)) {
    const result = await compareSemVer(hostVersion, minVer);
    if (Number.isInteger(result)) {
      msg = {
        [HOST_VERSION]: {
          result,
        },
      };
    }
  }
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
      fileMap[TMP_FILES_PB].clear();
      dir !== dPath && (
        msg = hostMsg("Failed to create private temporary directory.", "warn")
      );
    }
  }
  return msg && writeStdout(msg) || null;
};

/**
 * get temporary file from file data
 * @param {Object} data - temporary file data
 * @returns {AsyncFunction} - write stdout
 */
const getTmpFileFromFileData = async (data = {}) => {
  const {dataId, dir, host, tabId, windowId} = data;
  const func = [];
  let msg;
  if (dataId && dir && host && tabId && windowId && fileMap[dir]) {
    const fileId = [windowId, tabId, host, dataId].join("_");
    if (fileMap[dir].has(fileId)) {
      const {filePath} = fileMap[dir].get(fileId);
      if (await isString(filePath) && await isFile(filePath)) {
        const value = await readFile(filePath, {encoding: CHAR, flag: "r"}) ||
                      "";
        data.timestamp = await getFileTimestamp(filePath) || 0;
        msg = {
          [TMP_FILE_RES]: {data, value},
        };
        func.push(writeStdout(msg));
      }
    }
  }
  if (!msg) {
    data.timestamp = FILE_NOT_FOUND_TIMESTAMP;
    msg = {
      [TMP_FILE_RES]: {data},
    };
    func.push(
      writeStdout(
        hostMsg(`Failed to get temporary file. ID: ${dataId}`, "warn")
      ),
      writeStdout(msg),
    );
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
  if (await isString(filePath)) {
    const {dir, name} = path.parse(filePath);
    const dirArr = dir.replace(path.join(...TMPDIR_APP), "").split(path.sep);
    const [, , windowId, tabId, host] = dirArr;
    if (windowId && tabId && host && name) {
      fileId = [windowId, tabId, host, name].join("_");
    }
  }
  return fileId || null;
};

/**
 * create tmp file res message
 * @param {string} key - key
 * @returns {?AsyncFunction} - write stdout
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
          data.timestamp = await getFileTimestamp(key) || 0;
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
 * @returns {Promise.<Array>} - result of each handler
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
 * @returns {AsyncFunction} - get temp file from file name
 */
const watchTmpFile = (evtType, fileName) =>
  getTmpFileFromWatcherFileName(evtType, fileName).catch(throwErr);

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
      const arr = [...TMPDIR_APP, dir, windowId, tabId, host];
      const dPath = arr && await createDir(arr, PERM_DIR);
      const fileId = [windowId, tabId, host, dataId].join("_");
      filePath = dPath === path.join(...arr) && dataId && extType &&
        await createFile(path.join(dPath, dataId + extType), value,
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
          await writeStdout(hostMsg(e.message, "error"));
        }
      }
    }
  }
  return data && filePath && {data, filePath} || null;
};

/**
 * remove temporary file data
 * @param {Object} data - temporary file data
 * @returns {Promise.<Array>} - result of each handler
 */
const removeTmpFileData = async (data = {}) => {
  const {dataId, dir, host, tabId, windowId} = data;
  const func = [];
  if (dir && fileMap[dir]) {
    if (dataId) {
      const fileId = [windowId, tabId, host, dataId].join("_");
      if (fileMap[dir].has(fileId)) {
        const {filePath} = fileMap[dir].get(fileId);
        fileMap[FILE_WATCH].has(filePath) && func.push(unwatchFile(filePath));
        func.push(deleteKeyFromFileMap(dir, fileId));
      }
    } else {
      const keyPart = host && [windowId, tabId, host].join("_") ||
                      `${[windowId, tabId].join("_")}_`;
      fileMap[dir].forEach((value, key) => {
        if (key.startsWith(keyPart)) {
          const {filePath} = value;
          fileMap[FILE_WATCH].has(filePath) &&
            func.push(unwatchFile(filePath));
          func.push(deleteKeyFromFileMap(dir, key));
        }
      });
    }
  }
  return Promise.all(func);
};

/* local files */
/**
 * get editor config
 * @param {string} filePath - editor config file path
 * @returns {Promise.<Array>} - results of each handler
 */
const getEditorConfig = async () => {
  const func = [];
  const editorConfigPath = path.resolve(path.join(".", EDITOR_CONFIG_FILE));
  if (editorConfigPath && await isFile(editorConfigPath)) {
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
    try {
      const {protocol} = new URL(uri);
      if (protocol === "file:") {
        const file = await convertUriToFilePath(uri);
        if (file && await isFile(file)) {
          func = spawnChildProcess(file);
        }
      }
    } catch (e) {
      func = writeStdout(hostMsg(`Failed to handle ${uri}.`, "warn"));
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
        case HOST_VERSION_CHECK:
          func.push(portHostVersion(obj));
          break;
        case LOCAL_FILE_VIEW:
          func.push(viewLocalFile(obj));
          break;
        case TMP_FILE_CREATE:
          func.push(createTmpFile(obj).then(handleCreatedTmpFile));
          break;
        case TMP_FILE_DATA_REMOVE:
          func.push(removeTmpFileData(obj));
          break;
        case TMP_FILE_GET:
          func.push(getTmpFileFromFileData(obj));
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
  const tmpDirPath = path.join(...TMPDIR_APP);
  if (isDir(tmpDirPath)) {
    removeDir(tmpDirPath, TMPDIR);
    msg && process.stdout.write(msg);
  }
};

/**
 * handle startup
 * @returns {AsyncFunction} - handler
 */
const startup = () => {
  const [, , ...args] = process.argv;
  let setup, ver, func;
  if (Array.isArray(args) && args.length) {
    for (const arg of args) {
      if (/^--setup$/i.test(arg)) {
        setup = true;
        break;
      } else if (/^(?:-v|--version)$/i.test(arg)) {
        ver = true;
        break;
      }
    }
  }
  if (ver) {
    console.info(hostVersion);
    process.exit(0);
  } else if (setup) {
    func = (new Setup({
      hostDescription: HOST_DESC,
      hostName: HOST,
      chromeExtensionIds: [EXT_CHROME_ID],
      webExtensionIds: [EXT_WEB_ID],
      callback: handleSetupCallback,
    })).run();
  } else {
    func = Promise.all([
      createDir(TMPDIR_FILES, PERM_DIR),
      createDir(TMPDIR_FILES_PB, PERM_DIR),
    ]).then(portAppStatus).catch(handleReject);
  }
  return func;
};

/* process */
process.on("exit", handleExit);
process.on("uncaughtException", throwErr);
process.on("unhandleRejection", handleReject);
process.stdin.on("data", readStdin);

startup();
