/*
 *
 * remhost_manager.js
 *
 * Manages remote host connections
 *
 * A single user only opens a single RDP session to the remote host
 *
 */

var RemoteHostManager = {
    _remoteHost: '',
    _remoteSessionId: null,
    _net: null,
    _connectedWindows: [],
    _waitingCreators: [],
    _idWindowTest: 0,
    _lastConnectResult: 0,   // -1: failed, 0: unknown, 1: success
    _lastInputTime: new Date(),
    _userInfo: {},

    FIREBASE_API_KEY: 'AIzaSyAYdB3iIRB7ZVDDiBLX8_g4tc6hzdDCeFM',
    WINDOW_TEST_INTERVAL_MS: 15000,
    IDLE_CHECK_INTERVAL_MS: 2000,
    IDLE_WARNING_TIME_S: 90,

    getUserInfo: function() {
        return this._userInfo;
    },

    sendMessage: function (msg) {
        if (this._net)
            this._net.send('ietab:' + JSON.stringify(msg), true);
    },

    isConnected: function() {
        return (this._net != null);
    },

    isWindowClosed: function (theWindow) {
        try {
            // Accessing a closed window may just throw an exception, even trying to access the 'closed' property
            return theWindow.closed;
        } catch (ex) {
            return true;
        }
    },

    internalMessageHandler: function(msg) {
        if (msg && (msg.type == 'DOWNLOAD_FILE'))
        {
            window.open(msg.url, '_blank');
            return true;
        }
        return false;
    },

    onMessage: function (msg) {
        var i = 0;
        if (this.internalMessageHandler(msg))
            return;
        while (i < this._connectedWindows.length) {
            var entry = this._connectedWindows[i];
            if (this.isWindowClosed(entry.window)) {
                this._connectedWindows.splice(i, 1);
            } else {
                try {
                    // Call the function, but use a catch so one bad tab doesn't kill all messaging
                    if (entry.fnOnMessage(msg)) {
                        // If they return true, then they handled it and we should not forward it to
                        // other players.
                        return;
                    }
                } catch (ex) { }
                i++;
            }
        }
    },

    sendProxyData: function(requestId, httpVersion, status, statusText, headers, data) {
        var msg = {
            id: requestId,
            httpVersion: httpVersion,
            status: status,
            statusText: statusText,
            headers: headers,
            data: data
        }
        this._net.send('proxy:' + JSON.stringify(msg),true);
    },

    onProxyMessage: function (msg) {
        Tunnel.onProxyMessage(msg);
    },

    startConnectedWindowsTest: function () {
        if (this._idWindowTest)
            return;
        this._idWindowTest = window.setInterval(this.testConnectedWindows.bind(this), this.WINDOW_TEST_INTERVAL_MS);
    },

    resetRemoteHost: function() {
        this.clearNetIntervals();
        if (this._net) {
            try {
                this._net.close();
            } catch(ex) {};

            this._net = null;
            this._remoteHost = null;
            this._remoteSessionId = null;
        }
    },

    showIdleWarning: function(timeRemaining) {
        var msg = {
            type: 'IDLE_WARNING',
            timeRemaining: timeRemaining
        }
        this.sendMessageToAllContainers(msg);
    },

    cancelIdleWarning: function() {
        var msg = {
            type: 'CANCEL_IDLE_WARNING'
        }
        this.sendMessageToAllContainers(msg);

    },

    idleTimeout: function() {
        var msg = {
            type: 'SESSION_TIMEOUT'
        }
        this.sendMessageToAllContainers(msg);
        this.onNetworkClosed(true);
    },

    getIdleTime: function() {
        return ((new Date()).getTime() - this._lastInputTime.getTime()) / 1000; 
    },

    // getIdleState
    //     0 = not idle
    //     1 = idle warning should be visible
    //     2 = we have surpassed the idle timeout period
    //
    getIdleState: function() {
        var idleTime = this.getIdleTime();

        if (idleTime > this._sessionIdleTimeout) {
            return 2;

        } else if (idleTime > (this._sessionIdleTimeout - this.IDLE_WARNING_TIME_S)) {
            return 1;
        } else {
            return 0;
        }
    },

    startIdleTracking: function() {
        // Note:  This tracker gets cleared by clearNetIntervals along with
        // some of the intervals set up by myrtille
        window.setInterval(function() {
            var idleState = this.getIdleState();

            if (idleState == 2) {
                this.idleTimeout();

            } else if (idleState == 1) {
                this.showIdleWarning(this._sessionIdleTimeout - this.getIdleTime());
            }
        }.bind(this), this.IDLE_CHECK_INTERVAL_MS);
    },

    resumeIdleSession: function() {
        this.fakeInputAction();
    },

    fakeInputAction: function() {
        if (this._net) {
            // Send a fake keydown / keyup combo for the 'SHIFT' key
            // to simulate activity and avoid idle timeout
            this._net.send('KSC16-1');
            this._net.send('KSC16-0');
        }
        this.updateLastInputTime();
    },

    updateLastInputTime: function() {
        var prevIdleState = this.getIdleState();
        this._lastInputTime = new Date();
        if ((prevIdleState == 1) && (this.getIdleState != 1)) {
            this.cancelIdleWarning();
        }
    },

    testConnectedWindows: function () {
        // Send a message through to all connected windows, this will purge
        // any that aren't live or that are failing to handle callbacks.
        this.onMessage({ type: 'NULL' });

        // If all windows are gone, then close our connection
        if (!this._connectedWindows.length) {
            this.resetRemoteHost();
            window.clearInterval(this._idWindowTest);
            this._idWindowTest = 0;
        }
    },

    onNetworkError: function () {
        this.onNetworkClosed();
    },

    onNetworkClosed: function (skipMessage) {
        this.resetRemoteHost();
        if (this._lastConnectResult != 1) {
            // We failed to gracefully connect to the remote host.
            // Set lastConnectResult = -1, this will force us to try a different host on the next connection attempt
            this._lastConnectResult = -1;
            if (this.fnFinishConnect)
            {
                this.fnFinishConnect('Host Server Unavailable.  If your network is in working order, please contact us at support@ietab.net.');
            }
        }
        if (!skipMessage) {
            var msg = {
                type: 'NETWORK_CLOSED'
            }
            this.onMessage(msg);
        }
        this._connectedWindows = [];
    },

    disconnect: function (theWindow) {
        for (var i = 0; i < this._connectedWindows.length; i++) {

            if (theWindow == this._connectedWindows[i].window) {
                this._connectedWindows.splice(i, 1);
                return;
            }
        }
    },

    refreshJWT: function(fnContinue) {
        if (!localStorage['refreshToken']) {
            fnContinue();
            return;
        }

        // There doesn't appear to be a firebase JS api for refreshing the token.
        // It's just as well because we don't want that much overhead and the following
        // REST API request is documented, so it shouldn't go away.
        var req = new XMLHttpRequest();
        var params = 'grant_type=refresh_token&refresh_token=' + localStorage['refreshToken'];
        req.open('POST', 'https://securetoken.googleapis.com/v1/token?key=' + this.FIREBASE_API_KEY);
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        req.onreadystatechange = function() {
            if (req.readyState != 4)
                return;

            if (req.status != 200) {
                console.log('Error ' + req.status + ' from token refresh request');
                fnContinue();
                return;
            }

            try {
                var response = JSON.parse(req.responseText);
                if (!response.id_token || !response.expires_in) {
                    throw 'No token in response';
                }
                var expires = new Date();
                expires.setTime(expires.getTime() + parseInt(response.expires_in) * 1000);
                chrome.cookies.set({
                    url: Settings.get('website'),
                    domain: 'ietab.net',
                    name: 'jwt',
                    path: '/',
                    expirationDate: Math.floor(expires.getTime() / 1000),
                    value: response.id_token
                }, fnContinue );
            } catch(ex) {
                console.log(ex.message);
                fnContinue();
            }
        }.bind(this);
        req.send(params);
    },

    updateIETabAuth: function(fnContinue) {
        if (!localStorage['refreshToken']) {
            // There is nothing we can do without a refresh token regardless of
            // whether they have a JWT cookie
            fnContinue();
            return;
        }

        // See if they have a JWT
        chrome.cookies.get({ url: 'https://hub.ietab.net', name: 'jwt' }, function(cookie) {
            if (cookie && cookie.value) {
                // They have a JWT, let them through
                fnContinue();
                return;
            }

            // No auth token, try to refresh
            this.refreshJWT(fnContinue);
        }.bind(this));
    },

    updateRemoteHost: function (callingWindow, fnResponse) {
        this._remoteHost = null;
        this._remoteSessionId = null;

        this.updateIETabAuth(function() {
            var hubUrl = localStorage['hub-host'];
            if (!hubUrl) {
                hubUrl = 'https://hub.ietab.net';
            }
            hubUrl += '/hubapi/userslots';
            if (this._lastConnectResult == -1) {
                hubUrl += '?retry=1';
            }
            var xhr = new XMLHttpRequest;
            xhr.open('GET', hubUrl, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var result = null;
                        try {
                            result = JSON.parse(xhr.responseText);
                        } catch (ex) {
                            console.log('Invalid JSON response from HUB = ' + xhr.responseText);
                        }
                        if (result && result.UserInfo) {
                            this._userInfo = result.UserInfo;
                        }
                        if (result && result.Host && result.SessionId) {
                            this._remoteHost = result.Host;
                            this._remoteSessionId = result.SessionId;
                            this._sessionIdleTimeout = result.SessionIdleTimeout;
                            fnResponse('OK');
                        } else if (result.RedirectUrl) {
                            if (result.RedirectUrl.match(/^http/))
                                callingWindow.location.href = result.RedirectUrl;
                            else
                                callingWindow.location.href = Settings.get('website') + '/' + result.RedirectUrl;
                        } else {
                            fnResponse('NO HOST AVAILABLE');
                        }
                    } else if (xhr.status == 401) {
                        fnResponse('UNAUTHORIZED');
                    } else {
                        fnResponse('HUB CONNECTION FAILED, STATUS: ' + xhr.status);
                    }
                }
            }.bind(this);
            xhr.send();
        }.bind(this));

    },

    initNetwork: function() {
        // Myrtille sets up some intevals for bandwidth usage and fulscreen updates but they don't cancel them.
        // We want to track them so we can cancel them when the network shuts down.
        var fnOldSetInterval = window.setInterval;
        window.setInterval = function(fnCallback, interval) {
            this._netIntervals = this._netIntervals || [];
            var result = fnOldSetInterval(fnCallback, interval);
            this._netIntervals.push(result);
            return result;
        }.bind(this);
        try {
            this._net.init();
        } catch(ex) {
            window.setInterval = fnOldSetInterval;
        }
    },

    clearNetIntervals: function() {
        if (!this._netIntervals)
            return;
        for (var i=0; i<this._netIntervals.length; i++) {
            window.clearInterval(this._netIntervals[i]);
        }
        this._netIntervals = [];
    },

    sendMessageToAllContainers: function(msg) {
        var i = 0;
        msg.sendToAll = true;

        while (i < this._connectedWindows.length) {
            var entry = this._connectedWindows[i];
            try {
                entry.fnOnMessage(msg);
            } catch (ex) { }
            i++;
        }
    },

    connectImpl: function (window, fnOnMessage, fnResult) {

        var displayDiv = window.document.getElementById('display-div');

        try {

            if (this._net) {
                fnResult('OK'); // Connected and ready to go!
                RemoteHostManager.config.display.initUser(this._net);
                return;
            }

            if (!this._remoteHost || !this._remoteSessionId) {
                this.updateRemoteHost(window, function (result) {
                    if (result == 'OK') {
                        // Try again
                        this.connectImpl(window, fnOnMessage, fnResult);
                    } else {
                        fnResult(result);
                    }
                }.bind(this));
                return;
            }

            this.config.remoteHost = this._remoteHost;
            this.config.remoteSessionId = this._remoteSessionId;
            this._net = new Network(this.config, this.dialog, this.config.display);
            this._net.onerror = this.onNetworkError.bind(this);
            this._net.onclosed = this.onNetworkClosed.bind(this);
            this._lastConnectResult = 0;
            this.fnFinishConnect = this._net.fnFinishConnect = function (result) {
                if (result == 'OK') {
                    this._lastConnectResult = 1;
                    this.startIdleTracking();
                    RemoteHostManager.config.display.initUser(this._net);
                }
                fnResult(result);
            }.bind(this);

            this._net.onMessage = function (msg) {
                if (msg.indexOf('ietab:') == 0) {
                    try {
                        this.onMessage(JSON.parse(msg.substr(6)));
                    } catch (ex) {
                        console.log('Invalid Helper Message: ' + msg);
                    }
                    return true;
                } else if (msg.indexOf('proxy:') == 0) {
                    try {
                        this.onProxyMessage(JSON.parse(msg.substr(6)));
                    } catch(ex) {
                        console.log('Invalid Proxy Message: ' + msg);
                    }
                }

                return false;
            }.bind(this);

            this.initNetwork();
        }
        catch (exc) {
            console.log('failed to start myrtille: ' + exc.message);
            this.resetRemoteHost();
            fnResult('FAIL');
        }
    },

    connect: function (window, fnOnMessage, fnResult) {
        this.connectImpl(window, fnOnMessage, function(result) {
            if (result == 'OK') {
                this._connectedWindows.push({
                    window: window,
                    fnOnMessage: fnOnMessage
                });
                this.startConnectedWindowsTest();
            }
            fnResult(result);
        }.bind(this));
    },

    sendFullScreenUpdate: function () {
        this._net.send(this._net.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text);
    },

    _init: function () {
        try {
            // We can't provide the host here because we don't know the server URL at the time we load,
            // we only know it when we obtain it from the hub.  But we want to initialize Myrtille, so
            // just use 127.0.0.1 which is fine, we'll update it before we connect
            var httpServerUrl = 'http://127.0.0.1/Myrtille/';
            var remoteSessionActive = false;
            var statEnabled = true;
            // Technically, debugEnabled should be false.  But unfortunately Myrtille's design captures a bunch of
            // exceptions and logs them with Debug.showDebug so you don't see them.  So frankly if debugEnabled doesn't do
            // anything that is bad for performance, I'm inclined to leave it enabled.  Check whether it does!
            var debugEnabled = true;
            var compatibilityMode = false;
            var scaleDisplay = false;
            var displayWidth = window.screen.availWidth;
            var displayHeight = window.screen.availHeight;

            this.config = new Config(httpServerUrl, statEnabled, debugEnabled, compatibilityMode, scaleDisplay, displayWidth, displayHeight);
            this.dialog = new Dialog(this.config);
        }
        catch (exc) {
            console.log('failed to start myrtille: ' + exc.message);
            myrtille = null;
        }
    }
}

RemoteHostManager._init();
