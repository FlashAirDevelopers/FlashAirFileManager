FlashAirFileManager
====

English / [Japanese](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/README.ja.md)

FlashAirFileManager is an application that allows you to browse and download files on FlashAir™ via the network.
- [FlashAir™](http://www.flashair.info) is an SD card with the wireless LAN function sold by Toshiba Memory.
- [FlashAir IoT Hub](https://iot-hub.flashair-developers.com) is a web service that supports original system development using FlashAir. By configuring a few simple settings, you can upload and analyze FlashAir data and share the uploaded data with other cloud services or your own system.

## Description

FlashAirFileManager is an application that can browse and download files on FlashAir from a remote place via FlashAir IoT Hub using the FlashAir™ wireless LAN function.

Account registration of FlashAir IoT Hub is necessary for use. For details, refer to the following.
- [Flow of using FlashAir IoT Hub](https://www.flashair-developers.com/en/documents/tutorials/iot-hub/1/)

Currently, FlashAirFileManager has been confirmed to work on the following platforms.
- Windows 7
- Windows 10

This application is provided in open source, and you can modify source code and distribute application within the scope of [license](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/LICENSE.txt).

## Demo

![FlashAirFileManager Demo](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/img/doc/demo.gif)

## Install

Download the zip file or installer from [Release](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases).

## Document

It is in [FlashAir Developers - FlashairFileManager](https://www.flashair-developers.com/en/documents/tutorials/iot-hub/9/).

## Usage

1. Register your account in advance with FlashAir IoT Hub and register FlashAir. For details, please refer to [Flow of using FlashAir IoT Hub](https://www.flashair-developers.com/en/documents/tutorials/iot-hub/1/).
2. Login to FlashAir IoT Hub and download [Lua script](https://iot-hub.flashair-developers.com/en/static/flashair-scripts.zip), unzip it and place it on the root of FlashAir.
3. Add `LUA_RUN_SCRIPT=/bootscript.lua` to FlashAir CONFIG.
4. Disconnect and reconnect the FlashAir and restart.
5. Start FlashAirFileManger.
6. Approve access to FlashAir IoT Hub.
7. If you select the registered FlashAir, the file list of FlashAir is displayed on the left side of the screen.
8. When you select a FlashAir file and click the download button in the center of the screen, the file will be downloaded to the folder displayed on the right side of the screen.

Note: Since version 0.2.0, Lua scripts are using [FlashAir IoT Hub](https://iot-hub.flashair-developers.com) instead. If you are using a version earlier than 0.2.0, please follow the steps below.

- Login to FlashAir IoT Hub and download [Lua script](https://iot-hub.flashair-developers.com/en/static/flashair-scripts.zip), unzip it and place it on the root of FlashAir.
- Change FlashAir CONFIG from `LUA_RUN_SCRIPT=/fafm_boot.lua` to` LUA_RUN_SCRIPT=/bootscript.lua`.

## Build

### Windows

- Install node.js(6.x)
- `npm install -g --production windows-build-tools`
   - Run it at the command prompt 'Run as administrator' or on Windows PowerShell.
   - Administrator authority is unnecessary for the following procedures.
- `npm install -g yarn`
- `git clone https://github.com/FlashAirDevelopers/FlashAirFileManager`
- `cd FlashAirFileManager`
- `yarn install`
- `yarn pack:win`
- run `.\dist\win-unpacked\FlashAirFileManger.exe`

## Troubleshooting

- Failed to build keytar.
   - The behavior of [node-gyp](https://github.com/nodejs/node-gyp) used for build requires installation of Python 2.x series. Please make sure that is installed or Path is passed.
   - For Windows, Python 2. series should be installed along with the installation of [Windows-Build-Tools](https://github.com/felixrieseberg/windows-build-tools).
   - It may be solved by executing the following command.
      - `cd FlashAirFileManager`
      - `cd node_modules/keytar`
      - run `..\.bin\node-gyp rebuild --target=1.7.8 --arch=x64 --dist-url=https://atom.io/download/atom-shell`
      - Please specify the version number of Electron for `- target` and the parameter of your environment for `--arch = x64`.
- Continue displaying "Loading" at application startup.
    - Click Remote> Logout on the menu. It may be solved by re-logging in to FlashAir IoT Hub.

## Changelog

- [0.3.0](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases/tag/v0.3.0)
   - Supported English display. You can switch display languages from `Menu> Language`.
- [0.2.1](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases/tag/v0.2.1)
   - Fixed issue that fails to start.
- [0.2.0](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases/tag/v0.2.0)
   - Changed to use Lua script provided by [FlashAir IoT Hub](https://iot-hub.flashair-developers.com).
- [0.1.1](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases/tag/v0.1.1)
   - Fixed issue that failed to get file list.
- [0.1.0](https://github.com/FlashAirDevelopers/FlashAirFileManager/releases/tag/v0.1.0)
   - The first release.

## Licence

[Apache 2.0](https://github.com/FlashAirDevelopers/FlashAirFileManager/blob/master/LICENSE.txt)

## Author

[FlashAir Developers](https://github.com/FlashAirDevelopers)
