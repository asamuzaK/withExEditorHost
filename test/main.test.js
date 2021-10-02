/* eslint-disable no-template-curly-in-string */
/* api */
import {
  Input, Output,
  createDirectory, createFile, getFileTimestamp, isDir, isFile, removeDir
} from 'web-ext-native-msg';
import { compareSemVer, parseSemVer } from 'semver-parser';
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import childProcess from 'child_process';
import fs from 'fs';
import nock from 'nock';
import os from 'os';
import path from 'path';
import process from 'process';
import sinon from 'sinon';
import {
  EDITOR_CONFIG_FILE, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_CONFIG_TS,
  FILE_WATCH, HOST_VERSION, HOST_VERSION_CHECK, LABEL, LOCAL_FILE_VIEW,
  MODE_EDIT, TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_RES
} from '../modules/constant.js';

/* test */
import {
  addProcessListeners, createTmpFile, createTmpFileResMsg,
  deleteKeyFromFileMap, editorConfig, execChildProcess, exportAppStatus,
  exportEditorConfig, exportFileData, exportHostVersion, fetchLatestHostVersion,
  fileMap, getEditorConfig, getFileIdFromFilePath, getTmpFileFromFileData,
  getTmpFileFromWatcherFileName,
  handleChildProcessErr, handleChildProcessStderr, handleChildProcessStdout,
  handleCreatedTmpFile, handleExit, handleMsg, handleReject, hostMsg,
  initPrivateTmpDir, readStdin, removeTmpFileData, startup, unwatchFile,
  viewLocalFile, watchTmpFile, writeStdout
} from '../modules/main.js';

/* constant */
const APP = `${process.pid}`;
const CHAR = 'utf8';
const IS_WIN = os.platform() === 'win32';
const PERM_APP = 0o755;
const PERM_FILE = 0o644;
const TMPDIR = process.env.TMP || process.env.TMPDIR || process.env.TEMP ||
               os.tmpdir();
const TMPDIR_APP = path.resolve(path.join(TMPDIR, LABEL, APP));
const TMPDIR_FILES = path.join(TMPDIR_APP, TMP_FILES);
const TMPDIR_FILES_PB = path.join(TMPDIR_APP, TMP_FILES_PB);

describe('hostMsg', () => {
  it('should get object', async () => {
    const message = 'foo';
    const status = 'bar';
    const res = await hostMsg(message, status);
    assert.deepEqual(res, {
      withexeditorhost: {
        message: 'foo',
        status: 'bar'
      }
    });
  });
});

describe('handleReject', () => {
  it('should get false', () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      err = buf;
    });
    const msg = new Output().encode('unknown error.');
    const res = handleReject();
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it('should call function and get false', () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      err = buf;
    });
    const e = 'error';
    const msg = new Output().encode('error');
    const res = handleReject(e);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it('should call function and get false', () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      err = buf;
    });
    const e = new Error('error');
    const msg = new Output().encode('error');
    const res = handleReject(e);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });

  it('should call function and get false', () => {
    let err;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      err = buf;
    });
    const e = new TypeError('type error');
    const msg = new Output().encode('type error');
    const res = handleReject(e);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(err, msg);
    assert.isFalse(res);
  });
});

describe('writeStdout', () => {
  it('should get null', async () => {
    const res = await writeStdout();
    assert.isNull(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode('foo');
    const res = await writeStdout('foo');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe('exportAppStatus', () => {
  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      withexeditorhost: {
        message: EDITOR_CONFIG_GET,
        status: 'ready'
      }
    });
    const res = await exportAppStatus();
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe('exportEditorConfig', () => {
  beforeEach(() => {
    editorConfig.editorPath = '';
    editorConfig.cmdArgs = [];
    editorConfig.hasPlaceholder = false;
  });
  afterEach(() => {
    editorConfig.editorPath = '';
    editorConfig.cmdArgs = [];
    editorConfig.hasPlaceholder = false;
  });

  it('should throw', async () => {
    await exportEditorConfig().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, 'Expected String but got Undefined.');
    });
  });

  it('should throw', async () => {
    await exportEditorConfig('{foo:bar}').catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const editorConfigPath =
      path.resolve(path.join('test', 'file', 'editorconfig.json'));
    const timestamp = getFileTimestamp(editorConfigPath);
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const editorConfigData = {
      editorPath,
      cmdArgs: ['--foo', '--bar']
    };
    const value = `${JSON.stringify(editorConfigData)}\n`;
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: {
        editorName: 'test',
        executable: true,
        [EDITOR_CONFIG_TS]: timestamp
      }
    });
    const res = await exportEditorConfig(value, editorConfigPath);
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.strictEqual(editorConfig.editorPath, editorPath);
    assert.deepEqual(editorConfig.cmdArgs, ['--foo', '--bar']);
    assert.isFalse(editorConfig.hasPlaceholder);
    assert.deepEqual(res, msg);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const editorConfigPath =
      path.resolve(path.join('test', 'file', 'editorconfig.json'));
    const timestamp = getFileTimestamp(editorConfigPath);
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const editorConfigData = {
      editorPath,
      cmdArgs: ['--foo', '$file']
    };
    const value = `${JSON.stringify(editorConfigData)}\n`;
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: {
        editorName: 'test',
        executable: true,
        [EDITOR_CONFIG_TS]: timestamp
      }
    });
    const res = await exportEditorConfig(value, editorConfigPath);
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.strictEqual(editorConfig.editorPath, editorPath);
    assert.deepEqual(editorConfig.cmdArgs, ['--foo', '$file']);
    assert.isTrue(editorConfig.hasPlaceholder);
    assert.deepEqual(res, msg);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const editorConfigPath =
      path.resolve(path.join('test', 'file', 'editorconfig.json'));
    const timestamp = getFileTimestamp(editorConfigPath);
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const editorConfigData = {
      editorPath,
      cmdArgs: ['--foo="bar baz"']
    };
    const value = `${JSON.stringify(editorConfigData)}\n`;
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: {
        editorName: 'test',
        executable: true,
        [EDITOR_CONFIG_TS]: timestamp
      }
    });
    const res = await exportEditorConfig(value, editorConfigPath);
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.strictEqual(editorConfig.editorPath, editorPath);
    assert.deepEqual(editorConfig.cmdArgs, ['--foo="bar baz"']);
    assert.isFalse(editorConfig.hasPlaceholder);
    assert.deepEqual(res, msg);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const editorConfigPath =
      path.resolve(path.join('test', 'file', 'editorconfig.json'));
    const timestamp = getFileTimestamp(editorConfigPath);
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const editorConfigData = {
      editorPath,
      cmdArgs: ['--foo', '${file}']
    };
    const value = `${JSON.stringify(editorConfigData)}\n`;
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: {
        editorName: 'test',
        executable: true,
        [EDITOR_CONFIG_TS]: timestamp
      }
    });
    const res = await exportEditorConfig(value, editorConfigPath);
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.strictEqual(editorConfig.editorPath, editorPath);
    assert.deepEqual(editorConfig.cmdArgs, ['--foo', '${file}']);
    assert.isTrue(editorConfig.hasPlaceholder);
    assert.deepEqual(res, msg);
  });
});

describe('exportFileData', () => {
  it('should get null', async () => {
    const res = await exportFileData();
    assert.isNull(res);
  });

  it('should get null', async () => {
    const res = await exportFileData({});
    assert.isNull(res);
  });

  it('should get null', async () => {
    const res = await exportFileData({
      data: {}
    });
    assert.isNull(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      [TMP_FILE_DATA_PORT]: {
        data: {
          foo: 'bar'
        }
      }
    });
    const res = await exportFileData({
      data: {
        foo: 'bar'
      }
    });
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe('fetchLatestHostVersion', () => {
  beforeEach(() => {
    nock.cleanAll();
  });
  afterEach(() => {
    nock.cleanAll();
  });

  it('should throw', async () => {
    const hostName = process.env.npm_package_name;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(404);
    await fetchLatestHostVersion().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, 'Network response was not ok. status: 404');
    });
  });

  it('should throw', async () => {
    process.env.HTTPS_PROXY = 'http://localhost:9000';
    const hostName = process.env.npm_package_name;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(404);
    await fetchLatestHostVersion().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, 'Network response was not ok. status: 404');
    });
  });

  it('should get result', async () => {
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await fetchLatestHostVersion();
    assert.strictEqual(res, version);
  });

  it('should get result', async () => {
    process.env.HTTPS_PROXY = 'http://localhost:9000';
    const hostVersion = process.env.npm_package_version;
    const hostName = process.env.npm_package_name;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await fetchLatestHostVersion();
    delete process.env.HTTPS_PROXY;
    assert.strictEqual(res, version);
  });

  it('should get result', async () => {
    process.env.https_proxy = 'http://localhost:9000';
    const hostVersion = process.env.npm_package_version;
    const hostName = process.env.npm_package_name;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await fetchLatestHostVersion();
    delete process.env.https_proxy;
    assert.strictEqual(res, version);
  });

  it('should get result', async () => {
    process.env.HTTP_PROXY = 'http://localhost:9000';
    const hostVersion = process.env.npm_package_version;
    const hostName = process.env.npm_package_name;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await fetchLatestHostVersion();
    delete process.env.HTTP_PROXY;
    assert.strictEqual(res, version);
  });

  it('should get result', async () => {
    process.env.http_proxy = 'http://localhost:9000';
    const hostVersion = process.env.npm_package_version;
    const hostName = process.env.npm_package_name;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await fetchLatestHostVersion();
    delete process.env.http_proxy;
    assert.strictEqual(res, version);
  });
});

describe('exportHostVersion', () => {
  it('should throw', async () => {
    await exportHostVersion().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, 'Expected String but got Undefined.');
    });
  });

  it('should throw', async () => {
    await exportHostVersion('1').catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, '1 is not valid SemVer.');
    });
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const minVer = `${major > 0 ? major - 1 : 0}.${minor}.${patch}`;
    const version = hostVersion;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.isAbove(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isTrue(obj.hostVersion.isLatest);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const minVer = `${major > 0 ? major - 1 : 0}.${minor}.${patch}`;
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.isAbove(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isFalse(obj.hostVersion.isLatest);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const minVer = hostVersion;
    const version = `${major}.${minor}.${patch + 1}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.strictEqual(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isFalse(obj.hostVersion.isLatest);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const minVer = hostVersion;
    const version = hostVersion;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.strictEqual(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isTrue(obj.hostVersion.isLatest);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const minVer = hostVersion;
    const {
      major
    } = await parseSemVer(hostVersion);
    const version = `${major + 1}.0.0-a.1`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.strictEqual(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isFalse(obj.hostVersion.isLatest);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
      return buf;
    });
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const minVer = `${major > 0 ? major - 1 : 0}.${minor}.${patch}`;
    const version = `${major > 0 ? major - 1 : 0}.${minor}.${patch}`;
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await exportHostVersion(minVer);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    const [obj] = new Input().decode(msg);
    assert.isTrue(writeCalled);
    assert.isTrue(Buffer.isBuffer(res));
    assert.isAbove(obj.hostVersion.result, 0);
    assert.strictEqual(obj.hostVersion.latest, version);
    assert.isTrue(obj.hostVersion.isLatest);
  });
});

describe('handleChildProcessErr', () => {
  it('should call function', async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      info = buf;
    });
    const msg = new Output().encode('unknown error');
    await handleChildProcessErr();
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });

  it('should call function', async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      info = buf;
    });
    const msg = new Output().encode('error');
    await handleChildProcessErr('error');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });

  it('should call function', async () => {
    let info;
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => {
      info = buf;
    });
    const msg = new Output().encode('error');
    await handleChildProcessErr(new Error('error'));
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe('handleChildProcessStderr', () => {
  it('should not call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    await handleChildProcessStderr();
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
  });

  it('should call function', async () => {
    let info;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      info = buf;
    });
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'foo',
        status: 'childProcess_stderr'
      }
    });
    await handleChildProcessStderr('foo');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe('handleChildProcessStdout', () => {
  it('should not call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    await handleChildProcessStdout();
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
  });

  it('should call function', async () => {
    let info;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      info = buf;
    });
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'foo',
        status: 'childProcess_stdout'
      }
    });
    await handleChildProcessStdout('foo');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(info, msg);
  });
});

describe('execChildProcess', () => {
  beforeEach(() => {
    editorConfig.editorPath = '';
    editorConfig.cmdArgs = [];
    editorConfig.hasPlaceholder = false;
  });
  afterEach(() => {
    editorConfig.editorPath = '';
    editorConfig.cmdArgs = [];
    editorConfig.hasPlaceholder = false;
  });

  it('should throw', async () => {
    await execChildProcess().catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, 'No such file: undefined');
    });
  });

  it('should throw', async () => {
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    await execChildProcess(filePath).catch(e => {
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, 'Application is not executable.');
    });
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], [filePath]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath =
      path.resolve(path.join('test', 'file', 'sub dir', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], [filePath]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = '';
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], [filePath]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ['foo', 'bar'];
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], ['foo', 'bar', filePath]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = 'foo bar';
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], ['foo', 'bar', filePath]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ['foo ${file}', 'bar'];
    editorConfig.hasPlaceholder = true;
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], [`foo ${filePath}`, 'bar']);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath =
      path.resolve(path.join('test', 'file', 'sub dir', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ['foo ${file}', 'bar'];
    editorConfig.hasPlaceholder = true;
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], [`foo ${filePath}`, 'bar']);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ['foo', 'bar=baz ${file}'];
    editorConfig.hasPlaceholder = true;
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], ['foo', `bar=baz ${filePath}`]);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath =
      path.resolve(path.join('test', 'file', 'sub dir', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.cmdArgs = ['foo', 'bar=baz ${file}'];
    editorConfig.hasPlaceholder = true;
    const res = await execChildProcess(filePath, editorPath);
    const { called: writeCalled } = stubWrite;
    const { args: spawnArgs, calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.strictEqual(spawnArgs[0][0], editorPath);
    assert.deepEqual(spawnArgs[0][1], ['foo', `bar=baz ${filePath}`]);
    assert.isObject(res);
  });
});

describe('fileMap', () => {
  it('should be instance of Map', () => {
    const keys = Object.keys(fileMap);
    for (const key of keys) {
      const val = fileMap[key];
      assert.isTrue(val instanceof Map);
    }
  });
});

describe('deleteKeyFromFileMap', () => {
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

  it('should get false', async () => {
    fileMap[FILE_WATCH].set('foo', 'bar');
    const res = await deleteKeyFromFileMap();
    assert.isTrue(fileMap[FILE_WATCH].has('foo'));
    assert.isFalse(res);
  });

  it('should get false', async () => {
    fileMap[FILE_WATCH].set('foo', 'bar');
    const res = await deleteKeyFromFileMap(FILE_WATCH, 'baz');
    assert.isTrue(fileMap[FILE_WATCH].has('foo'));
    assert.isFalse(res);
  });

  it('should get true', async () => {
    fileMap[FILE_WATCH].set('foo', 'bar');
    fileMap[FILE_WATCH].set('baz', 'qux');
    fileMap[TMP_FILES].set('foo', 'quux');
    fileMap[TMP_FILES_PB].set('foo', 'corge');
    const res = await deleteKeyFromFileMap(FILE_WATCH, 'foo');
    assert.isFalse(fileMap[FILE_WATCH].has('foo'));
    assert.isTrue(fileMap[FILE_WATCH].has('baz'));
    assert.isTrue(fileMap[TMP_FILES].has('foo'));
    assert.isTrue(fileMap[TMP_FILES_PB].has('foo'));
    assert.isTrue(res);
  });

  it('should get true', async () => {
    fileMap[TMP_FILES].set('foo', 'bar');
    fileMap[TMP_FILES].set('baz', 'qux');
    fileMap[FILE_WATCH].set('foo', 'quux');
    fileMap[TMP_FILES_PB].set('foo', 'corge');
    const res = await deleteKeyFromFileMap(TMP_FILES, 'foo');
    assert.isFalse(fileMap[TMP_FILES].has('foo'));
    assert.isTrue(fileMap[TMP_FILES].has('baz'));
    assert.isTrue(fileMap[FILE_WATCH].has('foo'));
    assert.isTrue(fileMap[TMP_FILES_PB].has('foo'));
    assert.isTrue(res);
  });

  it('should get true', async () => {
    fileMap[TMP_FILES_PB].set('foo', 'bar');
    fileMap[TMP_FILES_PB].set('baz', 'qux');
    fileMap[FILE_WATCH].set('foo', 'quux');
    fileMap[TMP_FILES].set('foo', 'corge');
    const res = await deleteKeyFromFileMap(TMP_FILES_PB, 'foo');
    assert.isFalse(fileMap[TMP_FILES_PB].has('foo'));
    assert.isTrue(fileMap[TMP_FILES_PB].has('baz'));
    assert.isTrue(fileMap[FILE_WATCH].has('foo'));
    assert.isTrue(fileMap[TMP_FILES].has('foo'));
    assert.isTrue(res);
  });
});

describe('unwatchFile', () => {
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

  it('should not call function', async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set('foo', {
      close: stubClose
    });
    await unwatchFile();
    assert.isFalse(stubClose.called);
    assert.isTrue(fileMap[FILE_WATCH].has('foo'));
  });

  it('should call function', async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set('foo', {
      close: stubClose
    });
    await unwatchFile('foo');
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has('foo'));
  });

  it('should call function', async () => {
    const stubClose = sinon.stub();
    fileMap[FILE_WATCH].set('foo', {});
    await unwatchFile('foo', {
      close: stubClose
    });
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has('foo'));
  });
});

describe('initPrivateTmpDir', () => {
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

  it('should not init private directory', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const dir = await createDirectory(path.join(TMPDIR_FILES_PB, 'foo'));
    fileMap[TMP_FILES_PB].set('foo', {});
    await initPrivateTmpDir();
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(fileMap[TMP_FILES_PB].has('foo'));
    assert.isTrue(isDir(TMPDIR_FILES_PB));
    assert.isTrue(isDir(dir));
  });

  it('should init private directory', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const dir = await createDirectory(path.join(TMPDIR_FILES_PB, 'foo'));
    fileMap[TMP_FILES_PB].set('foo', {});
    await initPrivateTmpDir(true);
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isFalse(fileMap[TMP_FILES_PB].has('foo'));
    assert.isTrue(isDir(TMPDIR_FILES_PB));
    assert.isFalse(isDir(dir));
  });
});

describe('getTmpFileFromFileData', () => {
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

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1
        }
      }
    });
    const res = await getTmpFileFromFileData();
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubErrWrite =
      sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1
        }
      }
    });
    const res = await getTmpFileFromFileData({});
    const { calledOnce: writeCalled } = stubWrite;
    const { called: errWriteCalled } = stubErrWrite;
    stubWrite.restore();
    stubErrWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(errWriteCalled);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: 'foo',
          timestamp: -1
        }
      }
    });
    const err = new Output().encode({
      withexeditorhost: {
        message: 'Failed to get temporary file. ID: foo',
        status: 'warn'
      }
    });
    const res = await getTmpFileFromFileData({
      dataId: 'foo'
    });
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [msg, err]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const data = {
      dataId: 'foo',
      dir: TMP_FILES,
      host: 'host',
      tabId: 'tabId',
      windowId: 'windowId'
    };
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: 'foo',
          dir: TMP_FILES,
          host: 'host',
          tabId: 'tabId',
          windowId: 'windowId',
          timestamp: -1
        }
      }
    });
    const err = new Output().encode({
      withexeditorhost: {
        message: 'Failed to get temporary file. ID: foo',
        status: 'warn'
      }
    });
    const res = await getTmpFileFromFileData(data);
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [msg, err]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const data = {
      dataId: 'foo',
      dir: TMP_FILES,
      host: 'host',
      tabId: 'tabId',
      windowId: 'windowId'
    };
    const filePath = path.resolve(path.join('test', 'file', 'foo.txt'));
    fileMap[TMP_FILES].set('windowId_tabId_host_foo', { filePath });
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          dataId: 'foo',
          dir: TMP_FILES,
          host: 'host',
          tabId: 'tabId',
          windowId: 'windowId',
          timestamp: -1
        }
      }
    });
    const err = new Output().encode({
      withexeditorhost: {
        message: 'Failed to get temporary file. ID: foo',
        status: 'warn'
      }
    });
    const res = await getTmpFileFromFileData(data);
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.isFalse(fileMap[TMP_FILES].has('windowId_tabId_host_foo'));
    assert.deepEqual(res, [msg, err]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const data = {
      dataId: 'foo',
      dir: TMP_FILES,
      host: 'host',
      tabId: 'tabId',
      windowId: 'windowId'
    };
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const fileTimestamp = await getFileTimestamp(filePath);
    fileMap[TMP_FILES].set('windowId_tabId_host_foo', { filePath });
    const msg = new Output().encode({
      [TMP_FILE_RES]: {
        data: {
          dataId: 'foo',
          dir: TMP_FILES,
          host: 'host',
          tabId: 'tabId',
          windowId: 'windowId',
          timestamp: fileTimestamp
        },
        value: 'test file\n'
      }
    });
    const res = await getTmpFileFromFileData(data);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(fileMap[TMP_FILES].has('windowId_tabId_host_foo'));
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const data = {
      dataId: 'foo',
      dir: TMP_FILES_PB,
      host: 'host',
      tabId: 'tabId',
      windowId: 'windowId'
    };
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const fileTimestamp = await getFileTimestamp(filePath);
    fileMap[TMP_FILES_PB].set('windowId_tabId_host_foo', { filePath });
    const msg = new Output().encode({
      [TMP_FILE_RES]: {
        data: {
          dataId: 'foo',
          dir: TMP_FILES_PB,
          host: 'host',
          tabId: 'tabId',
          windowId: 'windowId',
          timestamp: fileTimestamp
        },
        value: 'test file\n'
      }
    });
    const res = await getTmpFileFromFileData(data);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(fileMap[TMP_FILES_PB].has('windowId_tabId_host_foo'));
    assert.deepEqual(res, [msg]);
  });
});

describe('getFileIdFromFilePath', () => {
  it('should get null', async () => {
    const res = await getFileIdFromFilePath();
    assert.isNull(res);
  });

  it('should get null', async () => {
    const res = await getFileIdFromFilePath(path.join(TMPDIR, 'foo.txt'));
    assert.isNull(res);
  });

  it('should get null', async () => {
    const filePath = path.join(TMPDIR_APP, 'foo.txt');
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it('should get null', async () => {
    const filePath = path.join(TMPDIR_APP, 'foo', 'bar.txt');
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it('should get null', async () => {
    const filePath = path.join(TMPDIR_APP, 'foo', 'bar', 'baz.txt');
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it('should get null', async () => {
    const filePath = path.join(TMPDIR_APP, 'foo', 'bar', 'baz', 'qux.txt');
    const res = await getFileIdFromFilePath(filePath);
    assert.isNull(res);
  });

  it('should get string', async () => {
    const filePath =
      path.join(TMPDIR_APP, 'foo', 'bar', 'baz', 'qux', 'quux.txt');
    const res = await getFileIdFromFilePath(filePath);
    assert.strictEqual(res, 'bar_baz_qux_quux');
  });
});

describe('createTmpFileResMsg', () => {
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

  it('should get null', async () => {
    const res = await createTmpFileResMsg();
    assert.isNull(res);
  });

  it('should get null', async () => {
    const res = await createTmpFileResMsg(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar.txt')
    );
    assert.isNull(res);
  });

  it('should get null', async () => {
    const dir =
      await createDirectory(path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar'));
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    const res = await createTmpFileResMsg(filePath);
    assert.isNull(res);
  });

  it('should get null', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz')
    );
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    const res = await createTmpFileResMsg(filePath);
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isNull(res);
  });

  it('should get null', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz')
    );
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    fileMap[TMP_FILES].set('foo_bar_baz_test', { filePath });
    const res = await createTmpFileResMsg(filePath);
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isNull(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz')
    );
    const data = {};
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    const timestamp = await getFileTimestamp(filePath);
    data.timestamp = timestamp;
    const msg = new Output().encode({
      [TMP_FILE_RES]: {
        data, value
      }
    });
    fileMap[TMP_FILES].set('foo_bar_baz_test', { data, filePath });
    const res = await createTmpFileResMsg(filePath);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, msg);
  });
});

describe('getTmpFileFromWatcherFileName', () => {
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

  it('should get empty array', async () => {
    const res = await getTmpFileFromWatcherFileName();
    assert.deepEqual(res, []);
  });

  it('should get empty array', async () => {
    const res = await getTmpFileFromWatcherFileName('change');
    assert.deepEqual(res, []);
  });

  it('should get empty array', async () => {
    const res = await getTmpFileFromWatcherFileName('foo', 'bar');
    assert.deepEqual(res, []);
  });

  it('should get empty array', async () => {
    const stubClose = sinon.stub();
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz')
    );
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose
    });
    const res = await getTmpFileFromWatcherFileName('change', 'foo.txt');
    assert.isFalse(stubClose.called);
    assert.deepEqual(res, []);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubClose = sinon.stub();
    const stubClose2 = sinon.stub();
    const dir = await createDirectory(
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz')
    );
    const data = {};
    const value = '';
    const filePath =
      await createFile(path.join(dir, 'test.txt'), value,
        { encoding: CHAR, flag: 'w', mode: PERM_FILE });
    const timestamp = await getFileTimestamp(filePath);
    const filePath2 =
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'qux', 'test.txt');
    data.timestamp = timestamp;
    const msg = new Output().encode({
      [TMP_FILE_RES]: {
        data, value
      }
    });
    fileMap[TMP_FILES].set('foo_bar_baz_test', { data, filePath });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose
    });
    fileMap[FILE_WATCH].set(filePath2, {
      close: stubClose2
    });
    const res = await getTmpFileFromWatcherFileName('change', 'test.txt');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(stubClose.called);
    assert.isTrue(stubClose2.calledOnce);
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.isFalse(fileMap[FILE_WATCH].has(filePath2));
    assert.deepEqual(res, [msg, undefined]);
  });
});

describe('watchTmpFile', () => {
  it('should get array', async () => {
    const res = await watchTmpFile();
    assert.deepEqual(res, []);
  });
});

describe('createTmpFile', () => {
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

  it('should get object', async () => {
    const res = await createTmpFile();
    assert.deepEqual(res, {
      data: undefined,
      filePath: undefined
    });
  });

  it('should get object', async () => {
    const res = await createTmpFile({
      data: {}
    });
    assert.deepEqual(res, {
      data: {},
      filePath: undefined
    });
  });

  it('should get object', async () => {
    const data = {
      dataId: 'dataId',
      dir: 'dir',
      extType: 'extType',
      host: 'host',
      tabId: 'tabId',
      windowId: 'windowId'
    };
    const keys = Object.keys(data);
    for (const key of keys) {
      const testData = data;
      testData[key] = false;
      const obj = {
        data: testData
      };
      const res = await createTmpFile(obj);
      assert.deepEqual(res, {
        data: testData,
        filePath: undefined
      });
    }
  });

  it('should create file and get object', async () => {
    const data = {
      dataId: 'qux',
      dir: TMP_FILES,
      extType: '.txt',
      host: 'baz',
      incognito: false,
      mode: MODE_EDIT,
      syncAuto: true,
      tabId: 'bar',
      windowId: 'foo'
    };
    const value = '';
    const obj = {
      data, value
    };
    const filePath =
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isTrue(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath
    });
    await fileMap[FILE_WATCH].get(filePath).close();
  });

  it('should create file and get object', async () => {
    const data = {
      dataId: 'qux',
      dir: TMP_FILES,
      extType: '.txt',
      host: 'baz',
      incognito: false,
      mode: 'foobar',
      syncAuto: true,
      tabId: 'bar',
      windowId: 'foo'
    };
    const value = '';
    const obj = {
      data, value
    };
    const filePath =
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isFalse(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath
    });
  });

  it('should create file and get object', async () => {
    const stubClose = sinon.stub();
    const data = {
      dataId: 'qux',
      dir: TMP_FILES,
      extType: '.txt',
      host: 'baz',
      incognito: false,
      mode: 'foobar',
      syncAuto: true,
      tabId: 'bar',
      windowId: 'foo'
    };
    const value = '';
    const obj = {
      data, value
    };
    const filePath =
      path.join(TMPDIR_APP, TMP_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    fileMap[FILE_WATCH].set(filePath, {
      close: stubClose
    });
    const res = await createTmpFile(obj);
    assert.isTrue(isFile(filePath));
    assert.isTrue(stubClose.calledOnce);
    assert.isFalse(fileMap[FILE_WATCH].has(filePath));
    assert.deepEqual(res, {
      data, filePath
    });
  });
});

describe('removeTmpFileData', () => {
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

  it('should get empty array', async () => {
    const res = await removeTmpFileData();
    assert.deepEqual(res, []);
  });

  it('should get empty array', async () => {
    const obj = {
      dataId: 'qux',
      dir: TMP_FILES,
      host: 'baz',
      tabId: 'bar',
      windowId: 'foo'
    };
    const res = await removeTmpFileData(obj);
    assert.deepEqual(res, []);
  });

  it('should get results', async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: null,
      tabId: 'bar',
      windowId: 'foo'
    };
    const fileId = 'foo_bar_baz_qux';
    const fileId2 = 'foo_bar_baz_quux';
    const fileId3 = 'foo_barr_baz_qux';
    const filePath = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const filePath2 = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'quux.txt');
    const filePath3 = path.join(TMPDIR_FILES, 'foo', 'barr', 'baz', 'qux.txt');
    fileMap[TMP_FILES].set(fileId, { filePath });
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [
      undefined,
      true
    ]);
  });

  it('should get results', async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: null,
      dir: TMP_FILES,
      host: 'baz',
      tabId: 'bar',
      windowId: 'foo'
    };
    const fileId = 'foo_bar_baz_qux';
    const fileId2 = 'foo_bar_baz_quux';
    const fileId3 = 'foo_barr_baz_qux';
    const filePath = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const filePath2 = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'quux.txt');
    const filePath3 = path.join(TMPDIR_FILES, 'foo', 'barr', 'baz', 'qux.txt');
    fileMap[TMP_FILES].set(fileId, { filePath });
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [
      undefined,
      true
    ]);
  });

  it('should get results', async () => {
    const stubWatcher = sinon.stub();
    const obj = {
      dataId: 'qux',
      dir: TMP_FILES,
      host: 'baz',
      tabId: 'bar',
      windowId: 'foo'
    };
    const fileId = 'foo_bar_baz_qux';
    const fileId2 = 'foo_bar_baz_quux';
    const fileId3 = 'foo_barr_baz_qux';
    const filePath = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const filePath2 = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'quux.txt');
    const filePath3 = path.join(TMPDIR_FILES, 'foo', 'barr', 'baz', 'qux.txt');
    fileMap[TMP_FILES].set(fileId, { filePath });
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3
    });
    fileMap[FILE_WATCH].set(filePath, {
      close: stubWatcher
    });
    const res = await removeTmpFileData(obj);
    assert.isTrue(stubWatcher.calledOnce);
    assert.deepEqual(res, [undefined]);
  });

  it('should get results', async () => {
    const obj = {
      dataId: 'qux',
      dir: TMP_FILES,
      host: 'baz',
      tabId: 'bar',
      windowId: 'foo'
    };
    const fileId = 'foo_bar_baz_qux';
    const fileId2 = 'foo_bar_baz_quux';
    const fileId3 = 'foo_barr_baz_qux';
    const filePath = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'qux.txt');
    const filePath2 = path.join(TMPDIR_FILES, 'foo', 'bar', 'baz', 'quux.txt');
    const filePath3 = path.join(TMPDIR_FILES, 'foo', 'barr', 'baz', 'qux.txt');
    fileMap[TMP_FILES].set(fileId, { filePath });
    fileMap[TMP_FILES].set(fileId2, {
      filePath: filePath2
    });
    fileMap[TMP_FILES].set(fileId3, {
      filePath: filePath3
    });
    const res = await removeTmpFileData(obj);
    assert.deepEqual(res, [true]);
  });
});

describe('getEditorConfig', () => {
  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const err = new Output().encode({
      withexeditorhost: {
        message: 'No such file: undefined',
        status: 'warn'
      }
    });
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: null
    });
    const res = await getEditorConfig();
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [err, msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const editorConfigPath = path.resolve(path.join('.', 'foo.json'));
    const err = new Output().encode({
      withexeditorhost: {
        message: `No such file: ${editorConfigPath}`,
        status: 'warn'
      }
    });
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: null
    });
    const res = await getEditorConfig(editorConfigPath);
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [err, msg]);
  });

  it('should call function', async () => {
    const editorConfigPath =
      path.resolve(path.join('test', 'file', 'editorconfig.json'));
    const res = await getEditorConfig(editorConfigPath);
    assert.deepEqual(res, [null]);
  });
});

describe('viewLocalFile', () => {
  beforeEach(() => {
    editorConfig.editorPath = '';
  });
  afterEach(() => {
    editorConfig.editorPath = '';
  });

  it('should throw', async () => {
    await viewLocalFile().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, 'Expected String but got Undefined.');
    });
  });

  it('should throw', async () => {
    await viewLocalFile('foo/bar').catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should throw', async () => {
    await viewLocalFile('file:///foo/bar.txt').catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should get null if not file uri', async () => {
    const res = await viewLocalFile('https://example.com');
    assert.isNull(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const filePathname = filePath.split(path.sep).join('/');
    const fileUrl = `file://${IS_WIN ? '/' : ''}${filePathname}`;
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.editorPath = editorPath;
    const res = await viewLocalFile(fileUrl);
    const { called: writeCalled } = stubWrite;
    const { calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.isObject(res);
  });

  it('should get null if file does not exist', async () => {
    const stubWrite = sinon.stub(process.stderr, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'foo.txt'));
    const filePathname = filePath.split(path.sep).join('/');
    const fileUrl = `file://${IS_WIN ? '/' : ''}${filePathname}`;
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.editorPath = editorPath;
    const res = await viewLocalFile(fileUrl);
    const { called: writeCalled } = stubWrite;
    const { calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isFalse(spawnCalled);
    assert.isNull(res);
  });
});

describe('handleCreatedTmpFile', () => {
  beforeEach(() => {
    editorConfig.editorPath = '';
  });
  afterEach(() => {
    editorConfig.editorPath = '';
  });

  it('should get empty array', async () => {
    const res = await handleCreatedTmpFile();
    assert.deepEqual(res, []);
  });

  it('should get empty array if file path is not file', async () => {
    const res = await handleCreatedTmpFile({
      filePath: 'foo/bar'
    });
    assert.deepEqual(res, []);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    const data = {
      foo: 'bar'
    };
    const obj = {
      filePath, data
    };
    const msg = new Output().encode({
      [TMP_FILE_DATA_PORT]: {
        data
      }
    });
    editorConfig.editorPath = editorPath;
    const res = await handleCreatedTmpFile(obj);
    const { calledOnce: writeCalled } = stubWrite;
    const { calledOnce: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(spawnCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 2);
    assert.deepEqual(res[1], msg);
  });
});

describe('handleMsg', () => {
  beforeEach(() => {
    editorConfig.editorPath = '';
  });
  afterEach(() => {
    editorConfig.editorPath = '';
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'No handler found for undefined.',
        status: 'warn'
      }
    });
    const res = await handleMsg();
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'No handler found for foo.',
        status: 'warn'
      }
    });
    const res = await handleMsg('foo');
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'No handler found for foo.',
        status: 'warn'
      }
    });
    const res = await handleMsg({
      foo: 'bar'
    });
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    await createDirectory(TMPDIR_FILES_PB);
    const res = await handleMsg({
      [TMP_FILES_PB_REMOVE]: true
    });
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [undefined]);
    await removeDir(TMPDIR_APP, TMPDIR);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const msg = new Output().encode({
      [TMP_FILE_DATA_REMOVE]: {
        data: {
          timestamp: -1
        }
      }
    });
    const res = await handleMsg({
      [TMP_FILE_GET]: {}
    });
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, [[msg]]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const res = await handleMsg({
      [TMP_FILE_DATA_REMOVE]: {}
    });
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[]]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const res = await handleMsg({
      [TMP_FILE_CREATE]: {}
    });
    const { called: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[]]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const stubSpawn = sinon.stub(childProcess, 'spawn').returns({
      on: a => a,
      stderr: {
        on: a => a
      },
      stdout: {
        on: a => a
      }
    });
    const filePath = path.resolve(path.join('test', 'file', 'test.txt'));
    const filePathname = filePath.split(path.sep).join('/');
    const fileUrl = `file://${IS_WIN ? '/' : ''}${filePathname}`;
    const app = IS_WIN ? 'test.cmd' : 'test.sh';
    const editorPath = path.resolve(path.join('test', 'file', app));
    if (!IS_WIN) {
      fs.chmodSync(editorPath, PERM_APP);
    }
    editorConfig.editorPath = editorPath;
    const [res] = await handleMsg({
      [LOCAL_FILE_VIEW]: fileUrl
    });
    const { called: writeCalled } = stubWrite;
    const { called: spawnCalled } = stubSpawn;
    stubWrite.restore();
    stubSpawn.restore();
    assert.isFalse(writeCalled);
    assert.isTrue(spawnCalled);
    assert.isObject(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const hostName = process.env.npm_package_name;
    const hostVersion = process.env.npm_package_version;
    const {
      major, minor, patch
    } = await parseSemVer(hostVersion);
    const version = `${major}.${minor}.${patch + 1}`;
    const currentResult = await compareSemVer(hostVersion, version);
    const isLatest = currentResult >= 0;
    const msg = new Output().encode({
      [HOST_VERSION]: {
        isLatest,
        latest: version,
        result: 0
      }
    });
    nock('https://registry.npmjs.org').get(`/${hostName}`).reply(200, {
      'dist-tags': {
        latest: version
      },
      versions: {
        [version]: {
          version
        }
      }
    });
    const res = await handleMsg({
      [HOST_VERSION_CHECK]: hostVersion
    });
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(res, [msg]);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const editorConfigPath = path.resolve(path.join('.', EDITOR_CONFIG_FILE));
    const err = new Output().encode({
      withexeditorhost: {
        message: `No such file: ${editorConfigPath}`,
        status: 'warn'
      }
    });
    const msg = new Output().encode({
      [EDITOR_CONFIG_RES]: null
    });
    const res = await handleMsg({
      [EDITOR_CONFIG_GET]: true
    });
    const { called: writeCalled, callCount: writeCallCount } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.strictEqual(writeCallCount, 2);
    assert.deepEqual(res, [[err, msg]]);
  });
});

describe('readStdin', () => {
  it('should get null', async () => {
    const chunk = new Output().encode('');
    const res = await readStdin(chunk);
    assert.isNull(res);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => buf);
    const chunk = new Output().encode({
      foo: 'bar'
    });
    const msg = new Output().encode({
      withexeditorhost: {
        message: 'No handler found for foo.',
        status: 'warn'
      }
    });
    const res = await readStdin(chunk);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isTrue(Array.isArray(res));
    assert.strictEqual(res.length, 1);
    assert.deepEqual(res, [[msg]]);
  });
});

describe('handleExit', () => {
  beforeEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it('should not call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
    });
    handleExit(0);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isUndefined(msg);
  });

  it('should call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
    });
    const input = new Input();
    handleExit(1);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(input.decode(msg), [
      {
        withexeditorhost: {
          message: 'exit 1',
          status: 'exit'
        }
      }
    ]);
  });

  it('should remove dir and not call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
    });
    const dir = await createDirectory(TMPDIR_APP);
    handleExit(0);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isFalse(writeCalled);
    assert.isFalse(isDir(dir));
    assert.isUndefined(msg);
  });

  it('should remove dir and call function', async () => {
    let msg;
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(buf => {
      msg = buf;
    });
    const input = new Input();
    const dir = await createDirectory(TMPDIR_APP);
    handleExit(1);
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.isFalse(isDir(dir));
    assert.deepEqual(input.decode(msg), [
      {
        withexeditorhost: {
          message: 'exit 1',
          status: 'exit'
        }
      }
    ]);
  });
});

describe('addProcessListeners', () => {
  it('should set listeners', async () => {
    const stubOn = sinon.stub(process, 'on');
    const stubStdinOn = sinon.stub(process.stdin, 'on');
    const i = stubOn.callCount;
    const j = stubStdinOn.callCount;
    await addProcessListeners();
    const { callCount: stubOnCallCount } = stubOn;
    const { callCount: stubStdinOnCallCount } = stubStdinOn;
    stubOn.restore();
    stubStdinOn.restore();
    assert.strictEqual(stubOnCallCount, i + 2);
    assert.strictEqual(stubStdinOnCallCount, j + 1);
  });
});

describe('startup', () => {
  beforeEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });
  afterEach(() => {
    removeDir(TMPDIR_APP, TMPDIR);
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(process.stdout, 'write').callsFake(msg => msg);
    const input = new Input();
    const res = await startup();
    const { calledOnce: writeCalled } = stubWrite;
    stubWrite.restore();
    assert.isTrue(writeCalled);
    assert.deepEqual(input.decode(res), [
      {
        withexeditorhost: {
          message: 'getEditorConfig',
          status: 'ready'
        }
      }
    ]);
  });
});
