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

import request from 'request';

import {AuthorizationRequest} from '@openid/appauth/built/authorization_request';
import {AuthorizationNotifier, AuthorizationRequestResponse, BUILT_IN_PARAMETERS} from '@openid/appauth/built/authorization_request_handler';
import {AuthorizationResponse} from '@openid/appauth/built/authorization_response';
import {AuthorizationServiceConfiguration} from '@openid/appauth/built/authorization_service_configuration';
import {cryptoGenerateRandom} from '@openid/appauth/built/crypto_utils';
import {AppAuthError} from '@openid/appauth/built/errors';
import {NodeBasedHandler} from '@openid/appauth/built/node_support/node_request_handler';
import {NodeRequestor} from '@openid/appauth/built/node_support/node_requestor';
import {BasicQueryStringUtils} from '@openid/appauth/built/query_string_utils';
import {LocalStorageBackend} from '@openid/appauth/built/storage';
import {GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN, TokenRequest} from '@openid/appauth/built/token_request';
import {BaseTokenRequestHandler, TokenRequestHandler} from '@openid/appauth/built/token_request_handler';
import {TokenError, TokenResponse} from '@openid/appauth/built/token_response';
import {StringMap} from '@openid/appauth/built/types';

import log from 'electron-log';
import {Base64} from 'js-base64';
import jsSHA from 'jssha';
import keytar from 'keytar';

import {iothub_api_config, DEFAULT_REDIRECT_PORT} from '../common/config';
import {resources} from '../common/resources';

export class AuthAccessToken {
  constructor(accessToken = null, refreshToken = null, expireAt = null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expireAt = expireAt;
  }
  isValid() {
    // token not exist
    if ((! this.accessToken) || (! this.refreshToken)) {
      return false;
    }
    const now = Math.round(new Date().getTime() / 1000);
    // token expired
    if (this.expireAt < now) {
      return false;
    }
    // token availabeled
    return true;
  }
  toJson() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expireAt: this.expireAt
    };
  }
}

// customize for FlashAir IoT Hub
class IoTHubQueryStringUtils extends BasicQueryStringUtils {
  // override for state Authorization query
  stringify(input) {
    return super.stringify(input).replace(/\./g, '%2E');
  }
}

class IoTHubTokenRequestHandler extends BaseTokenRequestHandler {
  performTokenRequest(configuration, request) {
    const tokenResponse = this.requestor.xhr({
      url: configuration.tokenEndpoint,
      method: 'POST',
      // comment out json dataType, 
      // because IoT Hub request body use standard http payload
      // dataType: 'json',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: this.utils.stringify(request.toStringMap())
    });
    return tokenResponse
      .then(body => JSON.parse(body))
      .then(response => {
        // check for error response
        if (this.isTokenResponse(response)) {
            return TokenResponse.fromJson(response);
        }
        else {
            return Promise.reject(new AppAuthError(response.error, TokenError.fromJson(response)));
        }
      });
  }
}

class CodePair {
  constructor() {
    this.codeVrifier = null;
    this.codeChallenge = null;
    // only SHA-256
    this.codeChallengeMethod = 'S256';
  }
  generate() {
    this.codeVrifier = this._makeCodeVerifier();
    this.codeChallenge = this._makeCodeChallenge(this.codeVrifier);
  }
  _makeCodeVerifier() {
    // minimum raw length 32
    // see: https://tools.ietf.org/html/rfc7636#section-4.1
    return Base64.encodeURI(cryptoGenerateRandom(32));
  }
  // Base64url Encoding without Padding
  // see: https://tools.ietf.org/html/rfc7636#appendix-A
  _makeCodeChallenge(codeVrifier) {
    // calculate SHA-256 hash
    const hashEncoder = new jsSHA('SHA-256', 'TEXT');
    hashEncoder.update(codeVrifier);
    // Base64 encoding and Remove any trailing '='
    let codeChallenge = hashEncoder.getHash('B64').split('=')[0];
    // Replace enable url charactor for Base64url
    codeChallenge = codeChallenge.replace(/\+/g, '-');
    codeChallenge = codeChallenge.replace(/\//g, '_');
    return codeChallenge;
  }
}

export class Auth {
  constructor(config = {
    authorizationEndPoint,
    tokenEndPoint,
    clientId,
    redirectUri,
    scope,
    redirectPort,
    usePCKE
  }, action, tokenStoreHander) {
    if (!config) {
      throw new Error('Configuration is not specified.');
    }
    log.debug(config);
    log.debug(action);
    log.debug(tokenStoreHander);
    this.config = config;
    this.action = action;
    this.tokenStoreHander = tokenStoreHander || function(token) {log.debug(token);};
    this.authConfiguration = new AuthorizationServiceConfiguration(
      config.authorizationEndPoint,
      config.tokenEndPoint
    );
    this.notifier = new AuthorizationNotifier();
    this.authorizationHandler = new NodeBasedHandler(
      config.redirectPort, new IoTHubQueryStringUtils());
    this.requestor = new NodeRequestor();
    this.tokenHandler = new IoTHubTokenRequestHandler(this.requestor);
    this.authorizationHandler.setAuthorizationNotifier(this.notifier);
    this.notifier.setAuthorizationListener((request, response, error) => {
      if (error) {
        log.error(error);
        return this.action.invalidAccessToken(error);
      }
      if (response) {
        if (this.authState !== response.state) {
          return this.action.invalidAccessToken(resources.auth_msg_invalid_access_token);
        }
        this._performWithInitTokenRequest(response.code)
        // .then(accessToken => this._performWithFreshTokens(accessToken))
        .then(accessToken => {
          log.debug(accessToken);
          log.debug(accessToken.toJson);
          return this.action.updateAccessToken(accessToken.toJson());
        })
        .catch(e => {
          if (!e) {
            return;
          }
          log.error(e);
          if (e instanceof Error) {
            this.action.invalidAccessToken(e.message);
          } else {
            this.action.invalidAccessToken(e);
          }
        });
      }
    });
    // use OAuth PKCE
    this.usePKCE = config.usePKCE;
    this._initAuthState(config.usePKCE);
  }
  _initAuthState(usePKCE) {
    this.authState = null;
    this.accessTokenResponse = null;
    this.accessToken = null;
    this.codePair = usePKCE ? new CodePair() : undefined;
  }
  authorization(accessToken = null) {
    if (!accessToken || (!accessToken.isValid() && !accessToken.refreshToken)) {
      this.performAuthorizationRequest();
      return Promise.resolve();
    } else {
      return this._performWithFreshTokens(accessToken)
      .then(newAccessToken => {
        return this.action.updateAccessToken(newAccessToken.toJson());
      });
    }
  }
  performAuthorizationRequest() {
    if (!this.config || !this.authConfiguration) {
      log.error('Unknown service configuration');
      return;
    }
    this.authState = cryptoGenerateRandom(10);
    // extra prameter for OAuth PKCE code_challenge
    const extra = [];
    if (this.codePair) {
      this.codePair.generate();
      log.debug('generate code pair');
      extra['code_challenge_method'] = this.codePair.codeChallengeMethod;
      extra['code_challenge'] = this.codePair.codeChallenge;
      log.debug(extra);
    }
    // create a request
    const request = new AuthorizationRequest(
      this.config.clientId, this.config.redirectUri, this.config.scope,
      AuthorizationRequest.RESPONSE_TYPE_CODE,
      this.authState, extra);

    this.authorizationHandler.performAuthorizationRequest(
        this.authConfiguration, request);
  }
  _performWithInitTokenRequest(code) {
    if (!this.authConfiguration) {
      return Promise.resolve();
    }
    const extra = [];
    if (this.codePair) {
      extra['code_verifier'] = this.codePair.codeVrifier;
      log.debug(extra);
    }
    // use the code to make the token request.
    const request = new TokenRequest(
      this.config.clientId, this.config.redirectUri,
      GRANT_TYPE_AUTHORIZATION_CODE, code, undefined, extra);

    return this.tokenHandler.performTokenRequest(this.authConfiguration, request)
    .then(response => {
      this.accessTokenResponse = response;
      return new AuthAccessToken(
        response.accessToken,
        response.refreshToken,
        response.issuedAt + response.expiresIn
      );
    })
    .then(this.tokenStoreHander);
  }
  _performWithFreshTokens(accessToken) {
    if (!this.config || !this.authConfiguration) {
      return Promise.reject('Unknown service configuration');
    }
    if (!accessToken || !accessToken.refreshToken) {
      return Promise.resolve('Missing refreshToken.');
    }
    if (accessToken && accessToken.isValid()) {
      log.debug('accessToken is valid');
      // do nothing
      return Promise.resolve(accessToken);
    }
    const request = new TokenRequest(
      this.config.clientId, this.config.redirectUri,
      GRANT_TYPE_REFRESH_TOKEN, undefined, accessToken.refreshToken);
    return this.tokenHandler.performTokenRequest(this.authConfiguration, request)
    .then(response => {
      this.accessTokenResponse = response;
      return new AuthAccessToken(
        response.accessToken,
        response.refreshToken,
        response.issuedAt + response.expiresIn
      );
    })
    .then(this.tokenStoreHander);
  }
  logout() {
    // Clear authorize state
    this._initAuthState(this.usePKCE);
  }
}