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

import log from 'electron-log';
import keytar from 'keytar';

import {iothub_api_config, storageKey} from '../common/config';
import {Auth, AuthAccessToken} from './auth';
import {TokenAction} from './action/token-action';
import {AppStore} from './store/app-store';

export class App {
    constructor(dispatcher) {
        this.tokenAction = new TokenAction(dispatcher);
        this.auth = new Auth(
            iothub_api_config,
            this.tokenAction,
            this._storeToken
        );
        this.loadToken();
    }
    logout() {
        return Promise.all([
            keytar.deletePassword(
                storageKey.serviceName,
                storageKey.accessToken
            ),
            keytar.deletePassword(
                storageKey.serviceName,
                storageKey.refreshToken
            ),
            keytar.deletePassword(
                storageKey.serviceName,
                storageKey.expireAt
            )]
        )
        .then(() => {
            this.auth.logout();
        })
        .catch(e => log.error(e));
    }
    _storeToken(accessToken) {
        return keytar.setPassword(
            storageKey.serviceName,
            storageKey.accessToken,
            accessToken.accessToken
        )
        .then(() => {
            return keytar.setPassword(
                storageKey.serviceName,
                storageKey.refreshToken,
                accessToken.refreshToken
            );
        })
        .then(() => {
            return keytar.setPassword(
                storageKey.serviceName,
                storageKey.expireAt,
                accessToken.expireAt
            );
        })
        .then(() => {
            return accessToken;
        });
    }
    loadToken() {
        // load IoT Hub access token if saved
        let accessToken = null;
        let refreshToken = null;
        let expireAt = null;
        return keytar.getPassword(
            storageKey.serviceName,
            storageKey.accessToken
        ).then(value => {
            accessToken = value;
            return keytar.getPassword(
                storageKey.serviceName,
                storageKey.refreshToken
            );
        }).then(value => {
            refreshToken = value;
            return keytar.getPassword(
                storageKey.serviceName,
                storageKey.expireAt
            );
        }).then(value => {
            expireAt = value;
            let token = null;
            // access token not exist or first run
            if ((accessToken || refreshToken) && expireAt) {
                token = new AuthAccessToken(
                    accessToken, refreshToken, expireAt);
                log.debug('access token valid');
                log.debug(token.isValid());
            }
            return this.auth.authorization(token)
            .catch(e => log.error(e));
        });
    }
}
