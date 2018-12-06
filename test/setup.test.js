"use strict";
/* api */
const {assert} = require("chai");
const {describe, it} = require("mocha");
const fs = require("fs");
const os = require("os");
const path = require("path");
const rewire = require("rewire");
const sinon = require("sinon");

/* constant */
const {EDITOR_CONFIG_FILE} = require("../modules/constant");
const DIR_TMP = os.tmpdir();
const IS_WIN = os.platform() === "win32";
const PERM_APP = 0o755;

const setupJs = rewire("../modules/setup");

describe("handleSetupCallback", () => {
  it("should return null if no argument is given", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    assert.strictEqual(handleSetupCallback(), null);
  });

  it("should return null if argument is not an object", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    assert.strictEqual(handleSetupCallback(""), null);
  });

  it("should return null if argument does not contain property", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    const info = {};
    assert.strictEqual(handleSetupCallback(info), null);
  });

  it("should return null if argument property is not string type", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    const info = {
      configDirPath: true,
    };
    assert.strictEqual(handleSetupCallback(info), null);
  });

  it("should return null if argument property is not a directory", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    const info = {
      configDirPath: "foo/bar",
    };
    assert.strictEqual(handleSetupCallback(info), null);
  });

  it("should return function", () => {
    const handleSetupCallback = setupJs.__get__("handleSetupCallback");
    const setupEditor = setupJs.__set__("setupEditor", () => true);
    const info = {
      configDirPath: DIR_TMP,
    };
    const res = handleSetupCallback(info);
    assert.isTrue(res);
    setupEditor();
  });
});

describe("setupEditor", () => {
  it("should throw if argument is not a directory", () => {
    const setupEditor = setupJs.__get__("setupEditor");
    const setupVars = setupJs.__set__("vars", {
      configPath: "foo/bar",
    });
    assert.throws(() => setupEditor(), "No such directory: foo/bar.");
    setupVars();
  });

  it("should ask a question", () => {
    let ques;
    const setupEditor = setupJs.__get__("setupEditor");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
      rl: {
        question: stubQues,
      },
    });
    setupEditor();
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques, "Enter editor path:\n");
    setupVars();
  });

  it("should ask a question", () => {
    let ques;
    const setupEditor = setupJs.__get__("setupEditor");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const configPath = path.resolve(path.join("test", "file"));
    const filePath = path.join(configPath, "editorconfig.json");
    const setupVars = setupJs.__set__("vars", {
      configPath,
      rl: {
        question: stubQues,
      },
    });
    setupEditor();
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques,
                       `${filePath} already exists. Overwrite? [y/n]\n`);
    setupVars();
  });

  it("should call function", () => {
    const setupEditor = setupJs.__get__("setupEditor");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const handleEditorPathInput = setupJs.__set__("handleEditorPathInput",
                                                  stubFunc);
    const configPath = path.resolve(path.join("test", "file"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const setupVars = setupJs.__set__("vars", {
      configPath, editorPath,
      overwriteEditorConfig: true,
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    setupEditor();
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleEditorPathInput();
    setupVars();
  });

  it("should call function", () => {
    let ques;
    const setupEditor = setupJs.__get__("setupEditor");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const handleEditorPathInput = setupJs.__set__("handleEditorPathInput",
                                                  stubFunc);
    const configPath = path.resolve(path.join("test", "file"));
    const setupVars = setupJs.__set__("vars", {
      configPath,
      overwriteEditorConfig: true,
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    setupEditor();
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isFalse(funcCalled);
    assert.isTrue(quesCalled);
    assert.strictEqual(ques, "Enter editor path:\n");
    handleEditorPathInput();
    setupVars();
  });

  it("should call function", () => {
    const setupEditor = setupJs.__get__("setupEditor");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const handleEditorPathInput = setupJs.__set__("handleEditorPathInput",
                                                  stubFunc);
    const configPath = DIR_TMP;
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const setupVars = setupJs.__set__("vars", {
      configPath, editorPath,
      overwriteEditorConfig: true,
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    setupEditor();
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleEditorPathInput();
    setupVars();
  });
});

describe("abortSetup", () => {
  it("should exit with message", () => {
    const abortSetup = setupJs.__get__("abortSetup");
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    sinon.stub(console, "info");
    sinon.stub(process, "exit");
    abortSetup("test");
    const {calledOnce: consoleCalledOnce} = console.info;
    const {calledOnce: exitCalledOnce} = process.exit;
    console.info.restore();
    process.exit.restore();
    assert.isTrue(consoleCalledOnce);
    assert.isTrue(exitCalledOnce);
    setupVars();
  });
});

describe("handleEditorConfigFileInput", () => {
  it("should throw if argument is not a directory", () => {
    const userInput = setupJs.__get__("handleEditorConfigFileInput");
    const setupVars = setupJs.__set__("vars", {
      configPath: "foo/bar",
    });
    assert.throws(() => userInput(), "No such directory: foo/bar.");
    setupVars();
  });

  it("should close if no argument is given", () => {
    const userInput = setupJs.__get__("handleEditorConfigFileInput");
    const stubQues = sinon.stub();
    const setupAbort = setupJs.__set__("abortSetup", msg => msg);
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
      rl: {
        question: stubQues,
        close: () => false,
      },
    });
    userInput();
    const {called: quesCalled} = stubQues;
    assert.isFalse(quesCalled);
    setupVars();
    setupAbort();
  });

  it("should close if answer is no", () => {
    const userInput = setupJs.__get__("handleEditorConfigFileInput");
    const stubQues = sinon.stub();
    const setupAbort = setupJs.__set__("abortSetup", msg => msg);
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
      rl: {
        question: stubQues,
        close: () => false,
      },
    });
    userInput("n");
    const {called: quesCalled} = stubQues;
    assert.isFalse(quesCalled);
    setupVars();
    setupAbort();
  });

  it("should ask a question if answer is yes", () => {
    const userInput = setupJs.__get__("handleEditorConfigFileInput");
    const stubQues = sinon.stub();
    const setupAbort = setupJs.__set__("abortSetup", msg => msg);
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
      rl: {
        question: stubQues,
        close: () => false,
      },
    });
    userInput("y");
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(quesCalledOnce);
    setupVars();
    setupAbort();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorConfigFileInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const handleEditorPathInput = setupJs.__set__("handleEditorPathInput",
                                                  stubFunc);
    const configPath = path.resolve(path.join("test", "file"));
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const setupVars = setupJs.__set__("vars", {
      configPath, editorPath,
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput("y");
    const {calledOnce: funcCalledOnce} = stubFunc;
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(funcCalledOnce);
    assert.isFalse(quesCalledOnce);
    handleEditorPathInput();
    setupVars();
  });
});

describe("handleEditorPathInput", () => {
  it("should ask a question if no argument is given", () => {
    let ques;
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    userInput();
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques, "Enter command line options:\n");
    setupVars();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const handleCmdArgsInput = setupJs.__set__("handleCmdArgsInput", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      editorArgs: ["foo", "bar"],
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput();
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled, stubFunc);
    assert.isFalse(quesCalled, stubQues);
    handleCmdArgsInput();
    setupVars();
  });

  it("should ask a question if empty string is given", () => {
    let ques;
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    userInput("");
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques, "Enter command line options:\n");
    setupVars();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const handleCmdArgsInput = setupJs.__set__("handleCmdArgsInput", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      editorArgs: ["foo", "bar"],
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput("");
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleCmdArgsInput();
    setupVars();
  });

  it("should warn if input answer is not executable", () => {
    let ques;
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
      rl: {
        question: stubQues,
      },
    });
    sinon.stub(console, "warn");
    userInput("foo/bar");
    const {calledOnce: consoleCalledOnce} = console.warn;
    const {calledOnce: quesCalledOnce} = stubQues;
    assert.isTrue(consoleCalledOnce);
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques, "Enter editor path:\n");
    console.warn.restore();
    setupVars();
  });

  it("should set executable app path", () => {
    let ques;
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    const app = IS_WIN && "test.cmd" || "test.sh";
    const file = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(file, PERM_APP);
    }
    sinon.stub(console, "warn");
    userInput(file);
    const {calledOnce: consoleCalledOnce} = console.warn;
    const {calledOnce: quesCalledOnce} = stubQues;
    const {editorPath} = editorConfig;
    assert.isFalse(consoleCalledOnce);
    assert.strictEqual(editorPath, file);
    assert.isTrue(quesCalledOnce);
    assert.strictEqual(ques, "Enter command line options:\n");
    console.warn.restore();
    setupVars();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const handleCmdArgsInput = setupJs.__set__("handleCmdArgsInput", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      editorArgs: [],
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput(editorPath);
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleCmdArgsInput();
    setupVars();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const handleCmdArgsInput = setupJs.__set__("handleCmdArgsInput", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      editorArgs: ["foo", "bar"],
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput(editorPath);
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleCmdArgsInput();
    setupVars();
  });

  it("should call function", () => {
    const userInput = setupJs.__get__("handleEditorPathInput");
    const stubFunc = sinon.stub().callsFake(a => a);
    const stubQues = sinon.stub().callsFake(a => a);
    const app = IS_WIN && "test.cmd" || "test.sh";
    const editorPath = path.resolve(path.join("test", "file", app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const handleCmdArgsInput = setupJs.__set__("handleCmdArgsInput", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      editorPath,
      editorArgs: ["foo", "bar"],
      rl: {
        close: () => undefined,
        question: stubQues,
      },
    });
    userInput();
    const {calledOnce: funcCalled} = stubFunc;
    const {calledOnce: quesCalled} = stubQues;
    assert.isTrue(funcCalled);
    assert.isFalse(quesCalled);
    handleCmdArgsInput();
    setupVars();
  });
});

describe("handleCmdArgsInput", () => {
  it("should return null if no argument is given", async () => {
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const editorConfig = setupJs.__get__("editorConfig");
    const stubFunc = sinon.stub().callsFake(async () => undefined);
    const createEditorConfig = setupJs.__set__("createEditorConfig", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const res = await userInput();
    const {calledOnce} = stubFunc;
    const {cmdArgs} = editorConfig;
    assert.isFalse(calledOnce);
    assert.isNull(res);
    assert.deepEqual(cmdArgs, []);
    createEditorConfig();
    setupVars();
  });

  it("should return null if argument is not string", async () => {
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const editorConfig = setupJs.__get__("editorConfig");
    const stubFunc = sinon.stub().callsFake(async () => undefined);
    const createEditorConfig = setupJs.__set__("createEditorConfig", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const res = await userInput(["foo", "bar"]);
    const {calledOnce} = stubFunc;
    const {cmdArgs} = editorConfig;
    assert.isFalse(calledOnce);
    assert.isNull(res);
    assert.deepEqual(cmdArgs, []);
    createEditorConfig();
    setupVars();
  });

  it("should return funtion if empty string is given", async () => {
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const editorConfig = setupJs.__get__("editorConfig");
    const stubFunc = sinon.stub().callsFake(async () => undefined);
    const createEditorConfig = setupJs.__set__("createEditorConfig", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const res = await userInput("");
    const {calledOnce} = stubFunc;
    const {cmdArgs} = editorConfig;
    assert.isTrue(calledOnce);
    assert.isUndefined(res);
    assert.deepEqual(cmdArgs, []);
    createEditorConfig();
    setupVars();
  });

  it("should return function and set cmd args in array", async () => {
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const editorConfig = setupJs.__get__("editorConfig");
    const stubFunc = sinon.stub().callsFake(async () => undefined);
    const createEditorConfig = setupJs.__set__("createEditorConfig", stubFunc);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const res = await userInput("foo bar \"baz qux\"");
    const {calledOnce} = stubFunc;
    const {cmdArgs} = editorConfig;
    assert.isTrue(calledOnce);
    assert.isUndefined(res);
    assert.deepEqual(cmdArgs, ["foo", "bar", "baz qux"]);
    createEditorConfig();
    setupVars();
  });
});

describe("createEditorConfig", () => {
  it("should throw if config path is not a directory", async () => {
    const createEditorConfig = setupJs.__get__("createEditorConfig");
    const setupVars = setupJs.__set__("vars", {
      configPath: "foo/bar",
    });
    await createEditorConfig().catch(e => {
      assert.strictEqual(e.message, "No such directory: foo/bar.");
    });
    setupVars();
  });

  it("should throw if failed to create file", async () => {
    const createEditorConfig = setupJs.__get__("createEditorConfig");
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
    });
    const file = path.join(DIR_TMP, EDITOR_CONFIG_FILE);
    const createFile = setupJs.__set__("createFile", () => false);
    await createEditorConfig().catch(e => {
      assert.strictEqual(e.message, `Failed to create ${file}.`);
    });
    setupVars();
    createFile();
  });

  it("should return editor config path", async () => {
    const createEditorConfig = setupJs.__get__("createEditorConfig");
    const setupVars = setupJs.__set__("vars", {
      configPath: DIR_TMP,
    });
    const filePath = path.join(DIR_TMP, EDITOR_CONFIG_FILE);
    const createFile = setupJs.__set__("createFile", file => file);
    sinon.stub(console, "info");
    await createEditorConfig().then(res => {
      assert.strictEqual(res, filePath);
    });
    const {calledOnce: consoleCalledOnce} = console.info;
    assert.isTrue(consoleCalledOnce);
    console.info.restore();
    setupVars();
    createFile();
  });

  it("should get new line at EOF", async () => {
    const createEditorConfig = setupJs.__get__("createEditorConfig");
    const dir = path.join(DIR_TMP, "withexeditorhost");
    const setupVars = setupJs.__set__("vars", {
      configPath: dir,
    });
    const filePath = path.join(dir, EDITOR_CONFIG_FILE);
    sinon.stub(console, "info");
    await fs.mkdirSync(dir);
    const res = await createEditorConfig();
    const file = fs.readFileSync(res, {
      encoding: "utf8",
      flag: "r",
    });
    const {calledOnce: consoleCalledOnce} = console.info;
    assert.isTrue(consoleCalledOnce);
    assert.strictEqual(res, filePath);
    assert.isTrue(file.endsWith("\n"));
    console.info.restore();
    setupVars();
    await fs.unlinkSync(filePath);
    await fs.rmdirSync(dir);
  });
});
