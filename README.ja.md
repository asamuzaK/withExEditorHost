[EN](./README.md) | JA

[![Build Status](https://travis-ci.org/asamuzaK/withExEditorHost.svg?branch=master)](https://travis-ci.org/asamuzaK/withExEditorHost)
[![dependencies Status](https://david-dm.org/asamuzaK/withExEditorHost/status.svg)](https://david-dm.org/asamuzaK/withExEditorHost)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditorHost/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditorHost?type=dev)
[![GitHub release](https://img.shields.io/github/release/asamuzaK/withExEditorHost.svg)](https://github.com/asamuzaK/withExEditorHost/releases)

# withExEditorHost

ブラウザ拡張機能*withExEditor*用のネイティブメッセージングホスト。
ブラウザはメッセージを介してホストと対話し、エディタはこのホストによって実行されます。

* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")
* [withExEditor - Chrome ウェブストア](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome ウェブストア")

## ブラウザサポート状況

|Browser      |Windows|Linux  |Mac    |
|:------------|:-----:|:-----:|:-----:|
|Firefox      |   ✓   |   ✓   |   ✓   |
|Waterfox     |   ✓ *1|       |       |
|Chrome       |   ✓   |   ✓   |   ✓   |
|Chrome Canary|   ✓ *2|       |   ✓   |
|Chromium     |       |   ✓   |   ✓   |
|CentBrowser  |   ✓ *2|       |       |
|Kinza        |   ✓ *2|       |       |
|Opera        |   ✓ *2|       |   ✓ *2|
|Vivaldi      |   ✓ *2|   ✓   |   ✓   |

*1: Firefoxとホストを共有。
*2: Chromeとホストを共有。

ブラウザが一覧にない場合やOSがサポート対象になっていない場合は、サポート要望の[イシュー](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost")を登録してください。
イシューを登録する際、そのブラウザでは[アプリケーションマニフェストをどこに保存すべきか](https://developer.mozilla.org/ja/Add-ons/WebExtensions/Native_messaging#App_manifest_%E3%81%AE%E5%A0%B4%E6%89%80 "Native messaging - Mozilla | MDN")もしご存知でしたら、お知らせください。

## ホストのセットアップ

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

備考：ホストv2.xからのアップグレードの場合にも下記セットアップスクリプトを実行してください。なお、v2.xのファイルはすべて削除してください。

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")から、お使いのOS用のzipファイルをダウンロードして展開した上で、自分のホームディレクトリ内の任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。

続いて、Windowsでは「cmd.exe」、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostの保存先に移動したうえで、下記コマンドを実行してホストの設定を行います。

```
> cd path/to/withExEditorHost
> index setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザから選択してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

備考：ホストv2.xからのアップグレードの場合、エディタ設定の上書きを行う必要はありません。
「n」を選択して終了してかまいません。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`

設定ファイルが正常に作成されたら、withExEditorを再び有効化してください。
ブラウザとホストが接続されて、エディタが使用できる状態になります。

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

***

## npm からのホストのセットアップ

備考：[Node.js](https://nodejs.org/ja/ "Node.js") v10.x.x以上が必要です。

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

ホストは[withexeditorhost - npm](https://www.npmjs.com/package/withexeditorhost)から入手できます。
ホストをグローバルにインストールした後に、インストール先に移動して（例：`C:\Users\XXX\AppData\Roaming\npm\node_modules\withexeditorhost`）、設定のためのコマンドを実行します。

備考：設定のコマンドは`node index setup`です。

```
> npm i -g withexeditorhost
> cd path/to/npm/node_modules/withexeditorhost
> node index setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザから選択してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`

設定ファイルが正常に作成されたら、withExEditorを再び有効化してください。
ブラウザとホストが接続されて、エディタが使用できる状態になります。

### オプション

セットアップスクリプトではいくつかのオプションを指定することができます。

#### -b --browser

ブラウザをあらかじめ指定する場合には、`-b`または`--browser`オプションで指定してください。

```
> node index setup --browser=firefox
```

#### -c --config-path

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`-c`または`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```
> node index setup --config-path="C:\Users\XXX\path\to\another\location"
```

#### その他

その他のオプションについては、ヘルプで確認してください

```
> node index setup --help
```

***

## ソースコードからのホストのセットアップ

備考：[Node.js](https://nodejs.org/ja/ "Node.js") v10.x.x以上が必要です。

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

[Releases](https://github.com/asamuzaK/withExEditorHost/releases "Releases · asamuzaK/withExEditorHost")からソースコードのzipファイルかtar.gzファイルをダウンロードして、展開した上で、自分のホームディレクトリ内の任意の場所に保存してください（例えば、`C:\Users\XXX\withExEditorHost\`）。

続いて、Windowsでは「cmd.exe」、Linux / Macでは「端末」（ターミナル）を開き、withExEditorHostの保存先に移動したうえで、下記コマンドを実行してホストの設定を行います。

備考：設定のコマンドは`npm run setup`です。

```
> cd path/to/withExEditorHost
> npm run setup
```

どのブラウザ向けにホストを設定するのか尋ねられますので、リストに表示されたブラウザから選択してください。

続いて、エディタ関連の以下の入力を求められますので適宜入力してください。

* エディタのパス
* コマンドラインオプション
  * 引数に空白やバックスラッシュが含まれる場合は引用符で括ってください。
    例：`-a -b "C:\Program Files"`

設定ファイルが正常に作成されたら、withExEditorを再び有効化してください。
ブラウザとホストが接続されて、エディタが使用できる状態になります。

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
> node index setup --help
```
