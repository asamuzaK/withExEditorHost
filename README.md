EN | [JA](./README.ja.md)

[![Build Status](https://travis-ci.com/asamuzaK/withExEditorHost.svg?branch=master)](https://travis-ci.com/asamuzaK/withExEditorHost)
[![dependencies Status](https://david-dm.org/asamuzaK/withExEditorHost/status.svg)](https://david-dm.org/asamuzaK/withExEditorHost)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditorHost/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditorHost?type=dev)
[![GitHub release](https://img.shields.io/github/release/asamuzaK/withExEditorHost.svg)](https://github.com/asamuzaK/withExEditorHost/releases)

# withExEditorHost

Native messaging host for browser extension *withExEditor*.
The browser interacts with the host via messages, and the editor is executed by this host.

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome Web Store](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome Web Store")

## Supported browsers

|Browser         |Windows|Linux  |Mac    |
|:---------------|:-----:|:-----:|:-----:|
|Firefox         |   ✓   |   ✓   |   ✓   |
|Waterfox Current|   ✓   |   ✓   |   ✓   |
|Chrome          |   ✓   |   ✓   |   ✓   |
|Chrome Canary   |   ✓ *2|       |   ✓   |
|Chrome Beta     |   ✓ *2|   ✓   |       |
|Chromium        |       |   ✓   |   ✓   |
|Brave           |   ✓ *2|   ✓   |   ✓   |
|CentBrowser     |   ✓ *2|       |       |
|Edge            |   ✓ *2|       |   ✓   |
|Kinza           |   ✓ *2|       |       |
|Opera           |   ✓ *2|       |   ✓ *2|
|Vivaldi         |   ✓ *2|   ✓   |   ✓   |

*1: Shares host with Firefox.
*2: Shares host with Chrome.

If your browser is not listed or OS for that browser is left blank, file an [issue](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost") for adding support.
When filing an issue, if you know [where to save the application manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location "Native messaging - Mozilla | MDN") in that browser, please let me know.

## Host setup

NOTE: If you already have Node.js installed, it is recommended to get the host from npm.
Refer to [Host setup from npm](#host-setup-from-npm) below.

When setting up the host, disable withExEditor installed in the browser.

Download a zip file for your OS from [Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost"), after decompressing, save it in an arbitrary place under your home directory (for example, `C:\Users\XXX\withExEditorHost\`).

Next, open "cmd.exe" on Windows, "terminal" on Linux / Mac, change directory to where you saved withExEditorHost, execute the following command.

```
> cd path/to/withExEditorHost
> index setup
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

### Options

In the setup script you can specify some options.

#### -b --browser

To specify the browser, please use `-b` or `--browser` option.

```
> index setup --browser=firefox
```

#### -c --config-path

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> index setup --config-path="C:\Users\XXX\path\to\another\location"
```

#### Other options

See help for other options.

```
> index setup --help
```

### Upgrade

Before upgrading a host, disable withExEditor installed in your browser.
To upgrade, just overwrite binary files, that's all.
There is no need to run the setup script again after the upgrade.
Enable withExEditor after the upgrade.

### Automated installation

#### Linux

Executing the following script (requires [cURL](https://curl.haxx.se/), [7-Zip](https://www.7-zip.org/), and [jq](https://stedolan.github.io/jq/)) will download and install the latest host version:

```
#!/usr/bin/env bash

# Install the host for withExEditor that allows editing text in the browser using an editor like Vim
# After executing this script, reload the browser plugin

# See https://github.com/asamuzaK/withExEditorHost/releases for supported operating systems
os="linux-x86_64"

# Possible values: firefox, waterfoxcurrent, chrome, chromebeta, chromium, brave, vivaldi
browser="firefox"

# Allowed tags: "latest" and "next" (pre-release)
versionTag="latest"
# The host's version number
version=$(curl --silent https://registry.npmjs.org/withexeditorhost | jq --raw-output ".\"dist-tags\".\"${versionTag}\"")

withExEditorHostRemoteFile="https://github.com/asamuzaK/withExEditorHost/releases/download/v${version}/${os}.zip"
withExEditorHostLocalZipFile="/tmp/withExEditorHost.zip"
withExEditorHostDir="${HOME}/.local/bin/withExEditorHost"

echo "Downloading withExEditorHost ${version} for ${browser}"

# Create the dir for the host's index file, download the archive and unzip it
mkdir --parents "${withExEditorHostDir}"
# If the URL returns 404, make cURL fail. This prevents 7z from unzipping an HTML error page
curl --fail -L -o "${withExEditorHostLocalZipFile}" "${withExEditorHostRemoteFile}"\
&& 7z x "${withExEditorHostLocalZipFile}" -o"${withExEditorHostDir}"

indexFile="${withExEditorHostDir}/index"
hostScript="${HOME}/.config/withexeditorhost/config/${browser}/withexeditorhost.sh"

# The browser plugin will use this shell script to call the host's index file
printf "#! /usr/bin/env bash\n%s\n" "${indexFile}" > "${hostScript}"

chmod +x "${indexFile}" "${hostScript}"
```

***

## Host setup from npm

NOTE: [Node.js](https://nodejs.org/en/ "Node.js") v10.x.x or higher is required.

When setting up the host, disable withExEditor installed in the browser.

Get host from [withexeditorhost - npm](https://www.npmjs.com/package/withexeditorhost) and install globally, move to installed path (for example, `C:\Users\XXX\AppData\Roaming\npm\node_modules\withexeditorhost`).
You can get the global installation path of npm with `npm root -g`.
```
> npm i -g withexeditorhost
> cd path/to/npm/node_modules/withexeditorhost
```

Run the setup command.

NOTE: The setup command is `node index setup`, NOT `npm run setup`.

```
> node index setup
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

### Options

In the setup script you can specify some options.

#### -b --browser

To specify the browser, please use `-b` or `--browser` option.

```
> node index setup --browser=firefox
```

#### -c --config-path

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `-c` or `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> node index setup --config-path="C:\Users\XXX\path\to\another\location"
```

#### Other options

For other options, see help

```
> node index setup --help
```

### Upgrade

Before upgrading the host, disable withExEditor installed in the browser.
Run update command.

```
> npm up -g
```

There is no need to run the setup script again after the upgrade.
Enable withExEditor after the upgrade.

***

## Host setup from source code

NOTE: [Node.js](https://nodejs.org/en/ "Node.js") v10.x.x or higher is required.

When setting up the host, disable withExEditor installed in the browser.

Download a zip file or tar.gz file of the source code from [Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost"), after decompressing, save it in an arbitrary place under your home directory (for example, `C:\Users\XXX\withExEditorHost\`).

Next, open "cmd.exe" on Windows, "terminal" on Linux / Mac, change directory to where you saved withExEditorHost, execute the following command.

NOTE: The setup command is `npm run setup`.

```
> cd path/to/withExEditorHost
> npm run setup
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

### Options

In the setup script you can specify some options.

#### -b --browser

To specify the browser, please use `-b` or `--browser` option.

```
> npm run setup -- --browser=firefox
```

#### -c --config-path

By default, configuration files are saved under user's home directory.
* Windows: `C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Mac: `~/Library/Application Support/withexeditorhost/config/`
* Linux: `~/.config/withexeditorhost/config/`

If you want to save configuration files in different location, use `-c` or `--config-path` option.
Quote path if it contains spaces or backslashes.

```
> npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

#### Other options

For other options, see help

```
> node index setup --help
```
