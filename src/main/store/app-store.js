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

import os from 'os';
import {EventEmitter} from 'events';
import log from 'electron-log';

import {AppEvent} from '../../common/event';

export class AppStore extends EventEmitter {
    constructor(dispatcher) {
        super();
        this.dispatcher = dispatcher;
        // State
        this._initialState = {
            // String
            accessToken: null,
            // String
            refreshToken: null,
            // Number unit:seconds
            expireAt: null,
            // object array registered FlashAir (id, name) list
            flashairs: [],
            // String current display flashair id
            flashairId: null,
            // obbject array FlashAir file list
            /*
             * [{
             *   path:<parent full path>,
             *   files:[{
             *     name:<file name>
             *     mode:<file type: file, directory>
             *     size:<file size>
             *     modification:<file modification timestamp>
             * },
             * {...}
             * ]
             */
            localFiles: [],
            remoteFiles: [],
            // String current local directory path
            localCurDir: os.homedir(),
            // String currnent remote direcotry path
            remoteCurDir: '/',
            // Number current waiting responder id
            curJobResponderId: null,
            // String selected FlashAir file name
            selectedRemoteFile: null,
            // Number download progress percent
            downloadProgress: 0,
            // async state
            // boolean get FlashAir Job
            isGettingJob: false,
            // boolean fetch FlashAir list
            isFetchingFlashairs: false,
            // boolean get local file list
            isGetingLocalFileList: false,
            // boolean fetch remote file list
            isFetchingRemoteFileList: false,
            // boolean delete FlashAir job
            isDeletingRemoteJob: false,
            // boolean request job download remote file
            isRequestDownloadingRemoteFile: false,
            // boolean download remote file
            isDownloadingRemoteFile: false,
            // boolean get download progress
            isGettingDownloadProgress: false,
            // boolean logout from FlashAir IoT Hub
            isLogoutingIoTHub: false,
            // String error message
            message: ''
        };
        this.state = Object.assign({}, this._initialState);
        // bind methods
        this.getState = this.getState.bind(this);
        // Actions
        this.dispatcher.on(AppEvent.UPDATE_TOKEN, this._updateToken.bind(this));
        this.dispatcher.on(AppEvent.INVALID_TOKEN, this._invalidAccessToken.bind(this));
        this.dispatcher.on(AppEvent.INIT_STATE, this._initState.bind(this));
        this.dispatcher.on(AppEvent.DELETE_REMOTE_JOB, this._deleteRemoteJobOnStart.bind(this));
        this.dispatcher.on(AppEvent.DELETE_REMOTE_JOB_SUCCESS, this._deleteRemoteJobOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.DELETE_REMOTE_JOB_FAILURE, this._deleteRemoteJobOnFailure.bind(this));
        this.dispatcher.on(AppEvent.FETCH_FLASHAIRS, this._fetchFlashAirsOnStart.bind(this));
        this.dispatcher.on(AppEvent.FETCH_FLASHAIRS_SUCCESS, this._fetchFlashAirsOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.FETCH_FLASHAIRS_FAILURE, this._fetchFlashAirsOnFailure.bind(this));
        this.dispatcher.on(AppEvent.CHANGE_FLASHAIR, this._changeFlashAir.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_REMOTE_FILE_LIST, this._requestFlashAirFileListOnStart.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_REMOTE_FILE_LIST_SUCCESS, this._requestFlashAirFileListOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE, this._requestFlashAirFileListOnFailure.bind(this));
        this.dispatcher.on(AppEvent.UPDATE_REMOTE_FILE_LIST, this._updateRemoteFileList.bind(this));
        this.dispatcher.on(AppEvent.GET_LOCAL_FILE_LIST, this._getLocalFileListOnStart.bind(this));
        this.dispatcher.on(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS, this._getLocalFileListOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, this._getLocalFileListOnFailure.bind(this));
        this.dispatcher.on(AppEvent.SELECT_REMOTE_FILE, this._selectRemoteFile.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB, this._requestTransferIoTHubOnstart.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS, this._requestTransferIoTHubOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE, this._requestTransferIoTHubOnFailure.bind(this));
        this.dispatcher.on(AppEvent.DOWNLOAD_REMOTE_FILE, this._downloadRemoteFileOnstart.bind(this));
        this.dispatcher.on(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, this._downloadRemoteFileOnProgress.bind(this));
        this.dispatcher.on(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS, this._downloadRemoteFileOnSuccess.bind(this));
        this.dispatcher.on(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE, this._downloadRemoteFileOnFailure.bind(this));
    }
    getState() {
        return Object.assign({}, this.state);
    }
    _initState() {
        this.state = Object.assign({}, this._initialState);
        this.emit(AppEvent.INIT_STATE, this.state);
    }
    _updateToken(updateToken) {
        this.state.accessToken = updateToken.accessToken;
        this.state.refreshToken = updateToken.refreshToken;
        this.state.expireAt = updateToken.expireAt;
        this.emit(AppEvent.UPDATE_TOKEN, this.state);
    }
    _invalidAccessToken(message) {
        this.state.message = message;
        this.emit(AppEvent.INVALID_TOKEN, this.state);
    }
    _fetchFlashAirsOnStart({isFetchingFlashairs}) {
        this.state.isFetchingFlashairs = isFetchingFlashairs;
        this.emit(AppEvent.FETCH_FLASHAIRS, this.state);
    }
    _fetchFlashAirsOnSuccess({isFetchingFlashairs, flashairs}) {
        this.state.isFetchingFlashairs = isFetchingFlashairs;
        this.state.flashairs = flashairs;
        this.state.flashairId = flashairs[0] ? flashairs[0].id : this.state.flashairId;
        this.emit(AppEvent.FETCH_FLASHAIRS_SUCCESS, this.state);
    }
    _fetchFlashAirsOnFailure({isFetchingFlashairs, message}) {
        this.state.isFetchingFlashairs = isFetchingFlashairs;
        this.state.message = message;
        this.emit(AppEvent.FETCH_FLASHAIRS_FAILURE, this.state);
    }
    _changeFlashAir({flashairId, remoteCurDir, isFetchingRemoteFileList, remoteFiles}) {
        this.state.flashairId = flashairId;
        this.state.remoteCurDir = remoteCurDir;
        this.state.remoteFiles = remoteFiles;
        this.state.isFetchingRemoteFileList = isFetchingRemoteFileList;
        this.emit(AppEvent.CHANGE_FLASHAIR, this.state);
    }
    _requestFlashAirFileListOnStart({isFetchingRemoteFileList, flashairId, remoteCurDir}) {
        this.state.isFetchingRemoteFileList = isFetchingRemoteFileList;
        this.state.flashairId = flashairId;
        this.state.remoteCurDir = remoteCurDir;
        this.state.curJobResponderId = null;
        this.emit(AppEvent.REQUEST_REMOTE_FILE_LIST, this.state);
    }
    _requestFlashAirFileListOnSuccess({isFetchingRemoteFileList, curJobResponderId}) {
        this.state.isFetchingRemoteFileList = isFetchingRemoteFileList;
        this.state.curJobResponderId = curJobResponderId;
        this.state.message = null;
        this.emit(AppEvent.REQUEST_REMOTE_FILE_LIST_SUCCESS, this.state);
    }
    _requestFlashAirFileListOnFailure({isFetchingRemoteFileList, message}) {
        this.state.isFetchingRemoteFileList = isFetchingRemoteFileList;
        this.state.message = message;
        this.emit(AppEvent.REQUEST_REMOTE_FILE_LIST_FAILURE, this.state);
    }
    _addRequestJob({remoteJob}) {
        const existJob = this.state.remoteRequestingJobs.find(job => {
            return job.id === remoteJob.id;
        });
        if (!existJob) {
            this.state.remoteRequestingJobs.push(remoteJob);
        }
        this.emit(AppEvent.ADD_REMOTE_JOB, this.state);
    }
    _deleteRemoteJobOnStart({isDeletingRemoteJob}) {
        this.state.isDeletingRemoteJob = isDeletingRemoteJob;
        this.emit(AppEvent.DELETE_REMOTE_JOB);
    }
    _deleteRemoteJobOnSuccess({isDeletingRemoteJob}) {
        this.state.isDeletingRemoteJob = isDeletingRemoteJob;
        this.state.message = null;
        this.emit(AppEvent.DELETE_REMOTE_JOB_SUCCESS);
    }
    _deleteRemoteJobOnFailure({isDeletingRemoteJob, message}) {
        this.state.isDeletingRemoteJob = isDeletingRemoteJob;
        this.state.message = message;
        this.emit(AppEvent.DELETE_REMOTE_JOB_FAILURE);
    }
    _updateRemoteFileList({remoteFiles, isFetchingRemoteFileList}) {
        this.state.isFetchingRemoteFileList = isFetchingRemoteFileList;
        this.state.remoteFiles = remoteFiles;
        this.emit(AppEvent.UPDATE_REMOTE_FILE_LIST, this.state);
    }
    _getLocalFileListOnStart({isGetingLocalFileList}) {
        this.state.isGetingLocalFileList = isGetingLocalFileList;
        this.emit(AppEvent.GET_LOCAL_FILE_LIST, this.state);
    }
    _getLocalFileListOnSuccess({isGetingLocalFileList, localCurDir, localFiles}) {
        this.state.isGetingLocalFileList = isGetingLocalFileList;
        this.state.localCurDir = localCurDir;
        this.state.localFiles = localFiles;
        this.state.message = null;
        this.emit(AppEvent.GET_LOCAL_FILE_LIST_SUCCESS, this.state);
    }
    _getLocalFileListOnFailure({isGetingLocalFileList, message}) {
        this.state.isGetingLocalFileList = isGetingLocalFileList;
        this.state.message = message;
        this.emit(AppEvent.GET_LOCAL_FILE_LIST_FAILURE, this.state);
    }
    _selectRemoteFile({selectedRemoteFile}) {
        this.state.selectedRemoteFile = selectedRemoteFile;
        this.emit(AppEvent.SELECT_REMOTE_FILE, this.state);
    }
    _requestTransferIoTHubOnstart({isRequestDownloadingRemoteFile, downloadProgress, selectedRemoteFile}) {
        this.state.isRequestDownloadingRemoteFile = isRequestDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.state.selectedRemoteFile = selectedRemoteFile;
        this.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB, this.state);
    }
    _requestTransferIoTHubOnSuccess({isRequestDownloadingRemoteFile, downloadProgress}) {
        this.state.isRequestDownloadingRemoteFile = isRequestDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.state.message = null;
        this.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_SUCCESS, this.state);
    }
    _requestTransferIoTHubOnFailure({isRequestDownloadingRemoteFile, downloadProgress, message}) {
        this.state.isRequestDownloadingRemoteFile = isRequestDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.state.message = message;
        this.selectedRemoteFile = null;
        this.emit(AppEvent.REQUEST_TRANSFER_REMOTE_TO_IOTHUB_FAILURE, this.state);
    }
    _downloadRemoteFileOnstart({isDownloadingRemoteFile, downloadProgress}) {
        this.state.isDownloadingRemoteFile = isDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.emit(AppEvent.DOWNLOAD_REMOTE_FILE, this.state);
    }
    _downloadRemoteFileOnProgress({downloadProgress}) {
        this.state.downloadProgress = downloadProgress;
        this.emit(AppEvent.DOWNLOAD_REMOTE_FILE_PROGRESS, this.state);
    }
    _downloadRemoteFileOnSuccess({isDownloadingRemoteFile, downloadProgress}) {
        this.state.isDownloadingRemoteFile = isDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.state.message = null;
        this.state.selectedRemoteFile = null;
        this.emit(AppEvent.DOWNLOAD_REMOTE_FILE_SUCCESS, this.state);
    }
    _downloadRemoteFileOnFailure({isDownloadingRemoteFile, downloadProgress, message}) {
        this.state.isDownloadingRemoteFile = isDownloadingRemoteFile;
        this.state.downloadProgress = downloadProgress;
        this.state.message = message;
        this.state.selectedRemoteFile = null;
        this.emit(AppEvent.DOWNLOAD_REMOTE_FILE_FAILURE, this.state);
    }
}
