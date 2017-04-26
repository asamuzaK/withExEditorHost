EN | [JA](./README.ja.md)

# withExEditorHost

Native messaging host for Firefox, Gecko based browsers and Blink based browsers extension withExEditor.

* [WithExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome Web Store](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome Web Store")

## Supported browsers

|Browser |Windows|Linux  |Mac    |
|:-------|:-----:|:-----:|:-----:|
|Firefox |   ✓   |   ✓   |   ✓   |
|Cyberfox|   ✓ *1|       |       |
|Waterfox|   ✓ *1|       |       |
|Chrome  |   ✓   |   ✓   |   ✓   |
|Chromium|   ✓   |   ✓   |   ✓   |
|Opera   |   ✓ *2|       |   ✓ *2|
|Vivaldi |   ✓ *2|   ✓   |   ✓   |

*1: Shares host with Firefox.
*2: Shares host with Chrome.

If your browser is not listed or OS for that browser is not supported, file an [issue](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost") for adding support.
When filing an issue, if you know where to save [the application manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location "Native messaging - Mozilla | MDN") in that browser, please let me know.

## Download the host

Download a zip file or tar.gz file of the source code from [Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost"), save it in an arbitrary place after decompressing (for example, `C:\Users\XXX\withExEditorHost\`).
If you have a Github account, you can also clone and save the repository.

Note that the host runs with [Node.js](https://nodejs.org/en/ "Node.js"), so if you do not have Node.js, please install it.
withExEditorHost v2.0.0-b.x (currently pre-release) requires Node.js v7.9.0 or higher.
Required Node.js version may change.

***

## Setting up the host

Open "cmd.exe" on Windows, "terminal" on Linux / Mac, change directory to where you saved withExEditorHost and run setup script.

```
> cd path/to/withExEditorHost
> node setup.js
```

When you run the script, you will be asked which browser you want to setup the host for, so please enter the browser name from the list.

After that, you will be prompted for the following, please input as appropriate.

* Enter editor path
* Enter command line options
  * NOTE: Quote the argument if it contains spaces or backslashes.
    For example: `-a -b "C:\Program Files"`
* Put file path after command arguments?

You can leave them empty and set them later from the options page of withExEditor.

If config files are created successfully, restart the browser.

### Options

In the setup script you can specify some options.

#### --browser=*name* option

To specify the browser, please use the `--browser` option.

```
> node setup.js --browser=firefox
```

#### --editor-config=*path* option

By default, the setup script creates a "config" folder under the location of withExEditorHost.
If you want to save setting files in different location, use `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> node setup.js --config-path="C:\Users\XXX\path\to\another\location"
```

***

## Manual setup

There are sample configuration files in "_config" folder of withExEditorHost.

Create a copy of the _config folder and rename it to `config`.
Please do not edit the contents of the `_config` folder directly.
It may be overwritten when updating withExEditorHost.

The config folder can be saved in an arbitrary place, but if you saved withExEditorHost from zip or tar.gz, just put it in the same place as the _config (`C:\Users\XXX\withExEditorHost\config\`).
If you are cloning the repository, to prevent your personal configuration information from being uploaded to GitHub unintentionally, it is strongly recommended to save the folder *outside* the repository, not inside.

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

Firefox, Gecko:
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

Blink:
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/"]
}
```

On Windows, you also need to set the registry.
You can save the registry key by executing the following command with cmd.exe.
Edit `"HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost"` and `"C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json"` part.

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json" /f
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

Editor configuration files can also be switched for each Firefox profile, or each browser.
For example, use "editorconfig.json" for the Firefox default profile, and prepare another configuration file such as "editorconfig-nightly.json" for nightly's profile.
When you choose a name other than "editorconfig.json", enter the path of the editor configuration file in the Options page of withExEditor.

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
stderr output from native app withexeditorhost: SyntaxError: Unexpected token {
```

* Upgrade Node.js

```
withexeditorhost: SyntaxError: Unexpected string in JSON at ...
```

* Check "editorconfig.json".
