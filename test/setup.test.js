/* eslint-disable no-template-curly-in-string */
/* api */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import {
  Setup, createDirectory, createFile, isFile, removeDirSync
} from 'web-ext-native-msg';

/* test */
import {
  abortSetup, confirmOverwriteEditorConfig, createEditorConfig, inquirer,
  handleCmdArgsInput, handleEditorPathInput, handleInquirerError,
  handleSetupCallback, runSetup, setupOpts
} from '../modules/setup.js';

/* constants */
import { EDITOR_CONFIG_FILE } from '../modules/constant.js';
const CHAR = 'utf8';
const DIR_TMP = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
                os.tmpdir();
const INDENT = 2;
const IS_WIN = os.platform() === 'win32';
const PERM_APP = 0o755;

describe('abortSetup', () => {
  it('should exit with message', () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const i = stubExit.withArgs(1).callCount;
    abortSetup('foo');
    const { calledOnce: infoCalled } = stubInfo;
    const { callCount: exitCallCount } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(infoCalled, true);
    assert.strictEqual(exitCallCount, i + 1);
    assert.strictEqual(info, 'Setup aborted: foo');
  });

  it('should exit with message', () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const i = stubExit.withArgs(2).callCount;
    abortSetup('foo', 2);
    const { calledOnce: infoCalled } = stubInfo;
    const { callCount: exitCallCount } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(infoCalled, true);
    assert.strictEqual(exitCallCount, i + 1);
    assert.strictEqual(info, 'Setup aborted: foo');
  });
});

describe('handleInquirerError', () => {
  it('should exit with unknown error message', () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const i = stubExit.withArgs(1).callCount;
    handleInquirerError('foo');
    const { calledOnce: infoCalled } = stubInfo;
    const { callCount: exitCallCount } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(infoCalled, true);
    assert.strictEqual(exitCallCount, i + 1);
    assert.strictEqual(info, 'Setup aborted: Unknown error.');
  });

  it('should exit with message', () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const i = stubExit.withArgs(1).callCount;
    handleInquirerError(new Error('foo'));
    const { calledOnce: infoCalled } = stubInfo;
    const { callCount: exitCallCount } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(infoCalled, true);
    assert.strictEqual(exitCallCount, i + 1);
    assert.strictEqual(info, 'Setup aborted: foo');
  });

  it('should exit with message', () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const i = stubExit.withArgs(130).callCount;
    const e = new Error('foo');
    e.name = 'ExitPromptError';
    handleInquirerError(e);
    const { calledOnce: infoCalled } = stubInfo;
    const { callCount: exitCallCount } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(infoCalled, true);
    assert.strictEqual(exitCallCount, i + 1);
    assert.strictEqual(info, 'Setup aborted: foo');
  });
});

describe('handleCmdArgsInput', () => {
  it('should get array', async () => {
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(true);
    const stubInput =
      sinon.stub(inquirer, 'input').resolves('foo "bar baz" qux');
    const cmdArgs = ['foo', 'bar', 'baz'];
    const res = await handleCmdArgsInput(cmdArgs);
    assert.isFalse(stubConfirm.called);
    assert.isFalse(stubInput.called);
    assert.deepEqual(res, cmdArgs);
    stubConfirm.restore();
    stubInput.restore();
  });

  it('should call function and get array', async () => {
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(true);
    const stubInput = sinon.stub(inquirer, 'input').resolves('foo bar baz');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(stubInput.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar',
      'baz'
    ]);
    stubConfirm.restore();
    stubInput.restore();
  });

  it('should call function and get array', async () => {
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(true);
    const stubInput =
      sinon.stub(inquirer, 'input').resolves('foo "bar baz" qux');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(stubInput.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar baz',
      'qux'
    ]);
    stubConfirm.restore();
    stubInput.restore();
  });

  it('should call function and get array', async () => {
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(true);
    const stubInput =
      sinon.stub(inquirer, 'input').resolves('foo bar="baz qux"');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(stubInput.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar=baz qux'
    ]);
    stubConfirm.restore();
    stubInput.restore();
  });

  it('should call function and get array', async () => {
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(false);
    const stubInput = sinon.stub(inquirer, 'input').resolves('foo bar baz');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubConfirm.calledOnce);
    assert.isFalse(stubInput.calledOnce);
    assert.deepEqual(res, []);
    stubConfirm.restore();
    stubInput.restore();
  });
});

describe('handleEditorPathInput', () => {
  it('should get string', async () => {
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubInput = sinon.stub(inquirer, 'input').resolves(editorPath);
    const res = await handleEditorPathInput(editorPath);
    assert.isFalse(stubInput.called);
    assert.strictEqual(res, editorPath);
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubInput = sinon.stub(inquirer, 'input').resolves(editorPath);
    const envVarPath = path.resolve('${TEST}', '$FILE', app);
    process.env.TEST = 'test';
    process.env.FILE = 'file';
    const res = await handleEditorPathInput(envVarPath);
    delete process.env.TEST;
    delete process.env.FILE;
    assert.isFalse(stubInput.called);
    assert.strictEqual(res, envVarPath);
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    let wrn;
    const stubWarn = sinon.stub(console, 'warn').callsFake(msg => {
      wrn = msg;
    });
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubInput = sinon.stub(inquirer, 'input').resolves(editorPath);
    const envVarPath = path.resolve('${TEST}', '$FILE', app);
    process.env.TEST = 'test';
    const res = await handleEditorPathInput(envVarPath);
    delete process.env.TEST;
    assert.strictEqual(wrn, `${envVarPath} not found.`);
    assert.isTrue(stubInput.called);
    assert.strictEqual(res, editorPath);
    stubWarn.restore();
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubInput = sinon.stub(inquirer, 'input').resolves(editorPath);
    const res = await handleEditorPathInput();
    assert.isTrue(stubInput.calledOnce);
    assert.strictEqual(res, editorPath);
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    let wrn;
    const stubWarn = sinon.stub(console, 'warn').callsFake(msg => {
      wrn = msg;
    });
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const inputPath = path.resolve('test', 'file', 'test.txt');
    const stubInput = sinon.stub(inquirer, 'input');
    const i = stubInput.callCount;
    stubInput.onFirstCall().resolves(inputPath);
    stubInput.onSecondCall().resolves(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} is not executable.`);
    assert.strictEqual(stubInput.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    let wrn;
    const stubWarn = sinon.stub(console, 'warn').callsFake(msg => {
      wrn = msg;
    });
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const inputPath = path.resolve('test', 'file');
    const stubInput = sinon.stub(inquirer, 'input');
    const i = stubInput.callCount;
    stubInput.onFirstCall().resolves(inputPath);
    stubInput.onSecondCall().resolves(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} is not a file.`);
    assert.strictEqual(stubInput.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubInput.restore();
  });

  it('should call function and get string', async () => {
    let wrn;
    const stubWarn = sinon.stub(console, 'warn').callsFake(msg => {
      wrn = msg;
    });
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const inputPath = path.resolve('test', 'file', 'foo');
    const stubInput = sinon.stub(inquirer, 'input');
    const i = stubInput.callCount;
    stubInput.onFirstCall().resolves(inputPath);
    stubInput.onSecondCall().resolves(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} not found.`);
    assert.strictEqual(stubInput.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubInput.restore();
  });
});

describe('createEditorConfig', () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });

  it('should throw', async () => {
    await createEditorConfig().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, 'No such directory: undefined');
    });
  });

  it('should call function', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const configPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configPath, EDITOR_CONFIG_FILE);
    setupOpts.set('configPath', configPath);
    setupOpts.set('editorFilePath', editorPath);
    setupOpts.set('editorCmdArgs', []);
    const res = await createEditorConfig();
    const file = fs.readFileSync(filePath, {
      encoding: 'utf8',
      flag: 'r'
    });
    const parsedFile = JSON.parse(file);
    const { calledOnce: infoCalled } = stubInfo;
    stubInfo.restore();
    assert.isTrue(infoCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    assert.isTrue(file.endsWith('\n'));
    assert.deepEqual(parsedFile, {
      editorPath,
      cmdArgs: []
    });
  });
});

describe('confirmOverwriteEditorConfig', () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });

  it('should abort', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(false);
    const res = await confirmOverwriteEditorConfig('/foo/bar');
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, 'Setup aborted: /foo/bar already exists.');
    assert.isUndefined(res);
    stubConfirm.restore();
  });

  it('should call function', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRl = sinon.stub(inquirer, 'input');
    const i = stubRl.callCount;
    stubRl.onFirstCall().resolves(editorPath);
    stubRl.onSecondCall().resolves('');
    const stubConfirm = sinon.stub(inquirer, 'confirm');
    const j = stubConfirm.callCount;
    stubConfirm.onFirstCall().resolves(true);
    stubConfirm.onSecondCall().resolves(true);
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: 'w'
    });
    setupOpts.set('configPath', configDirPath);
    const res = await confirmOverwriteEditorConfig(filePath);
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(setupOpts.get('configPath'), configDirPath);
    assert.strictEqual(stubRl.callCount, i + 2);
    assert.strictEqual(stubConfirm.callCount, j + 2);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubConfirm.restore();
  });
});

describe('handleSetupCallback', () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDirSync(configDirPath, DIR_TMP);
    setupOpts.clear();
  });

  it('should throw', () => {
    assert.throws(() => handleSetupCallback(),
      'No such directory: undefined');
  });

  it('should throw', () => {
    const configDirPath = path.normalize('/foo/bar');
    assert.throws(() => handleSetupCallback({ configDirPath }),
                  `No such directory: ${configDirPath}`);
  });

  it('should call function', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRl = sinon.stub(inquirer, 'input');
    const i = stubRl.callCount;
    stubRl.onFirstCall().resolves(editorPath);
    stubRl.onSecondCall().resolves('');
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(true);
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const res = await handleSetupCallback({ configDirPath });
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(setupOpts.get('configPath'), configDirPath);
    assert.strictEqual(stubRl.callCount, i + 2);
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubConfirm.restore();
  });

  it('should abort', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRl = sinon.stub(inquirer, 'input');
    const i = stubRl.callCount;
    stubRl.onFirstCall().resolves(editorPath);
    stubRl.onSecondCall().resolves('');
    const stubConfirm = sinon.stub(inquirer, 'confirm').resolves(false);
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: 'w'
    });
    const res = await handleSetupCallback({ configDirPath });
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(setupOpts.has('configPath'), false);
    assert.strictEqual(stubRl.callCount, i);
    assert.isTrue(stubConfirm.calledOnce);
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, `Setup aborted: ${filePath} already exists.`);
    assert.isTrue(isFile(filePath));
    assert.isUndefined(res);
    stubRl.restore();
    stubConfirm.restore();
  });

  it('should call function', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRl = sinon.stub(inquirer, 'input');
    const i = stubRl.callCount;
    stubRl.onFirstCall().resolves(editorPath);
    stubRl.onSecondCall().resolves('');
    const stubConfirm = sinon.stub(inquirer, 'confirm');
    const j = stubConfirm.callCount;
    stubConfirm.onFirstCall().resolves(true);
    stubConfirm.onSecondCall().resolves(true);
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: 'w'
    });
    const res = await handleSetupCallback({ configDirPath });
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(setupOpts.get('configPath'), configDirPath);
    assert.strictEqual(stubRl.callCount, i + 2);
    assert.strictEqual(stubConfirm.callCount, j + 2);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubConfirm.restore();
  });

  it('should call function', async () => {
    let info;
    const stubInfo = sinon.stub(console, 'info').callsFake(msg => {
      info = msg;
    });
    const stubExit = sinon.stub(process, 'exit');
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRl = sinon.stub(inquirer, 'input');
    const i = stubRl.callCount;
    stubRl.onFirstCall().resolves(editorPath);
    stubRl.onSecondCall().resolves('');
    const stubConfirm = sinon.stub(inquirer, 'confirm');
    const j = stubConfirm.callCount;
    stubConfirm.onFirstCall().resolves(true);
    stubConfirm.onSecondCall().resolves(true);
    const configDirPath = await createDirectory(
      path.join(DIR_TMP, 'withexeditorhost-test')
    );
    const filePath = path.join(configDirPath, EDITOR_CONFIG_FILE);
    const content = `${JSON.stringify({}, null, INDENT)}\n`;
    await createFile(filePath, content, {
      encoding: CHAR,
      flag: 'w'
    });
    setupOpts.set('editorPath', editorPath);
    setupOpts.set('editorArgs', 'foo bar baz');
    setupOpts.set('overwriteEditorConfig', true);
    const res = await handleSetupCallback({ configDirPath });
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.strictEqual(setupOpts.get('configPath'), configDirPath);
    assert.strictEqual(setupOpts.get('editorFilePath'), editorPath);
    assert.deepEqual(setupOpts.get('editorCmdArgs'), ['foo', 'bar', 'baz']);
    assert.strictEqual(stubRl.callCount, i);
    assert.strictEqual(stubConfirm.callCount, j);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubConfirm.restore();
  });
});

describe('runSetup', () => {
  beforeEach(() => {
    setupOpts.clear();
  });
  afterEach(() => {
    setupOpts.clear();
  });

  it('should call function', async () => {
    const stubRun = sinon.stub(Setup.prototype, 'run').callsFake(() => true);
    const res = await runSetup();
    assert.isTrue(stubRun.calledOnce);
    assert.isTrue(res);
    stubRun.restore();
  });

  it('should call function', async () => {
    const stubRun = sinon.stub(Setup.prototype, 'run').callsFake(() => true);
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const res = await runSetup({
      editorPath,
      browser: 'firefox',
      configPath: path.resolve('test', 'file'),
      overwriteConfig: true,
      editorArgs: 'foo bar baz',
      overwriteEditorConfig: true
    });
    assert.isTrue(stubRun.calledOnce);
    assert.strictEqual(setupOpts.get('editorPath'), editorPath);
    assert.strictEqual(setupOpts.get('editorArgs'), 'foo bar baz');
    assert.isTrue(setupOpts.get('overwriteEditorConfig'));
    assert.isTrue(res);
    stubRun.restore();
  });
});
