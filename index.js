/**
 * index.js
 */
"use strict";
{
  /* api */
  const {ChildProcess, CmdArgs} = require("./modules/child-process");
  const {Input, Output} = require("./modules/native-message");
  const {escapeChar, isString, throwErr} = require("./modules/common");
  const {
    convUriToFilePath, createDir, createFile, getAbsPath,
    getFileNameFromFilePath, getFileTimestamp, isDir, isExecutable, isFile,
    removeDir, readFile,
  } = require("./modules/file-util");
  const os = require("os");
  const path = require("path");
  const process = require("process");

  /* constants */
  const {
    EDITOR_CMD_ARGS, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_SET,
    EDITOR_CONFIG_TS, EDITOR_FILE_POS, EDITOR_PATH, HOST, LABEL,
    LOCAL_FILE_VIEW, PROCESS_CHILD, TMP_FILES, TMP_FILES_PB,
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

  /* output */
  /**
   * write stdout
   * @param {*} msg - message
   * @returns {?Function} - write message to the Writable stream
   */
  const writeStdout = msg => {
    msg = (new Output()).encode(msg);
    return msg && process.stdout.write(msg) || null;
  };

  /**
   * port app status
   * @param {Array} arr - array of temporary directories
   * @returns {Promise.<Array>} - results of each handler
   */
  const portAppStatus = (arr = []) => {
    const [tmpDir, tmpDirPb] = arr;
    const func = [];
    if (tmpDir && tmpDirPb) {
      func.push(writeStdout(hostMsg(EDITOR_CONFIG_GET, "ready")));
    } else {
      !tmpDir && func.push(writeStdout(
        hostMsg(`Failed to create ${path.join(TMPDIR_FILES)}.`, "warn")
      ));
      !tmpDirPb && func.push(writeStdout(
        hostMsg(`Failed to create ${path.join(TMPDIR_FILES_PB)}.`, "warn")
      ));
    }
    return Promise.all(func);
  };

  /**
   * port editor config
   * @param {string} data - editor config
   * @param {string} editorConfig - editor config file path
   * @returns {?Function} - write stdout
   */
  const portEditorConfig = (data, editorConfig) => {
    let msg;
    try {
      data = data && JSON.parse(data);
      if (data) {
        const {editorPath} = data;
        const editorName = getFileNameFromFilePath(editorPath);
        const executable = isExecutable(editorPath);
        const timestamp = getFileTimestamp(editorConfig) || 0;
        const items = Object.keys(vars);
        for (const item of items) {
          const obj = data[item];
          switch (item) {
            case "editorPath":
              vars[item] = obj;
              break;
            case "cmdArgs":
              vars[item] = (new CmdArgs(...obj)).toArray();
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
            [EDITOR_CMD_ARGS]: (new CmdArgs(...vars.cmdArgs)).toString(),
            [EDITOR_CONFIG_TS]: timestamp,
            [EDITOR_FILE_POS]: vars.fileAfterCmdArgs,
            [EDITOR_PATH]: editorPath,
          },
        };
      }
    } catch (e) {
      msg = hostMsg(`${e}: ${editorConfig}`, "error");
    }
    return msg && writeStdout(msg) || null;
  };

  /**
   * port file data
   * @param {Object} obj - file data
   * @returns {?Function} - write stdout
   */
  const portFileData = (obj = {}) => {
    const msg = Object.keys(obj).length && {
      [TMP_FILE_DATA_PORT]: obj,
    };
    return msg && writeStdout(msg) || null;
  };

  /* child process */
  /**
   * spawn child process
   * @param {string} file - file path
   * @param {string} app - app path
   * @returns {ChildProcess|Function} - child process / write stdout
   */
  const spawnChildProcess = (file, app = vars.editorPath) => {
    if (!isFile(file)) {
      return writeStdout(hostMsg(`${file} is not a file.`, "warn"));
    }
    if (!isExecutable(app)) {
      return writeStdout(hostMsg(`${app} is not executable.`, "warn"));
    }
    const args = vars.cmdArgs || [];
    const pos = vars.fileAfterCmdArgs || false;
    const opt = {
      cwd: null,
      encoding: CHAR,
      env: process.env,
    };
    const proc = (new ChildProcess(app, args, opt)).spawn(file, pos);
    proc.on("error", e => {
      e = (new Output()).encode(e);
      e && process.stderr.write(e);
    });
    proc.stderr.on("data", data => {
      if (data) {
        data = (new Output()).encode(
          hostMsg(`${data}: ${app}`, `${PROCESS_CHILD}_stderr`)
        );
        data && process.stdout.write(data);
      }
    });
    proc.stdout.on("data", data => {
      if (data) {
        data = (new Output()).encode(
          hostMsg(`${data}: ${app}`, `${PROCESS_CHILD}_stdout`)
        );
        data && process.stdout.write(data);
      }
    });
    return proc;
  };

  /* temporary files */
  /**
   * initialize private temporary directory
   * @param {boolean} bool - remove
   * @returns {?Function} - write stdout
   */
  const initPrivateTmpDir = bool => {
    let msg;
    if (bool) {
      const dir = path.join(...TMPDIR_FILES_PB);
      removeDir(dir, TMPDIR);
      if (isDir(dir)) {
        msg = hostMsg(`Failed to remove ${dir}.`, "warn");
      } else {
        const dPath = createDir(TMPDIR_FILES_PB, PERM_DIR);
        dir !== dPath && (msg = hostMsg(`Failed to create ${dir}.`, "warn"));
      }
    }
    return msg && writeStdout(msg) || null;
  };

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
                    [...TMPDIR_APP, dir, windowId, tabId, host];
      const dPath = arr && createDir(arr, PERM_DIR);
      filePath = dPath === path.join(...arr) && fileName &&
                   createFile(
                     path.join(dPath, fileName), value,
                     {encoding: CHAR, flag: "w", mode: PERM_FILE}
                   );
    }
    resolve(data && filePath && {data, filePath} || null);
  });

  /**
   * get temporary file
   * @param {Object} data - temporary file data
   * @returns {?Function} - write stdout
   */
  const getTmpFile = (data = {}) => {
    const {filePath} = data;
    let msg;
    if (isFile(filePath)) {
      const value = readFile(filePath, {encoding: CHAR, flag: "r"}) || "";
      data.timestamp = getFileTimestamp(filePath) || 0;
      msg = {
        [TMP_FILE_RES]: {data, value},
      };
    } else {
      msg = hostMsg(`${filePath} is not a file.`, "warn");
    }
    return msg && writeStdout(msg) || null;
  };

  /* local files */
  /**
   * get editor config
   * @param {string} filePath - editor config file path
   * @returns {Promise.<Array>} - results of each handler
   */
  const getEditorConfig = filePath => {
    const func = [];
    filePath = isString(filePath) && filePath.length && filePath ||
               path.resolve(path.join(".", "editorconfig.json"));
    if (isFile(filePath)) {
      const data = readFile(filePath, {encoding: CHAR, flag: "r"});
      func.push(portEditorConfig(data, filePath));
    } else {
      func.push(
        writeStdout(hostMsg(`${filePath} is not a file.`, "warn")),
        writeStdout({[EDITOR_CONFIG_RES]: null})
      );
    }
    return Promise.all(func);
  };

  /**
   * set editor config
   * @param {Object} data - editor config data
   * @returns {Function} - port editor config
   */
  const setEditorConfig = (data = {}) => {
    const {cmdArgs, editorConfig, editorPath, fileAfterCmdArgs} = data;
    const file = JSON.stringify({
      editorPath: editorPath || "",
      cmdArgs: (new CmdArgs(cmdArgs)).toArray(),
      fileAfterCmdArgs: !!fileAfterCmdArgs,
    }, null, "  ");
    const editorConfigPath = getAbsPath(editorConfig);
    if (editorConfigPath && editorConfigPath.startsWith(DIR_HOME)) {
      const {dir} = path.parse(editorConfigPath);
      if (!isDir(dir)) {
        const homeDir = escapeChar(DIR_HOME, /(\\)/g);
        const reHomeDir = new RegExp(`^(?:${homeDir}|~)`);
        const subDir = (dir.replace(reHomeDir, "")).split(path.sep)
                         .filter(i => i);
        createDir(subDir.length && [DIR_HOME, ...subDir] || [DIR_HOME],
                  PERM_DIR);
      }
      createFile(editorConfigPath, file,
                 {encoding: CHAR, flag: "w", mode: PERM_FILE});
    }
    return portEditorConfig(file, editorConfig);
  };

  /**
   * view local file
   * @param {string} uri - local file uri
   * @returns {?Function} - spawn child process
   */
  const viewLocalFile = uri => {
    const file = convUriToFilePath(uri);
    return file && spawnChildProcess(file) || null;
  };

  /* handlers */
  /**
   * handle created temporary file
   * @param {Object} obj - temporary file data
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleCreatedTmpFile = (obj = {}) => {
    const {filePath} = obj;
    const func = [];
    if (isFile(filePath)) {
      func.push(spawnChildProcess(filePath), portFileData(obj));
    }
    return Promise.all(func);
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Promise.<Array>} - results of each handler
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
          case EDITOR_CONFIG_SET:
            func.push(setEditorConfig(obj));
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
