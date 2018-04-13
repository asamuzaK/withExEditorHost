/* eslint-disable max-nested-callbacks */
"use strict";
/* api */
const {Output} = require("web-ext-native-msg");
const {assert} = require("chai");
const {describe, it} = require("mocha");
const fs = require("fs");
const os = require("os");
const path = require("path");
const rewire = require("rewire");
const sinon = require("sinon");

/* constant */
const {
  EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS, FILE_WATCH,
  HOST_VERSION, HOST_VERSION_CHECK, LABEL, LOCAL_FILE_VIEW, MODE_EDIT,
  TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_RES,
} = require("../modules/constant");
const APP = `${process.pid}`;
const IS_WIN = os.platform() === "win32";
const PERM_APP = 0o755;
const PERM_DIR = 0o700;
const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
               os.tmpdir();
const TMPDIR_APP = [TMPDIR, LABEL, APP];
const TMPDIR_FILES = [...TMPDIR_APP, TMP_FILES];
const TMPDIR_FILES_PB = [...TMPDIR_APP, TMP_FILES_PB];

const indexJs = rewire("../index");

describe("fileMap", () => {
  it("should be instance of Map", () => {
    const fileMap = indexJs.__get__("fileMap");
    const keys = Object.keys(fileMap);
    for (const key of keys) {
      const val = fileMap[key];
      assert.isTrue(val instanceof Map);
    }
  });
});

describe("hostMsg", () => {
  it("should get object", () => {
    const hostMsg = indexJs.__get__("hostMsg");
    const message = "foo";
    const status = "bar";
    assert.deepEqual(hostMsg(message, status), {
      withexeditorhost: {
        message: "foo",
        status: "bar",
      },
    });
  });
});

describe("handleReject", () => {
  it("should write message", () => {
    const handleReject = indexJs.__get__("handleReject");
    const e = {
      message: "foo",
    };
    const {stdout} = process;
    sinon.stub(stdout, "write");
    const res = handleReject(e);
    const {calledOnce} = stdout.write;
    stdout.write.restore();
    assert.strictEqual(calledOnce, true);
    assert.strictEqual(res, false);
  });
});

describe("writeStdout", () => {
  it("should return null if no argument given", async () => {
    const writeStdout = indexJs.__get__("writeStdout");
    const {stdout} = process;
    sinon.stub(stdout, "write");
    const res = await writeStdout();
    const {calledOnce} = stdout.write;
    stdout.write.restore();
    assert.strictEqual(calledOnce, false);
    assert.isNull(res);
  });

  it("should write message", async () => {
    const writeStdout = indexJs.__get__("writeStdout");
    const msg = "foo";
    const {stdout} = process;
    sinon.stub(stdout, "write");
    await writeStdout(msg);
    const {calledOnce} = stdout.write;
    stdout.write.restore();
    assert.strictEqual(calledOnce, true);
  });
});

describe("portAppStatus", () => {
  const tmpDirMsg = "Failed to create temporary directory.";
  const tmpDirPrivateMsg = "Failed to create private temporary directory.";
  const status = "warn";

  it("should warn if no argument given", async () => {
    const portAppStatus = indexJs.__get__("portAppStatus");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await portAppStatus();
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          status,
          message: tmpDirMsg,
        },
      },
      {
        withexeditorhost: {
          status,
          message: tmpDirPrivateMsg,
        },
      },
    ]);
    writeStdout();
  });

  it("should warn if any argument is missing", async () => {
    const portAppStatus = indexJs.__get__("portAppStatus");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await portAppStatus(["foo"]);
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          status,
          message: tmpDirPrivateMsg,
        },
      },
    ]);
    writeStdout();
  });

  it("should warn if any argument is missing", async () => {
    const portAppStatus = indexJs.__get__("portAppStatus");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await portAppStatus([undefined, "foo"]);
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          status,
          message: tmpDirMsg,
        },
      },
    ]);
    writeStdout();
  });

  it("should write message", async () => {
    const portAppStatus = indexJs.__get__("portAppStatus");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await portAppStatus(["foo", "bar"]);
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          message: EDITOR_CONFIG_GET,
          status: "ready",
        },
      },
    ]);
    writeStdout();
  });
});

describe("portEditorConfig", () => {
  it("should return null if no argument given", async () => {
    const portEditorConfig = indexJs.__get__("portEditorConfig");
    const res = await portEditorConfig();
    assert.isNull(res);
  });

  it("should warn if arg is not JSON parsable", async () => {
    const portEditorConfig = indexJs.__get__("portEditorConfig");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const data = () => undefined;
    const res = await portEditorConfig(data);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Unexpected token ( in JSON at position 0",
        status: "error",
      },
    });
    writeStdout();
  });

  it("should write message", async () => {
    const portEditorConfig = indexJs.__get__("portEditorConfig");
    const getFileTimestamp = indexJs.__get__("getFileTimestamp");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const file = path.resolve(path.join("test", "file", "test.txt"));
    const ts = await getFileTimestamp(file);
    const data = JSON.stringify({
      editorPath,
    });
    const res = await portEditorConfig(data, file);
    assert.deepEqual(res, {
      [EDITOR_CONFIG_RES]: {
        editorName: "test",
        executable: true,
        [EDITOR_CONFIG_TS]: ts,
      },
    });
    writeStdout();
  });
});

describe("portFileData", () => {
  it("should return null if no argument given", async () => {
    const portFileData = indexJs.__get__("portFileData");
    const res = await portFileData();
    assert.isNull(res);
  });

  it("should write message", async () => {
    const portFileData = indexJs.__get__("portFileData");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const obj = {
      data: "foo",
    };
    const res = await portFileData(obj);
    assert.deepEqual(res, {
      [TMP_FILE_DATA_PORT]: {
        data: "foo",
      },
    });
    writeStdout();
  });
});

describe("portHostVersion", () => {
  it("should return 1 or positive", async () => {
    const portHostVersion = indexJs.__get__("portHostVersion");
    const hostVersion = indexJs.__set__("hostVersion", "v1.2.3");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const msg = await portHostVersion("v1.0.0");
    const {result} = msg[HOST_VERSION];
    assert.isAbove(result, 0);
    hostVersion();
    writeStdout();
  });

  it("should return 0", async () => {
    const portHostVersion = indexJs.__get__("portHostVersion");
    const hostVersion = indexJs.__set__("hostVersion", "v1.2.3");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const msg = await portHostVersion("v1.2.3");
    const {result} = msg[HOST_VERSION];
    assert.strictEqual(result, 0);
    hostVersion();
    writeStdout();
  });

  it("should return -1 or negative", async () => {
    const portHostVersion = indexJs.__get__("portHostVersion");
    const hostVersion = indexJs.__set__("hostVersion", "v1.2.3");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const msg = await portHostVersion("v1.5.0");
    const {result} = msg[HOST_VERSION];
    assert.isBelow(result, 0);
    hostVersion();
    writeStdout();
  });
});

describe("spawnChildProcess", () => {
  it("should warn if file arg is not a file", async () => {
    const spawnChildProcess = indexJs.__get__("spawnChildProcess");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await spawnChildProcess("foo/bar");
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Given path is not a file.",
        status: "warn",
      },
    });
    writeStdout();
  });

  it("should warn if app arg is not a file", async () => {
    const spawnChildProcess = indexJs.__get__("spawnChildProcess");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const vars = indexJs.__set__("vars", {
      editorPath: "foo/bar",
    });
    const file = path.resolve(path.join("test", "file", "test.txt"));
    const res = await spawnChildProcess(file);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Application is not executable.",
        status: "warn",
      },
    });
    vars();
    writeStdout();
  });

  it("should return child process instance", async () => {
    const spawnChildProcess = indexJs.__get__("spawnChildProcess");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const file = path.resolve(path.join("test", "file", "test.txt"));
    const res = await spawnChildProcess(file, editorPath);
    assert.isObject(res);
    writeStdout();
  });
});

describe("initPrivateTmpDir", () => {
  it("should return null if arg is falsy", async () => {
    const initPrivateTmpDir = indexJs.__get__("initPrivateTmpDir");
    const res = await initPrivateTmpDir(false);
    assert.isNull(res);
  });

  it("should warn if failed to remove directory", async () => {
    const initPrivateTmpDir = indexJs.__get__("initPrivateTmpDir");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const removeDir = indexJs.__set__("removeDir", () => undefined);
    const res = await initPrivateTmpDir(true);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Failed to remove private temporary directory.",
        status: "warn",
      },
    });
    writeStdout();
    removeDir();
  });

  it("should warn if failed to create directory", async () => {
    const initPrivateTmpDir = indexJs.__get__("initPrivateTmpDir");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const createDir = indexJs.__set__("createDir", () => undefined);
    const res = await initPrivateTmpDir(true);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Failed to create private temporary directory.",
        status: "warn",
      },
    });
    writeStdout();
    createDir();
  });

  it("should get null on success", async () => {
    const initPrivateTmpDir = indexJs.__get__("initPrivateTmpDir");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const createDir = indexJs.__get__("createDir");
    const isDir = indexJs.__get__("isDir");
    const dir = await createDir(TMPDIR_FILES_PB, PERM_DIR);
    const res = await initPrivateTmpDir(true);
    assert.isNull(res);
    assert.isTrue(isDir(dir));
    writeStdout();
  });
});

describe("getTmpFileFromFileData", () => {
  it("should warn if no argument given", async () => {
    const getTmpFileFromFileData = indexJs.__get__("getTmpFileFromFileData");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await getTmpFileFromFileData();
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Failed to get temporary file.",
        status: "warn",
      },
    });
    writeStdout();
  });

  it("should warn if key in fileMap does not exist", async () => {
    const getTmpFileFromFileData = indexJs.__get__("getTmpFileFromFileData");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const data = {
      dataId: "dataId",
      dir: "dir",
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const res = await getTmpFileFromFileData(data);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Failed to get temporary file.",
        status: "warn",
      },
    });
    writeStdout();
  });

  it("should get message", async () => {
    const getTmpFileFromFileData = indexJs.__get__("getTmpFileFromFileData");
    const fileMap = indexJs.__get__("fileMap");
    const getFileTimestamp = indexJs.__get__("getFileTimestamp");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const {dir, name} = path.parse(filePath);
    const dirArr = dir.replace(path.join(...TMPDIR_APP), "").split(path.sep);
    const [, , windowId, tabId, host] = dirArr;
    const fileId = `${windowId}_${tabId}_${host}_${name}`;
    const timestamp = await getFileTimestamp(filePath);
    const data = {
      filePath, host, tabId, windowId,
      dataId: name,
      dir: TMP_FILES,
    };
    fileMap[TMP_FILES].set(fileId, {filePath});
    const res = await getTmpFileFromFileData(data);
    assert.deepEqual(res, {
      [TMP_FILE_RES]: {
        data: {
          filePath, host, tabId, timestamp, windowId,
          dataId: name,
          dir: TMP_FILES,
        },
        value: "test file\n",
      },
    });
    writeStdout();
  });
});

describe("getFileIdFromFilePath", () => {
  it("should get null if no argument given", async () => {
    const getFileIdFromFilePath = indexJs.__get__("getFileIdFromFilePath");
    const res = await getFileIdFromFilePath();
    assert.isNull(res);
  });

  it("should get null if argument is not string", async () => {
    const getFileIdFromFilePath = indexJs.__get__("getFileIdFromFilePath");
    const res = await getFileIdFromFilePath(1);
    assert.isNull(res);
  });

  it("should get null if argument is not file path", async () => {
    const getFileIdFromFilePath = indexJs.__get__("getFileIdFromFilePath");
    const res = await getFileIdFromFilePath("foo/bar");
    assert.isNull(res);
  });

  it("should get string", async () => {
    const getFileIdFromFilePath = indexJs.__get__("getFileIdFromFilePath");
    const windowId = "foo";
    const tabId = "bar";
    const host = "baz";
    const name = "qux";
    const file =
      path.join(...TMPDIR_FILES, windowId, tabId, host, `${name}.txt`);
    const fileId = `${windowId}_${tabId}_${host}_${name}`;
    const res = await getFileIdFromFilePath(file);
    assert.strictEqual(res, fileId);
  });
});

describe("createTmpFileResMsg", () => {
  it("should get null if no argument given", async () => {
    const createTmpFileResMsg = indexJs.__get__("createTmpFileResMsg");
    const res = await createTmpFileResMsg();
    assert.isNull(res);
  });

  it("should get null if argument is not string", async () => {
    const createTmpFileResMsg = indexJs.__get__("createTmpFileResMsg");
    const res = await createTmpFileResMsg(1);
    assert.isNull(res);
  });

  it("should get null if argument is not a file", async () => {
    const createTmpFileResMsg = indexJs.__get__("createTmpFileResMsg");
    const res = await createTmpFileResMsg("foo/bar");
    assert.isNull(res);
  });

  it("should get message", async () => {
    const createTmpFileResMsg = indexJs.__get__("createTmpFileResMsg");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const fileMap = indexJs.__get__("fileMap");
    const getFileTimestamp = indexJs.__get__("getFileTimestamp");
    const file = path.resolve(path.join("test", "file", "test.txt"));
    const {dir, name} = path.parse(file);
    const dirArr = dir.replace(path.join(...TMPDIR_APP), "").split(path.sep);
    const [, , windowId, tabId, host] = dirArr;
    const fileId = `${windowId}_${tabId}_${host}_${name}`;
    const timestamp = await getFileTimestamp(file);
    fileMap[TMP_FILES].set(fileId, {
      data: {},
    });
    const res = await createTmpFileResMsg(file);
    assert.deepEqual(res, {
      [TMP_FILE_RES]: {
        data: {
          timestamp,
        },
        value: "test file\n",
      },
    });
    writeStdout();
  });
});

describe("getTmpFileFromWatcherFileName", () => {
  it("should get lenth 0 if no argument given", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const res = await getTmpFileFromWatcherFileName();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get lenth 0 if event does not match", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const res = await getTmpFileFromWatcherFileName("foo", "bar");
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get lenth 0 if file arg is not string", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const res = await getTmpFileFromWatcherFileName("change", {});
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get length 0 if Map is empty", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].clear();
    const res = await getTmpFileFromWatcherFileName("change", "bar");
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get unwatch file if key does not match", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const unwatchFile = indexJs.__set__("unwatchFile", (k, v) => [k, v]);
    const fileMap = indexJs.__get__("fileMap");
    const file = path.resolve(path.join("foo", "bar", "test.txt"));
    const watcher = {
      close: () => undefined,
    };
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(file, watcher);
    const res = await getTmpFileFromWatcherFileName("change", "test.txt");
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res[0], [file, watcher]);
    unwatchFile();
  });

  it("should get message", async () => {
    const getTmpFileFromWatcherFileName =
      indexJs.__get__("getTmpFileFromWatcherFileName");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const fileMap = indexJs.__get__("fileMap");
    const getFileTimestamp = indexJs.__get__("getFileTimestamp");
    const file = path.resolve(path.join("test", "file", "test.txt"));
    const timestamp = getFileTimestamp(file);
    const watcher = {
      close: () => undefined,
    };
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(file, watcher);
    const res = await getTmpFileFromWatcherFileName("change", "test.txt");
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res[0], {
      [TMP_FILE_RES]: {
        data: {
          timestamp,
        },
        value: "test file\n",
      },
    });
    writeStdout();
  });
});

describe("deleteKeyFromFileMap", () => {
  it("should not delete key if argument is missing", async () => {
    const deleteKeyFromFileMap = indexJs.__get__("deleteKeyFromFileMap");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", "bar");
    await deleteKeyFromFileMap();
    assert.strictEqual(fileMap[FILE_WATCH].get("foo"), "bar");
    fileMap[FILE_WATCH].delete("foo");
  });

  it("should not delete key if argument does not match", async () => {
    const deleteKeyFromFileMap = indexJs.__get__("deleteKeyFromFileMap");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", "bar");
    await deleteKeyFromFileMap(FILE_WATCH, "baz");
    assert.strictEqual(fileMap[FILE_WATCH].has("baz"), false);
    assert.strictEqual(fileMap[FILE_WATCH].get("foo"), "bar");
    fileMap[FILE_WATCH].delete("foo");
  });

  it("should delete key", async () => {
    const deleteKeyFromFileMap = indexJs.__get__("deleteKeyFromFileMap");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", "bar");
    await deleteKeyFromFileMap(FILE_WATCH, "foo");
    assert.strictEqual(fileMap[FILE_WATCH].has("foo"), false);
    assert.strictEqual(fileMap[FILE_WATCH].get("foo"), undefined);
  });
});

describe("unwatchFile", () => {
  it("should not unwatch if argument is missing", async () => {
    const unwatchFile = indexJs.__get__("unwatchFile");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", {
      close: () => undefined,
    });
    await unwatchFile();
    assert.strictEqual(fileMap[FILE_WATCH].has("foo"), true);
    fileMap[FILE_WATCH].delete("foo");
  });

  it("should unwatch", async () => {
    const unwatchFile = indexJs.__get__("unwatchFile");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", {
      close: () => undefined,
    });
    await unwatchFile("foo");
    assert.strictEqual(fileMap[FILE_WATCH].has("foo"), false);
  });

  it("should unwatch", async () => {
    const unwatchFile = indexJs.__get__("unwatchFile");
    const fileMap = indexJs.__get__("fileMap");
    fileMap[FILE_WATCH].set("foo", {
      close: () => undefined,
    });
    await unwatchFile("foo", {
      close: () => undefined,
    });
    assert.strictEqual(fileMap[FILE_WATCH].has("foo"), false);
  });
});

describe("watchTmpFile", () => {
  it("should pass given args", async () => {
    const watchTmpFile = indexJs.__get__("watchTmpFile");
    const getTmpFileFromWatcherFileName =
      indexJs.__set__("getTmpFileFromWatcherFileName",
                      async (type, file) => ({
                        evtType: type,
                        fileName: file,
                      }));
    const evtType = "foo";
    const fileName = "bar";
    const res = await watchTmpFile(evtType, fileName);
    assert.deepEqual(res, {
      evtType, fileName,
    });
    getTmpFileFromWatcherFileName();
  });
});

describe("createTmpFile", () => {
  it("should get null if no argument given", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const res = await createTmpFile();
    assert.isNull(res);
  });

  it("should get null if argument is not object", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const res = await createTmpFile(1);
    assert.isNull(res);
  });

  it("should get null if argument is not object", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const res = await createTmpFile(1);
    assert.isNull(res);
  });

  it("should get null if data prop is falsy", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const obj = {
      data: false,
    };
    const res = await createTmpFile(obj);
    assert.isNull(res);
  });

  it("should get null if data lacks one of required prop", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const data = {
      dataId: "dataId",
      dir: "dir",
      extType: "extType",
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const func = [];
    const keys = Object.keys(data);
    for (const key of keys) {
      const testData = data;
      testData[key] = false;
      const obj = {
        data: testData,
      };
      func.push(createTmpFile(obj).then(res => {
        assert.isNull(res);
      }));
    }
    await Promise.all(func);
  });

  it("should set key/value to Map and get object", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const createDir = indexJs.__set__("createDir", arr => path.join(...arr));
    const createFile = indexJs.__set__("createFile", filePath => filePath);
    const watch = indexJs.__set__("watch", () => ({}));
    const fileMap = indexJs.__get__("fileMap");
    const data = {
      dataId: "qux",
      dir: TMP_FILES,
      extType: ".txt",
      host: "baz",
      incognito: false,
      mode: MODE_EDIT,
      syncAuto: true,
      tabId: "bar",
      windowId: "foo",
    };
    const value = "";
    const obj = {
      data, value,
    };
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[FILE_WATCH].clear();
    const res = await createTmpFile(obj);
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
    createDir();
    createFile();
    watch();
  });

  it("should delete key from Map and get object", async () => {
    const createTmpFile = indexJs.__get__("createTmpFile");
    const createDir = indexJs.__set__("createDir", arr => path.join(...arr));
    const createFile = indexJs.__set__("createFile", filePath => filePath);
    const watch = indexJs.__set__("watch", () => ({}));
    const fileMap = indexJs.__get__("fileMap");
    const data = {
      dataId: "qux",
      dir: TMP_FILES,
      extType: ".txt",
      host: "baz",
      incognito: false,
      mode: MODE_EDIT,
      syncAuto: false,
      tabId: "bar",
      windowId: "foo",
    };
    const value = "";
    const obj = {
      data, value,
    };
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(filePath, {
      close: () => undefined,
    });
    const res = await createTmpFile(obj);
    assert.isFalse(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
    createDir();
    createFile();
    watch();
  });

  it("should write message and get object", async () => {
    let stdoutMsg;
    const createTmpFile = indexJs.__get__("createTmpFile");
    const writeStdout = indexJs.__set__("writeStdout", msg => {
      stdoutMsg = msg;
    });
    const createDir = indexJs.__set__("createDir", arr => path.join(...arr));
    const createFile = indexJs.__set__("createFile", filePath => filePath);
    const watch = indexJs.__set__("watch", () => ({}));
    const fileMap = indexJs.__get__("fileMap");
    const data = {
      dataId: "qux",
      dir: TMP_FILES,
      extType: ".txt",
      host: "baz",
      incognito: false,
      mode: MODE_EDIT,
      syncAuto: false,
      tabId: "bar",
      windowId: "foo",
    };
    const value = "";
    const obj = {
      data, value,
    };
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(filePath, {
      close: () => {
        throw new Error("quux");
      },
    });
    const res = await createTmpFile(obj);
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
    assert.deepEqual(stdoutMsg, {
      withexeditorhost: {
        message: "quux",
        status: "error",
      },
    });
    createDir();
    createFile();
    watch();
    writeStdout();
  });
});

describe("removeTmpFileData", () => {
  it("should get empty array if no argument given", async () => {
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const res = await removeTmpFileData();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get empty array if dir prop is falsy", async () => {
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const obj = {
      dir: false,
    };
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get empty array if Map does not exist", async () => {
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const obj = {
      dir: "foo",
    };
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get empty array if Map does not exist", async () => {
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    fileMap[TMP_FILES].clear();
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 1;
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const unwatchFile = indexJs.__set__("unwatchFile", file => file);
    const deleteKeyFromFileMap =
      indexJs.__set__("deleteKeyFromFileMap",
                      (dir, fileId) => ({dir, fileId}));
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[FILE_WATCH].clear();
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      {
        fileId,
        dir: TMP_FILES,
      },
    ]);
    unwatchFile();
    deleteKeyFromFileMap();
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 2;
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const unwatchFile = indexJs.__set__("unwatchFile", file => file);
    const deleteKeyFromFileMap =
      indexJs.__set__("deleteKeyFromFileMap",
                      (dir, fileId) => ({dir, fileId}));
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(filePath, true);
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      filePath,
      {
        fileId,
        dir: TMP_FILES,
      },
    ]);
    unwatchFile();
    deleteKeyFromFileMap();
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 1;
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const unwatchFile = indexJs.__set__("unwatchFile", file => file);
    const deleteKeyFromFileMap =
      indexJs.__set__("deleteKeyFromFileMap",
                      (dir, fileId) => ({dir, fileId}));
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[FILE_WATCH].clear();
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      {
        fileId,
        dir: TMP_FILES,
      },
    ]);
    unwatchFile();
    deleteKeyFromFileMap();
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 2;
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const unwatchFile = indexJs.__set__("unwatchFile", file => file);
    const deleteKeyFromFileMap =
      indexJs.__set__("deleteKeyFromFileMap",
                      (dir, fileId) => ({dir, fileId}));
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(filePath, true);
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      filePath,
      {
        fileId,
        dir: TMP_FILES,
      },
    ]);
    unwatchFile();
    deleteKeyFromFileMap();
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 3;
    const removeTmpFileData = indexJs.__get__("removeTmpFileData");
    const fileMap = indexJs.__get__("fileMap");
    const unwatchFile = indexJs.__set__("unwatchFile", file => file);
    const deleteKeyFromFileMap =
      indexJs.__set__("deleteKeyFromFileMap",
                      (dir, fileId) => ({dir, fileId}));
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: null,
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const fileId2 = "foo_bar";
    const filePath =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    const filePath2 =
      path.join(...TMPDIR_FILES, "foo", "bar", "baz", "quux.txt");
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2,
    });
    fileMap[FILE_WATCH].clear();
    fileMap[FILE_WATCH].set(filePath, true);
    const res = await removeTmpFileData(obj);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      filePath,
      {
        fileId,
        dir: TMP_FILES,
      },
      {
        fileId: fileId2,
        dir: TMP_FILES,
      },
    ]);
    unwatchFile();
    deleteKeyFromFileMap();
  });
});

describe("getEditorConfig", () => {
  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 1;
    const FILE_PATH = path.join("test", "file", "test.txt");
    const getEditorConfig = indexJs.__get__("getEditorConfig");
    const editorConfigPath =
      indexJs.__set__("EDITOR_CONFIG_FILE", FILE_PATH);
    const portEditorConfig = indexJs.__set__("portEditorConfig",
                                             (data, file) => ({data, file}));
    const res = await getEditorConfig();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      {
        data: "test file\n",
        file: path.resolve(FILE_PATH),
      },
    ]);
    portEditorConfig();
    editorConfigPath();
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 2;
    const FILE_PATH = path.join("test", "file", "foo.txt");
    const getEditorConfig = indexJs.__get__("getEditorConfig");
    const editorConfigPath = indexJs.__set__("EDITOR_CONFIG_FILE", FILE_PATH);
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await getEditorConfig();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          message: `Failed to handle ${path.resolve(FILE_PATH)}.`,
          status: "warn",
        },
      },
      {
        [EDITOR_CONFIG_RES]: null,
      },
    ]);
    editorConfigPath();
    writeStdout();
  });
});

describe("viewLocalFile", () => {
  it("should get null if argument is not string", async () => {
    const viewLocalFile = indexJs.__get__("viewLocalFile");
    const res = await viewLocalFile(1);
    assert.isNull(res);
  });

  it("should get message if argument is not uri", async () => {
    const viewLocalFile = indexJs.__get__("viewLocalFile");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await viewLocalFile("foo/bar");
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "Failed to handle foo/bar.",
        status: "warn",
      },
    });
    writeStdout();
  });

  it("should get null if not file uri", async () => {
    const viewLocalFile = indexJs.__get__("viewLocalFile");
    const res = await viewLocalFile("https://example.com");
    assert.isNull(res);
  });

  it("should get null if file does not exist", async () => {
    const viewLocalFile = indexJs.__get__("viewLocalFile");
    const res = await viewLocalFile("file:///foo/bar.txt");
    assert.isNull(res);
  });

  it("should get spawn child process function", async () => {
    const viewLocalFile = indexJs.__get__("viewLocalFile");
    const spawnChildProcess =
      indexJs.__set__("spawnChildProcess", file => file);
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const filePathname = filePath.split(path.sep).join("/");
    const fileUrl = `file://${IS_WIN && "/" || ""}${filePathname}`;
    const res = await viewLocalFile(fileUrl);
    assert.strictEqual(res, filePath);
    spawnChildProcess();
  });
});

describe("handleCreatedTmpFile", () => {
  it("should get empty array if argument not given", async () => {
    const handleCreatedTmpFile = indexJs.__get__("handleCreatedTmpFile");
    const res = await handleCreatedTmpFile();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get empty array if file path is not file", async () => {
    const handleCreatedTmpFile = indexJs.__get__("handleCreatedTmpFile");
    const res = await handleCreatedTmpFile({
      filePath: "foo/bar",
    });
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

  it("should get array with expected length", async () => {
    const EXPECTED_LENGTH = 2;
    const handleCreatedTmpFile = indexJs.__get__("handleCreatedTmpFile");
    const spawnChildProcess =
      indexJs.__set__("spawnChildProcess", file => file);
    const portFileData = indexJs.__set__("portFileData", obj => obj);
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const data = {
      filePath,
    };
    const res = await handleCreatedTmpFile(data);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      filePath,
      {
        filePath,
      },
    ]);
    spawnChildProcess();
    portFileData();
  });
});

describe("handleMsg", () => {
  it("should get message if no argument given", async () => {
    const handleMsg = indexJs.__get__("handleMsg");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const res = await handleMsg();
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [
      {
        withexeditorhost: {
          message: "No handler found for undefined.",
          status: "warn",
        },
      },
    ]);
    writeStdout();
  });

  it("should get function and/or message", async () => {
    const EXPECTED_LENGTH = 2;
    const handleMsg = indexJs.__get__("handleMsg");
    const writeStdout = indexJs.__set__("writeStdout", msg => msg);
    const getEditorConfig = indexJs.__set__("getEditorConfig", obj => obj);
    const msg = {
      [EDITOR_CONFIG_GET]: true,
      foo: "bar",
    };
    const res = await handleMsg(msg);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, EXPECTED_LENGTH);
    assert.deepEqual(res, [
      true,
      {
        withexeditorhost: {
          message: "No handler found for foo.",
          status: "warn",
        },
      },
    ]);
    writeStdout();
    getEditorConfig();
  });

  it("should get function", async () => {
    const EXPECTED_LENGTH = 1;
    const handleMsg = indexJs.__get__("handleMsg");
    const keyMap = {
      [EDITOR_CONFIG_GET]: "getEditorConfig",
      [HOST_VERSION_CHECK]: "portHostVersion",
      [LOCAL_FILE_VIEW]: "viewLocalFile",
      [TMP_FILE_CREATE]: ["createTmpFile", "handleCreatedTmpFile"],
      [TMP_FILE_DATA_REMOVE]: "removeTmpFileData",
      [TMP_FILE_GET]: "getTmpFileFromFileData",
      [TMP_FILES_PB_REMOVE]: "initPrivateTmpDir",
    };
    Object.entries(keyMap).forEach(async arg => {
      const [key, value] = arg;
      const msg = {
        [key]: key,
      };
      let func, func2;
      if (Array.isArray(value)) {
        const [val, val2] = value;
        func = indexJs.__set__(val, async obj => obj);
        func2 = indexJs.__set__(val2, async obj => obj);
      } else {
        func = indexJs.__set__(value, async obj => obj);
        func2 = () => undefined;
      }
      const res = await handleMsg(msg);
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, EXPECTED_LENGTH);
      assert.deepEqual(res, [key]);
      func();
      func2();
    });
  });
});

describe("readStdin", () => {
  it("should get null", async () => {
    const readStdin = indexJs.__get__("readStdin");
    const handleMsg = indexJs.__set__("handleMsg", msg => msg);
    const chunk = (new Output()).encode("");
    const res = await readStdin(chunk);
    assert.isNull(res);
    handleMsg();
  });

  it("should get function", async () => {
    const readStdin = indexJs.__get__("readStdin");
    const handleMsg = indexJs.__set__("handleMsg", msg => msg);
    const chunk = (new Output()).encode("test");
    const res = await readStdin(chunk);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, ["test"]);
    handleMsg();
  });
});

describe("handleExit", () => {
  it("should exit with code", async () => {
    const handleExit = indexJs.__get__("handleExit");
    const {stdout} = process;
    sinon.stub(stdout, "write");
    await handleExit(0);
    const {calledOnce} = stdout.write;
    stdout.write.restore();
    assert.isTrue(calledOnce);
  });
});

describe("startup", () => {
  it("should get function", async () => {
    const func = indexJs.__get__("startup");
    const createDir = indexJs.__set__("createDir", async arr => arr);
    const portAppStatus = indexJs.__set__("portAppStatus", async arr => arr);
    const res = await func();
    assert.isArray(res);
    assert.deepEqual(res, [TMPDIR_FILES, TMPDIR_FILES_PB]);
    createDir();
    portAppStatus();
  });

  it("should get function", async () => {
    const func = indexJs.__get__("startup");
    const processArgv = indexJs.__set__("process", {
      argv: [
        "foo",
        "bar",
      ],
    });
    const createDir = indexJs.__set__("createDir", async arr => arr);
    const portAppStatus = indexJs.__set__("portAppStatus", async arr => arr);
    const res = await func();
    assert.isArray(res);
    assert.deepEqual(res, [TMPDIR_FILES, TMPDIR_FILES_PB]);
    processArgv();
    createDir();
    portAppStatus();
  });

  it("should get function", async () => {
    const func = indexJs.__get__("startup");
    const processArgv = indexJs.__set__("process", {
      argv: [
        "foo",
        "bar",
        "baz",
      ],
    });
    const createDir = indexJs.__set__("createDir", async arr => arr);
    const portAppStatus = indexJs.__set__("portAppStatus", async arr => arr);
    const res = await func();
    assert.isArray(res);
    assert.deepEqual(res, [TMPDIR_FILES, TMPDIR_FILES_PB]);
    processArgv();
    createDir();
    portAppStatus();
  });

  it("should get function", async () => {
    const func = indexJs.__get__("startup");
    const processArgv = indexJs.__set__("process", {
      argv: [
        "foo",
        "bar",
        "--setup",
      ],
    });
    class fakeSetup {
      constructor(opt) {
        this._opt = opt;
      }
      run() {
        return this._opt;
      }
    }
    const stubSetup = indexJs.__set__("Setup", fakeSetup);
    const res = await func();
    assert.isObject(res);
    assert.hasAllKeys(res, [
      "hostDescription",
      "hostName",
      "chromeExtensionIds",
      "webExtensionIds",
      "callback",
    ]);
    processArgv();
    stubSetup();
  });
});
