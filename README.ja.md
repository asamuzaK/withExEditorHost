[EN](./README.md) | JA

[![build](https://github.com/asamuzaK/withExEditorHost/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3Abuild)
[![CodeQL](https://github.com/asamuzaK/withExEditorHost/workflows/CodeQL/badge.svg)](https://github.com/asamuzaK/withExEditorHost/actions?query=workflow%3ACodeQL)
[![npm](https://img.shields.io/npm/v/withexeditorhost)](https://www.npmjs.com/package/withexeditorhost)
[![release](https://img.shields.io/github/v/release/asamuzaK/withExEditorHost)](https://github.com/asamuzaK/withExEditorHost/releases)

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
|Chrome Beta     |   ✓ *2|   ✓   |   ✓   |
|Chrome Canary   |   ✓ *2|       |   ✓   |
|Chromium        |       |   ✓   |   ✓   |
|Brave           |   ✓ *2|   ✓   |   ✓   |
|Edge            |   ✓   |   ✓   |   ✓   |
|Opera           |   ✓ *2|       |   ✓ *2|
|Vivaldi         |   ✓ *2|   ✓   |   ✓   |

*1: Firefoxとホストを共有。
*2: Chromeとホストを共有。

ブラウザが一覧にない場合やOSがサポート対象になっていない場合は、サポート要望の[イシュー](https://github.com/asamuzaK/withExEditorHost/issues "Issues · asamuzaK/withExEditorHost")を登録してください。
イシューを登録する際、そのブラウザでは[アプリケーションマニフェストをどこに保存すべきか](https://developer.mozilla.org/ja/Add-ons/WebExtensions/Native_messaging#App_manifest_%E3%81%AE%E5%A0%B4%E6%89%80 "Native messaging - Mozilla | MDN")もしご存知でしたら、お知らせください。

## npm からのホストのセットアップ

備考：[Node.js](https://nodejs.org/ja/ "Node.js")が必要です。メンテナンスLTSかそれ以上のバージョンを使用してください。

ホストを設定するときは、ブラウザにインストールされているwithExEditorを無効化してください。

ホストは[withexeditorhost - npm](https://www.npmjs.com/package/withexeditorhost)から入手できます。
ホストをグローバルにインストールした後に、インストール先に移動してください。

備考：Windowsでのインストール先は基本的に`C:\Users\XXX\AppData\Roaming\npm\node_modules\withexeditorhost`で、macOSとLinuxでは`/usr/local/lib/node_modules/withexeditorhost`となっているはずです。
もし見つからない場合、npmのグローバルインストールパスは`npm root -g`で取得できます。
参照： [Where does npm install the packages?](https://nodejs.dev/learn/where-does-npm-install-the-packages)

```console
npm i -g withexeditorhost
cd path/to/npm/node_modules/withexeditorhost
```

ホストを設定するためのコマンド`npm run setup`を実行します。

```console
npm run setup
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

```console
npm run setup -- --browser=firefox
```

#### -c --config-path

セットアップスクリプトは、デフォルトでユーザーのホームディレクトリ下に各設定ファイルを保持します。
* Windowsの場合：`C:\Users\[UserName]\AppData\Roaming\withexeditorhost\config\`
* Macの場合：`~/Library/Application Support/withexeditorhost/config/`
* Linuxの場合：`~/.config/withexeditorhost/config/`

設定ファイルの保存先を変更したい場合は、`-c`または`--config-path`オプションで指定してください。
パスに空白やバックスラッシュが含まれる場合は引用符で括ってください。

```console
npm run setup -- --config-path="C:\Users\XXX\path\to\another\location"
```

#### その他

その他のオプションについては、ヘルプで確認してください

```console
npm run setup -- --help
```

### アップグレード

ホストをアップグレードする前に、ブラウザにインストールされているwithExEditorを無効にしてください。
下記コマンドを実行します。

```console
npm i -g withexeditorhost
```

アップグレード後にセットアップスクリプトを再度実行する必要はありません。
アップグレード後にはwithExEditorを有効化してください。

***
