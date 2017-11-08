/**
 * Copyright 2017 FlashAir Developers
 * 
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const {EventEmitter} = require('events');
const {app, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');
const openAboutWindow = require('about-window').default;
const {AppStore} = require('./store/app-store');
const {AppEvent} = require('../common/event');
const {resources} = require('../common/resources');
const {App} = require('./app');

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  log.transports.console.level = 'debug';
}

let mainWindow = null;
let mainApp = null;
let appStore = null;
const dispatcher = new EventEmitter();

const mainManue = [
  {
    label: resources.menu_label_file,
    accelerator: 'Alt+f',
    submenu: [
      {
        role: 'close',
        label: resources.menu_label_file_close
      }
    ]
  },
  {
    label: resources.menu_label_remote,
    accelerator: 'Alt+l',
    submenu: [
      {
        label: resources.menu_label_remote_logout,
        click: () => {
          try {
            dispatcher.emit(AppEvent.INIT_STATE);
            mainWindow.reload();
            mainApp.logout()
            .then(() => {
              return mainApp.loadToken();
            });
          } catch (e) {
            log.error(e);
          }
        }
      }
    ]
  },
  {
    label: resources.menu_label_help,
    accelerator: 'Alt+h',
    submenu: [
      {
        label: resources.menu_label_help_about,
        click: () => {
          openAboutWindow({
            icon_path: path.join(__dirname, 'img', 'icon', 'icon.png'),
            package_json_dir: __dirname,
            copyright: `Distributed under <a href='${path.join(__dirname, '..', 'LICENSE.txt')}' target='_blank'>Apache 2.0</a> license.`,
            use_inner_html: true
          });
        }
      }
    ]
  }
];

function createWindow() {
  // Create main window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: resources.common_window_title,
    useContentSize: true,
    webPreferences: {
      // comment out for load jQuery and Bootstrap
      // nodeIntegration: true,
    }
  });
  // Release window when close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  ipcMain.on('app-focus', () => {
    log.info('Main process is gaining focus');
    app.focus();
  });
  ipcMain.on('renderer-error', ({message, filename, err, stack}) => {
    log.error(message);
    log.error(stack);
  });
  // Load main page
  var indexUrl = `file://${__dirname}/static/index.html`;
  mainWindow.loadURL(indexUrl);
  if (!isProduction) {
    mainWindow.webContents.openDevTools();
  }
  // initialize application
  try {
    appStore = new AppStore(dispatcher);
    mainApp = new App(dispatcher);
    // Public application store to render process
    exports.store = appStore;
    exports.dispatcher = dispatcher;
  } catch (e) {
    log.error(e);
    throw e;
  }
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on('ready', () => {
  createWindow();
  // Create menu
  const menu = Menu.buildFromTemplate(mainManue);
  Menu.setApplicationMenu(menu);
});

app.on('did-finish-load', () => {
  mainWindow.webContents.send(AppEvent.DID_FINISH_LOAD, appStore.getState());
});

exports.app = app;