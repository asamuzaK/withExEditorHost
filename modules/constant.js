/**
 * constant.js
 */
"use strict";
/* shared constants */
const CMD_BROWSER = "-b, --browser <name>";
const CMD_BROWSER_DESC = "specify the browser";
const CMD_CONFIG_PATH = "-c, --config-path <path>";
const CMD_CONFIG_PATH_DESC = "path to save config files";
const CMD_EDITOR_ARGS = "-a, --editor-args <args>";
const CMD_EDITOR_ARGS_DESC = "editor command args, need to be quoted";
const CMD_EDITOR_PATH = "-e, --editor-path <path>";
const CMD_EDITOR_PATH_DESC = "editor path";
const CMD_OVERWRITE_CONFIG = "-o, --overwrite-config";
const CMD_OVERWRITE_CONFIG_DESC = "overwrite config if exists";
const CMD_OVERWRITE_EDITOR_CONFIG = "-O, --overwrite-editor-config";
const CMD_OVERWRITE_EDITOR_CONFIG_DESC = "overwrite editor config if exists";
const CMD_FILE_POS = "-f, --file-after-args";
const CMD_FILE_POS_DESC = "put file path at the end of command args";
const CONTENT_GET = "getContent";
const CONTEXT_MENU = "contextMenu";
const CONTEXT_MODE = "contextMode";
const EDITOR_CMD_ARGS = "editorCmdArgs";
const EDITOR_CONFIG = "editorConfigPath";
const EDITOR_CONFIG_FILE = "editorconfig.json";
const EDITOR_CONFIG_GET = "getEditorConfig";
const EDITOR_CONFIG_RES = "resEditorConfig";
const EDITOR_CONFIG_SET = "setEditorConfig";
const EDITOR_CONFIG_TS = "editorConfigTimestamp";
const EDITOR_FILE_NAME = "editorFileName";
const EDITOR_FILE_POS = "editorFileAfterCmdArgs";
const EDITOR_LABEL = "editorLabel";
const EDITOR_PATH = "editorPath";
const EXT_CHROME_ID = "chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/";
const EXT_WEB_ID = "jid1-WiAigu4HIo0Tag@jetpack";
const FILE_EXT = "fileExt";
const FILE_WATCH = "watchFile";
const IS_ENABLED = "isEnabled";
const KEY_ACCESS = "accessKey";
const KEY_EDITOR = "editorShortCut";
const KEY_OPTIONS = "optionsShortCut";
const HOST = "withexeditorhost";
const HOST_DESC = "Native messaging host for withExEditor";
const HOST_VERSION = "hostVersion";
const HOST_VERSION_CHECK = "checkHostVersion";
const LABEL = "withExEditor";
const LOCAL_FILE_VIEW = "viewLocalFile";
const MODE_EDIT = "modeEditText";
const MODE_MATHML = "modeViewMathML";
const MODE_SELECTION = "modeViewSelection";
const MODE_SOURCE = "modeViewSource";
const MODE_SVG = "modeViewSVG";
const ONLY_EDITABLE = "enableOnlyEditable";
const OPTIONS_OPEN = "openOptions";
const PROCESS_CHILD = "childProcess";
const STORAGE_SET = "setStorage";
const TEXT_SYNC = "syncText";
const TMP_FILES = "tmpFiles";
const TMP_FILES_PB = "tmpFilesPb";
const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
const TMP_FILE_CREATE = "createTmpFile";
const TMP_FILE_DATA_PORT = "portTmpFileData";
const TMP_FILE_DATA_REMOVE = "removeTmpFileData";
const TMP_FILE_GET = "getTmpFile";
const TMP_FILE_RES = "resTmpFile";
const VARS_SET = "setVars";

module.exports = {
  CMD_BROWSER,
  CMD_BROWSER_DESC,
  CMD_CONFIG_PATH,
  CMD_CONFIG_PATH_DESC,
  CMD_EDITOR_ARGS,
  CMD_EDITOR_ARGS_DESC,
  CMD_EDITOR_PATH,
  CMD_EDITOR_PATH_DESC,
  CMD_OVERWRITE_CONFIG,
  CMD_OVERWRITE_CONFIG_DESC,
  CMD_OVERWRITE_EDITOR_CONFIG,
  CMD_OVERWRITE_EDITOR_CONFIG_DESC,
  CMD_FILE_POS,
  CMD_FILE_POS_DESC,
  CONTENT_GET,
  CONTEXT_MENU,
  CONTEXT_MODE,
  EDITOR_CMD_ARGS,
  EDITOR_CONFIG,
  EDITOR_CONFIG_FILE,
  EDITOR_CONFIG_GET,
  EDITOR_CONFIG_RES,
  EDITOR_CONFIG_SET,
  EDITOR_CONFIG_TS,
  EDITOR_FILE_NAME,
  EDITOR_FILE_POS,
  EDITOR_LABEL,
  EDITOR_PATH,
  EXT_CHROME_ID,
  EXT_WEB_ID,
  FILE_EXT,
  FILE_WATCH,
  IS_ENABLED,
  KEY_ACCESS,
  KEY_EDITOR,
  KEY_OPTIONS,
  HOST,
  HOST_DESC,
  HOST_VERSION,
  HOST_VERSION_CHECK,
  LABEL,
  LOCAL_FILE_VIEW,
  MODE_EDIT,
  MODE_MATHML,
  MODE_SELECTION,
  MODE_SOURCE,
  MODE_SVG,
  ONLY_EDITABLE,
  OPTIONS_OPEN,
  PROCESS_CHILD,
  STORAGE_SET,
  TEXT_SYNC,
  TMP_FILES,
  TMP_FILES_PB,
  TMP_FILES_PB_REMOVE,
  TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT,
  TMP_FILE_DATA_REMOVE,
  TMP_FILE_GET,
  TMP_FILE_RES,
  VARS_SET,
};
