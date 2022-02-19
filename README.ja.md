[EN](./README.md) | JA

[![build](https://github.com/asamuzaK/withExEditorHost/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3Abuild)
[![CodeQL](https://github.com/asamuzaK/withExEditorHost/workflows/CodeQL/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3ACodeQL)
<!--
[![dependencies Status](https://david-dm.org/asamuzaK/withExEditorHost/status.svg)](https://david-dm.org/asamuzaK/withExEditorHost)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditorHost/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditorHost?type=dev)
-->
[![npm version](https://badge.fury.io/js/withexeditorhost.svg)](https://badge.fury.io/js/withexeditorhost)
[![GitHub release](https://img.shields.io/github/release/asamuzaK/withExEditorHost.svg)](https://github.com/asamuzaK/withExEditorHost/releases)

# withExEditorHost

ブラウザ拡張機能*withExEditor*用のネイティブメッセージングホスト。
ブラウザはメッセージを介してホストと対話し、エディタはこのホストによって実行されます。

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome ウェブストア](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome ウェブストア")

## ブラウザサポート状況

|Browser         |Windows|Linux  |Mac    |
|:---------------|:-----:|:-----:|:-----:|
|Firefox         |   ✓   |   ✓   |   ✓   |
|Waterfox Current|   ✓   |   ✓   |   ✓   |
|LibreWolf       |   ✓ *1|   ✓   |       |
|Chrome          |   ✓   |   ✓   |   ✓   |
|Chrome Canary   |   ✓ *2|       |   ✓   |
|Chrome Beta     |   ✓ *2|   ✓   |   ✓   |
|Chromium        |       |   ✓   |   ✓   |
|Brave           |   ✓ *2|   ✓   |   ✓   |
|CentBrowser     |   ✓ *2|       |       |
|Edge            |   ✓   |       |   ✓   |
|Opera           |   ✓ *2|       |   ✓ *2|
|Vivaldi         |   ✓ *2|   ✓   |   ✓   |

*1: Firefoxとホストを共有。
*2: Chromeとホストを共有。

ブラウザが一覧にない場合やOSがサポート対象になっていない場合は、サポート要望の[イシュー](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost")を登録してください。
イシューを登録する際、そのブラウザでは[アプリケーションマニフェストをどこに保存すべきか](https://developer.mozilla.org/ja/Add-ons/WebExtensions/Native_messaging#App_manifest_%E3%81%AE%E5%A0%B4%E6%89%80 "Native messaging - Mozilla | MDN")もしご存知でしたら、お知らせください。

## ホストのセットアップ

備考：Node.jsがインストール済みの場合は、npmからホストを入手することをお勧めします。
また、32bitのWindowsや32bitのLinuxをご利用の場合は、Node.jsをインストールした上で、npmからホストを入手してください。
下記、[npm からのホストのセットアップ](#npm-からのホストのセットアップ)を参照してください。

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")から、お使いのOS用のzipファイル（Linux / Macではtar.gzファイル）をダウンロードして展開した上で、自分のホームディレクトリ内の任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。

続いて、Windowsでは「cmd.exe」、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostの保存先に移動したうえで、下記コマンドを実行してホストの設定を行います。

```
> cd path/to/withExEditorHost
> index setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザから選択してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`
  * 引数に一時ファイルのプレイスホルダー`${file}`を使用することができます。
    例：`-a ${file} -b`

設定ファイルが正常に作成されたら、withExEditorを再び有効化してください。
ブラウザとホストが接続されて、エディタが使用できる状態になります。

備考：ブラウザで強制アクセス制御（AppArmorなど）を有効にしている場合は、プロファイルで`withexeditorhost.sh`の実行が許可されていることを確認してください。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### -b --browser

ブラウザをあらかじめ指定する場合には、`-b`または`--browser`オプションで指定してください。

```
> index setup --browser=firefox
```

#### -c --config-path

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`-c`または`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```
> index setup --config-path="C:\Users\XXX\path\to\another\location"
```

#### その他

その他のオプションについては、ヘルプで確認してください

```
> index setup --help
```

### アップグレード

ホストをアップグレードする前に、ブラウザにインストールされているwithExEditorを無効にしてください。
アップグレードは、単にバイナリファイルを上書きするだけです。
アップグレード後にセットアップスクリプトを再度実行する必要はありません。
アップグレード後にはwithExEditorを有効化してください。

### 自動インストール

#### Linux

以下のスクリプトを実行すると、最新のホストをダウンロードした上でインストールします。
（[cURL](https://curl.haxx.se/)、[jq](https://stedolan.github.io/jq/)が必要です)

```
#!/usr/bin/env bash

function main {
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

  withExEditorHostRemoteFile="https://github.com/asamuzaK/withExEditorHost/releases/download/v${version}/${os}.tar.gz"
  withExEditorHostLocalArchive="/tmp/withExEditorHost.tar.gz"
  withExEditorHostDir="${HOME}/.local/bin/withExEditorHost"

  echo "Downloading withExEditorHost ${version} for ${browser}"

  # Create the dir for the host's index file, download the archive and extract it
  mkdir --parents "${withExEditorHostDir}"
  # If the URL returns 404, make cURL fail. This prevents the archive extractor from trying to extract an HTML error page
  if curl --fail -L -o "${withExEditorHostLocalArchive}" "${withExEditorHostRemoteFile}"\
  && extractTarGz "${withExEditorHostLocalArchive}" "${withExEditorHostDir}"; then

    indexFile="${withExEditorHostDir}/index"
    hostScript="${HOME}/.config/withexeditorhost/config/${browser}/withexeditorhost.sh"

    # The browser plugin will use this shell script to call the host's index file
    printf "#!/usr/bin/env bash\n%s\n" "${indexFile}" > "${hostScript}"

    chmod +x "${indexFile}" "${hostScript}"
  fi
}

# Extracts the files of a tar.gz archive (first parameter) to a destination directory (second parameter).
# Uses either bsdtar (from libarchive) or 7z.
function extractTarGz {

  if hash bsdtar 2>/dev/null; then
    echo "Extracting with bsdtar to $2"
    bsdtar -xf "$1" --directory "$2"

  elif hash 7z 2>/dev/null; then
    echo "Extracting with 7z to $2"
    7z x "$1" -o"$2"

  else
    echo "No program found to extract a tar.gz archive. Please install bsdtar or 7z."
  fi
}
main

```

***

## npm からのホストのセットアップ

備考：[Node.js](https://nodejs.org/ja/ "Node.js")が必要です。メンテナンスLTSかそれ以上のバージョンを使用してください。

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

ホストは[withexeditorhost - npm](https://www.npmjs.com/package/withexeditorhost)から入手できます。
ホストをグローバルにインストールした後に、インストール先に移動してください（例：`C:\Users\XXX\AppData\Roaming\npm\node_modules\withexeditorhost`）。
なお、npmのグローバルインストールパスは`npm root -g`で取得できます。

```
> npm i -g withexeditorhost
> cd path/to/npm/node_modules/withexeditorhost
```

ホストを設定するためのコマンド`npm run setup`を実行します。

```
> npm run setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザから選択してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`
  * 引数に一時ファイルのプレイスホルダー`${file}`を使用することができます。
    例：`-a ${file} -b`

設定ファイルが正常に作成されたら、withExEditorを再び有効化してください。
ブラウザとホストが接続されて、エディタが使用できる状態になります。

備考：ブラウザで強制アクセス制御（AppArmorなど）を有効にしている場合は、プロファイルで`withexeditorhost.sh`の実行が許可されていることを確認してください。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### -b --browser

ブラウザをあらかじめ指定する場合には、`-b`または`--browser`オプションで指定してください。

```
> npm run setup -- --browser=firefox
```

#### -c --config-path

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`-c`または`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```
> npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

#### その他

その他のオプションについては、ヘルプで確認してください

```
> npm run setup -- --help
```

### アップグレード

ホストをアップグレードする前に、ブラウザにインストールされているwithExEditorを無効にしてください。
下記コマンドを実行します。

```
> npm i -g withexeditorhost
```

アップグレード後にセットアップスクリプトを再度実行する必要はありません。
アップグレード後にはwithExEditorを有効化してください。

***
