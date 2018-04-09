"use strict";
{
  /* api */
  const {assert} = require("chai");
  const {describe, it} = require("mocha");
  const {Output} = require("web-ext-native-msg");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const rewire = require("rewire");
  const sinon = require("sinon");

  /* constant */
  const {
    EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
    FILE_WATCH, HOST_VERSION,
    LABEL, MODE_EDIT,
    TMP_FILES, TMP_FILES_PB,
    TMP_FILE_DATA_PORT, TMP_FILE_RES,
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

  const index = rewire("../index");

  describe("fileMap", () => {
    it("should be instance of Map", () => {
      const fileMap = index.__get__("fileMap");
      const keys = Object.keys(fileMap);
      for (const key of keys) {
        const val = fileMap[key];
        assert.isTrue(val instanceof Map);
      }
    });
  });

  describe("hostMsg", () => {
    const hostMsg = index.__get__("hostMsg");

    it("should get object", () => {
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
    const handleReject = index.__get__("handleReject");

    it("should write message", () => {
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
    const writeStdout = index.__get__("writeStdout");

    it("should return null if no argument given", async () => {
      const {stdout} = process;
      sinon.stub(stdout, "write");
      const res = await writeStdout();
      const {calledOnce} = stdout.write;
      stdout.write.restore();
      assert.strictEqual(calledOnce, false);
      assert.isNull(res);
    });

    it("should write message", async () => {
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
    const portAppStatus = index.__get__("portAppStatus");
    const tmpDirMsg = "Failed to create temporary directory.";
    const tmpDirPrivateMsg = "Failed to create private temporary directory.";
    const status = "warn";

    it("should warn if no argument given", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
    const portEditorConfig = index.__get__("portEditorConfig");

    it("should return null if no argument given", async () => {
      const res = await portEditorConfig();
      assert.isNull(res);
    });

    it("should warn if arg is not JSON parsable", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const getFileTimestamp = index.__get__("getFileTimestamp");
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
    const portFileData = index.__get__("portFileData");

    it("should return null if no argument given", async () => {
      const res = await portFileData();
      assert.isNull(res);
    });

    it("should write message", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
    const portHostVersion = index.__get__("portHostVersion");

    it("should return 1 or positive", async () => {
      const hostVersion = index.__set__("hostVersion", "v1.2.3");
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const msg = await portHostVersion("v1.0.0");
      const {result} = msg[HOST_VERSION];
      assert.isAbove(result, 0);
      hostVersion();
      writeStdout();
    });

    it("should return 0", async () => {
      const hostVersion = index.__set__("hostVersion", "v1.2.3");
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const msg = await portHostVersion("v1.2.3");
      const {result} = msg[HOST_VERSION];
      assert.strictEqual(result, 0);
      hostVersion();
      writeStdout();
    });

    it("should return -1 or negative", async () => {
      const hostVersion = index.__set__("hostVersion", "v1.2.3");
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const msg = await portHostVersion("v1.5.0");
      const {result} = msg[HOST_VERSION];
      assert.isBelow(result, 0);
      hostVersion();
      writeStdout();
    });
  });

  describe("spawnChildProcess", () => {
    const spawnChildProcess = index.__get__("spawnChildProcess");

    it("should warn if file arg is not a file", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const vars = index.__set__("vars", {
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
    const initPrivateTmpDir = index.__get__("initPrivateTmpDir");

    it("should return null if arg is falsy", async () => {
      const res = await initPrivateTmpDir(false);
      assert.isNull(res);
    });

    it("should warn if failed to remove directory", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const removeDir = index.__set__("removeDir", () => undefined);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const createDir = index.__set__("createDir", () => undefined);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const createDir = index.__get__("createDir");
      const isDir = index.__get__("isDir");
      const dir = await createDir(TMPDIR_FILES_PB, PERM_DIR);
      const res = await initPrivateTmpDir(true);
      assert.isNull(res);
      assert.isTrue(isDir(dir));
      writeStdout();
    });
  });

  describe("getTmpFileFromFileData", () => {
    const getTmpFileFromFileData = index.__get__("getTmpFileFromFileData");

    it("should warn if no argument given", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
  });

  describe("getFileIdFromFilePath", () => {
    const getFileIdFromFilePath = index.__get__("getFileIdFromFilePath");

    it("should get null if no argument given", async () => {
      const res = await getFileIdFromFilePath();
      assert.isNull(res);
    });

    it("should get null if argument is not string", async () => {
      const res = await getFileIdFromFilePath(1);
      assert.isNull(res);
    });

    it("should get null if argument is not file path", async () => {
      const res = await getFileIdFromFilePath("foo/bar");
      assert.isNull(res);
    });

    it("should get string", async () => {
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
    const createTmpFileResMsg = index.__get__("createTmpFileResMsg");

    it("should get null if no argument given", async () => {
      const res = await createTmpFileResMsg();
      assert.isNull(res);
    });

    it("should get null if argument is not string", async () => {
      const res = await createTmpFileResMsg(1);
      assert.isNull(res);
    });

    it("should get null if argument is not a file", async () => {
      const res = await createTmpFileResMsg("foo/bar");
      assert.isNull(res);
    });

    it("should get message", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const fileMap = index.__get__("fileMap");
      const getFileTimestamp = index.__get__("getFileTimestamp");
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
    const getTmpFileFromWatcherFileName =
      index.__get__("getTmpFileFromWatcherFileName");

    it("should get lenth 0 if no argument given", async () => {
      const res = await getTmpFileFromWatcherFileName();
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get lenth 0 if event does not match", async () => {
      const res = await getTmpFileFromWatcherFileName("foo", "bar");
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get lenth 0 if file arg is not string", async () => {
      const res = await getTmpFileFromWatcherFileName("change", {});
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get length 0 if Map is empty", async () => {
      const fileMap = index.__get__("fileMap");
      fileMap[FILE_WATCH].clear();
      const res = await getTmpFileFromWatcherFileName("change", "bar");
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get unwatch file if key does not match", async () => {
      const unwatchFile = index.__set__("unwatchFile", (k, v) => [k, v]);
      const fileMap = index.__get__("fileMap");
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const fileMap = index.__get__("fileMap");
      const getFileTimestamp = index.__get__("getFileTimestamp");
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
    const deleteKeyFromFileMap = index.__get__("deleteKeyFromFileMap");
    const fileMap = index.__get__("fileMap");

    it("should not delete key if argument is missing", async () => {
      fileMap[FILE_WATCH].set("foo", "bar");
      await deleteKeyFromFileMap();
      assert.strictEqual(fileMap[FILE_WATCH].get("foo"), "bar");
      fileMap[FILE_WATCH].delete("foo");
    });

    it("should not delete key if argument does not match", async () => {
      fileMap[FILE_WATCH].set("foo", "bar");
      await deleteKeyFromFileMap(FILE_WATCH, "baz");
      assert.strictEqual(fileMap[FILE_WATCH].has("baz"), false);
      assert.strictEqual(fileMap[FILE_WATCH].get("foo"), "bar");
      fileMap[FILE_WATCH].delete("foo");
    });

    it("should delete key", async () => {
      fileMap[FILE_WATCH].set("foo", "bar");
      await deleteKeyFromFileMap(FILE_WATCH, "foo");
      assert.strictEqual(fileMap[FILE_WATCH].has("foo"), false);
      assert.strictEqual(fileMap[FILE_WATCH].get("foo"), undefined);
    });
  });

  describe("unwatchFile", () => {
    const unwatchFile = index.__get__("unwatchFile");
    const fileMap = index.__get__("fileMap");

    it("should not unwatch if argument is missing", async () => {
      fileMap[FILE_WATCH].set("foo", {
        close: () => undefined,
      });
      await unwatchFile();
      assert.strictEqual(fileMap[FILE_WATCH].has("foo"), true);
      fileMap[FILE_WATCH].delete("foo");
    });

    it("should unwatch", async () => {
      fileMap[FILE_WATCH].set("foo", {
        close: () => undefined,
      });
      await unwatchFile("foo");
      assert.strictEqual(fileMap[FILE_WATCH].has("foo"), false);
    });

    it("should unwatch", async () => {
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
    const watchTmpFile = index.__get__("watchTmpFile");

    it("should pass given args", async () => {
      const getTmpFileFromWatcherFileName =
        index.__set__("getTmpFileFromWatcherFileName", async (type, file) => ({
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
    const createTmpFile = index.__get__("createTmpFile");

    it("should get null if no argument given", async () => {
      const res = await createTmpFile();
      assert.isNull(res);
    });

    it("should get null if argument is not object", async () => {
      const res = await createTmpFile(1);
      assert.isNull(res);
    });

    it("should get null if argument is not object", async () => {
      const res = await createTmpFile(1);
      assert.isNull(res);
    });

    it("should get null if data prop is falsy", async () => {
      const obj = {
        data: false,
      };
      const res = await createTmpFile(obj);
      assert.isNull(res);
    });

    it("should get null if data lacks one of required prop", async () => {
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
      const createDir = index.__set__("createDir", arr => path.join(...arr));
      const createFile = index.__set__("createFile", filePath => filePath);
      const watch = index.__set__("watch", () => ({}));
      const fileMap = index.__get__("fileMap");
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
      const createDir = index.__set__("createDir", arr => path.join(...arr));
      const createFile = index.__set__("createFile", filePath => filePath);
      const watch = index.__set__("watch", () => ({}));
      const fileMap = index.__get__("fileMap");
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
      const writeStdout = index.__set__("writeStdout", msg => {
        stdoutMsg = msg;
      });
      const createDir = index.__set__("createDir", arr => path.join(...arr));
      const createFile = index.__set__("createFile", filePath => filePath);
      const watch = index.__set__("watch", () => ({}));
      const fileMap = index.__get__("fileMap");
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
    const removeTmpFileData = index.__get__("removeTmpFileData");

    it("should get empty array if no argument given", async () => {
      const res = await removeTmpFileData();
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get empty array if dir prop is falsy", async () => {
      const obj = {
        dir: false,
      };
      const res = await removeTmpFileData(obj);
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get empty array if Map does not exist", async () => {
      const obj = {
        dir: "foo",
      };
      const res = await removeTmpFileData(obj);
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get empty array if Map does not exist", async () => {
      const fileMap = index.__get__("fileMap");
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
      const fileMap = index.__get__("fileMap");
      const unwatchFile = index.__set__("unwatchFile", file => file);
      const deleteKeyFromFileMap =
        index.__set__("deleteKeyFromFileMap", (dir, fileId) => ({dir, fileId}));
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
      const fileMap = index.__get__("fileMap");
      const unwatchFile = index.__set__("unwatchFile", file => file);
      const deleteKeyFromFileMap =
        index.__set__("deleteKeyFromFileMap", (dir, fileId) => ({dir, fileId}));
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
      const fileMap = index.__get__("fileMap");
      const unwatchFile = index.__set__("unwatchFile", file => file);
      const deleteKeyFromFileMap =
        index.__set__("deleteKeyFromFileMap", (dir, fileId) => ({dir, fileId}));
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
      const fileMap = index.__get__("fileMap");
      const unwatchFile = index.__set__("unwatchFile", file => file);
      const deleteKeyFromFileMap =
        index.__set__("deleteKeyFromFileMap", (dir, fileId) => ({dir, fileId}));
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
      const fileMap = index.__get__("fileMap");
      const unwatchFile = index.__set__("unwatchFile", file => file);
      const deleteKeyFromFileMap =
        index.__set__("deleteKeyFromFileMap", (dir, fileId) => ({dir, fileId}));
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
    const getEditorConfig = index.__get__("getEditorConfig");

    it("should get array with expected length", async () => {
      const EXPECTED_LENGTH = 1;
      const FILE_PATH = path.join("test", "file", "test.txt");
      const editorConfigPath =
        index.__set__("EDITOR_CONFIG_FILE", FILE_PATH);
      const portEditorConfig = index.__set__("portEditorConfig",
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
      const editorConfigPath = index.__set__("EDITOR_CONFIG_FILE", FILE_PATH);
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
    const viewLocalFile = index.__get__("viewLocalFile");

    it("should get null if argument is not string", async () => {
      const res = await viewLocalFile(1);
      assert.isNull(res);
    });

    it("should get message if argument is not uri", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const res = await viewLocalFile("https://example.com");
      assert.isNull(res);
    });

    it("should get null if file does not exist", async () => {
      const res = await viewLocalFile("file:///foo/bar.txt");
      assert.isNull(res);
    });

    it("should get spawn child process function", async () => {
      const spawnChildProcess =
        index.__set__("spawnChildProcess", file => file);
      const filePath = path.resolve(path.join("test", "file", "test.txt"));
      const filePathname = filePath.split(path.sep).join("/");
      const fileUrl = `file://${IS_WIN && "/" || ""}${filePathname}`;
      const res = await viewLocalFile(fileUrl);
      assert.strictEqual(res, filePath);
      spawnChildProcess();
    });
  });

  describe("handleCreatedTmpFile", () => {
    const handleCreatedTmpFile = index.__get__("handleCreatedTmpFile");

    it("should get empty array if argument not given", async () => {
      const res = await handleCreatedTmpFile();
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get empty array if file path is not file", async () => {
      const res = await handleCreatedTmpFile({
        filePath: "foo/bar",
      });
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 0);
    });

    it("should get array with expected length", async () => {
      const EXPECTED_LENGTH = 2;
      const spawnChildProcess =
        index.__set__("spawnChildProcess", file => file);
      const portFileData = index.__set__("portFileData", obj => obj);
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
    const handleMsg = index.__get__("handleMsg");

    it("should get message if no argument given", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
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
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const getEditorConfig = index.__set__("getEditorConfig", obj => obj);
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
  });

  describe("readStdin", () => {
    const readStdin = index.__get__("readStdin");

    it("should get function", async () => {
      const handleMsg = index.__set__("handleMsg", msg => msg);
      const chunk = (new Output()).encode("test");
      const res = await readStdin(chunk);
      assert.isTrue(Array.isArray(res));
      assert.strictEqual(res.length, 1);
      assert.deepEqual(res, ["test"]);
      handleMsg();
    });
  });

  describe("handleExit", () => {
    const handleExit = index.__get__("handleExit");

    it("should exit with code", async () => {
      const {stdout} = process;
      sinon.stub(stdout, "write");
      await handleExit(0);
      const {calledOnce} = stdout.write;
      stdout.write.restore();
      assert.isTrue(calledOnce);
    });
  });
}
