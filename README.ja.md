[EN](./README.md) | JA

# withExEditorHost

FirefoxやGeckoベースのブラウザ、Blinkベースのブラウザ用の拡張機能withExEditorのネイティブメッセージングホスト

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome ウェブストア](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome ウェブストア")

## ホストのダウンロード

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")からソースコードのzipファイルかtar.gzファイルをダウンロードして、展開した上で任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。
Githubのアカウントがある場合は、レポジトリをクローンして保存してもOKです。

なお、ホストは[Node.js](https://nodejs.org/ja/ "Node.js")で実行しますので、Node.jsが入っていない場合はインストールしてください。
また、ホストはNode.jsのバージョンに依存することにも注意してください。
* withExEditorHost v2.xは、Node.js v7.9.0以上（現時点）を必要とします。
* withExEditorHost v1.x（Firefoxのみサポート）では、Node.js v6.9.5以上を必要とします。

***

## ホストの設定

Windowsでは"cmd.exe"、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostを保存したディレクトリに移動してセットアップスクリプトを実行します。

```
> cd path/to/withExEditorHost
> node setup.js
```

スクリプトを実行すると、どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザ名を入力してください。
注：ブラウザがリストにない場合は、ブラウザのサポートを要望する[イシュー](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost")を登録してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。
その場では何も入力せず、後でwithExEditorのオプションページから設定することもできます。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`
* 一時ファイルをコマンドラインオプションの後に置くか

設定ファイルが正常に作成されたら、ブラウザを再起動してください。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### --browserオプション

ブラウザをあらかじめ指定する場合には、`--browser`オプションで指定してください。

```
> node setup.js --browser=firefox
```

#### --config-pathオプション

セットアップスクリプトは、デフォルトでwithExEditorHostの保存先の直下に"config"フォルダを作成し各設定ファイルを保持します。
設定ファイルの保存先を変更したい場合は、`--config-path`オプションで指定してください。

```
> node setup.js --config-path="C:\Users\XXX\path\to\another\location"
```

***

## 手動設定

withExEditorHostの"_config"というフォルダの中に必要な設定ファイルのサンプルがあります。

_configフォルダのコピーを作成して`config`にリネームしてください。
なお、_configフォルダの中身は直接編集しないようにしてください。
withExEditorHostをアップデートしたときに上書きされてしまう可能性があります。

configフォルダは任意の場所に保存できますが、zipやtar.gzから展開して保存した場合は、そのまま_configフォルダと同じ場所（`C:\Users\XXX\withExEditorHost\config\`）に置けばOKです。
一方、レポジトリをクローンしている場合は、あなたの個人的な設定情報が意図せずGitHubにアップロードされるようなことを防ぐためにも、レポジトリの中ではなく*外*にフォルダを保存することを強くおすすめします。

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

Firefox、Gecko：
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

Blink：
```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://koghhpkkcndhhclklnnnhcpkkplfkgoi/"]
}
```

Windowsではレジストリも設定する必要があります。
cmd.exeで次のコマンドを実行するとレジストリキーを保存することができます。
`"HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost"`と`"C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json"`の部分は、適宜書き換えてください。

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json" /f
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

エディタ設定ファイルは、Firefoxのプロファイル毎やブラウザ毎に切り替えることもできます。
例えば、Firefoxの場合、defaultのプロファイルでは"editorconfig.json"を使い、nightlyのプロファイルでは"editorconfig-nightly.json"といった別名のエディタ設定ファイルを用意するなど。
なお、"editorconfig.json"以外の名前を使用する場合は、withExEditor本体の設定ページでエディタ設定ファイルのパスを入力してください。

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
stderr output from native app withexeditorhost: SyntaxError: Unexpected token {
```

* Node.jsをアップグレードしてください。

```
withexeditorhost: SyntaxError: Unexpected string in JSON at ...
```

* "editorconfig.json"を確認してください。
