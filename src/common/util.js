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

export const fatDateToDate = (fatDate) => {
  if (fatDate === 0) {
    return new Date(1980, 0, 1, 0, 0, 0);
  }
  const year = ((fatDate >> 25) & 0x7F) + 1980;
  const month = ((fatDate >> 21) & 0x0F);
  const date = ((fatDate >> 16) & 0x1F);
  const hour = ((fatDate >> 11) & 0x1F);
  const minutes = ((fatDate >> 5) & 0x3F);
  const secound = (fatDate & 0x1F) * 2;
  // JavaScript mounth of Date is zero-based
  return new Date(year, (month - 1), date, hour, minutes, secound);
};
export const dateFormat = {
  fmt: {
    yyyy: date => date.getFullYear().toString(),
    MM: date => `0${(date.getMonth() + 1)}`.slice(-2),
    dd: date => `0${date.getDate()}`.slice(-2),
    hh: date => `0${date.getHours()}`.slice(-2),
    mm: date => `0${date.getMinutes()}`.slice(-2),
    ss: date => `0${date.getSeconds()}`.slice(-2),
  },
  format: (date, format) => {
    let result = format;
    Object.keys(dateFormat.fmt).forEach(key => {
      result = result.replace(key, dateFormat.fmt[key](date));
    });
    return result;
  },
};
export const basename = path => {
  const base = path.substr(path.lastIndexOf('/') + 1);
  return base.replace(new RegExp('$', 'g'), '');
};
