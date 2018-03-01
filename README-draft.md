EN | [JA](./README.ja.md)

[![Build Status](https://travis-ci.org/asamuzaK/withExEditorHost.svg?branch=master)](https://travis-ci.org/asamuzaK/withExEditorHost)
[![dependencies Status](https://david-dm.org/asamuzaK/withExEditorHost/status.svg)](https://david-dm.org/asamuzaK/withExEditorHost)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditorHost/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditorHost#info=devDependencies)

# withExEditorHost

Native messaging host for browser extension *withExEditor*.
The browser interacts with the host via messages, and the editor is executed by this host.

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome Web Store](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome Web Store")

## Supported browsers

|Browser    |Windows|Linux  |Mac    |
|:----------|:-----:|:-----:|:-----:|
|Firefox    |   ✓   |   ✓   |   ✓   |
|Cyberfox   |   ✓ *1|       |       |
|Waterfox   |   ✓ *1|       |       |
|Chrome     |   ✓   |   ✓   |   ✓   |
|Chromium   |       |   ✓   |   ✓   |
|CentBrowser|   ✓ *2|       |       |
|Kinza      |   ✓ *2|       |       |
|Opera      |   ✓ *2|       |   ✓ *2|
|Vivaldi    |   ✓ *2|   ✓   |   ✓   |

*1: Shares host with Firefox.
*2: Shares host with Chrome.

If your browser is not listed or OS for that browser is left blank, file an [issue](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost") for adding support.
When filing an issue, if you know [where to save the application manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location "Native messaging - Mozilla | MDN") in that browser, please let me know.

## Host setup

NOTE: This is an instruction for `v3.x`.

Download a zip file for your OS from [Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost"), after decompressing, save it in an arbitrary place under your home directory (for example, `C:\Users\XXX\withExEditorHost\`).

Next, open "cmd.exe" on Windows, "terminal" on Linux / Mac, change directory to where you saved withExEditorHost, execute the following command.

```
> cd path/to/withExEditorHost
> index --setup
```

Then you will be asked which browser you want to setup the host for, so please enter the browser name from the list.

After that, you will be prompted for the following, please input as appropriate.

* Enter editor path
* Enter command line options
  * NOTE: Quote the argument if it contains spaces or backslashes.
    For example: `-a -b "C:\Program Files"`
* Put file path after command arguments?
  * NOTE: When specifying the file, some editor requires to put the file path after command arguments. Enter `y` in such case.

If config files are created successfully, restart the browser.
When you start the browser, the browser and the host get connected and the editor will be ready to use.

### Options

In the setup script you can specify some options.

#### --browser=*name* option

To specify the browser, please use the `--browser` option.

```
> index --setup --browser=firefox
```

#### --config-path=*path* option

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> index --setup --config-path="C:\Users\XXX\path\to\another\location"
```

## Host setup from source code

Download a zip file or tar.gz file of the source code from [Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost"), after decompressing, save it in an arbitrary place under your home directory (for example, `C:\Users\XXX\withExEditorHost\`).
If you have a Github account, you can also clone and save the repository.

Note that the host requires [Node.js](https://nodejs.org/en/ "Node.js") v8.9.0 or higher.

Next, open "cmd.exe" on Windows, "terminal" on Linux / Mac, change directory to where you saved withExEditorHost, execute the following command.

```
> cd path/to/withExEditorHost
> npm run setup
```

Then you will be asked which browser you want to setup the host for, so please enter the browser name from the list.

After that, you will be prompted for the following, please input as appropriate.

* Enter editor path
* Enter command line options
  * NOTE: Quote the argument if it contains spaces or backslashes.
    For example: `-a -b "C:\Program Files"`
* Put file path after command arguments?
  * NOTE: When specifying the file, some editor requires to put the file path after command arguments. Enter `y` in such case.

If config files are created successfully, restart the browser.
When you start the browser, the browser and the host get connected and the editor will be ready to use.

### Options

In the setup script you can specify some options.

#### --browser=*name* option

To specify the browser, please use the `--browser` option.

```
> npm run setup -- --browser=firefox
```

#### --config-path=*path* option

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

<!--
***

## Manual setup

There are sample configuration files in "_config" folder of withExEditorHost.

Create a copy of the _config folder and rename it to `config`.
Please do not edit the contents of the `_config` folder directly.
It may be overwritten when updating withExEditorHost.

### Edit the shell script which executes the host

On Windows, open "withexeditorhost.cmd" and enter the path of the index.js file of the host.

```
@echo off
:: Fill in the path of the index.js file of the host.
node "C:\Users\XXX\withExEditorHost\index.js"
```

On Linux / Mac, open "withexeditorhost.sh" and enter the path of the index.js file of the host.

```
#!/usr/bin/env bash
# Fill in the path of the index.js file of the host.
# Replace "node" command to "nodejs" according to your environment.
node /path/to/withexeditorhost/index.js
```

### Edit the application manifest

Open "withexeditorhost.json" and enter the path of the shell script in the `path` field in it.
Note that on Windows, it is necessary to escape backslashes, which is a directory delimiter, by adding an extra backslash.

Gecko:
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\path\\to\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

Blink:
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\path\\to\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/"]
}
```

On Windows, you also need to set the registry.
You can save the registry key by executing the following command with cmd.exe.
Edit `"HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost"` and `"C:\Users\XXX\path\to\withExEditorHosts\config\withexeditorhost.json"` part.

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\path\to\withExEditorHosts\config\withexeditorhost.json" /f
```

On Linux and Mac, you need to save "withexeditorhost.json" in the specified location.
The following is an example for Firefox. For other browsers, refer to the official documents etc.

Linux:
```
~/.mozilla/native-messaging-hosts/withexeditorhost.json
```

Mac:
```
~/Library/Application Support/Mozilla/NativeMessagingHosts/withexeditorhost.json
```

### Edit the editor configuration

Open "editorconfig.json" and fill in the information of the editor.

```
{
  "editorPath": "C:\\Program Files\\Path\\To\\Your\\Editor.exe",
  "cmdArgs": ["-a", "-b", "--c=d\\e"],
  "fileAfterCmdArgs": false
}
```

* *editorPath* - The path of the editor to use. Backslashes must be escaped.
* *cmdArgs* - Command line options. Enter each argument in array, separated by comma. Backslashes must be escaped.
* *fileAfterCmdArgs* - Boolean (`true` / `false`). When specifying the file, some editor requires to put the file path after command arguments. Set `true` in such case.

After the above work, restart the browser.

***

## Troubleshooting

If something goes wrong, check the browser console (Ctrl + Shift + J in Firefox).

```
Error: Attempt to postMessage on disconnected port
```

* Windows: Is the registry saved correctly?
* Linux / Mac: Is "withexeditorhost.json" saved in the right location?
* When you start the browser, is a Node.js process executed too?
  * If not, make sure that Node.js's installation directory is listed in the $PATH environment variable.
    Or change the shell script from "node" command to full path of Node.js.
    ```
    /path/to/node.js /path/to/withexeditorhost/index.js
    ```
  * Also, make sure the execute bit is set on "withexeditorhost.sh" (Linux / Mac).

```
withexeditorhost: SyntaxError: Unexpected token {
```

* Upgrade Node.js

```
withexeditorhost: SyntaxError: Unexpected string in JSON at ...
```

* Check "editorconfig.json".
-->
