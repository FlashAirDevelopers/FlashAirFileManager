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
import {inspect} from 'util';
import log from 'electron-log';
import promise from 'es6-promise';
import fetch from 'isomorphic-fetch';

import {IoTHubApi, FlashAIrScript} from '../../common/config';
import {IoTHubApiConst} from '../../common/const';
import {AppEvent} from '../../common/event';
import {basename} from '../../common/util';

promise.polyfill();
const {dialog} = remote;
import fs from 'fs';
import path from 'path';

export class IoTHubAction {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
  }
  handleHttpStatus(response) {
    if ((response.status === 200)     // Status OK
      || (response.status === 201)    // Created
      || (response.status === 204)) { // No Conten
      return Promise.resolve(response);
    }
    console.log(inspect(response, {
      showHidden: false,
      depth: null
    }));
    return Promise.reject('HTTP status not OK');
  }
  fetchDevices(state = {accessToken, isFetchingDevices}) {
    if (state.isFetchingDevices) {
      return Promise.resolve();
    }
    return this._fetchDevices(state);
  }
  _fetchDevices(state = {accessToken, isFetchingDevices}) {
    // Notify fetch start event
    this.dispatcher.emit(AppEvent.FETCH_FLASHAIRS, {
      isFetchingFlashairs: true
    });
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.flashairs}`, {
      headers: {
        'Authorization': `Bearer ${state.accessToken}`
      }
    })
    .then(this.handleHttpStatus)
    .then(response => {
      return response.json();
    })
    .then(json => {
      // filter necessary properties
      const flashairs = json.flashairs.map(flashair => {
        return {
          id: flashair.id,
          name: flashair.name
        };
      });
      this.dispatcher.emit(AppEvent.FETCH_FLASHAIRS_SUCCESS, {
        flashairs: flashairs,
        isFetchingFlashairs: false
      });
      return flashairs;
    })
    .catch(e => {
      log.error(e);
      let message = null;
      if (e instanceof Error) {
        message = e.message;
      } else {
        message = e;
      }
      this.dispatcher.emit(AppEvent.FETCH_FLASHAIRS_FAILURE, {
        message: message,
        isFetchingFlashairs: false
      });
    });
  }
  changeFlashAir(flashairId) {
    this.dispatcher.emit(AppEvent.CHANGE_FLASHAIR, {
      flashairId: flashairId,
      remoteCurDir: '/',
      remoteFiles: [],
      isFetchingRemoteFileList: false
    });
  }
  requestRemoteFileList(state = {accessToken, isFetchingRemoteFileList, flashairId, remoteCurDir}, useCache = false) {
    if (state.isFetchingRemoteFileList || !state.flashairId) {
      return Promise.resolve();
    }
    return this._requestRemoteFileList(state, useCache);
  }
  _requestRemoteFileList(state = {accessToken, isFetchingRemoteFileList, flashairId, remoteCurDir}, useCache = false) {
    // Notify fetch start event
    this.dispatcher.emit(AppEvent.REQUEST_REMOTE_FILE_LIST, {
      isFetchingRemoteFileList: true,
      flashairId: state.flashairId,
      remoteCurDir: state.remoteCurDir
    });
    const requestBody = {
      request: {
        type: 'script',
        path: FlashAIrScript.LIST,
        arguments: {current_path: state.remoteCurDir || '/'}
      }
    };
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.jobs.replace('{flashair_id}', state.flashairId)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    .then(this.handleHttpStatus)
    .then(response => {
      return response.json();
    })
    .then(json => {
      this.dispatcher.emit(AppEvent.REQUEST_REMOTE_FILE_LIST_SUCCESS, {
        curJobResponderId: json.responder_id
      });
    })
    .catch(e => {
      let message;
      if (e) {
        log.error(e);
        if (e.message) {
          message = e.message;
        } else {
          message = e;
        }
      } else {
        message = 'unkown error';
      }
      this.dispatcher.emit(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE, {
        message: message,
        isFetchingRemoteFileList: false
      });
      return Promise.reject(e);
    });
  }
  getJobs(state = {accessToken, isGettingJob, flashairId}) {
    if (state.isGettingJob || !state.flashairId) {
      return Promise.resolve();
    }
    return this._getJobs(state);
  }
  _getJobs(state = {accessToken, isGettingJob, flashairId}) {
    // Notify get start event
    this.dispatcher.emit(AppEvent.GET_REMOTE_JOB, {
      isGettingJob: true
    });
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.jobs.replace('{flashair_id}', state.flashairId)}?with_details=true`, {
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'Content-Type': 'application/json',
      }
    })
    .then(this.handleHttpStatus)
    .then(response => {
      return response.json();
    })
    .then(json => {
      this.dispatcher.emit(AppEvent.GET_REMOTE_JOB_SUCCESS, {
        isGettingJob: false
      });
      return json;
    })
    .catch(e => {
      let message;
      if (e) {
        log.error(e);
        if (e.message) {
          message = e.message;
        } else {
          message = e;
        }
      } else {
        message = 'unkown error';
      }
      this.dispatcher.emit(AppEvent.GET_REMOTE_JOB_FAILURE, {
        message: message,
        isGettingJob: false
      });
      return Promise.reject(e);
    });
  }
  deleteJob(state = {accessToken, isDeletingRemoteJob, flashairId}, job) {
    if (state.isDeletingRemoteJob || !state.flashairId) {
      return Promise.resolve();
    }
    return this._deleteJob(state, job);
  }
  _deleteJob(state = {accessToken, flashairId}, job) {
    // Notify get start event
    this.dispatcher.emit(AppEvent.DELETE_REMOTE_JOB, {
      isDeletingRemoteJob: true
    });
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.jobs.replace('{flashair_id}', state.flashairId)}/${job.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'If-Match': job.etag
      }
    })
    .then(this.handleHttpStatus)
    .then(response => {
      this.dispatcher.emit(AppEvent.DELETE_REMOTE_JOB_SUCCESS, {
        isDeletingRemoteJob: false
      });
    })
    .catch(e => {
      let message;
      if (e) {
        log.error(e);
        if (e.message) {
          message = e.message;
        } else {
          message = e;
        }
      } else {
        message = 'unkown error';
      }
      this.dispatcher.emit(AppEvent.DELETE_REMOTE_JOB_FAILURE, {
        message: message,
        isDeletingRemoteJob: false
      });
    });
  }
  updateFiles(state = {remoteFiles}) {
    this.dispatcher.emit(AppEvent.UPDATE_REMOTE_FILE_LIST, {
      remoteFiles: state.remoteFiles,
      isFetchingRemoteFileList: false
    });
  }
  selectRemoteFile(fileName) {
    this.dispatcher.emit(AppEvent.SELECT_REMOTE_FILE, {
      selectedRemoteFile: fileName
    });
  }
  requestUploadFile(state = {accessToken, flashairId, isRequestDownloadingRemoteFile, remoteCurDir, selectedRemoteFile}) {
    if (state.isRequestDownloadingRemoteFile || !state.selectedRemoteFile) {
      return Promise.resolve();
    }
    return this._requestUploadFile(state);
  }
  _requestUploadFile(state = {accessToken, flashairId, isRequestDownloadingRemoteFile, remoteCurDir, selectedRemoteFile}) {
    // Notify fetch start event
    this.dispatcher.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB, {
      isRequestDownloadingRemoteFile: true,
      selectedRemoteFile: null,
      downloadProgress: 10
    });
    let current_path = state.remoteCurDir || '/';
    if (((current_path.lastIndexOf('/')) + 1) !== current_path.length) {
      current_path = current_path + '/';
    }
    const requestBody = {
      request: {
        type: 'script',
        path: FlashAIrScript.UPLOAD,
        arguments: {
          current_path: current_path,
          file_name: state.selectedRemoteFile
        }
      }
    };
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.jobs.replace('{flashair_id}', state.flashairId)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    .then(this.handleHttpStatus)
    .then(response => {
      return response.json();
    })
    .then(() => {
      this.dispatcher.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS, {
        isRequestDownloadingRemoteFile: false,
        downloadProgress: 20
      });
    })
    .catch(e => {
      let message;
      if (e) {
        log.error(e);
        if (e.message) {
          message = e.message;
        } else {
          message = e;
        }
      } else {
        message = 'unkown error';
      }
      this.dispatcher.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE, {
        message: message,
        isRequestDownloadingRemoteFile: false,
        downloadProgress: 0
      });
      return Promise.reject(e);
    });
  }
  updateDownloadProgress(state = {isDownloadingRemoteFile}, downloadProgress) {
    if (! state.isDownloadingRemoteFile) {
      return;
    }
    this.dispatcher.emit(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, {
      downloadProgress: downloadProgress
    });
  }
  downloadFromRemote(state = {accessToken, flashairId, isRequestDownloadingRemoteFile, isDownloadingRemoteFile, localCurDir}, upload) {
    if (state.isDownloadingRemoteFile) {
      return Promise.resolve();
    }
    return this._downloadFromRemote(state, upload);
  }
  _downloadFromRemote(state = {accessToken, flashairId, isRequestDownloadingRemoteFile, isDownloadingRemoteFile, localCurDir}, upload) {
    this.dispatcher.emit(AppEvent.DOWNLOAD_REMOTE_FILE, {
      isDownloadingRemoteFile: true,
      downloadProgress: 50
    });
    const uploadData = JSON.parse(upload);
    return fetch(`${IoTHubApi.baseUrl}${IoTHubApi.files.replace('{flashair_id}', state.flashairId)}/${uploadData.id}`, {
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
      }
    })
    .then(this.handleHttpStatus)
    .then(response => {
      this.dispatcher.emit(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, {
        downloadProgress: 80
      });
      return response.buffer();
    })
    .then(data => {
      if (!data) {
        return;
      }
      log.debug('data received');
      const fileBaseName = basename(uploadData.name);
      return new Promise((resolve, reject) => {
        fs.writeFile(path.join(state.localCurDir, fileBaseName), data, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    })
    .then(() => {
      this.dispatcher.emit(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS, {
        isDownloadingRemoteFile: false,
        downloadProgress: 0 // Reset progress status
      });
    })
    .catch(e => {
      let message;
      if (e) {
        log.error(e);
        if (e.message) {
          message = e.message;
        } else {
          message = e;
        }
      } else {
        message = 'unkown error';
      }
      this.dispatcher.emit(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE, {
        message: message,
        isDownloadingRemoteFile: false,
        downloadProgress: 0
      });
      return Promise.reject(e);
    });
  }
}