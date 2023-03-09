'use strict';
/* api */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import readline from 'readline-sync';
import sinon from 'sinon';
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import {
  Setup, createDirectory, createFile, isFile, removeDir
} from 'web-ext-native-msg';

/* test */
import {
  abortSetup, createEditorConfig, handleCmdArgsInput, handleEditorPathInput,
  handleSetupCallback, runSetup, setupOpts
} from '../modules/setup.js';
import { EDITOR_CONFIG_FILE } from '../modules/constant.js';

/* constant */
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
    abortSetup('foo');
    const { calledOnce: infoCalled } = stubInfo;
    const { calledOnce: exitCalled } = stubExit;
    stubInfo.restore();
    stubExit.restore();
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, 'Setup aborted: foo');
  });
});

describe('handleCmdArgsInput', () => {
  it('should get array', async () => {
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(true);
    const stubRlQues =
      sinon.stub(readline, 'question').returns('foo "bar baz" qux');
    const cmdArgs = ['foo', 'bar', 'baz'];
    const res = await handleCmdArgsInput(cmdArgs);
    assert.isFalse(stubRlKey.called);
    assert.isFalse(stubRlQues.called);
    assert.deepEqual(res, cmdArgs);
    stubRlKey.restore();
    stubRlQues.restore();
  });

  it('should call function and get array', async () => {
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(true);
    const stubRlQues =
      sinon.stub(readline, 'question').returns('foo bar baz');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(stubRlQues.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar',
      'baz'
    ]);
    stubRlKey.restore();
    stubRlQues.restore();
  });

  it('should call function and get array', async () => {
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(true);
    const stubRlQues =
      sinon.stub(readline, 'question').returns('foo "bar baz" qux');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(stubRlQues.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar baz',
      'qux'
    ]);
    stubRlKey.restore();
    stubRlQues.restore();
  });

  it('should call function and get array', async () => {
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(true);
    const stubRlQues =
      sinon.stub(readline, 'question').returns('foo bar="baz qux"');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(stubRlQues.calledOnce);
    assert.deepEqual(res, [
      'foo',
      'bar=baz qux'
    ]);
    stubRlKey.restore();
    stubRlQues.restore();
  });

  it('should call function and get array', async () => {
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(false);
    const stubRlQues =
      sinon.stub(readline, 'question').returns('foo bar baz');
    const res = await handleCmdArgsInput();
    assert.isTrue(stubRlKey.calledOnce);
    assert.isFalse(stubRlQues.calledOnce);
    assert.deepEqual(res, []);
    stubRlKey.restore();
    stubRlQues.restore();
  });
});

describe('handleEditorPathInput', () => {
  it('should get string', async () => {
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath = sinon.stub(readline, 'question').returns(editorPath);
    const res = await handleEditorPathInput(editorPath);
    assert.isFalse(stubRlPath.called);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
  });

  it('should call function and get string', async () => {
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve('test', 'file', app);
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const stubRlPath = sinon.stub(readline, 'question').returns(editorPath);
    const res = await handleEditorPathInput();
    assert.isTrue(stubRlPath.calledOnce);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
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
    const stubRlPath = sinon.stub(readline, 'question');
    const i = stubRlPath.callCount;
    stubRlPath.onFirstCall().returns(inputPath);
    stubRlPath.onSecondCall().returns(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} is not executable.`);
    assert.strictEqual(stubRlPath.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
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
    const stubRlPath = sinon.stub(readline, 'question');
    const i = stubRlPath.callCount;
    stubRlPath.onFirstCall().returns(inputPath);
    stubRlPath.onSecondCall().returns(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} is not a file.`);
    assert.strictEqual(stubRlPath.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
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
    const stubRlPath = sinon.stub(readline, 'question');
    const i = stubRlPath.callCount;
    stubRlPath.onFirstCall().returns(inputPath);
    stubRlPath.onSecondCall().returns(editorPath);
    const res = await handleEditorPathInput();
    const { calledOnce: warnCalled } = stubWarn;
    stubWarn.restore();
    assert.isTrue(warnCalled);
    assert.strictEqual(wrn, `${inputPath} not found.`);
    assert.strictEqual(stubRlPath.callCount, i + 2);
    assert.strictEqual(res, editorPath);
    stubRlPath.restore();
  });
});

describe('createEditorConfig', () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDir(configDirPath, DIR_TMP);
    setupOpts.clear();
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDir(configDirPath, DIR_TMP);
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

describe('handleSetupCallback', () => {
  beforeEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDir(configDirPath, DIR_TMP);
    setupOpts.clear();
  });
  afterEach(() => {
    const configDirPath = path.join(DIR_TMP, 'withexeditorhost-test');
    removeDir(configDirPath, DIR_TMP);
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
    const stubRl = sinon.stub(readline, 'question');
    const i = stubRl.callCount;
    stubRl.onFirstCall().returns(editorPath);
    stubRl.onSecondCall().returns('');
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(true);
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
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubRlKey.restore();
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
    const stubRl = sinon.stub(readline, 'question');
    const i = stubRl.callCount;
    stubRl.onFirstCall().returns(editorPath);
    stubRl.onSecondCall().returns('');
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict').returns(false);
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
    assert.strictEqual(stubRl.callCount, i);
    assert.isTrue(stubRlKey.calledOnce);
    assert.isTrue(infoCalled);
    assert.isTrue(exitCalled);
    assert.strictEqual(info, `Setup aborted: ${filePath} already exists.`);
    assert.isTrue(isFile(filePath));
    assert.isNull(res);
    stubRl.restore();
    stubRlKey.restore();
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
    const stubRl = sinon.stub(readline, 'question');
    const i = stubRl.callCount;
    stubRl.onFirstCall().returns(editorPath);
    stubRl.onSecondCall().returns('');
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict');
    const j = stubRlKey.callCount;
    stubRlKey.onFirstCall().returns(true);
    stubRlKey.onSecondCall().returns(true);
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
    assert.strictEqual(stubRlKey.callCount, j + 2);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubRlKey.restore();
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
    const stubRl = sinon.stub(readline, 'question');
    const i = stubRl.callCount;
    stubRl.onFirstCall().returns(editorPath);
    stubRl.onSecondCall().returns('');
    const stubRlKey = sinon.stub(readline, 'keyInYNStrict');
    const j = stubRlKey.callCount;
    stubRlKey.onFirstCall().returns(true);
    stubRlKey.onSecondCall().returns(true);
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
    assert.strictEqual(stubRlKey.callCount, j);
    assert.isTrue(infoCalled);
    assert.isFalse(exitCalled);
    assert.strictEqual(info, `Created: ${filePath}`);
    assert.isTrue(isFile(filePath));
    assert.strictEqual(res, filePath);
    stubRl.restore();
    stubRlKey.restore();
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
