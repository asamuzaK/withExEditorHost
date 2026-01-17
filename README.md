EN | [JA](./README.ja.md)

[![build](https://github.com/asamuzaK/withExEditorHost/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3Abuild)
[![CodeQL](https://github.com/asamuzaK/withExEditorHost/workflows/CodeQL/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3ACodeQL)
[![npm](https://img.shields.io/npm/v/withexeditorhost)](https://www.npmjs.com/package/withexeditorhost)
[![release](https://img.shields.io/github/v/release/asamuzaK/withExEditorHost)](https://github.com/asamuzaK/withExEditorHost/releases)

# withExEditorHost

Native messaging host for browser extension *withExEditor*.
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

## Host setup from npm

NOTE: [Node.js](https://nodejs.org/en/ "Node.js") is required. Use maintenance LTS or higher.

When setting up the host, disable withExEditor installed in the browser.

Get host from [withexeditorhost - npm](https://www.npmjs.com/package/withexeditorhost) and install globally, move to installed path.

NOTE: The installation path on Windows is basically `C:\Users\XXX\AppData\Roaming\npm\node_modules\withexeditorhost`, and on macOS and Linux it should be `/usr/local/lib/node_modules/withexeditorhost`.
If you can't find it, you can get the global installation path for npm with `npm root -g`.
Ref: [Where does npm install the packages?](https://nodejs.dev/learn/where-does-npm-install-the-packages)

```console
npm i -g withexeditorhost
cd path/to/npm/node_modules/withexeditorhost
```

Run the setup command `npm run setup`.

```console
npm run setup
```

Then you will be asked which browser you want to setup the host for, so please select from the browsers listed.

After that, you will be prompted for the following, please input as appropriate.

* Enter editor path
* Enter command line options
  * NOTE: Quote the argument if it contains spaces or backslashes.
    For example: `-a -b "C:\Program Files"`
  * NOTE: You can use the temporary file placeholder `${file}` in the arguments.
    For example: `-a ${file} -b`

If config files are created successfully, enable withExEditor again.
The browser and the host get connected and the editor will be ready to use.

NOTE: If you have enabled Mandatory Access Control (for example, AppArmor) for your web-browser, ensure the profile allows the `withexeditorhost.sh` script to be executed.

### Options

In the setup script you can specify some options.

#### -b --browser

To specify the browser, please use `-b` or `--browser` option.

```console
npm run setup -- --browser=firefox
```

#### -c --config-path

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `-c` or `--config-path` option.
Quote path if it contains spaces or backslashes.

```console
npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

#### Other options

For other options, see help

```console
npm run setup -- --help
```

### Upgrade

Before upgrading the host, disable withExEditor installed in the browser.
Run install command.

```console
npm i -g withexeditorhost
```

There is no need to run the setup script again after the upgrade.
Enable withExEditor after the upgrade.

***
