/* eslint-disable no-magic-numbers */
"use strict";
/* api */
const {
  abortSetup, createEditorConfig,
  handleCmdArgsInput, handleEditorPathInput, handleSetupCallback,
} = require("../modules/setup");
const {
  createDirectory, createFile, isFile, removeDir,
} = require("web-ext-native-msg");
const {assert} = require("chai");
const {afterEach, beforeEach, describe, it} = require("mocha");
const commander = require("commander");
const fs = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");
const readline = require("readline-sync");
const sinon = require("sinon");

/* constant */
const {EDITOR_CONFIG_FILE} = require("../modules/constant");
const CHAR = "utf8";
const DIR_TMP = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
                os.tmpdir();
const INDENT = 2;
const IS_WIN = os.platform() === "win32";
const PERM_APP = 0o755;

describe("abortSetup", () => {
  it("should exit with message", () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, "exit");
    abortSetup("foo");
    const {calledOnce: infoCalled} = stubInfo;
    const {calledOnce: exitCalled} = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, "Setup aborted: foo");
  });
});

describe("handleCmdArgsInput", () => {
  it("should get array", async () => {
    const stubRlQues =
      sinon.stub(readline, "question").returns("foo \"bar baz\" qux");
    const cmdArgs = ["foo", "bar", "baz"];
    const res = await handleCmdArgsInput(cmdArgs);
    assert.isFalse(stubRlQues.called);
    assert.deepEqual(res, cmdArgs);
    stubRlQues.restore();
  });

  it("should call function and get array", async () => {
    const stubRlQues =
      sinon.stub(readline, "question").returns("foo \"bar baz\" qux");
    const res = await handleCmdArgsInput();
    assert.isTrue(stubRlQues.calledOnce);
    assert.deepEqual(res, [
      "foo",
      "bar baz",
      "qux",
    ]);
    stubRlQues.restore();
  });
});

describe("handleEditorPathInput", () => {
  it("should get string", async () => {
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const res = await handleEditorPathInput(editorPath);
    assert.isFalse(stubRlPath.called);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
  });

  it("should call function and get string", async () => {
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const res = await handleEditorPathInput();
    assert.isTrue(stubRlPath.calledOnce);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
  });

  it("should call function and get string", async () => {
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const unexecutablePath =
      path.resolve(path.join("test", "file", "test.txt"));
    const stubRlPath = sinon.stub(readline, "questionPath");
    const i = stubRlPath.callCount;
    stubRlPath.onFirstCall().returns(unexecutablePath);
    stubRlPath.onSecondCall().returns(editorPath);
    const res = await handleEditorPathInput();
    assert.strictEqual(stubRlPath.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
  });
});

describe("createEditorConfig", () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, "withexeditorhost-test");
    removeDir(configDirPath, DIR_TMP);
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, "withexeditorhost-test");
    removeDir(configDirPath, DIR_TMP);
  });

  it("should throw", async () => {
    await createEditorConfig().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, "No such directory: undefined");
    });
  });

  it("should call function", async () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const configPath = await createDirectory(
      path.join(DIR_TMP, "withexeditorhost-test")
    );
    const filePath = path.join(configPath, EDITOR_CONFIG_FILE);
    const res = await createEditorConfig({
      configPath,
      editorPath,
      editorArgs: [],
    });
    const file = fs.readFileSync(filePath, {
      encoding: "utf8",
      flag: "r",
    });
    const parsedFile = JSON.parse(file);
    const {calledOnce: infoCalled} = stubInfo;
    stubInfo.restore();
    assert.isTrue(infoCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    assert.isTrue(file.endsWith("\n"));
    assert.deepEqual(parsedFile, {
      editorPath,
      cmdArgs: [],
    });
  });
});

describe("handleSetupCallback", () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, "withexeditorhost-test");
    removeDir(configDirPath, DIR_TMP);
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, "withexeditorhost-test");
    removeDir(configDirPath, DIR_TMP);
  });

  it("should throw", () => {
    assert.throws(() => handleSetupCallback(),
                  "No such directory: undefined");
  });

  it("should throw", () => {
    const configDirPath = path.normalize("/foo/bar");
    assert.throws(() => handleSetupCallback({configDirPath}),
                  `No such directory: ${configDirPath}`);
  });

  it("should call function", async () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, "exit");
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const stubRlQues = sinon.stub(readline, "question").returns("");
    const stubRlKey = sinon.stub(readline, "keyInYNStrict").returns(true);
    const stubCommander = sinon.stub(commander, "opts").callsFake(() => {
      const opt = {};
      return opt;
    });
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, "withexeditorhost-test")
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const res = await handleSetupCallback({configDirPath});
    const {calledOnce: infoCalled} = stubInfo;
    const {calledOnce: exitCalled} = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isTrue(stubRlPath.calledOnce);
    assert.isTrue(stubRlQues.calledOnce);
    assert.isFalse(stubRlKey.called);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRlPath.restore();
    stubRlQues.restore();
    stubRlKey.restore();
    stubCommander.restore();
  });

  it("should abort", async () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, "exit");
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const stubRlQues = sinon.stub(readline, "question").returns("");
    const stubRlKey = sinon.stub(readline, "keyInYNStrict").returns(false);
    const stubCommander = sinon.stub(commander, "opts").callsFake(() => {
      const opt = {};
      return opt;
    });
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, "withexeditorhost-test")
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: "w",
    });
    const res = await handleSetupCallback({configDirPath});
    const {calledOnce: infoCalled} = stubInfo;
    const {calledOnce: exitCalled} = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isFalse(stubRlPath.called);
    assert.isFalse(stubRlQues.called);
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, `Setup aborted: ${filePath} already exists.`);
    assert.isTrue(isFile(filePath));
    assert.isNull(res);
    stubRlPath.restore();
    stubRlQues.restore();
    stubRlKey.restore();
    stubCommander.restore();
  });

  it("should call function", async () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, "exit");
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const stubRlQues = sinon.stub(readline, "question").returns("");
    const stubRlKey = sinon.stub(readline, "keyInYNStrict").returns(true);
    const stubCommander = sinon.stub(commander, "opts").callsFake(() => {
      const opt = {};
      return opt;
    });
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, "withexeditorhost-test")
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: "w",
    });
    const res = await handleSetupCallback({configDirPath});
    const {calledOnce: infoCalled} = stubInfo;
    const {calledOnce: exitCalled} = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isTrue(stubRlPath.calledOnce);
    assert.isTrue(stubRlQues.calledOnce);
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRlPath.restore();
    stubRlQues.restore();
    stubRlKey.restore();
    stubCommander.restore();
  });

  it("should call function", async () => {
    let info;
    const stubInfo = sinon.stub(console, "info").callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, "exit");
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath =
      sinon.stub(readline, "questionPath").returns(editorPath);
    const stubRlQues = sinon.stub(readline, "question").returns("");
    const stubRlKey = sinon.stub(readline, "keyInYNStrict").returns(true);
    const stubCommander = sinon.stub(commander, "opts").callsFake(() => {
      const opt = {
        editorPath,
        editorArgs: "foo bar baz",
        overwriteEditorConfig: true,
      };
      return opt;
    });
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, "withexeditorhost-test")
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: "w",
    });
    const res = await handleSetupCallback({configDirPath});
    const {calledOnce: infoCalled} = stubInfo;
    const {calledOnce: exitCalled} = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isFalse(stubRlPath.called);
    assert.isFalse(stubRlQues.called);
    assert.isFalse(stubRlKey.called);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRlPath.restore();
    stubRlQues.restore();
    stubRlKey.restore();
    stubCommander.restore();
  });
});
