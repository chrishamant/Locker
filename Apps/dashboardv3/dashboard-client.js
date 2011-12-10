/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express')
  , connect = require('connect')
  , locker
  , request = require('request')
  , lconfig = require(__dirname + '/../../Common/node/lconfig.js')
  , github = false
  , form = require('connect-form')
  , uistate = require(__dirname + '/state')
  , profileImage = 'img/default-profile.png'
  , page = ''
  , oauthPopupSizes = {foursquare: {height: 540,  width: 960},
                 github: {height: 1000, width: 1000},
                 twitter: {width: 630, height: 500},
                 tumblr: {width: 630, height: 500},
                 facebook: {width: 980, height: 705},
                 instagram: {width: 800, height: 500},
                 flickr: {width: 1000, height: 877}
                };

module.exports = function(passedLocker, passedExternalBase, listenPort, callback) {
    lconfig.load('../../Config/config.json');
    locker = passedLocker;
    app.listen(listenPort, callback);
    // hackzzzzzzzzzzzzzzzzz
    // will replace when we have a reasonable notion of a user's profile
    request.get({url:locker.lockerBase + "/synclets/facebook/get_profile"}, function(error, res, body) {
        try {
            var body = JSON.parse(body);
            if (body.username) {
                profileImage = "http://graph.facebook.com/" + body.username + "/picture";
            }
        } catch (E) {}
    });

};

var app = express.createServer();
app.use(express.cookieParser());

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(form({ keepExtensions: true }));
    app.use(express.static(__dirname + '/static'));
    app.dynamicHelpers({
        dashboard: function(req, res) {
            return lconfig.dashboard;
        },
        profileImage: function(req, res) {
            return profileImage;
        },
        page: function(req, res) {
            return page;
        }
    });
});

var clickApp = function(req, res) {
    var clickedApp = req.params.app;
    if (clickedApp) {
        uistate.appClicked(clickedApp);
    }
    res.end();
}

var renderApps = function(req, res) {
    uistate.fetchState();
    getAppsInfo(null, function(sortedResult) {
        res.render('iframe/appsList', {
            layout: false,
            apps: sortedResult,
            dashboard: lconfig.dashboard
        });
    })
}

var renderCreate = function(req, res) {
    page = 'create';
    getGithubApps(function(apps) {
        res.render('create', {
            apps: apps
        });
    });
}

var renderPublish = function(req, res) {
    getGithubApps(function(apps) {
        res.render('iframe/publish', {
            layout: false,
            apps: apps
        });
    });
}

var submitPublish = function(req, res) {
    if (req.form) {
        req.form.complete(function(err, fields, files) {
            res.writeHead(200, {});
            if (err) res.write(JSON.stringify(err.message));
            res.write(JSON.stringify(fields));
            res.write(JSON.stringify(files));
            res.end();
        });
    } else {
        res.send(req.body);
    }
}

var getAppsInfo = function(count, callback) {
    locker.map(function(err, map) {
        var result = [];
        var sortedResult = [];
        for (var i in map.installed) {
            if ((map.installed[i].is === 'app' || map.installed[i].type === 'app') && !map.installed[i].hidden) {
                result.push(map.installed[i]);
            }
        }
        var recentApps = uistate.getNLastUsedApps(count);
        var added = {};
        for (var i = 0; i < recentApps.length; i++) {
            for (var j in result) {
                if (result[j].id === recentApps[i].name && result[j].static) {
                    result[j].lastUsed = recentApps[i].lastUsed;
                    sortedResult.push(result[j]);
                    added[j] = true;
                    break;
                }
            }
        }
        for (var i in result) {
            if(result[i].static && !added[i]) sortedResult.push(result[i]);
        }
        callback(sortedResult);
    });
}

var renderYou = function(req, res) {
    uistate.fetchState();
    getAppsInfo(8, function(sortedResult) {
        locker.synclets(function(err, synclets) {
            for (var i in synclets.installed) {
                if (i === 'github') { github = true; }
                synclets.available.some(function(synclet) {
                    if (synclet.provider === synclets.installed[i].provider) {
                        synclets.available.splice(synclets.available.indexOf(synclet), 1);
                    }
                });
            }
            for (var i = 0; i < synclets.available.length; i++) {
                if (oauthPopupSizes[synclets.available[i].provider]) {
                    synclets.available[i].oauthSize = oauthPopupSizes[synclets.available[i].provider];
                } else {
                    synclets.available[i].oauthSize = {width: 960, height: 600};
                }
            }
            page = 'you';
            res.render('you', {
                synclets: synclets,
                github: github,
                map: sortedResult
            });
        });
    });
};

var renderAllApps = function(req, res) {
    getGithubApps(function(apps) {
        res.render('iframe/allApps', {
            layout: false,
            apps: apps
        });
    });
};

app.get('/clickapp/:app', clickApp);
app.get('/you', renderYou);
app.get('/', renderYou);
app.get('/allApps', renderApps);
app.get('/create', renderCreate);

app.get('/publish', renderPublish);
app.post('/publish', submitPublish);

app.get('/viewAll', renderAllApps);


var getGithubApps = function(callback) {
    var apps = [];
    var pattern = /^Me\/github/
    locker.map(function(err, map) {
        for (var i in map.installed) {
            if (pattern.exec(map.installed[i].srcdir)) {
                apps.push(map.installed[i]);
            }
        }
        callback(apps);
    });
}