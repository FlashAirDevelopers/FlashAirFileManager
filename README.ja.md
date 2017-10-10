FlashAirFileManager
====

[English](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/README.md) / Japanese

ネットワーク経由でFlashAir™上のファイルを閲覧、ダウンロード出来るアプリケーションです。
- [FlashAir™](http://www.flashair.info)は、東芝メモリが販売している無線LAN機能を搭載したSDカードです。
- [FlashAir IoT Hub](https://iot-hub.flashair-developers.com)は、FlashAirを利用した独自のシステム開発をサポートするウェブサービスです。いくつかの簡単な設定をすることで、FlashAirのデータをアップロードし解析したり、アップロードしたデータを他のクラウドサービスや独自システムに共有することができます。

## Description

FlashAir™の無線LAN機能を使い、FlashAir IoT Hubを経由する事で離れた場所からFlashAir上のファイルを閲覧、ダウンロード出来るアプリケーションです。

ご利用には、FlashAir IoT Hubのアカウント登録が必要です。詳細は次を参照してください。
- [Flow of using FlashAir IoT Hub](https://www.flashair-developers.com/ja/documents/tutorials/iot-hub/1/)

現在、次のプラットフォームにて動作を確認しています。
- Windows 7
- Windows 10

本アプリケーションはオープンソースで提供されており、[ライセンス](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/LICENSE.txt)の範囲においてソースコードの改変、アプリケーションの配布を行う事が出来ます。

## Demo

![FlashAirFileManager Demo](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/img/doc/demo.gif)

## Install

[リリース](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases)からzipファイルまたはインストーラーをダウンロードしてください。

## Document

[FlashAir Developers - FlashairFileManager](https://www.flashair-developers.com/ja/documents/tutorials/iot-hub/9/)にあります。

## Usage

1. 事前にFlashAir IoT Hubでアカウント登録し、FlashAirを登録する。詳細は[FlashAir IoT Hubのご利用の流れ](https://www.flashair-developers.com/ja/documents/tutorials/iot-hub/1/)を参照。
2. [Luaスクリプト](https://github.com/FlashAirDevelopers/FlashAirFileManager/archive/FlashAirFileManagerScript-0.1.0.zip)をダウンロード・解凍してFlashAirのルート上に置く。
3. FlashAirのCONFIGに`LUA_RUN_SCRIPT=/fafm_boot.lua`を追記する。
4. FlashAirを抜き挿しするなどして、再起動する。
5. FlashAirFileMangerを起動する。
6. （初回起動の場合）FlashAir IoT Hub にログインし、アクセスの承認を行う。
7. 登録したFlashAirを選択すると、FlashAirのファイル一覧が画面左側に表示されます。
8. FlashAirのファイルを選択して、画面中央のダウンロードボタンをクリックすると、ファイルが画面右側に表示されているフォルダーにダウンロードされます。

## Build

### Windows

- node.js(6.x)をインストール
- `npm install -g --production windows-build-tools`
   - `管理者として実行`したコマンドプロンプト、またはWindows PowerShell上で実行してください。
   - 以降の手順は管理者権限は不要です。
- `npm install -g yarn`
- `git clone https://github.com/FlashAirDevelopers/FlashAirFileManager`
- `cd FlashAirFileManager`
- `yarn install`
- `yarn pack:win`
- run `.\dist\win-unpacked\FlashAirFileManger.exe`

## Troubleshooting

- keytarのビルドに失敗する。
   - ビルドに使用する[node-gyp](https://github.com/nodejs/node-gyp)の動作にはPython 2.x系列のインストールが必要です。インストールされているか、Pathが通っているか確認してください。
   - Windowsの場合、[Windows-Build-Tools](https://github.com/felixrieseberg/windows-build-tools)のインストールでPython2.系列がインストールされているはずです。
   - 次のコマンドを実行する事で解決するかもしれません。
      - `cd FlashAirFileManager`
      - `cd node_modules/keytar`
      - run `..\.bin\node-gyp rebuild --target=1.7.8 --arch=x64 --dist-url=https://atom.io/download/atom-shell`
      - `--target`にはElectronのバージョン番号を、`--arch=x64`みはお使いの環境のパラメータを指定してください。

## Licence

[Apache 2.0](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/LICENSE.txt)

## Author

[FlashAir Developers](https://github.com/FlashAirDevelopers)
