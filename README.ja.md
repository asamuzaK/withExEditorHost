[EN](./README.md) | JA

[![Build Status](https://travis-ci.org/asamuzaK/withExEditorHost.svg?branch=master)](https://travis-ci.org/asamuzaK/withExEditorHost)
[![dependencies Status](https://david-dm.org/asamuzaK/withExEditorHost/status.svg)](https://david-dm.org/asamuzaK/withExEditorHost)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditorHost/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditorHost#info=devDependencies)

# withExEditorHost

ブラウザ拡張機能*withExEditor*用のネイティブメッセージングホスト。
ブラウザはメッセージを介してホストと対話し、エディタはこのホストによって実行されます。

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome ウェブストア](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome ウェブストア")

## ブラウザサポート状況

|ブラウザ     |Windows|Linux  |Mac    |
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

*1: Firefoxとホストを共有。
*2: Chromeとホストを共有。

ブラウザが一覧にない場合やOSがサポート対象になっていない場合は、サポート要望の[イシュー](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost")を登録してください。
イシューを登録する際、そのブラウザでは[アプリケーションマニフェストをどこに保存すべきか](https://developer.mozilla.org/ja/Add-ons/WebExtensions/Native_messaging#App_manifest_%E3%81%AE%E5%A0%B4%E6%89%80 "Native messaging - Mozilla | MDN")もしご存知でしたら、お知らせください。

## ホストのセットアップ

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")から、お使いのOS用のzipファイルをダウンロードして展開した上で、自分のホームディレクトリ内の任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。

続いて、Windowsでは「cmd.exe」、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostの保存先に移動したうえで、下記コマンドを実行してホストの設定を行います。

```
> cd path/to/withExEditorHost
> index --setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザ名を入力してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`
* 一時ファイルをコマンドラインオプションの後に置くか
  * いくつかのエディタでは、ファイルを指定する場合はコマンドの最後に置くように求めているものがあります。そのような場合に「y」を入力してください。

設定ファイルが正常に作成されたら、ブラウザを再起動してください。
ブラウザを起動するとブラウザとホストが接続されて、エディタが使用できる状態になります。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### --browserオプション

ブラウザをあらかじめ指定する場合には、`--browser`オプションで指定してください。

```
> index --setup --browser=firefox
```

#### --config-pathオプション

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```
> index --setup --config-path="C:\Users\XXX\path\to\another\location"
```

***

## ソースコードからのホストのセットアップ

ソースコードからのホストの実行には[Node.js](https://nodejs.org/ja/ "Node.js") v8.9.0以上が必要です。

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")からソースコードのzipファイルかtar.gzファイルをダウンロードして、展開した上で、自分のホームディレクトリ内の任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。
Githubのアカウントがある場合は、レポジトリをクローンして保存してもOKです。

続いて、Windowsでは「cmd.exe」、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostの保存先に移動したうえで、下記コマンドを実行してホストの設定を行います。

```
> cd path/to/withExEditorHost
> npm run setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザ名を入力してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`
* 一時ファイルをコマンドラインオプションの後に置くか
  * いくつかのエディタでは、ファイルを指定する場合はコマンドの最後に置くように求めているものがあります。そのような場合に「y」を入力してください。

設定ファイルが正常に作成されたら、ブラウザを再起動してください。
ブラウザを起動するとブラウザとホストが接続されて、エディタが使用できる状態になります。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### --browserオプション

ブラウザをあらかじめ指定する場合には、`--browser`オプションで指定してください。

```
> npm run setup -- --browser=firefox
```

#### --config-pathオプション

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```
> npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

<!--
***

## 手動設定

withExEditorHostの"_config"というフォルダの中に必要な設定ファイルのサンプルがあります。

_configフォルダのコピーを作成して`config`にリネームしてください。
なお、_configフォルダの中身は直接編集しないようにしてください。
withExEditorHostをアップデートしたときに上書きされてしまう可能性があります。

### ホストを起動するシェルスクリプトの編集

Windowsの場合は"withexeditorhost.cmd"を開いて、ホストのindex.jsファイルのパスを記入します。

```
@echo off
:: Fill in the path of the index.js file of the host.
node "C:\Users\XXX\withExEditorHost\index.js"
```

Linux / Macの場合は"withexeditorhost.sh"を開いて、ホストのindex.jsファイルのパスを記入します。

```
#!/usr/bin/env bash
# Fill in the path of the index.js file of the host.
# Replace "node" command to "nodejs" according to your environment.
node /path/to/withexeditorhost/index.js
```

### アプリケーションマニフェストの編集

"withexeditorhost.json"を開いて、その中の`path`フィールドにシェルスクリプトのパスを記入します。
Windowsの場合は、ディレクトリの区切りであるバックスラッシュ文字にはさらにバックスラッシュを加えてエスケープさせる必要があることに注意してください。

Gecko：
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\path\\to\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

Blink：
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\path\\to\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/"]
}
```

Windowsではレジストリも設定する必要があります。
cmd.exeで次のコマンドを実行するとレジストリキーを保存することができます。
`"HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost"`と`"C:\Users\XXX\path\to\withExEditorHosts\config\withexeditorhost.json"`の部分は、適宜書き換えてください。

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\path\to\withExEditorHosts\config\withexeditorhost.json" /f
```

LinuxとMacでは、"withexeditorhost.json"を指定の場所に保存する必要があります。
以下は、Firefoxでの例です。ほかのブラウザについては公式のドキュメントなどを参照してください。

Linux:
```
~/.mozilla/native-messaging-hosts/withexeditorhost.json
```

Mac:
```
~/Library/Application Support/Mozilla/NativeMessagingHosts/withexeditorhost.json
```

### エディタ設定ファイルの編集

"editorconfig.json"を開いて、使用するエディタの情報を記入します。

```
{
  "editorPath": "C:\\Program Files\\Path\\To\\Your\\Editor.exe",
  "cmdArgs": ["-a", "-b", "--c=d\\e"],
  "fileAfterCmdArgs": false
}
```

* *editorPath* - 使用するエディタのパス。バックスラッシュ文字はエスケープさせる必要があります。
* *cmdArgs"* - コマンドラインオプション。[]括弧の中にカンマ区切りで各引数を記入してください。バックスラッシュ文字はエスケープさせる必要があります。
* *fileAfterCmdArgs* - 真偽値（`true` / `false`）。いくつかのエディタでは、ファイルを指定する場合はコマンドの最後に置くように求めているものがあります。そのような場合に有効化してください。

以上の作業を終えたら、ブラウザを再起動してください。

***

## トラブルシューティング

何か問題が起きたら、ブラウザコンソールをチェックしてみてください（Firefoxの場合、Ctrl + Shift + J）。

```
Error: Attempt to postMessage on disconnected port
```

* Windows: レジストリは正しく保存されていますか？
* Linux / Mac: "withexeditorhost.json"の保存先は間違っていませんか？
* ブラウザを起動したとき、Node.jsのプロセスも立ち上がっていますか？
  * もしNode.jsが立ち上がっていないならば、Node.jsの$PATH環境変数が設定されているかどうか確認してみてください。
    あるいは、シェルスクリプトで、nodeコマンドではなくNode.jsのパスに変更してみてください。
    ```
    /path/to/node.js /path/to/withexeditorhost/index.js
    ```
  * また、"withexeditorhost.sh"に実行ビットが付与されていることも確認してください（Linux / Mac）。

```
withexeditorhost: SyntaxError: Unexpected token {
```

* Node.jsをアップグレードしてください。

```
withexeditorhost: SyntaxError: Unexpected string in JSON at ...
```

* "editorconfig.json"を確認してください。
-->
