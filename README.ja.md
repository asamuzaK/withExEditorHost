[EN](./README.md) | JA

# withExEditorHost

Firefoxのアドオン[withExEditor](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")用のネイティブメッセージングホスト

## ホストのダウンロード

[Releases](https://github.com/asamuzaK/withExEditorHost/releases)からソースコードのzipファイルかtar.gzファイルをダウンロードして、展開した上で任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。
Githubのアカウントがある場合は、レポジトリをクローンして保存してもOKです。

なお、ホストは[Node.js](https://nodejs.org/ja/)で実行しますので、Node.jsが入っていない場合はインストールしてください。

## ホストの設定

withExEditorHostの"_config"というフォルダの中に必要な設定ファイルのサンプルがあります。

_configフォルダのコピーを作成して`config`にリネームしてください。
なお、_configフォルダの中身は直接編集しないようにしてください。
withExEditorHostをアップデートしたときに上書きされてしまう可能性があります。

configフォルダは任意の場所に保存できますが、zipやtar.gzから展開して保存した場合は、そのまま_configフォルダと同じ場所に置けばOKです。
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
node /path/to/withexeditorhost/index.js
```

### アプリケーションマニフェストの編集

"withexeditorhost.json"を開いて、その中の`path`フィールドにシェルスクリプトのパスを記入します。
Windowsの場合は、ディレクトリの区切りであるバックスラッシュ文字にはさらにバックスラッシュを加えてエスケープさせる必要があることに注意してください。

ほかのフィールドはそのままでOKです。

```
{
  "name": "withexeditorhost",
  "description": "Native messaging host for withExEditor",
  "path": "C:\\Users\\XXX\\withExEditorHost\\config\\withexeditorhost.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

Windowsではレジストリも設定する必要があります。
cmd.exeで次のコマンドを実行するとレジストリキーを保存することができます。
`"C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json"`の部分は書き換えてください。

```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\withexeditorhost" /ve /d "C:\Users\XXX\withExEditorHosts\config\withexeditorhost.json" /f
```

LinuxとMacでは、アプリケーションマニフェストを指定の場所に保存する必要があります。
詳細は[App manifest location](https://developer.mozilla.org/ja/Add-ons/WebExtensions/Native_messaging#App_manifest_location)を参照してください。

### エディタ設定ファイルの編集

"editorconfig.json"を開いて、使用するエディタの情報を記入します。

```
{
  "editorPath": "C:\\Program Files\\Path\\To\\Your\\Editor.exe",
  "cmdArgs": [],
  "fileAfterCmdArgs": false
}
```

* *editorPath* - 使用するエディタのパス。Windowsの場合は、バックスラッシュ文字はエスケープさせる必要があります。
* *cmdArgs"* - コマンドラインオプション。[]括弧の中にカンマ区切りで各引数を記入してください。例：`"cmdArgs": ["-a", "-b", "-c"]`
* *fileAfterCmdArgs* - 真偽値（`true` / `false`）。いくつかのエディタでは、ファイルを指定する場合はコマンドの最後に置くように求めているものがあります。そのような場合に有効化してください。

***

以上の作業を終えたら、Firefoxを再起動してください。

なお、configフォルダをホストの外に保存した場合は、withExEditor本体の設定ページで"editorconfig.json"のパスを入力してください。
