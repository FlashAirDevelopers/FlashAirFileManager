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
import $ from 'jquery';
import {Spinner} from 'spin.js';
require('bootstrap-notify');
import log from 'electron-log';

import {FlashAIrScript} from '../../common/config';
import {IoTHubApiConst, Filer} from '../../common/const';
import {resources} from '../../common/resources';
import {AppEvent} from '../../common/event';
import {fatDateToDate, dateFormat} from '../../common/util';
import filerTemplate from './filer_tmpl.hbs';
import {IoTHubAction} from '../action/iothub-action';
import {LocalFileSystemAction} from '../action/local-fs-action';

const appMain = remote.require('./main');
const fs = remote.require('fs');
const path = remote.require('path');

export class FilerPage {
  constructor() {
    this.locale = appMain.getLocale();
    this.baseTemplateVar = Object.assign({}, resources[this.locale]);
    this.iotHubAction = new IoTHubAction(appMain.dispatcher);
    this.localFsAction = new LocalFileSystemAction(appMain.dispatcher);
    this.timer = null;
    this.downloadProgressNotifier = null;
    // Unit: mili seconds
    this.refreshInterval = 1000 * 5;
    // bind methods
    this.render = this.render.bind(this);
    this.mount = this.mount.bind(this);
    this.requestRemoteFileList = this.requestRemoteFileList.bind(this);
    this.changeRemoteDirecory = this.changeRemoteDirecory.bind(this);
    this.changeLocalDirecory = this.changeLocalDirecory.bind(this);
    this.changeLocalParentDirecory = this.changeLocalParentDirecory.bind(this);
    this.changeRemoteParentDirecory = this.changeRemoteParentDirecory.bind(this);
    this.refreshRemoteDirectory = this.refreshRemoteDirectory.bind(this);
    this.refreshLocalDirectory = this.refreshLocalDirectory.bind(this);
    this.watchRequestJob = this.watchRequestJob.bind(this);
    this.takeInJobResults = this.takeInJobResults.bind(this);
    this._fetchRemoteFileList = this._fetchRemoteFileList.bind(this);
    this._downloadFromRemote = this._downloadFromRemote.bind(this);
    this.onClickDownload = this.onClickDownload.bind(this);
  }
  mount(state) {
    // store callback event
    appMain.store.on(AppEvent.FETCH_FLASHAIRS, state => {
      log.debug(AppEvent.FETCH_FLASHAIRS);
      // Show spinner for fetching FlashAir file list
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.FETCH_FLASHAIRS_SUCCESS, state => {
      log.debug(AppEvent.FETCH_FLASHAIRS_SUCCESS);
      this.render(Object.assign(this.baseTemplateVar, state));
      this.iotHubAction.requestRemoteFileList(state);
    });
    appMain.store.on(AppEvent.CHANGE_FLASHAIR, state => {
      log.debug(AppEvent.CHANGE_FLASHAIR);
      this.requestRemoteFileList(state.flashairId);
    });
    appMain.store.on(AppEvent.REQUEST_REMOTE_FILE_LIST, state => {
      log.debug(AppEvent.REQUEST_REMOTE_FILE_LIST);
      // Show spinner for fetching FlashAir file list
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE, state => {
      log.debug(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE);
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.GET_REMOTE_JOB, state => {
      log.debug(AppEvent.GET_REMOTE_JOB);
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.UPDATE_REMOTE_FILE_LIST, state => {
      log.debug(AppEvent.UPDATE_REMOTE_FILE_LIST);
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS, state => {
      log.debug(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS);
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, state => {
      log.debug(AppEvent.GET_LOCAL_FILE_LIST_FAILURE);
      this.render(Object.assign(this.baseTemplateVar, state));
    });
    appMain.store.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB, state => {
      log.debug(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB);
      this.downloadProgressNotifier = $.notify({message: resources[this.locale].filer_msg_remote_download_progress}
        , {type: 'info', placement: {from: 'top', align: 'right'}, allow_dismiss: false
        , showProgressbar: true, progress: state.downloadProgress, delay: 0});
      log.debug(`progress: ${state.downloadProgress}`);
    });
    appMain.store.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS, state => {
      log.debug(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS);
      if (this.downloadProgressNotifier) {
        this.downloadProgressNotifier.update({progress: state.downloadProgress, delay: 0});
        log.debug(`progress: ${state.downloadProgress}`);
      }
    });
    appMain.store.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE, state => {
      log.debug(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE);
      if (this.downloadProgressNotifier) {
        this.downloadProgressNotifier.close();
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
        log.debug(`progress: ${state.downloadProgress}`);
      }
    });
    appMain.store.on(AppEvent.DOWNLOAD_REMOTE_FILE, state => {
      log.debug(AppEvent.DOWNLOAD_REMOTE_FILE);
      if (this.downloadProgressNotifier) {
        this.downloadProgressNotifier.update({progress: state.downloadProgress, delay: 0});
        log.debug(`progress: ${state.downloadProgress}`);
      }
    });
    appMain.store.on(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, state => {
      log.debug(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS);
      if (this.downloadProgressNotifier) {
        this.downloadProgressNotifier.update({progress: state.downloadProgress, delay: 0});
        log.debug(`progress: ${state.downloadProgress}`);
      }
    });
    appMain.store.on(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS, state => {
      log.debug(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS);
      if (this.downloadProgressNotifier) {
        log.debug(`progress: ${state.downloadProgress}`);
        this.downloadProgressNotifier.update({progress: 100, delay: 0});
        this.downloadProgressNotifier.close();
        setTimeout(() => {
          this.notifyMessage('success', resources[this.locale].filer_msg_remote_download_completed);
        }, 1000);
      }
    });
    appMain.store.on(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE, state => {
      log.debug(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE);
      if (this.downloadProgressNotifier) {
        this.downloadProgressNotifier.close();
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
    
    // initialize action event
    Promise.all([
      this.iotHubAction.fetchDevices(state),
      this.localFsAction.getLocalFileList(state)
    ])
    .catch(e => {
      log.error(e);
      this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
    });
    this.watchRequestJob();
    this.render(Object.assign(this.baseTemplateVar, state));
  }
  unmount() {
    appMain.store.removeListener(AppEvent.FETCH_FLASHAIRS, () => {
      log.debug(`Remove listener ${AppEvent.FETCH_FLASHAIRS}`);
    });
    appMain.store.removeListener(AppEvent.FETCH_FLASHAIRS_SUCCESS, () => {
      log.debug(`Remove listener ${AppEvent.FETCH_FLASHAIRS_SUCCESS}`);
    });
    appMain.store.removeListener(AppEvent.CHANGE_FLASHAIR, () => {
      log.debug(`Remove listener ${AppEvent.CHANGE_FLASHAIR}`);
    });
    appMain.store.removeListener(AppEvent.REQUEST_REMOTE_FILE_LIST, () => {
      log.debug(`Remove listener ${AppEvent.REQUEST_REMOTE_FILE_LIST}`);
    });
    appMain.store.removeListener(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE, () => {
      log.debug(`Remove listener ${AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE}`);
    });
    appMain.store.removeListener(AppEvent.GET_REMOTE_JOB, () => {
      log.debug(`Remove listener ${AppEvent.GET_REMOTE_JOB}`);
    });
    appMain.store.removeListener(AppEvent.UPDATE_REMOTE_FILE_LIST, () => {
      log.debug(`Remove listener ${AppEvent.UPDATE_REMOTE_FILE_LIST}`);
    });
    appMain.store.removeListener(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS, () => {
      log.debug(`Remove listener ${AppEvent.GET_LOCAL_FILE_LIST_SUCCESS}`);
    });
    appMain.store.removeListener(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, () => {
      log.debug(`Remove listener ${AppEvent.GET_LOCAL_FILE_LIST_FAILURE}`);
    });
    appMain.store.removeListener(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB, () => {
      log.debug(`Remove listener ${AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB}`);
    });
    appMain.store.removeListener(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS, () => {
      log.debug(`Remove listener ${AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS}`);
    });
    appMain.store.removeListener(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE, () => {
      log.debug(`Remove listener ${AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE}`);
    });
    appMain.store.removeListener(AppEvent.DOWNLOAD_REMOTE_FILE, () => {
      log.debug(`Remove listener ${AppEvent.DOWNLOAD_REMOTE_FILE}`);
    });
    appMain.store.removeListener(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, () => {
      log.debug(`Remove listener ${AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS}`);
    });
    appMain.store.removeListener(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS, () => {
      log.debug(`Remove listener ${AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS}`);
    });
    appMain.store.removeListener(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE, () => {
      log.debug(`Remove listener ${AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE}`);
    });
  }
  notifyMessage(type, message) {
    $.notify({message: message}, {type: type, placement: {from: 'top', align: 'right'}});
  }
  render(templateVar) {
    log.debug('render');
    // filter current local directory files
    if (templateVar.localFiles && templateVar.localFiles.length > 0) {
      const tmpLocalFiles = templateVar.localFiles.filter(dir => {
        return dir.path === templateVar.localCurDir;
      })[0];
      if (tmpLocalFiles && tmpLocalFiles.files) {
        tmpLocalFiles.files.forEach((file, index, array) => {
          if (file.modification && (file.modification instanceof Date)) {
            array[index].modification = dateFormat.format(file.modification, 'yyyy/MM/dd');
          }
        });
        templateVar.localFiles = tmpLocalFiles.files;
      }
    }
    // filter current FlashAir directory files
    if (templateVar.remoteFiles && templateVar.remoteFiles.length > 0) {
      const tmpRemoteFiles = templateVar.remoteFiles.filter(dir => {
        return dir.path === templateVar.remoteCurDir;
      })[0];
      if (tmpRemoteFiles && tmpRemoteFiles.files) {
        templateVar.remoteFiles = tmpRemoteFiles.files;
      }
      // Set fetch more files start index
      templateVar.remoteStartIndex = tmpRemoteFiles.startIndex;
    }
    this._templateAddFileFlag(templateVar);
    const renderContent = filerTemplate(templateVar || this.baseTemplateVar);
    $('#app').html(renderContent);
    $('#flashair-selector').selectpicker('render');
    if (templateVar.flashairId) {
      $('#flashair-selector').selectpicker('val', templateVar.flashairId);
    }
    $('#flashair-selector').on('changed.bs.select', (event) => {
      log.debug('changed.bs.select');
      const selectFlashAirId = $(event.currentTarget).val();
      log.debug(selectFlashAirId);
      this.iotHubAction.changeFlashAir(selectFlashAirId);
    });
    $('.remote-files tr')
    .on('click', (event) => {
      $(event.currentTarget).toggleClass('fa-file-selected');
      $('.remote-files tr').each((index, tr) => {
        if (tr.id !== event.currentTarget.id) {
          $(tr).removeClass('fa-file-selected');
        }
      });
      const fileName = $(event.currentTarget).attr('data-file-name');
      this.onSelectRemoteFile(fileName);
    })
    .on('dblclick', (event) => {
      const fileMode = $(event.currentTarget).attr('data-file-mode');
      if (fileMode === Filer.files.mode.DIRECTORY) {
        let dirName = $(event.currentTarget).attr('data-file-name');
        if (dirName === Filer.files.special.PARENT_DIR) {
          this.changeRemoteParentDirecory();
          return;
        }
        const parentDir = appMain.store.getState().remoteCurDir || '/';
        if (parentDir === '/') {
          dirName = `/${dirName}`;
        } else {
          dirName = `${parentDir}/${dirName}`;
        }
        this.changeRemoteDirecory(dirName);
      }
    });
    $('.local-files tr')
    .on('click', (event) => {
      $(event.currentTarget).toggleClass('fa-file-selected');
      $('.local-files tr').each((index, tr) => {
        if (tr.id !== event.currentTarget.id) {
          $(tr).removeClass('fa-file-selected');
        }
      });
    })
    .on('dblclick', (event) => {
      const fileMode = $(event.currentTarget).attr('data-file-mode');
      if (fileMode === Filer.files.mode.DIRECTORY) {
        let dirName = $(event.currentTarget).attr('data-file-name');
        // if parent directory('..'), move to parent directory
        if (dirName === Filer.files.special.PARENT_DIR) {
          this.changeLocalParentDirecory();
          return;
        }
        const parentDir = appMain.store.getState().localCurDir;
        dirName = path.join(parentDir, dirName);
        this.changeLocalDirecory(dirName, false);
      }
    });
    $('#remote-cur-dir').on('change', (event) => {
      const dirName = $(event.currentTarget).val();
      // Check invalid path
      if (!dirName) {
        return;
      }
      this.changeRemoteDirecory(dirName, false);
    });
    $('#local-cur-dir').on('change', (event) => {
      const dirName = $(event.currentTarget).val();
      // Check invalid path, file exist, dose directory
      if (!dirName
        || !fs.existsSync(dirName)
        || !fs.statSync(dirName).isDirectory()) {
        return;
      }
      this.changeLocalDirecory(dirName, false);
    });
    $('#remote-parent-dir').on('click', () => {
      const curDir = appMain.store.getState().remoteCurDir;
      if (curDir === '/') {
        // if top directory, do nothing
        return;
      }
      // adjust top directory path
      let parentDir = curDir.substr(0, curDir.lastIndexOf('/'));
      if (parentDir === '') {
        parentDir = '/';
      }
      this.changeRemoteDirecory(parentDir, true);
    });
    $('#local-parent-dir').on('click', this.changeLocalParentDirecory);
    $('#remote-reload').on('click', this.refreshRemoteDirectory);
    $('#local-reload').on('click', this.refreshLocalDirectory);
    $('#download-button').on('click', this.onClickDownload);
    $('#remote-file-row-more-item').on('click', (event) => {
      const startIndex = $(event.currentTarget).attr('data-start-index');
      this.onClickMoreRemoteFiles(startIndex);
    });

    // Show FlashAir file loading
    if (templateVar.isFetchingFlashairs || templateVar.isFetchingRemoteFileList) {
      if (!this.remoteSpinner) {
        this.remoteSpinner = this._createSpinner();
      }
    } else if (!templateVar.isFetchingFlashairs && !templateVar.isFetchingRemoteFileList) {
      if (this.remoteSpinner) {
        this.remoteSpinner.stop();
        this.remoteSpinner = null;
      }
    }
  }
  _createSpinner() {
    return new Spinner({
      top: '120px',
      scale: 2,
      color: '#003399',
      lines: 8
    })
    .spin(document.getElementById('remote-file-area'));
  }
  _templateAddFileFlag(templateVar) {
    if (templateVar.localFiles) {
      templateVar.localFiles.forEach((localFile, index, array) => {
        array[index].isDirectory = (localFile.mode === Filer.files.mode.DIRECTORY);
        array[index].isParentDirectory = (localFile.name === Filer.files.special.PARENT_DIR);
      });
    }
    if (templateVar.remoteFiles) {
      templateVar.remoteFiles.forEach((remoteFile, index, array) => {
        array[index].isDirectory = (remoteFile.mode === Filer.files.mode.DIRECTORY);
        array[index].isParentDirectory = (remoteFile.name === Filer.files.special.PARENT_DIR);
      });
    }
  }
  onSelectRemoteFile(fileName) {
    this.iotHubAction.selectRemoteFile(fileName);
  }
  onClickDownload() {
    this.iotHubAction.requestUploadFile(appMain.store.getState())
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  requestRemoteFileList(flashAirId) {
    this.iotHubAction.requestRemoteFileList(Object.assign(
      appMain.store.getState(), {flashairId: flashAirId})
    )
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  changeRemoteDirecory(remoteNextDir, useCache) {
    this.iotHubAction.requestRemoteFileList(Object.assign(
      appMain.store.getState(), {
        remoteCurDir: remoteNextDir,
        selectedRemoteFile: null,
        isMoreRemoteFiles: false
    }
      ,useCache)
    )
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  changeLocalDirecory(localNextDir, useCache = false) {
    this.localFsAction.getLocalFileList(Object.assign(
      appMain.store.getState(), {localCurDir: localNextDir}
      ,useCache)
    )
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  changeRemoteParentDirecory() {
    const curDir = appMain.store.getState().remoteCurDir;
    if (curDir === '/') {
      // if top directory, do nothing
      return;
    }
    // adjust top directory path
    let parentDir = curDir.substr(0, curDir.lastIndexOf('/'));
    if (parentDir === '') {
      parentDir = '/';
    }
    this.changeRemoteDirecory(parentDir, true);
  }
  changeLocalParentDirecory() {
    const curDir = appMain.store.getState().localCurDir;
    if (curDir.match(/:\\$/) || (curDir === '/')) {
      // if top directory, do nothing
      return;
    }
    // adjust top directory path
    let parentDir = curDir.substr(0, curDir.lastIndexOf(path.sep));
    const parentDirMatch = curDir.match(/.+:$/);
    if (parentDirMatch && (parentDirMatch.length > 0)) {
      parentDir = parentDirMatch[0];
    } else if (parentDir === '') {
      parentDir = '/';
    }
    this.changeLocalDirecory(parentDir, false);
  }
  refreshRemoteDirectory() {
    this.iotHubAction.requestRemoteFileList(appMain.store.getState(), false)
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  refreshLocalDirectory() {
    this.localFsAction.getLocalFileList(appMain.store.getState(), false)
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  onClickMoreRemoteFiles(startIndex) {
    this.iotHubAction.requestRemoteFileList(appMain.store.getState(), true, startIndex)
    .catch(response => {
      log.error(response);
      if (response) {
        this.notifyMessage('danger', resources[this.locale].common_msg_process_failure);
      }
    });
  }
  watchRequestJob() {
    const curState = appMain.store.getState();
    this.iotHubAction.getJobs(curState)
    .then(response => {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      if (!response || !response.jobs) {
        log.debug('watchRequestJob() job empty or getting');
        setTimeout(this.watchRequestJob, this.refreshInterval);
        return;
      }
      const responderJobs = response.jobs.filter(job => job.responder_id = curState.curJobResponderId);
      if (responderJobs.length < 1) {
        log.debug('responderJobs not exist');
        setTimeout(this.watchRequestJob, this.refreshInterval);
        return;
      }
      const executedJobs = responderJobs.filter(job => {
        return ((job.status === IoTHubApiConst.jobs.status.EXECUTED)
          && (job.request));
      });
      log.debug('executedJobs');
      if (executedJobs && (executedJobs.length > 0)) {
        log.debug('takeInJobResults()');
        this.takeInJobResults(executedJobs);
        setTimeout(this.watchRequestJob, this.refreshInterval);
      } else {
        log.debug('watchRequestJob() job not execute yet');
        setTimeout(this.watchRequestJob, this.refreshInterval);
      }
    })
    .catch(response => {
      log.error(response);
    });
  }
  takeInJobResults(executedJobs) {
    for (let i = 0; i < executedJobs.length; i++) {
      const job = executedJobs[i];
      if (job.request.type === IoTHubApiConst.jobs.type.SCRIPT) {
        switch (job.request.path) {
          case FlashAIrScript.LIST:
            this._fetchRemoteFileList(job);
            break;
          case FlashAIrScript.UPLOAD:
            this._downloadFromRemote(job);
            break;
          default:
            break;
        }
      }
    }
  }
  _comparetorFiles(a, b) {
    // sort by mode(directory or file)
    // directory than file
    if (a.m < b.m) {
      return -1;
    } else if (b.m < a.m) {
      return 1;
    }
    // sort by name
    if (a.n.hasOwnProperty('localeCompare')) {
      const nameCmp = a.n.localeCompare(b.n);
      if (nameCmp !== 0) {
        // ASC sort
        return nameCmp;
      }
    }
    // ASC sort
    if (a.n < b.n) {
      return -1;
    } else if (b.n < a.n) {
      return 1;
    }
    // sort by timestamp
    return a.u - b.u;
  }
  _fetchRemoteFileList(job) {
    const curState = appMain.store.getState();
    if ((job.response)
      && (job.response.result)
      && (job.response.result.length > 0)) {
      const curRemoteFiles = curState.remoteFiles || [];
      let fetchedDir = curRemoteFiles.filter(dir => {
        return dir.path !== job.request.arguments.current_path;
      });
      let prevDir = curRemoteFiles.filter(dir => {
        return dir.path === job.request.arguments.current_path;
      });
      if (prevDir.length > 0) {
        prevDir = prevDir[0];
      } else {
        prevDir = null;
      }
      job.response.result.forEach((file, index, array) => {
        // Mapping shot protperty to regureler property
        array[index].name = file.n;
        array[index].mode = file.m;
        // formatting modification timestamp
        array[index].modification = dateFormat.format(fatDateToDate(file.u), 'yyyy/MM/dd');
      });
      
      let nextFiles = job.response.result;
      let isMoreFiles = false;
      // Cut fetch size
      if (nextFiles.length > FlashAIrScript.LIST_FETCH_MAX) {
        nextFiles = nextFiles.slice(0, FlashAIrScript.LIST_FETCH_MAX);
        isMoreFiles = true;
      }
      // Add previous directory items
      if (prevDir && prevDir.startIndex > 0) {
        nextFiles = prevDir.files.concat(nextFiles);
        // Remove parent directory item
        nextFiles.shift();
        // Merge and Uniq
        const newFileMap = new Map();
        nextFiles.forEach(file => newFileMap.set(file.name, file));
        nextFiles.length = 0;
        for (let file of newFileMap.values()) {
          nextFiles.push(file);
        }
      }
      let remoteFileStartIndex = nextFiles.length;
      nextFiles.sort(this._comparetorFiles);
      // Add move parent directory item
      nextFiles.unshift({
        name: Filer.files.special.PARENT_DIR,
        mode: Filer.files.mode.DIRECTORY,
        modification: ''
      });
      fetchedDir = fetchedDir.concat([{
        path: job.request.arguments.current_path,
        startIndex: remoteFileStartIndex,
        files: nextFiles
      }]);
      this.iotHubAction.updateFiles({
        remoteFiles: fetchedDir,
        isMoreRemoteFiles: isMoreFiles
      });
      this.iotHubAction.deleteJob(curState, job)
      .catch(message => {
        log.error(message);
      });
    }
  }
  _downloadFromRemote(job) {
    if (job.response && job.response.result) {
      this.iotHubAction.downloadFromRemote(appMain.store.getState(), job.response.result)
      .then(() => {
        this.localFsAction.getLocalFileList(appMain.store.getState())
        .catch(message => {
          log.error(message);
        });
        return this.iotHubAction.deleteJob(appMain.store.getState(), job);
      })
      .catch(message => {
        log.error(message);
      });
    }
  }
}
