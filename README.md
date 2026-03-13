EN | [JA](./README.ja.md)

[![build](https://github.com/asamuzaK/withExEditorHost/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3Abuild)
[![CodeQL](https://github.com/asamuzaK/withExEditorHost/workflows/CodeQL/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3ACodeQL)
[![npm](https://img.shields.io/npm/v/withexeditorhost)](https://www.npmjs.com/package/withexeditorhost)
[![release](https://img.shields.io/github/v/release/asamuzaK/withExEditorHost)](https://github.com/asamuzaK/withExEditorHost/releases)

# withExEditorHost

Native messaging host for the *withExEditor* browser extension.
The browser interacts with the host via messages, and the editor is executed by this host.

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Supported browsers

|Browser         |Windows|Linux  |Mac    |
|:---------------|:-----:|:-----:|:-----:|
|Firefox         |   ✓   |   ✓   |   ✓   |
|Waterfox Current|   ✓   |   ✓   |   ✓   |
|LibreWolf       |   ✓ *1|   ✓   |       |

*1: Shares host with Firefox.

If your browser is not listed or OS for that browser is left blank, file an [issue](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost") for adding support.
When filing an issue, if you know [where to save the application manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location "Native messaging - Mozilla | MDN") in that browser, please let me know.

## Installation and Setup

**Note:** [Node.js](https://nodejs.org/en/ "Node.js") is required.

When setting up the host, disable the withExEditor extension installed in the browser.

Install withExEditorHost globally, then move to the installed path.

```console
npm i -g withexeditorhost
cd path/to/npm/node_modules/withexeditorhost
```

**Note:** To find the installation path, run `npm root -g`. Ref: [npm-root](https://docs.npmjs.com/cli/commands/npm-root)

Run the setup command `npm run setup`.

```console
npm run setup
```

During the setup process, you will be prompted to provide the following information.
Please enter the appropriate values:

* **Enter editor path:** Provide the full path to your preferred text editor.  
* **Enter command line options:** Specify any command-line arguments your editor requires.  
  * *Note:* Enclose the argument in quotes if it contains spaces or backslashes. (Example: `-a -b "C:\\Program Files"`)  
  * *Note:* You can use the `${file}` placeholder in the arguments to represent the temporary file. (Example: `-a ${file} \-b`)

**Note:** If you have enabled Mandatory Access Control (e.g., AppArmor) for your web browser, ensure that its profile allows the execution of the withexeditorhost.sh script.

If config files are created successfully, enable withExEditor again.
The browser and the host get connected and the editor will be ready to use.

### Options

You can specify several options when running the setup script:

#### -b --browser

Use this option to specify the target browser for the installation.

```console
npm run setup -- --browser=firefox
```

#### -c --config-path

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save the configuration files in a different location, use this option.
Enclose the path in quotes if it contains spaces or backslashes.

```console
npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

#### Other options

For other options, see help

```console
npm run setup -- --help
```

## Upgrading

1. **Disable** the withExEditor extension installed in your browser.
2. Run the update command:
   ```console
   npm i -g withexeditorhost@latest
   ```
3. **Re-enable** the withExEditor extension.
   There is no need to run the setup script again.

***
