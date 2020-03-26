/**
 * index.js
 */
"use strict";
/* api */
const {logErr, throwErr} = require("./modules/common");
const {startup} = require("./modules/main");
const {parseCommand} = require("./modules/commander");
const process = require("process");

/* process */
process.on("uncaughtException", throwErr);
process.on("unhandledRejection", logErr);

/* startup */
(() => {
  const args = process.argv;
  const reg = /^(?:(?:--)?help|-[h|v]|--version|s(?:etup)?)$/;
  let func;
  if (args.some(arg => reg.test(arg))) {
    func = parseCommand(args);
  } else {
    func = startup();
  }
  return func;
})();
