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
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques,
                       `${filePath} already exists. Overwrite? [y/n]\n`);
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
    assert.strictEqual(consoleCalledOnce, true);
    assert.strictEqual(exitCalledOnce, true);
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
    assert.strictEqual(quesCalled, false);
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
    assert.strictEqual(quesCalled, false);
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
    assert.strictEqual(quesCalledOnce, true);
    setupVars();
    setupAbort();
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
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques, "Enter command line options:\n");
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
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques, "Enter command line options:\n");
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
    assert.strictEqual(consoleCalledOnce, true);
    assert.strictEqual(quesCalledOnce, true);
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
    assert.strictEqual(consoleCalledOnce, false);
    assert.strictEqual(editorPath, file);
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques, "Enter command line options:\n");
    console.warn.restore();
    setupVars();
  });
});

describe("handleCmdArgsInput", () => {
  it("should get empty array if no argument is given", () => {
    let ques;
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    userInput();
    const {calledOnce: quesCalledOnce} = stubQues;
    const {cmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, false);
    assert.strictEqual(ques, undefined);
    assert.deepEqual(cmdArgs, []);
    setupVars();
  });

  it("should get empty array if argument is not string", () => {
    let ques;
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    userInput(["-a", "-b"]);
    const {calledOnce: quesCalledOnce} = stubQues;
    const {cmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, false);
    assert.strictEqual(ques, undefined);
    assert.deepEqual(cmdArgs, []);
    setupVars();
  });

  it("should get empty array if empty string is given", () => {
    let ques;
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    userInput("");
    const {calledOnce: quesCalledOnce} = stubQues;
    const {cmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques,
                       "Put file path after command arguments? [y/n]\n");
    assert.deepEqual(cmdArgs, []);
    setupVars();
  });

  it("should set cmd args in array", () => {
    let ques;
    const userInput = setupJs.__get__("handleCmdArgsInput");
    const stubQues = sinon.stub().callsFake(q => {
      ques = q;
    });
    const setupVars = setupJs.__set__("vars", {
      rl: {
        question: stubQues,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    userInput("-a -b");
    const {calledOnce: quesCalledOnce} = stubQues;
    const {cmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, true);
    assert.strictEqual(ques,
                       "Put file path after command arguments? [y/n]\n");
    assert.deepEqual(cmdArgs, ["-a", "-b"]);
    setupVars();
  });
});

describe("handleFilePosInput", () => {
  it("should return null if no argument is given", () => {
    const userInput = setupJs.__get__("handleFilePosInput");
    assert.strictEqual(userInput(), null);
  });

  it("should get false if user input is no", () => {
    const userInput = setupJs.__get__("handleFilePosInput");
    const stubQues = sinon.stub();
    const createEditorConfig = setupJs.__set__("createEditorConfig",
                                               async () => undefined);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    userInput("n");
    const {calledOnce: quesCalledOnce} = stubQues;
    const {fileAfterCmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, false);
    assert.strictEqual(fileAfterCmdArgs, false);
    setupVars();
    createEditorConfig();
  });

  it("should get true if user input is yes", async () => {
    const userInput = setupJs.__get__("handleFilePosInput");
    const stubQues = sinon.stub();
    const createEditorConfig = setupJs.__set__("createEditorConfig",
                                               async () => true);
    const setupVars = setupJs.__set__("vars", {
      rl: {
        close: () => undefined,
      },
    });
    const editorConfig = setupJs.__get__("editorConfig");
    const res = await userInput("y");
    const {calledOnce: quesCalledOnce} = stubQues;
    const {fileAfterCmdArgs} = editorConfig;
    assert.strictEqual(quesCalledOnce, false);
    assert.strictEqual(fileAfterCmdArgs, true);
    assert.strictEqual(res, true);
    setupVars();
    createEditorConfig();
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
    assert.strictEqual(consoleCalledOnce, true);
    console.info.restore();
    setupVars();
    createFile();
  });
});
