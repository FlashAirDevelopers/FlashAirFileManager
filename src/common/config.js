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

const OAUTH_BASE_URL = 'https://iot-hub-api.flashair-developers.com';
export const DEFAULT_REDIRECT_PORT = 8900;
export const iothub_api_config = {
    authorizationEndPoint: OAUTH_BASE_URL + '/v1/authorize',
    tokenEndPoint: OAUTH_BASE_URL + '/v1/token',
    clientId: 'Nf4kfjC723uenOFJKB0a59',
    redirectUri: 'http://127.0.0.1:' + DEFAULT_REDIRECT_PORT,
    scope: 'user.read flashair.read flashair.write',
    redirectPort: DEFAULT_REDIRECT_PORT,
    usePKCE: true
};
export const storageKey = {
    serviceName: 'iot-hub.flashair-developers.com.api',
    accessToken: 'iot-hub.flashair-developers.com.api.access_token',
    refreshToken: 'iot-hub.flashair-developers.com.api.refresh_token',
    expireAt: 'iot-hub.flashair-developers.com.api.expire_at'
};
export const IoTHubApi = {
    baseUrl: 'https://iot-hub-api.flashair-developers.com',
    flashairs: '/v1/flashairs',
    jobs: '/v1/flashairs/{flashair_id}/jobs',
    files: '/v1/flashairs/{flashair_id}/files',
};
export const FlashAIrScript = {
    LIST: '/list_file.lua',
    UPLOAD: '/upload_file.lua'
};
