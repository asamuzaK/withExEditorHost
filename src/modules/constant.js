/**
 * constant.js
 */
"use strict";
{
  /* shared constants */
  const CONTENT_GET = "getContent";
  const CONTEXT_MENU = "contextMenu";
  const CONTEXT_MODE = "contextMode";
  const EDITOR_CONFIG = "editorConfigPath";
  const EDITOR_CONFIG_GET = "getEditorConfig";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_LABEL = "editorLabel";
  const FILE_EXT = "fileExt";
  const IS_ENABLED = "isEnabled";
  const KEY_ACCESS = "accessKey";
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const LABEL = "withExEditor";
  const LABEL_HOST = "withexeditorhost";
  const LOCAL_FILE_VIEW = "viewLocalFile";
  const MASK_BIT = 0o111;
  const MODE_EDIT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NODE_COMMENT = 8;
  const NODE_ELEMENT = 1;
  const NODE_TEXT = 3;
  const NS_URI = "nsURI";
  const ONLY_EDITABLE = "enableOnlyEditable";
  const OPEN_OPTIONS = "openOptions";
  const PERM_FILE = 0o666;
  const PERM_DIR = 0o777;
  const PORT_FILE_DATA = "portFileData";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";
  const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_GET = "getTmpFile";

  module.exports = {
    CONTENT_GET, CONTEXT_MENU, CONTEXT_MODE, EDITOR_CONFIG, EDITOR_CONFIG_GET,
    EDITOR_CONFIG_RES, EDITOR_LABEL, FILE_EXT, IS_ENABLED, KEY_ACCESS,
    KEY_EDITOR, KEY_OPTIONS, LABEL, LABEL_HOST, LOCAL_FILE_VIEW, MASK_BIT,
    MODE_EDIT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG, NODE_COMMENT,
    NODE_ELEMENT, NODE_TEXT, NS_URI, ONLY_EDITABLE, OPEN_OPTIONS, PERM_FILE,
    PERM_DIR, PORT_FILE_DATA, SET_VARS, SYNC_TEXT, TMP_FILES, TMP_FILES_PB,
    TMP_FILES_PB_REMOVE, TMP_FILE_CREATE, TMP_FILE_GET,
  };
}
