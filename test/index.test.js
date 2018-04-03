"use strict";
{
  /* api */
  const {assert} = require("chai");
  const {describe, it} = require("mocha");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const rewire = require("rewire");
  const sinon = require("sinon");

  /* constant */
  const {
    EDITOR_CONFIG_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
    EXT_CHROME_ID, EXT_WEB_ID, FILE_WATCH, HOST, HOST_DESC, HOST_VERSION,
    HOST_VERSION_CHECK, LABEL, LOCAL_FILE_VIEW, MODE_EDIT, PROCESS_CHILD,
    TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
    TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_RES,
  } = require("../modules/constant");
  const APP = `${process.pid}`;
  const CHAR = "utf8";
  const IS_WIN = os.platform() === "win32";
  const PERM_APP = 0o755;
  const PERM_DIR = 0o700;
  const PERM_FILE = 0o600;
  const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
                 os.tmpdir();
  const TMPDIR_APP = [TMPDIR, LABEL, APP];
  const TMPDIR_FILES = [...TMPDIR_APP, TMP_FILES];
  const TMPDIR_FILES_PB = [...TMPDIR_APP, TMP_FILES_PB];

  const index = rewire("../index");

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

    it("should warn if no argument given", async () => {
      const writeStdout = index.__set__("writeStdout", msg => msg);
      const res = await portAppStatus();
      assert.deepEqual(res, [
        {
          withexeditorhost: {
            message: "Failed to create temporary directory.",
            status: "warn",
          },
        },
        {
          withexeditorhost: {
            message: "Failed to create private temporary directory.",
            status: "warn",
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
            message: "Failed to create private temporary directory.",
            status: "warn",
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
            message: "Failed to create temporary directory.",
            status: "warn",
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

    it("should return null", async () => {
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

    it("should warn if failed to remove directory", async () => {
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
}
