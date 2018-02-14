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

import {remote} from 'electron';
import log from 'electron-log';

import {AppEvent} from '../../common/event';
import {Filer} from '../../common/const';

const fs = remote.require('fs');
const path = remote.require('path');

export class LocalFileSystemAction {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
    // bind methods
    this.getLocalFileList = this.getLocalFileList.bind(this);
    this._getLocalFileList = this._getLocalFileList.bind(this);
  }
  getLocalFileList(state = {localCurDir, isGetingLocalFileList, localFiles}, useCache = false) {
    if (state.isGetingLocalFileList) {
      return Promise.resolve();
    }
    return this._getLocalFileList(state, useCache);
  }
  _getLocalFileList(state = {localCurDir, isGetingLocalFileList, localFiles}, useCache = false) {
    this.dispatcher.emit(AppEvent.GET_LOCAL_FILE_LIST, {
      isGetingLocalFileList: true
    });
    return new Promise((resolve, reject) => {
      fs.readdir(state.localCurDir, (err, files) => {
        if (err) {
          log.error(err);
          this.dispatcher.emit(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, {
            isGetingLocalFileList: false
          });
          return reject(err);
        }
        const readStats = files.map(file => {
          return new Promise((resolveStat, rejectStat) => {
            fs.stat(path.join(state.localCurDir, file), (err, stat) => {
              if (err) {
                log.error(err);
                this.dispatcher.emit(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, {
                  isGetingLocalFileList: false
                });
                return rejectStat(err);
              }
              if (!stat.isFile() && !stat.isDirectory()) {
                return;
              }
              resolveStat({
                name: file,
                mode: stat.isDirectory() ? Filer.files.mode.DIRECTORY : Filer.files.mode.FILE,
                size: stat.size,
                modification: stat.mtime
              });
            });
          });
        });
        return Promise.all(readStats)
        .then(stats => {
          // const localFiles = stats;
          stats.sort((a, b) => {
            // sort by mode(directory or file)
            // directory than file
            if (a.mode < b.mode) {
              return -1;
            } else if (b.mode < a.mode) {
              return 1;
            }
            // sort by name
            if (a.name.hasOwnProperty('localeCompare')) {
              const nameCmp = a.name.localeCompare(b.name);
              if (nameCmp !== 0) {
                // ASC sort
                return nameCmp;
              }
            }
            // ASC sort
            if (a.name < b.name) {
              return -1;
            } else if (b.name < a.name) {
              return 1;
            }
            // sort by timestamp
            return a.modification - b.modification;
          });
          // Add move parent directory item
          stats.unshift({
            name: Filer.files.special.PARENT_DIR,
            mode: Filer.files.mode.DIRECTORY,
            size: 0,
            modification: ''
          });
          const curLocalFiles = state.localFiles || [];
          const cachedDir = curLocalFiles.filter(dir => {
            return dir.path !== state.localCurDir;
          }).concat([{
            path: state.localCurDir,
            files: stats
          }]);
          this.dispatcher.emit(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS, {
            isGetingLocalFileList: false,
            localCurDir: state.localCurDir,
            localFiles: cachedDir
          });
          return cachedDir;
        });
      });
    });
  }
}