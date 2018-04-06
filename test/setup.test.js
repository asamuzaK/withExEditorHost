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
  const {EDITOR_CONFIG_FILE} = require("../modules/constant");
  const DIR_TMP = os.tmpdir();
  const IS_WIN = os.platform() === "win32";
  const PERM_APP = 0o755;

  const setup = rewire("../modules/setup");

  describe("handleSetupCallback", () => {
    const handleSetupCallback = setup.__get__("handleSetupCallback");

    it("should return null if no argument is given", () => {
      assert.strictEqual(handleSetupCallback(), null);
    });

    it("should return null if argument is not an object", () => {
      assert.strictEqual(handleSetupCallback(""), null);
    });

    it("should return null if argument does not contain property", () => {
      const info = {};
      assert.strictEqual(handleSetupCallback(info), null);
    });

    it("should return null if argument property is not string type", () => {
      const info = {
        configDirPath: true,
      };
      assert.strictEqual(handleSetupCallback(info), null);
    });

    it("should return null if argument property is not a directory", () => {
      const info = {
        configDirPath: "foo/bar",
      };
      assert.strictEqual(handleSetupCallback(info), null);
    });
  });

  describe("setupEditor", () => {
    const setupEditor = setup.__get__("setupEditor");

    it("should throw if argument is not a directory", () => {
      const setupVars = setup.__set__("vars", {
        configPath: "foo/bar",
      });
      assert.throws(() => setupEditor(), "No such directory: foo/bar.");
      setupVars();
    });

    it("should ask a question", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        configPath: DIR_TMP,
        rl: {
          question: stubQues,
        },
      });
      setupEditor();
      const {calledOnce: quesCalledOnce} = stubQues;
      assert.strictEqual(quesCalledOnce, true);
      setupVars();
    });
  });

  describe("abortSetup", () => {
    const abortSetup = setup.__get__("abortSetup");

    it("should exit with message", () => {
      const setupVars = setup.__set__("vars", {
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
    const userInput = setup.__get__("handleEditorConfigFileInput");

    it("should throw if argument is not a directory", () => {
      const setupVars = setup.__set__("vars", {
        configPath: "foo/bar",
      });
      assert.throws(() => userInput(), "No such directory: foo/bar.");
      setupVars();
    });

    it("should close if no argument is given", () => {
      const stubQues = sinon.stub();
      const setupAbort = setup.__set__("abortSetup", msg => msg);
      const setupVars = setup.__set__("vars", {
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
      const stubQues = sinon.stub();
      const setupAbort = setup.__set__("abortSetup", msg => msg);
      const setupVars = setup.__set__("vars", {
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
      const stubQues = sinon.stub();
      const setupAbort = setup.__set__("abortSetup", msg => msg);
      const setupVars = setup.__set__("vars", {
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
    const userInput = setup.__get__("handleEditorPathInput");

    it("should ask a question if no argument is given", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        rl: {
          question: stubQues,
        },
      });
      userInput();
      const {calledOnce: quesCalledOnce} = stubQues;
      assert.strictEqual(quesCalledOnce, true);
      setupVars();
    });

    it("should warn if input answer is not executable", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        configPath: DIR_TMP,
        rl: {
          question: stubQues,
        },
      });
      sinon.stub(console, "warn");
      userInput("foo/bar");
      const {calledOnce: quesCalledOnce} = stubQues;
      const {calledOnce: consoleCalledOnce} = console.warn;
      assert.strictEqual(quesCalledOnce, true);
      assert.strictEqual(consoleCalledOnce, true);
      console.warn.restore();
      setupVars();
    });

    it("should set executable app path", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        rl: {
          question: stubQues,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
      const app = IS_WIN && "test.cmd" || "test.sh";
      const file = path.resolve(path.join("test", "file", app));
      if (!IS_WIN) {
        fs.chmodSync(file, PERM_APP);
      }
      sinon.stub(console, "warn");
      userInput(file);
      const {calledOnce: quesCalledOnce} = stubQues;
      const {calledOnce: consoleCalledOnce} = console.warn;
      const {editorPath} = editorConfig;
      assert.strictEqual(quesCalledOnce, true);
      assert.strictEqual(consoleCalledOnce, false);
      assert.strictEqual(editorPath, file);
      console.warn.restore();
      setupVars();
    });
  });

  describe("handleCmdArgsInput", () => {
    const userInput = setup.__get__("handleCmdArgsInput");

    it("should get empty array if no argument is given", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        rl: {
          question: stubQues,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
      userInput();
      const {calledOnce: quesCalledOnce} = stubQues;
      const {cmdArgs} = editorConfig;
      assert.strictEqual(quesCalledOnce, false);
      assert.deepEqual(cmdArgs, []);
      setupVars();
    });

    it("should get empty array if argument is not string", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        rl: {
          question: stubQues,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
      userInput(["-a", "-b"]);
      const {calledOnce: quesCalledOnce} = stubQues;
      const {cmdArgs} = editorConfig;
      assert.strictEqual(quesCalledOnce, false);
      assert.deepEqual(cmdArgs, []);
      setupVars();
    });

    it("should set cmd args in array", () => {
      const stubQues = sinon.stub();
      const setupVars = setup.__set__("vars", {
        rl: {
          question: stubQues,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
      userInput("-a -b");
      const {calledOnce: quesCalledOnce} = stubQues;
      const {cmdArgs} = editorConfig;
      assert.strictEqual(quesCalledOnce, true);
      assert.deepEqual(cmdArgs, ["-a", "-b"]);
      setupVars();
    });
  });

  describe("handleFilePosInput", () => {
    const userInput = setup.__get__("handleFilePosInput");

    it("should return null if no argument is given", () => {
      assert.strictEqual(userInput(), null);
    });

    it("should get false if user input is no", () => {
      const stubQues = sinon.stub();
      const createEditorConfig = setup.__set__("createEditorConfig",
                                               async () => undefined);
      const setupVars = setup.__set__("vars", {
        rl: {
          close: () => undefined,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
      userInput("n");
      const {calledOnce: quesCalledOnce} = stubQues;
      const {fileAfterCmdArgs} = editorConfig;
      assert.strictEqual(quesCalledOnce, false);
      assert.strictEqual(fileAfterCmdArgs, false);
      setupVars();
      createEditorConfig();
    });

    it("should get true if user input is yes", async () => {
      const stubQues = sinon.stub();
      const createEditorConfig = setup.__set__("createEditorConfig",
                                               async () => true);
      const setupVars = setup.__set__("vars", {
        rl: {
          close: () => undefined,
        },
      });
      const editorConfig = setup.__get__("editorConfig");
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
    const createEditorConfig = setup.__get__("createEditorConfig");

    it("should throw if config path is not a directory", async () => {
      const setupVars = setup.__set__("vars", {
        configPath: "foo/bar",
      });
      await createEditorConfig().catch(e => {
        assert.strictEqual(e.message, "No such directory: foo/bar.");
      });
      setupVars();
    });

    it("should throw if failed to create file", async () => {
      const setupVars = setup.__set__("vars", {
        configPath: DIR_TMP,
      });
      const file = path.join(DIR_TMP, EDITOR_CONFIG_FILE);
      const createFile = setup.__set__("createFile", () => false);
      await createEditorConfig().catch(e => {
        assert.strictEqual(e.message, `Failed to create ${file}.`);
      });
      setupVars();
      createFile();
    });

    it("should return editor config path", async () => {
      const setupVars = setup.__set__("vars", {
        configPath: DIR_TMP,
      });
      const filePath = path.join(DIR_TMP, EDITOR_CONFIG_FILE);
      const createFile = setup.__set__("createFile", file => file);
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
}
