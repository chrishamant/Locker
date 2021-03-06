/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var path   = require('path')
  , lastfm = require(path.join(__dirname, 'lib.js'));

exports.sync = function (processInfo, cb) {
    var info = [];

    lastfm.getInfo(processInfo
                 , function (me) {
                       info = [me];
                   }
                 , function (err) {
                       if (err) {
                           console.error(err);
                           cb(err);
                       }
                       else {
                           processInfo.auth.profile = info;
                           cb(null, {data : {info : info}, auth: processInfo.auth});
                       }
                   }
    );
};
