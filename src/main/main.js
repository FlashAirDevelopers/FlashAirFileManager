/**
 * Copyright 2017-2018 FlashAir Developers
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
const storege = require('electron-json-storage');
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
let locale = 'en-US';
const dispatcher = new EventEmitter();
const CONFIG_NAME = 'config';

const getMainManue = newLocale => {
  return [
    {
      label: resources[newLocale].menu_label_file,
      submenu: [
        {
          role: 'close',
          label: resources[newLocale].menu_label_file_close
        }
      ]
    },
    {
      label: resources[newLocale].menu_label_remote,
      submenu: [
        {
          label: resources[newLocale].menu_label_remote_logout,
          click: () => {
            try {
              dispatcher.emit(AppEvent.INIT_STATE);
              mainWindow.reload();
              mainApp.logout()
              .then(() => {
                return mainApp.loadToken();
              })
              .catch(e => log.error(e));
            } catch (e) {
              log.error(e);
            }
          }
        }
      ]
    },
    {
      label: resources[newLocale].menu_label_locale_language,
      submenu: [
        {
          label: resources[newLocale].menu_label_locale_ja,
          type: 'checkbox',
          checked: newLocale === 'ja',
          click: () => changeLocale('ja')
        },
        {
          label: resources[newLocale].menu_label_locale_en,
          type: 'checkbox',
          checked: newLocale === 'en-US',
          click: () => changeLocale('en-US')
        }
      ]
    },
    {
      label: resources[newLocale].menu_label_help,
      submenu: [
        {
          label: resources[newLocale].menu_label_help_about,
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
};

const changeLocale = newLocale => {
  locale = newLocale;
  // check supported language
  if ((locale !== 'ja') && (locale !== 'en-US')) {
    locale = 'en-US';
  }
  // save new locale
  storege.set(CONFIG_NAME, { locale }, error => {
    if (error) {
      log.error(error);
    }
  });
  const mainManue = getMainManue(locale);
  const menu = Menu.buildFromTemplate(mainManue);
  Menu.setApplicationMenu(menu);
  if (mainWindow !== null) {
    mainWindow.reload();
  }
};

const createWindow = () => {
  // Create main window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: resources[locale].common_window_title,
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
  ipcMain.on('renderer-error', (event, {message, filename, err, stack}) => {
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
    exports.getLocale = () => locale;
  } catch (e) {
    log.error(e);
    throw e;
  }
};

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
  // load OS language
  locale = app.getLocale();
  // load config
  storege.get(CONFIG_NAME, (error, data) => {
    // data is exist
    if (!error && data && (Object.keys(data).length !== 0)) {
      if (data.locale) {
        locale = data.locale;
      }
    }
    // check supported language
    if ((locale !== 'ja') && (locale !== 'en-US')) {
      locale = 'en-US';
    }
    createWindow();
    // Create menu
    changeLocale(locale);
  });
});

app.on('did-finish-load', () => {
  mainWindow.webContents.send(AppEvent.DID_FINISH_LOAD, appStore.getState());
});

exports.app = app;