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

import {ipcRenderer, remote} from 'electron';
import log from 'electron-log';

import $ from 'jquery';
import Bootstrap from 'bootstrap';
import BootstrapSelect from 'bootstrap-select';
import Handlebars from 'handlebars';

import {resources} from '../common/resources';
import {AppEvent} from '../common/event';
import indexTemplate from './view/index_tmpl.hbs';
import {FilerPage} from './view/filer';

const appMain = remote.require('./main');

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  require('source-map-support').install();
}

class IndexPage {
  constructor() {
    this.baseTemplateVar = Object.assign({}, resources);
    // bind methods
    this.render = this.render.bind(this);
    this.redirectPageIfAuthorized = this.redirectPageIfAuthorized.bind(this);
    // store callback event
    this.redirected = false;
    appMain.store.on(AppEvent.UPDATE_TOKEN, state => {
      console.debug(AppEvent.UPDATE_TOKEN);
      this.redirectPageIfAuthorized(state);
    });
    appMain.store.on(AppEvent.INVALID_TOKEN, state => {
      console.debug(AppEvent.INVALID_TOKEN);
      this.redirectPageIfAuthorized(state);
    });
    appMain.store.on(AppEvent.INIT_TOKEN, state => {
      console.debug(AppEvent.INIT_TOKEN);
      this.redirected = false;
      if (this.pages.filer) {
        this.pages.filer.unmount();
      }
      this.redirectPageIfAuthorized(state);
    });
    this.pages = {
      filer: new FilerPage()
    };
  }
  render(templateVar) {
    const renderContent = indexTemplate(templateVar || this.baseTemplateVar);
    $('#app').html(renderContent);
  }
  redirectPageIfAuthorized(state) {
    if (this.redirected) {
      return;
    }
    if (state.accessToken !== null) {
      // change page filer page;
      this.redirected = true;
      appMain.store.removeListener(AppEvent.UPDATE_TOKEN, () => {
        log.debug(`Remove listener ${AppEvent.UPDATE_TOKEN}`);
      });
      appMain.store.removeListener(AppEvent.INVALID_TOKEN, () => {
        log.debug(`Remove listener ${AppEvent.INVALID_TOKEN}`);
      });
      this.pages.filer.mount(state);
      return;
    }
    const templateVar = Object.assign(this.baseTemplateVar, state);
    this.render(templateVar);
  }
}

$(function() {
  log.debug('load index.html');
  const indexPage = new IndexPage();
  const state = appMain.store.getState();
  indexPage.redirectPageIfAuthorized(state);
  window.indexPage = indexPage;
});
