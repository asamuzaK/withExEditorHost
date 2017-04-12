/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {ChildProcess, CmdArgs} = require("./modules/child-process");
  const {escapeChar, isString, logError} = require("./modules/common");
  const {
    createDir, createFile, getAbsPath, isDir, isExecutable, isFile,
  } = require("./modules/file-util");
  const os = require("os");
  const path = require("path");
  const process = require("process");
  const readline = require("readline");

  /* constants */
  const {
    EDITOR_CMD_ARGS, EDITOR_FILE_POS, EDITOR_PATH, HOST,
  } = require("./modules/constant");
  const ADDON_ID = "jid1-WiAigu4HIo0Tag@jetpack";
  const CHAR = "utf8";
  const DIR_CWD = process.cwd();
  const DIR_HOME = os.homedir();
  const HOST_DIR_LINUX = [DIR_HOME, ".mozilla", "native-messaging-hosts"];
  const HOST_DIR_MAC = [
    DIR_HOME, "Library", "Application Support", "Mozilla",
    "NativeMessagingHosts",
  ];
  const IS_MAC = os.platform() === "darwin";
  const IS_WIN = os.platform() === "win32";
  const PERM_DIR = 0o700;
  const PERM_EXEC = 0o700;
  const PERM_FILE = 0o600;

  /* variables */
  const vars = {
    configDir: [DIR_CWD, "config"],
  };

  /**
   * create app manifest
   * @param {string} configPath - config direcory path
   * @param {string} shellPath - shell script path
   * @returns {string} - app manifest path
   */
  const createAppManifest = async (configPath, shellPath) => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    if (await !isFile(shellPath)) {
      throw new Error(`No such file: ${shellPath}.`);
    }
    const allowed = "allowed_extensions";
    const manifest = JSON.stringify({
      [allowed]: [ADDON_ID],
      description: "Native messaging host for withExEditor",
      name: HOST,
      path: shellPath,
      type: "stdio",
    });
    const fileName = `${HOST}.json`;
    const filePath = path.resolve(
      IS_WIN && path.join(configPath, fileName) ||
      IS_MAC && path.join(...HOST_DIR_MAC, fileName) ||
      path.join(...HOST_DIR_LINUX, fileName)
    );
    if (IS_WIN) {
      const reg = path.join(process.env.WINDIR, "system32", "reg.exe");
      const key = path.join(
        "HKEY_CURRENT_USER", "SOFTWARE", "Mozilla", "NativeMessagingHosts",
        HOST
      );
      const args = ["add", key, "/ve", "/d", filePath, "/f"];
      const opt = {
        cwd: null,
        encoding: CHAR,
        env: process.env,
      };
      const proc = (new ChildProcess(reg, args, opt)).spawn();
      proc.on("error", e => {
        throw e;
      });
      proc.stderr.on("data", data => {
        data && console.error(`stderr: ${reg}: ${data}`);
      });
      proc.on("close", code => {
        if (code === 0) {
          console.info(`Created: ${key}`);
        } else {
          console.warn(`${reg} exited with ${code}.`);
        }
      });
    } else {
      const hostDir = IS_MAC && HOST_DIR_MAC || HOST_DIR_LINUX;
      const hostDirPath = await createDir(hostDir, PERM_DIR);
      if (await !isDir(hostDirPath)) {
        throw new Error(`Failed to create ${path.join(...hostDir)}.`);
      }
    }
    await createFile(
      filePath, manifest,
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (await !isFile(filePath)) {
      throw new Error(`Failed to create ${filePath}.`);
    }
    console.info(`Created: ${filePath}`);
    return filePath;
  };

  /**
   * create shell script
   * @param {string} configPath - config directory path
   * @returns {string} - shell script path
   */
  const createShellScript = async configPath => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const shellExt = IS_WIN && "cmd" || "sh";
    const shellPath = path.join(configPath, `${HOST}.${shellExt}`);
    const indexPath = path.resolve(path.join(DIR_CWD, "index.js"));
    if (await isFile(indexPath)) {
      const node = process.argv0;
      const cmd = `${node} ${indexPath}`;
      const file = IS_WIN && `@echo off\n${cmd}\n` ||
                   `#!/usr/bin/env bash\n${cmd}\n`;
      await createFile(
        shellPath, file,
        {encoding: CHAR, flag: "w", mode: PERM_EXEC}
      );
    }
    if (await !isFile(shellPath)) {
      throw new Error(`Failed to create ${shellPath}.`);
    }
    console.info(`Created: ${shellPath}`);
    return shellPath;
  };

  /* editor config */
  const editorConfig = {
    [EDITOR_PATH]: "",
    [EDITOR_CMD_ARGS]: [],
    [EDITOR_FILE_POS]: false,
  };

  /**
   * create editor config
   * @param {string} configPath - config directory path
   * @returns {string} - editor config path
   */
  const createEditorConfig = async configPath => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const editorConfigPath = path.join(configPath, "editorconfig.json");
    await createFile(
      editorConfigPath, JSON.stringify(editorConfig, null, "  "),
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (await !isFile(editorConfigPath)) {
      throw new Error(`Failed to create ${editorConfigPath}.`);
    }
    console.info(`Created: ${editorConfigPath}`);
    return editorConfigPath;
  };

  /**
   * set config directory
   * @param {string} arg - argument
   * @returns {void}
   */
  const setConfigDir = async arg => {
    if (await isString(arg)) {
      arg = /^--config-path=(.+)$/.exec(arg);
      if (arg) {
        const configPath = await getAbsPath(arg[1].trim());
        if (configPath.startsWith(DIR_HOME)) {
          const re = /(\\)/g;
          const dirHome = await escapeChar(DIR_HOME, re);
          const reHomeDir = new RegExp(`^(?:${dirHome}|~)`);
          const subDir = (configPath.replace(reHomeDir, "")).split(path.sep)
                           .filter(i => i);
          if (subDir.length) {
            vars.configDir = [DIR_HOME, ...subDir];
          } else {
            vars.configDir = [DIR_HOME];
          }
        } else {
          vars.configDir = configPath.split(path.sep);
        }
      }
    }
  };

  /**
   * create config directory
   * @returns {string} - config directory path
   */
  const createConfig = async () => {
    const configPath = await createDir(vars.configDir, PERM_DIR);
    if (await !isDir(configPath)) {
      throw new Error(`Failed to create ${path.join(...vars.configDir)}.`);
    }
    console.info(`Created: ${configPath}`);
    return configPath;
  };

  /**
   * setup
   * @returns {Promise.<Array>} - results of each handler
   */
  const setup = async () => {
    const configPath = await createConfig();
    const shellPath = await createShellScript(configPath);
    return Promise.all([
      createAppManifest(configPath, shellPath),
      createEditorConfig(configPath),
    ]);
  };

  /* readline */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  /**
   * handle editor temporary file position input
   * @param {string} ans - user input
   * @returns {AsyncFuncrtion} - setup
   */
  const handleFilePosInput = ans => {
    if (isString(ans)) {
      ans = ans.trim();
      /^y(?:es)?$/i.test(ans) && (editorConfig[EDITOR_FILE_POS] = true);
    }
    rl.close();
    return setup().catch(logError);
  };

  /**
   * handle editor cmd args input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleCmdArgsInput = ans => {
    if (isString(ans)) {
      editorConfig[EDITOR_CMD_ARGS] = (new CmdArgs(ans.trim())).toArray();
    }
    rl.question("Put file path after command arguments? [y/n]\n",
                handleFilePosInput);
  };

  /**
   * handle editor path input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleEditorPathInput = ans => {
    if (isString(ans)) {
      ans = ans.trim();
      if (ans.length) {
        if (isExecutable(ans)) {
          editorConfig[EDITOR_PATH] = ans;
          rl.question("Enter command line options:\n", handleCmdArgsInput);
        } else {
          console.warn(`${ans} is not executable.`);
          rl.question("Enter editor path:\n", handleEditorPathInput);
        }
      } else {
        rl.question("Enter command line options:\n", handleCmdArgsInput);
      }
    } else {
      rl.question("Enter command line options:\n", handleCmdArgsInput);
    }
  };

  {
    const [, , ...args] = process.argv;
    if (Array.isArray(args) && args.length) {
      const func = [];
      for (const arg of args) {
        /^--config-path=/.test(arg) && func.push(setConfigDir(arg));
      }
      Promise.all(func).catch(logError);
    }
    rl.question("Enter editor path:\n", handleEditorPathInput);
  }
}
