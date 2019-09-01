/* eslint-disable no-await-in-loop, no-magic-numbers */
"use strict";
/* api */
const {
  editorConfig, fileMap,
  addProcessListeners, createTmpFile, createTmpFileResMsg, deleteKeyFromFileMap,
  exportAppStatus, exportEditorConfig, exportFileData, exportHostVersion,
  getEditorConfig, getFileIdFromFilePath,
  getTmpFileFromFileData, getTmpFileFromWatcherFileName,
  handleChildProcessErr, handleChildProcessStderr, handleChildProcessStdout,
  handleCreatedTmpFile, handleExit, handleMsg, handleReject, hostMsg,
  initPrivateTmpDir, readStdin, removeTmpFileData, spawnChildProcess,
  startup, unwatchFile, viewLocalFile, watchTmpFile, writeStdout,
} = require("../modules/main");
const {
  Input, Output,
  createDirectory, createFile, getFileTimestamp, isDir, isFile, removeDir,
} = require("web-ext-native-msg");
const {
  promises: {
    compareSemVer, parseSemVer,
  },
} = require("semver-parser");
const {name: hostName, version: hostVersion} = require("../package.json");
const {assert} = require("chai");
const {afterEach, beforeEach, describe, it} = require("mocha");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");
const rewiremock = require("rewiremock/node");
const sinon = require("sinon");

/* constant */
const {
  EDITOR_CONFIG_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
  FILE_WATCH,
  HOST_VERSION, HOST_VERSION_CHECK, LABEL, LOCAL_FILE_VIEW, MODE_EDIT,
  TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_RES,
} = require("../modules/constant");
const APP = `${process.pid}`;
const CHAR = "utf8";
const IS_WIN = os.platform() === "win32";
const PERM_APP = 0o755;
const PERM_FILE = 0o644;
const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
               os.tmpdir();
const TMPDIR_APP = path.resolve(path.join(TMPDIR, LABEL, APP));
const TMPDIR_FILES = path.join(TMPDIR_APP, TMP_FILES);
const TMPDIR_FILES_PB = path.join(TMPDIR_APP, TMP_FILES_PB);

describe("hostMsg", () => {
  it("should get object", async () => {
    const message = "foo";
    const status = "bar";
    const res = await hostMsg(message, status);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: "foo",
        status: "bar",
      },
    });
  });
});

describe("handleReject", () => {
  it("should get false", () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      err = buf;
    });
    const msg = (new Output()).encode("unknown error.");
    const res = handleReject();
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it("should call function and get false", () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      err = buf;
    });
    const e = "error";
    const msg = (new Output()).encode("error");
    const res = handleReject(e);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it("should call function and get false", () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      err = buf;
    });
    const e = new Error("error");
    const msg = (new Output()).encode("error");
    const res = handleReject(e);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it("should call function and get false", () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      err = buf;
    });
    const e = new TypeError("type error");
    const msg = (new Output()).encode("type error");
    const res = handleReject(e);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });
});

describe("writeStdout", () => {
  it("should get null", async () => {
    const res = await writeStdout();
    assert.isNull(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode("foo");
    const res = await writeStdout("foo");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe("exportAppStatus", () => {
  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: EDITOR_CONFIG_GET,
        status: "ready",
      },
    });
    const res = await exportAppStatus();
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe("exportEditorConfig", () => {
  beforeEach(() => {
    editorConfig.editorPath = "";
    editorConfig.cmdArgs = [];
  });
  afterEach(() => {
    editorConfig.editorPath = "";
    editorConfig.cmdArgs = [];
  });

  it("should throw", async () => {
    await exportEditorConfig().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, "Expected String but got Undefined.");
    });
  });

  it("should throw", async () => {
    await exportEditorConfig("{foo:bar}").catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const editorConfigPath =
      path.resolve(path.join("test", "file", "editorconfig.json"));
    const timestamp = getFileTimestamp(editorConfigPath);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const editorConfigData = {
      editorPath,
      cmdArgs: ["--foo", "--bar"],
    };
    const value = `${JSON.stringify(editorConfigData)}\n`;
    const msg = (new Output()).encode({
      [EDITOR_CONFIG_RES]: {
        editorName: "test",
        executable: true,
        [EDITOR_CONFIG_TS]: timestamp,
      },
    });
    const res = await exportEditorConfig(value, editorConfigPath);
    const {calledOnce: writeCalled} = stubWrite;
    const {called: errWriteCalled} = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.strictEqual(editorConfig.editorPath, editorPath);
    assert.deepEqual(editorConfig.cmdArgs, ["--foo", "--bar"]);
    assert.deepEqual(res, msg);
  });
});

describe("exportFileData", () => {
  it("should get null", async () => {
    const res = await exportFileData();
    assert.isNull(res);
  });

  it("should get null", async () => {
    const res = await exportFileData({});
    assert.isNull(res);
  });

  it("should get null", async () => {
    const res = await exportFileData({
      data: {},
    });
    assert.isNull(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_PORT]: {
        data: {
          foo: "bar",
        },
      },
    });
    const res = await exportFileData({
      data: {
        foo: "bar",
      },
    });
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe("getLatestHostVersion", () => {
  it("should get result", async () => {
    const stubWrite = sinon.stub(process.stdout, "write");
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const stubCreateAgent = sinon.stub().resolves({});
    const stubGlobalAgent = {
      createGlobalProxyAgent: stubCreateAgent,
    };
    const stubPackageJson = sinon.stub();
    stubPackageJson.withArgs(hostName).resolves({
      version: `${major}.${minor}.${patch + 1}`,
    });
    stubPackageJson.withArgs(hostName, {
      agent: {},
    }).resolves({
      version: `${major}.${minor}.${patch + 2}`,
    });
    rewiremock("global-agent").with(stubGlobalAgent);
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.getLatestHostVersion();
    const {calledOnce: createCalled} = stubCreateAgent;
    const {calledOnce: pjCalled} = stubPackageJson;
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    if (process.env.HTTP_PROXY || process.env.http_proxy ||
        process.env.HTTPS_PROXY || process.env.https_proxy) {
      assert.isTrue(createCalled);
      assert.isTrue(pjCalled);
      assert.strictEqual(res, `${major}.${minor}.${patch + 2}`);
    } else {
      assert.isFalse(createCalled);
      assert.isTrue(pjCalled);
      assert.strictEqual(res, `${major}.${minor}.${patch + 1}`);
    }
    assert.isFalse(writeCalled);
  });

  it("should write stdout", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
      return buf;
    });
    const stubPackageJson = sinon.stub().rejects(new Error("error"));
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.getLatestHostVersion();
    rewiremock.disable();
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    const [obj] = (new Input()).decode(msg);
    assert.isTrue(stubPackageJson.calledOnce);
    assert.isNull(res);
    assert.isTrue(writeCalled);
    assert.deepEqual(obj, {
      [hostName]: {
        message: "error",
        status: "error",
      },
    });
  });
});

describe("getLatestHostVersion, proxy", () => {
  let proxy;
  beforeEach(() => {
    if (process.env.HTTP_PROXY) {
      proxy = process.env.HTTP_PROXY;
    } else {
      process.env.HTTP_PROXY = "http://localhost:8080";
    }
  });
  afterEach(() => {
    if (proxy) {
      process.env.HTTP_PROXY = proxy;
    } else {
      delete process.env.HTTP_PROXY;
    }
  });

  it("should get result", async () => {
    assert.strictEqual(process.env.HTTP_PROXY, "http://localhost:8080");
    const stubWrite = sinon.stub(process.stdout, "write");
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const latest = `${major}.${minor}.${patch + 1}`;
    const stubCreateAgent = sinon.stub().resolves({});
    const stubGlobalAgent = {
      createGlobalProxyAgent: stubCreateAgent,
    };
    const stubPackageJson = sinon.stub().withArgs(hostName, {
      agent: {},
    }).resolves({
      version: latest,
    });
    rewiremock("global-agent").with(stubGlobalAgent);
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.getLatestHostVersion();
    const {calledOnce: createCalled} = stubCreateAgent;
    const {calledOnce: pjCalled} = stubPackageJson;
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    assert.isTrue(createCalled);
    assert.isTrue(pjCalled);
    assert.strictEqual(res, latest);
    assert.isFalse(writeCalled);
  });
});

describe("exportHostVersion", () => {
  it("should throw", async () => {
    await exportHostVersion().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, "Expected String but got Undefined.");
    });
  });

  it("should throw", async () => {
    await exportHostVersion("1").catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, "1 is not valid SemVer.");
    });
  });

  it("should call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
      return buf;
    });
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const ver = `${major > 0 && major - 1 || 0}.${minor}.${patch}`;
    const latest = `${major}.${minor}.${patch + 1}`;
    const currentResult = await compareSemVer(hostVersion, latest);
    const isLatest = currentResult >= 0;
    const stubPackageJson = sinon.stub().resolves({
      version: latest,
    });
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.exportHostVersion(ver);
    const {calledOnce: pjCalled} = stubPackageJson;
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    const [obj] = (new Input()).decode(msg);
    assert.isTrue(pjCalled);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.isAbove(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, latest);
    assert.strictEqual(obj.hostVersion.isLatest, isLatest);
  });

  it("should call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
      return buf;
    });
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const ver = `${major}.${minor}.${patch + 1}`;
    const latest = `${major}.${minor}.${patch + 1}`;
    const currentResult = await compareSemVer(hostVersion, latest);
    const isLatest = currentResult >= 0;
    const stubPackageJson = sinon.stub().resolves({
      version: latest,
    });
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.exportHostVersion(ver);
    const {calledOnce: pjCalled} = stubPackageJson;
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    const [obj] = (new Input()).decode(msg);
    assert.isTrue(pjCalled);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.isBelow(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, latest);
    assert.strictEqual(obj.hostVersion.isLatest, isLatest);
  });

  it("should call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
      return buf;
    });
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const latest = `${major}.${minor}.${patch + 1}`;
    const currentResult = await compareSemVer(hostVersion, latest);
    const isLatest = currentResult >= 0;
    const stubPackageJson = sinon.stub().resolves({
      version: latest,
    });
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.exportHostVersion(hostVersion);
    const {calledOnce: pjCalled} = stubPackageJson;
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    const [obj] = (new Input()).decode(msg);
    assert.isTrue(pjCalled);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.strictEqual(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, latest);
    assert.strictEqual(obj.hostVersion.isLatest, isLatest);
  });

  it("should call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
      return buf;
    });
    const stubPackageJson = sinon.stub().resolves({});
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.exportHostVersion(hostVersion);
    const {calledOnce: pjCalled} = stubPackageJson;
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    const [obj] = (new Input()).decode(msg);
    assert.isTrue(pjCalled);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.strictEqual(obj.hostVersion.result, 0);
    assert.isNull(obj.hostVersion.latest);
    assert.isUndefined(obj.hostVersion.isLatest);
  });
});

describe("handleChildProcessErr", () => {
  it("should call function", async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      info = buf;
    });
    const msg = (new Output()).encode("unknown error");
    await handleChildProcessErr();
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });

  it("should call function", async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      info = buf;
    });
    const msg = (new Output()).encode("error");
    await handleChildProcessErr("error");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });

  it("should call function", async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => {
      info = buf;
    });
    const msg = (new Output()).encode("error");
    await handleChildProcessErr(new Error("error"));
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe("handleChildProcessStderr", () => {
  it("should not call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    await handleChildProcessStderr();
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
  });

  it("should call function", async () => {
    let info;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      info = buf;
    });
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "foo",
        status: "childProcess_stderr",
      },
    });
    await handleChildProcessStderr("foo");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe("handleChildProcessStdout", () => {
  it("should not call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    await handleChildProcessStdout();
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
  });

  it("should call function", async () => {
    let info;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      info = buf;
    });
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "foo",
        status: "childProcess_stdout",
      },
    });
    await handleChildProcessStdout("foo");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe("spawnChildProcess", () => {
  beforeEach(() => {
    editorConfig.editorPath = "";
    editorConfig.cmdArgs = [];
  });
  afterEach(() => {
    editorConfig.editorPath = "";
    editorConfig.cmdArgs = [];
  });

  it("should throw", async () => {
    await spawnChildProcess().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, "No such file: undefined");
    });
  });

  it("should throw", async () => {
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    await spawnChildProcess(filePath).catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, "Application is not executable.");
    });
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const res = await spawnChildProcess(filePath, editorPath);
    const {called: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.deepEqual(editorConfig.cmdArgs, []);
    assert.isObject(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = "";
    const res = await spawnChildProcess(filePath, editorPath);
    const {called: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.deepEqual(editorConfig.cmdArgs, "");
    assert.isObject(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ["foo", "bar"];
    const res = await spawnChildProcess(filePath, editorPath);
    const {called: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.deepEqual(editorConfig.cmdArgs, ["foo", "bar"]);
    assert.isObject(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = "foo bar";
    const res = await spawnChildProcess(filePath, editorPath);
    const {called: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.deepEqual(editorConfig.cmdArgs, "foo bar");
    assert.isObject(res);
  });
});

describe("fileMap", () => {
  it("should be instance of Map", () => {
    const keys = Object.keys(fileMap);
    for (const key of keys) {
      const val = fileMap[key];
      assert.isTrue(val instanceof Map);
    }
  });
});

describe("deleteKeyFromFileMap", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });

  it("should get false", async () => {
    fileMap[FILE_WATCH].set("foo", "bar");
    const res = await deleteKeyFromFileMap();
    assert.isTrue(fileMap[FILE_WATCH].has("foo"));
    assert.isFalse(res);
  });

  it("should get false", async () => {
    fileMap[FILE_WATCH].set("foo", "bar");
    const res = await deleteKeyFromFileMap(FILE_WATCH, "baz");
    assert.isTrue(fileMap[FILE_WATCH].has("foo"));
    assert.isFalse(res);
  });

  it("should get true", async () => {
    fileMap[FILE_WATCH].set("foo", "bar");
    fileMap[FILE_WATCH].set("baz", "qux");
    fileMap[TMP_FILES].set("foo", "quux");
    fileMap[TMP_FILES_PB].set("foo", "corge");
    const res = await deleteKeyFromFileMap(FILE_WATCH, "foo");
    assert.isFalse(fileMap[FILE_WATCH].has("foo"));
    assert.isTrue(fileMap[FILE_WATCH].has("baz"));
    assert.isTrue(fileMap[TMP_FILES].has("foo"));
    assert.isTrue(fileMap[TMP_FILES_PB].has("foo"));
    assert.isTrue(res);
  });

  it("should get true", async () => {
    fileMap[TMP_FILES].set("foo", "bar");
    fileMap[TMP_FILES].set("baz", "qux");
    fileMap[FILE_WATCH].set("foo", "quux");
    fileMap[TMP_FILES_PB].set("foo", "corge");
    const res = await deleteKeyFromFileMap(TMP_FILES, "foo");
    assert.isFalse(fileMap[TMP_FILES].has("foo"));
    assert.isTrue(fileMap[TMP_FILES].has("baz"));
    assert.isTrue(fileMap[FILE_WATCH].has("foo"));
    assert.isTrue(fileMap[TMP_FILES_PB].has("foo"));
    assert.isTrue(res);
  });

  it("should get true", async () => {
    fileMap[TMP_FILES_PB].set("foo", "bar");
    fileMap[TMP_FILES_PB].set("baz", "qux");
    fileMap[FILE_WATCH].set("foo", "quux");
    fileMap[TMP_FILES].set("foo", "corge");
    const res = await deleteKeyFromFileMap(TMP_FILES_PB, "foo");
    assert.isFalse(fileMap[TMP_FILES_PB].has("foo"));
    assert.isTrue(fileMap[TMP_FILES_PB].has("baz"));
    assert.isTrue(fileMap[FILE_WATCH].has("foo"));
    assert.isTrue(fileMap[TMP_FILES].has("foo"));
    assert.isTrue(res);
  });
});

describe("unwatchFile", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });

  it("should not call function", async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set("foo", {
      close: stubClose,
    });
    await unwatchFile();
    assert.isFalse(stubClose.called);
    assert.isTrue(fileMap[FILE_WATCH].has("foo"));
  });

  it("should call function", async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set("foo", {
      close: stubClose,
    });
    await unwatchFile("foo");
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has("foo"));
  });

  it("should call function", async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set("foo", {});
    await unwatchFile("foo", {
      close: stubClose,
    });
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has("foo"));
  });
});

describe("initPrivateTmpDir", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should not init private directory", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const dir = await createDirectory(path.join(TMPDIR_FILES_PB, "foo"));
    fileMap[TMP_FILES_PB].set("foo", {});
    await initPrivateTmpDir();
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(fileMap[TMP_FILES_PB].has("foo"));
    assert.isTrue(isDir(TMPDIR_FILES_PB));
    assert.isTrue(isDir(dir));
  });

  it("should init private directory", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const dir = await createDirectory(path.join(TMPDIR_FILES_PB, "foo"));
    fileMap[TMP_FILES_PB].set("foo", {});
    await initPrivateTmpDir(true);
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isFalse(fileMap[TMP_FILES_PB].has("foo"));
    assert.isTrue(isDir(TMPDIR_FILES_PB));
    assert.isFalse(isDir(dir));
  });
});

describe("getTmpFileFromFileData", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1,
        },
      },
    });
    const res = await getTmpFileFromFileData();
    const {calledOnce: writeCalled} = stubWrite;
    const {called: errWriteCalled} = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1,
        },
      },
    });
    const res = await getTmpFileFromFileData({});
    const {calledOnce: writeCalled} = stubWrite;
    const {called: errWriteCalled} = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: "foo",
          timestamp: -1,
        },
      },
    });
    const err = (new Output()).encode({
      withexeditorhost: {
        message: "Failed to get temporary file. ID: foo",
        status: "warn",
      },
    });
    const res = await getTmpFileFromFileData({
      dataId: "foo",
    });
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [msg, err]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const data = {
      dataId: "foo",
      dir: TMP_FILES,
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: "foo",
          dir: TMP_FILES,
          host: "host",
          tabId: "tabId",
          windowId: "windowId",
          timestamp: -1,
        },
      },
    });
    const err = (new Output()).encode({
      withexeditorhost: {
        message: "Failed to get temporary file. ID: foo",
        status: "warn",
      },
    });
    const res = await getTmpFileFromFileData(data);
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [msg, err]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const data = {
      dataId: "foo",
      dir: TMP_FILES,
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const filePath = path.resolve(path.join("test", "file", "foo.txt"));
    fileMap[TMP_FILES].set("windowId_tabId_host_foo", {filePath});
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: "foo",
          dir: TMP_FILES,
          host: "host",
          tabId: "tabId",
          windowId: "windowId",
          timestamp: -1,
        },
      },
    });
    const err = (new Output()).encode({
      withexeditorhost: {
        message: "Failed to get temporary file. ID: foo",
        status: "warn",
      },
    });
    const res = await getTmpFileFromFileData(data);
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.isFalse(fileMap[TMP_FILES].has("windowId_tabId_host_foo"));
    assert.deepEqual(res, [msg, err]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const data = {
      dataId: "foo",
      dir: TMP_FILES,
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const fileTimestamp = await getFileTimestamp(filePath);
    fileMap[TMP_FILES].set("windowId_tabId_host_foo", {filePath});
    const msg = (new Output()).encode({
      [TMP_FILE_RES]: {
        data: {
          dataId: "foo",
          dir: TMP_FILES,
          host: "host",
          tabId: "tabId",
          windowId: "windowId",
          timestamp: fileTimestamp,
        },
        value: "test file\n",
      },
    });
    const res = await getTmpFileFromFileData(data);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(fileMap[TMP_FILES].has("windowId_tabId_host_foo"));
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const data = {
      dataId: "foo",
      dir: TMP_FILES_PB,
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const fileTimestamp = await getFileTimestamp(filePath);
    fileMap[TMP_FILES_PB].set("windowId_tabId_host_foo", {filePath});
    const msg = (new Output()).encode({
      [TMP_FILE_RES]: {
        data: {
          dataId: "foo",
          dir: TMP_FILES_PB,
          host: "host",
          tabId: "tabId",
          windowId: "windowId",
          timestamp: fileTimestamp,
        },
        value: "test file\n",
      },
    });
    const res = await getTmpFileFromFileData(data);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(fileMap[TMP_FILES_PB].has("windowId_tabId_host_foo"));
    assert.deepEqual(res, [msg]);
  });
});

describe("getFileIdFromFilePath", () => {
  it("should get null", async () => {
    const res = await getFileIdFromFilePath();
    assert.isNull(res);
  });

  it("should get null", async () => {
    const res = await getFileIdFromFilePath(path.join(TMPDIR, "foo.txt"));
    assert.isNull(res);
  });

  it("should get null", async () => {
    const filePath = path.join(TMPDIR_APP, "foo.txt");
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it("should get null", async () => {
    const filePath = path.join(TMPDIR_APP, "foo", "bar.txt");
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it("should get null", async () => {
    const filePath = path.join(TMPDIR_APP, "foo", "bar", "baz.txt");
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it("should get null", async () => {
    const filePath = path.join(TMPDIR_APP, "foo", "bar", "baz", "qux.txt");
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it("should get string", async () => {
    const filePath =
      path.join(TMPDIR_APP, "foo", "bar", "baz", "qux", "quux.txt");
    const res = await getFileIdFromFilePath(filePath);
    assert.strictEqual(res, "bar_baz_qux_quux");
  });
});

describe("createTmpFileResMsg", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should get null", async () => {
    const res = await createTmpFileResMsg();
    assert.isNull(res);
  });

  it("should get null", async () => {
    const res = await createTmpFileResMsg(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar.txt")
    );
    assert.isNull(res);
  });

  it("should get null", async () => {
    const dir =
      await createDirectory(path.join(TMPDIR_APP, TMP_FILES, "foo", "bar"));
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    const res = await createTmpFileResMsg(filePath);
    assert.isNull(res);
  });

  it("should get null", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz")
    );
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    const res = await createTmpFileResMsg(filePath);
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isNull(res);
  });

  it("should get null", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz")
    );
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    fileMap[TMP_FILES].set("foo_bar_baz_test", {filePath});
    const res = await createTmpFileResMsg(filePath);
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isNull(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz")
    );
    const data = {};
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    const timestamp = await getFileTimestamp(filePath);
    data.timestamp = timestamp;
    const msg = (new Output()).encode({
      [TMP_FILE_RES]: {
        data, value,
      },
    });
    fileMap[TMP_FILES].set("foo_bar_baz_test", {data, filePath});
    const res = await createTmpFileResMsg(filePath);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe("getTmpFileFromWatcherFileName", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should get empty array", async () => {
    const res = await getTmpFileFromWatcherFileName();
    assert.deepEqual(res, []);
  });

  it("should get empty array", async () => {
    const res = await getTmpFileFromWatcherFileName("change");
    assert.deepEqual(res, []);
  });

  it("should get empty array", async () => {
    const res = await getTmpFileFromWatcherFileName("foo", "bar");
    assert.deepEqual(res, []);
  });

  it("should get empty array", async () => {
    const stubClose = sinon.stub();
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz")
    );
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose,
    });
    const res = await getTmpFileFromWatcherFileName("change", "foo.txt");
    assert.isFalse(stubClose.called);
    assert.deepEqual(res, []);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const stubClose = sinon.stub();
    const stubClose2 = sinon.stub();
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz")
    );
    const data = {};
    const value = "";
    const filePath =
      await createFile(path.join(dir, "test.txt"), value,
                       {encoding: CHAR, flag: "w", mode: PERM_FILE});
    const timestamp = await getFileTimestamp(filePath);
    const filePath2 =
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "qux", "test.txt");
    data.timestamp = timestamp;
    const msg = (new Output()).encode({
      [TMP_FILE_RES]: {
        data, value,
      },
    });
    fileMap[TMP_FILES].set("foo_bar_baz_test", {data, filePath});
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose,
    });
    fileMap[FILE_WATCH].set(filePath2, {
      close: stubClose2,
    });
    const res = await getTmpFileFromWatcherFileName("change", "test.txt");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(stubClose.called);
    assert.isTrue(stubClose2.calledOnce);
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.isFalse(fileMap[FILE_WATCH].has(filePath2));
    assert.deepEqual(res, [msg, undefined]);
  });
});

describe("watchTmpFile", () => {
  it("should get array", async () => {
    const res = await watchTmpFile();
    assert.deepEqual(res, []);
  });
});

describe("createTmpFile", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should get object", async () => {
    const res = await createTmpFile();
    assert.deepEqual(res, {
      data: undefined,
      filePath: undefined,
    });
  });

  it("should get object", async () => {
    const res = await createTmpFile({
      data: {},
    });
    assert.deepEqual(res, {
      data: {},
      filePath: undefined,
    });
  });

  it("should get object", async () => {
    const data = {
      dataId: "dataId",
      dir: "dir",
      extType: "extType",
      host: "host",
      tabId: "tabId",
      windowId: "windowId",
    };
    const keys = Object.keys(data);
    for (const key of keys) {
      const testData = data;
      testData[key] = false;
      const obj = {
        data: testData,
      };
      const res = await createTmpFile(obj);
      assert.deepEqual(res, {
        data: testData,
        filePath: undefined,
      });
    }
  });

  it("should create file and get object", async () => {
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
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz", "qux.txt");
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
    await fileMap[FILE_WATCH].get(filePath).close();
  });

  it("should create file and get object", async () => {
    const data = {
      dataId: "qux",
      dir: TMP_FILES,
      extType: ".txt",
      host: "baz",
      incognito: false,
      mode: "foobar",
      syncAuto: true,
      tabId: "bar",
      windowId: "foo",
    };
    const value = "";
    const obj = {
      data, value,
    };
    const filePath =
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz", "qux.txt");
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isFalse(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
  });

  it("should create file and get object", async () => {
    const stubClose = sinon.stub();
    const data = {
      dataId: "qux",
      dir: TMP_FILES,
      extType: ".txt",
      host: "baz",
      incognito: false,
      mode: "foobar",
      syncAuto: true,
      tabId: "bar",
      windowId: "foo",
    };
    const value = "";
    const obj = {
      data, value,
    };
    const filePath =
      path.join(TMPDIR_APP, TMP_FILES, "foo", "bar", "baz", "qux.txt");
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose,
    });
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath,
    });
  });
});

describe("removeTmpFileData", () => {
  beforeEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });
  afterEach(() => {
    fileMap[FILE_WATCH].clear();
    fileMap[TMP_FILES].clear();
    fileMap[TMP_FILES_PB].clear();
  });

  it("should get empty array", async () => {
    const res = await removeTmpFileData();
    assert.deepEqual(res, []);
  });

  it("should get empty array", async () => {
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const res = await removeTmpFileData(obj);
    assert.deepEqual(res, []);
  });

  it("should get results", async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: null,
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const fileId2 = "foo_bar_baz_quux";
    const fileId3 = "foo_barr_baz_qux";
    const filePath = path.join(TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    const filePath2 = path.join(TMPDIR_FILES, "foo", "bar", "baz", "quux.txt");
    const filePath3 = path.join(TMPDIR_FILES, "foo", "barr", "baz", "qux.txt");
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2,
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3,
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher,
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [
      undefined,
      true,
    ]);
  });

  it("should get results", async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const fileId2 = "foo_bar_baz_quux";
    const fileId3 = "foo_barr_baz_qux";
    const filePath = path.join(TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    const filePath2 = path.join(TMPDIR_FILES, "foo", "bar", "baz", "quux.txt");
    const filePath3 = path.join(TMPDIR_FILES, "foo", "barr", "baz", "qux.txt");
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2,
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3,
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher,
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [
      undefined,
      true,
    ]);
  });

  it("should get results", async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const fileId2 = "foo_bar_baz_quux";
    const fileId3 = "foo_barr_baz_qux";
    const filePath = path.join(TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    const filePath2 = path.join(TMPDIR_FILES, "foo", "bar", "baz", "quux.txt");
    const filePath3 = path.join(TMPDIR_FILES, "foo", "barr", "baz", "qux.txt");
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2,
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3,
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher,
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [undefined]);
  });

  it("should get results", async () => {
    const obj = {
      dataId: "qux",
      dir: TMP_FILES,
      host: "baz",
      tabId: "bar",
      windowId: "foo",
    };
    const fileId = "foo_bar_baz_qux";
    const fileId2 = "foo_bar_baz_quux";
    const fileId3 = "foo_barr_baz_qux";
    const filePath = path.join(TMPDIR_FILES, "foo", "bar", "baz", "qux.txt");
    const filePath2 = path.join(TMPDIR_FILES, "foo", "bar", "baz", "quux.txt");
    const filePath3 = path.join(TMPDIR_FILES, "foo", "barr", "baz", "qux.txt");
    fileMap[TMP_FILES].set(fileId, {filePath});
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2,
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3,
    });
    const res = await removeTmpFileData(obj);
    assert.deepEqual(res, [true]);
  });
});

describe("getEditorConfig", () => {
  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const err = (new Output()).encode({
      withexeditorhost: {
        message: "No such file: undefined",
        status: "warn",
      },
    });
    const msg = (new Output()).encode({
      [EDITOR_CONFIG_RES]: null,
    });
    const res = await getEditorConfig();
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [err, msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const editorConfigPath = path.resolve(path.join(".", "foo.json"));
    const err = (new Output()).encode({
      withexeditorhost: {
        message: `No such file: ${editorConfigPath}`,
        status: "warn",
      },
    });
    const msg = (new Output()).encode({
      [EDITOR_CONFIG_RES]: null,
    });
    const res = await getEditorConfig(editorConfigPath);
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [err, msg]);
  });

  it("should call function", async () => {
    const editorConfigPath =
      path.resolve(path.join("test", "file", "editorconfig.json"));
    const res = await getEditorConfig(editorConfigPath);
    assert.deepEqual(res, [null]);
  });
});

describe("viewLocalFile", () => {
  beforeEach(() => {
    editorConfig.editorPath = "";
  });
  afterEach(() => {
    editorConfig.editorPath = "";
  });

  it("should throw", async () => {
    await viewLocalFile().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, "Expected String but got Undefined.");
    });
  });

  it("should throw", async () => {
    await viewLocalFile("foo/bar").catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it("should get null if not file uri", async () => {
    const res = await viewLocalFile("https://example.com");
    assert.isNull(res);
  });

  it("should get null if file does not exist", async () => {
    const res = await viewLocalFile("file:///foo/bar.txt");
    assert.isNull(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stderr, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const filePathname = filePath.split(path.sep).join("/");
    const fileUrl = `file://${IS_WIN && "/" || ""}${filePathname}`;
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.editorPath = editorPath;
    const res = await viewLocalFile(fileUrl);
    const {called: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.isObject(res);
  });
});

describe("handleCreatedTmpFile", () => {
  beforeEach(() => {
    editorConfig.editorPath = "";
  });
  afterEach(() => {
    editorConfig.editorPath = "";
  });

  it("should get empty array", async () => {
    const res = await handleCreatedTmpFile();
    assert.deepEqual(res, []);
  });

  it("should get empty array if file path is not file", async () => {
    const res = await handleCreatedTmpFile({
      filePath: "foo/bar",
    });
    assert.deepEqual(res, []);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, "spawn").returns({
      on: a => a,
      stderr: {
        on: a => a,
      },
      stdout: {
        on: a => a,
      },
    });
    const filePath = path.resolve(path.join("test", "file", "test.txt"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const data = {
      foo: "bar",
    };
    const obj = {
      filePath, data,
    };
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_PORT]: {
        data,
      },
    });
    editorConfig.editorPath = editorPath;
    const res = await handleCreatedTmpFile(obj);
    const {calledOnce: writeCalled} = stubWrite;
    const {calledOnce: spawnCalled} = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(spawnCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 2);
    assert.deepEqual(res[1], msg);
  });
});

describe("handleMsg", () => {
  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "No handler found for undefined.",
        status: "warn",
      },
    });
    const res = await handleMsg();
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "No handler found for foo.",
        status: "warn",
      },
    });
    const res = await handleMsg("foo");
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "No handler found for foo.",
        status: "warn",
      },
    });
    const res = await handleMsg({
      foo: "bar",
    });
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    await createDirectory(TMPDIR_FILES_PB);
    const res = await handleMsg({
      [TMP_FILES_PB_REMOVE]: true,
    });
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [undefined]);
    await removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const msg = (new Output()).encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1,
        },
      },
    });
    const res = await handleMsg({
      [TMP_FILE_GET]: {},
    });
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, [[msg]]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const res = await handleMsg({
      [TMP_FILE_DATA_REMOVE]: {},
    });
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[]]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const res = await handleMsg({
      [TMP_FILE_CREATE]: {},
    });
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[]]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const res = await handleMsg({
      [LOCAL_FILE_VIEW]: "file:///foo/bar.txt",
    });
    const {called: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [null]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const {
      major, minor, patch,
    } = await parseSemVer(hostVersion);
    const latest = `${major}.${minor}.${patch + 1}`;
    const currentResult = await compareSemVer(hostVersion, latest);
    const isLatest = currentResult >= 0;
    const msg = (new Output()).encode({
      [HOST_VERSION]: {
        isLatest,
        latest,
        result: 0,
      },
    });
    const stubPackageJson = sinon.stub().resolves({
      version: latest,
    });
    rewiremock("package-json").with(stubPackageJson);
    rewiremock.enable();
    const mainJs = require("../modules/main");
    const res = await mainJs.handleMsg({
      [HOST_VERSION_CHECK]: hostVersion,
    });
    const {calledOnce: pjCalled} = stubPackageJson;
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    rewiremock.disable();
    assert.isTrue(pjCalled);
    assert.isTrue(writeCalled);
    assert.deepEqual(res, [msg]);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const editorConfigPath = path.resolve(path.join(".", EDITOR_CONFIG_FILE));
    const err = (new Output()).encode({
      withexeditorhost: {
        message: `No such file: ${editorConfigPath}`,
        status: "warn",
      },
    });
    const msg = (new Output()).encode({
      [EDITOR_CONFIG_RES]: null,
    });
    const res = await handleMsg({
      [EDITOR_CONFIG_GET]: true,
    });
    const {called: writeCalled, callCount: writeCallCount} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [[err, msg]]);
  });
});

describe("readStdin", () => {
  it("should get null", async () => {
    const chunk = (new Output()).encode("");
    const res = await readStdin(chunk);
    assert.isNull(res);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => buf);
    const chunk = (new Output()).encode({
      foo: "bar",
    });
    const msg = (new Output()).encode({
      withexeditorhost: {
        message: "No handler found for foo.",
        status: "warn",
      },
    });
    const res = await readStdin(chunk);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[msg]]);
  });
});

describe("handleExit", () => {
  beforeEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should not call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
    });
    handleExit(0);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isUndefined(msg);
  });

  it("should call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
    });
    const input = new Input();
    handleExit(1);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(input.decode(msg), [
      {
        withexeditorhost: {
          message: "exit 1",
          status: "exit",
        },
      },
    ]);
  });

  it("should remove dir and not call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
    });
    const dir = await createDirectory(TMPDIR_APP);
    handleExit(0);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isFalse(isDir(dir));
    assert.isUndefined(msg);
  });

  it("should remove dir and call function", async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(buf => {
      msg = buf;
    });
    const input = new Input();
    const dir = await createDirectory(TMPDIR_APP);
    handleExit(1);
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(isDir(dir));
    assert.deepEqual(input.decode(msg), [
      {
        withexeditorhost: {
          message: "exit 1",
          status: "exit",
        },
      },
    ]);
  });
});

describe("addProcessListeners", () => {
  it("should set listeners", async () => {
    const stubOn = sinon.stub(process, "on");
    const stubStdinOn = sinon.stub(process.stdin, "on");
    const i = stubOn.callCount;
    const j = stubStdinOn.callCount;
    await addProcessListeners();
    const {callCount: stubOnCallCount} = stubOn;
    const {callCount: stubStdinOnCallCount} = stubStdinOn;
    stubOn.restore();
    stubStdinOn.restore();
    assert.strictEqual(stubOnCallCount, i + 2);
    assert.strictEqual(stubStdinOnCallCount, j + 1);
  });
});

describe("startup", () => {
  beforeEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it("should call function", async () => {
    const stubWrite = sinon.stub(process.stdout, "write").callsFake(msg => msg);
    const input = new Input();
    const res = await startup();
    const {calledOnce: writeCalled} = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(input.decode(res), [
      {
        withexeditorhost: {
          message: "getEditorConfig",
          status: "ready",
        },
      },
    ]);
  });
});
