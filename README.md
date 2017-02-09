EN | [JA](./README.ja.md)

# withExEditorHost
Native messaging host for Firefox add-on [withExEditor] (https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Download the host

Download a zip file or tar.gz file of the source code from [Releases] (https://github.com/asamuzaK/withExEditorHost/releases), save it in an arbitrary place after decompressing (for example, `C:\Users\XXX\withExEditorHost\`).
If you have a Github account, you can also clone and save the repository.

Note that the host runs with [Node.js] (https://nodejs.org/en/), so if you do not have Node.js, please install it.

## Setting up the host

There are sample configuration files in "_config" folder of withExEditorHost.

Create a copy of the _config folder and rename it to `config`.
Please do not edit the contents of the `_config` folder directly.
It may be overwritten when updating withExEditorHost.

The config folder can be saved in an arbitrary place, but if you saved withExEditorHost from zip or tar.gz, just put it in the same place as the _config.
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
node /path/to/withexeditorhost/index.js
```

### Edit the application manifest

Open "withexeditorhost.json" and enter the path of the shell script in the `path` field in it.
Note that on Windows, it is necessary to escape backslashes, which is a directory delimiter, by adding an extra backslash.

Leave other fields as is.

```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

On Windows, you also need to set the registry.
You can save the registry key by executing the following command with cmd.exe.
Edit the `"C:\Users\XXX\withExEditorHosts\withexeditorhost.json"` part.

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json" /f
```

On Linux and Mac, you need to save the application manifest in the specified location.
For details, please refer to [App manifest location] (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location).

### Edit the editor configuration

Open "editorconfig.json" and fill in the information of the editor.

```
{
  "editorPath": "C:\\Program Files\\Path\\To\\Your\\Editor.exe",
  "cmdArgs": [],
  "fileAfterCmdArgs": false
}
```

* *editorPath* - The path of the editor to use. On Windows, backslashes must be escaped.
* *cmdArgs* - Command line options. Enter each argument in array, separated by comma. For example, `"cmdArgs": ["-a", "-b", "-c"]`
* *fileAfterCmdArgs* - Boolean (`true` / `false`). When specifying the file, some editor requires to put the file path after command arguments. Set `true` in such case.

***

After the above work, restart Firefox.

If you saved the config folder outside the host, you need to enter the path of "editorconfig.json" in the options page of withExEditor.
