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

import {AppEvent} from '../../common/event';

export class TokenAction {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
  }
  updateAccessToken({accessToken, refreshToken, expireAt}) {
    this.dispatcher.emit(AppEvent.UPDATE_TOKEN, {
      accessToken,
      refreshToken,
      expireAt
    });
  }
  invalidAccessToken(message) {
    this.dispatcher.emit(AppEvent.INVALID_TOKEN, message);
  }
}