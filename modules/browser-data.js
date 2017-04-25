/**
 * browser-data.js
 */
"use strict";
{
  /* api */
  const os = require("os");

  /* constants */
  const {HOST} = require("./constant");
  const DIR_HOME = os.homedir();
  const DIR_HOST_MAC = [DIR_HOME, "Library", "Application Support"];
  const EXT_CHROME = "chromeExtension";
  const EXT_CHROME_ALLOWED = "allowed_origins";
  const EXT_CHROME_ID = "chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/";
  const EXT_WEB = "webExtension";
  const EXT_WEB_ALLOWED = "allowed_extensions";
  const EXT_WEB_ID = "jid1-WiAigu4HIo0Tag@jetpack";
  const HKCU_SOFTWARE = ["HKEY_CURRENT_USER", "SOFTWARE"];
  const HOST_DIR_LABEL = "NativeMessagingHosts";

  /* allowed field key/value for app manifest */
  const allowedField = {
    [EXT_CHROME]: {
      key: EXT_CHROME_ALLOWED,
      value: [EXT_CHROME_ID],
    },
    [EXT_WEB]: {
      key: EXT_WEB_ALLOWED,
      value: [EXT_WEB_ID],
    },
  };

  /* browser config data */
  const browserData = {
    /* gecko */
    firefox: {
      alias: "firefox",
      hostLinux: [DIR_HOME, ".mozilla", "native-messaging-hosts"],
      hostMac: [...DIR_HOST_MAC, "Mozilla", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Mozilla", HOST_DIR_LABEL, HOST],
      type: EXT_WEB,
    },
    cyberfox: {
      alias: "cyberfox",
      aliasWin: "firefox",
      hostLinux: null,
      hostMac: null,
      regWin: [...HKCU_SOFTWARE, "Mozilla", HOST_DIR_LABEL, HOST],
      type: EXT_WEB,
    },
    waterfox: {
      alias: "waterfox",
      aliasWin: "firefox",
      hostLinux: null,
      hostMac: null,
      regWin: [...HKCU_SOFTWARE, "Mozilla", HOST_DIR_LABEL, HOST],
      type: EXT_WEB,
    },
    /* blink */
    chrome: {
      alias: "chrome",
      hostLinux: [DIR_HOME, ".config", "google-chrome", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Google", "Chrome", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Google", "Chrome", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
    chromium: {
      alias: "chromium",
      hostLinux: [DIR_HOME, ".config", "chromium", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Chromium", HOST_DIR_LABEL],
      regWin: null,
      type: EXT_CHROME,
    },
    opera: {
      alias: "opera",
      aliasMac: "chrome",
      aliasWin: "chrome",
      hostLinux: null,
      hostMac: [...DIR_HOST_MAC, "Google", "Chrome", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Google", "Chrome", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
    vivaldi: {
      alias: "vivaldi",
      aliasWin: "chrome",
      hostLinux: [DIR_HOME, ".config", "vivaldi", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Vivaldi", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Google", "Chrome", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
  };

  module.exports = {
    allowedField, browserData,
  };
}
