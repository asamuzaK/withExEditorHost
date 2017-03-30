/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {concatArgs, isString, logError} = require("./modules/common");
  const {
    createDir, createFile, isDir, isExecutable, isFile,
  } = require("./modules/file-util");
  const {execFile} = require("child_process");
  const os = require("os");
  const path = require("path");
  const process = require("process");
  const readline = require("readline");

  /* constants */
  const ADDON_ID = "jid1-WiAigu4HIo0Tag@jetpack";
  const CHAR = "utf8";
  const DIR_CWD = process.cwd();
  const DIR_HOME = os.homedir();
  const HOST_NAME = "withexeditorhost";
  const IS_MAC = os.platform() === "darwin";
  const IS_WIN = os.platform() === "win32";
  const PERM_DIR = 0o700;
  const PERM_EXEC = 0o700;
  const PERM_FILE = 0o600;

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
      name: HOST_NAME,
      path: shellPath,
      type: "stdio",
    });
    const fileName = `${HOST_NAME}.json`;
    const filePath = path.resolve(
      IS_WIN && path.join(configPath, fileName) ||
      IS_MAC && path.join(
        "~/Library/Application Support",
        "Mozilla",
        "NativeMessagingHosts",
        fileName
      ) ||
      path.join("~", ".mozilla", "native-messaging-hosts", fileName)
    );
    if (IS_WIN) {
      const reg = path.join(process.env.WINDIR, "system32", "reg.exe");
      const key = path.join(
        "HKEY_CURRENT_USER", "SOFTWARE", "Mozilla", "NativeMessagingHosts",
        HOST_NAME
      );
      const args = ["add", key, "/ve", "/d", filePath, "/f"];
      const opt = {
        cwd: null,
        encoding: CHAR,
        env: process.env,
      };
      const proc = execFile(reg, args, opt, (e, stdout, stderr) => {
        if (e) {
          throw e;
        }
        if (stderr) {
          console.error(stderr);
        }
        if (stdout) {
          //console.log(stdout);
        }
      });
      proc.on("close", code => {
        if (code === 0) {
          console.info(`Created: ${key}`);
        } else {
          console.warn(`${reg} exited with ${code}.`);
        }
      });
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
    const shellPath = path.join(configPath, `${HOST_NAME}.${shellExt}`);
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
    editorPath: "",
    cmdArgs: [],
    fileAfterCmdArgs: false,
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
   * get config directory path in array
   * @returns {Array} - config directory array
   */
  const getConfigPath = async () => {
    const [, , ...args] = process.argv;
    let configPath;
    if (Array.isArray(args) && args.length) {
      for (const arg of args) {
        let argConf = /^--config-path=(.+)$/.exec(arg);
        argConf && (argConf = argConf[1].trim());
        (/^".+"$/.test(argConf) || /^'.+'$/.test(argConf)) &&
          (argConf = argConf.replace(/^["']/, "").replace(/['"]$/, "").trim());
        argConf && (argConf = path.resolve(argConf));
        if (argConf && argConf.startsWith(path.resolve(DIR_HOME))) {
          configPath = argConf;
          break;
        }
      }
    }
    return configPath && configPath.split(path.sep) || [DIR_CWD, "config"];
  };

  /**
   * create config directory
   * @returns {string} - config directory path
   */
  const createConfig = async () => {
    const configDir = await getConfigPath();
    const configPath = await createDir(configDir, PERM_DIR);
    if (await !isDir(configPath)) {
      throw new Error(`Failed to create ${path.join(...configDir)}.`);
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
  const handleFilePos = ans => {
    if (isString(ans)) {
      ans = ans.trim();
      /^y(?:es)?$/i.test(ans) && (editorConfig.fileAfterCmdArgs = true);
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
      ans = ans.trim();
      ans.length && (editorConfig.cmdArgs = concatArgs(ans));
    }
    rl.question("Put file path after command arguments? [y/n]\n",
                handleFilePos);
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
          editorConfig.editorPath = ans;
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

  rl.question("Enter editor path:\n", handleEditorPathInput);
}
