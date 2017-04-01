/**
 * child-process.js
 */
"use strict";
{
  /* api */
  const {concatArgs, getType, isString} = require("./common");
  const {isExecutable} = require("./file-util");
  const {spawn} = require("child_process");
  const process = require("process");

  /* Child process */
  class ChildProcess {
    /**
     * command, arguments and option
     * @param {string} cmd - command
     * @param {string|Array} args - command arguments
     * @param {Object} opt - option
     */
    constructor(cmd, args, opt) {
      this._cmd = isString(cmd) && cmd || null;
      this._args = Array.isArray(args) && args ||
                   isString(args) && concatArgs(args) || [];
      this._opt = getType(opt) === "Object" && opt ||
                  {cwd: null, env: process.env};
    }

    /**
     * spawn child process
     * @param {string} file - file
     * @param {boolean} pos - file after cmd args
     * @returns {Object} - child process
     */
    spawn(file, pos = false) {
      if (!isExecutable(this._cmd)) {
        throw new Error(`${this._cmd} is not executable.`);
      }
      const cmd = this._cmd;
      const args = isString(file) && (
                     pos && concatArgs(this._args,
                                       [file.replace(/\\/g, "\\\\")]) ||
                     concatArgs([file.replace(/\\/g, "\\\\")], this._args)
                   ) || this._args;
      const opt = this._opt;
      return spawn(cmd, args, opt);
    }
  }

  module.exports = {
    ChildProcess,
  };
}
