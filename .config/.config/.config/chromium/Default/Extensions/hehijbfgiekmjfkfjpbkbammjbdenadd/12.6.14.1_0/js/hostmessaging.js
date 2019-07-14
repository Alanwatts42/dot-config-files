/*
 * hostmessaging.js
 *
 * Code for communicating with the host, whether it's a native host or a remote host
 * This is an abstract implementation, NativeHost and RemoteHost provide the following
 * necessary functions:
         postMessageImpl
         sendMessageImpl (only if you aren't providing message correlation)
         connectImpl
         isConnectedImpl
         testForHostImpl
         disconnectImpl
         onUnloadImpl
         hostInitImpl
         checkVersionImpl
 */
var HostMessaging = {

    _nextCallbackId: 1,
    _pendingCallbacks: {},
    _listeners: [],
    _includeWithAll: {},
    _processId: 0,
    _hostName: '',
    _hostWindowId: null,
    _enableMessageCorrelation: true,

    CALLBACK_TIMEOUT: 30000,

    /*
    *     sendMessage
    *
    *     Provides response callback functionality for message sending
     */
    sendMessage: function(msg, fnResponse) {
        if (this._includeWithAll) {
            msg = $.extend(msg, this._includeWithAll);
        }
        if (!this._enableMessageCorrelation) {
            this.sendMessageImpl(msg, fnResponse);
            return;
        }
        // Use our own message correlation functionality
        if (fnResponse) {
            var callId = msg._callId = this._nextCallbackId++;
            this._pendingCallbacks[callId] = fnResponse;

            // Delete the callback entry if the callback never happens
            window.setTimeout(function() {
                if (this._pendingCallbacks[callId]) {
                    delete this._pendingCallbacks[callId];
                }
            }.bind(this), this.CALLBACK_TIMEOUT);
        }
        this.postMessage(msg);
    },

    postMessage: function(msg) {
        if (this._includeWithAll) {
            msg = $.extend(msg, this._includeWithAll);
        }
        this.postMessageImpl(msg);
    },

    addListener: function(fnListener) {
        this._listeners.push(fnListener);
    },

    removeListener: function(fnListener) {
        for (var i=0; i<this._listeners.length; i++) {
            if (this._listeners[i] == fnListener) {
                this._listeners.splice(i, 1);
                break;
            }
        }
    },

    isConnected: function() {
        return this.isConnectedImpl();
    },

    /*
    ** setIncludeWithAll
     *
     * Provide params that will be included with all outgoing messages
     *
    */
    setIncludeWithAll: function(params) {
        this._includeWithAll = $.extend(this._includeWithAll, params);
    },

    _postMessageToListeners: function(msg) {
        for (var i=0; i<this._listeners.length; i++) {
            this._listeners[i](msg);
        }
    },

    // Return true if it has been handled.
    // Returns false if it should be forwarded to listeners.
    _handleHostMessage: function(msg) {
        if (msg.type == 'DEBUG_LOG') {
            console.log('HOST_LOG: ' + msg.text);
            return true;
        }
        return false;
    },

    onHostMessage: function (msg) {
        if (this._enableMessageCorrelation && msg._responseId) {
            // This was a "sendMessage" potentially with a callback, so call it.
            var fnResponse = this._pendingCallbacks[msg._responseId];
            if (!fnResponse) {
                return;
            }
            delete this._pendingCallbacks[msg._responseId];
            delete msg[msg._responseId];
            fnResponse(msg);
            return;
        }

        // A regular incoming message, check for internal handling, otherwise forward to listeners
        if (!this._handleHostMessage(msg))
            this._postMessageToListeners(msg);
    },

    getProcessId: function() {
        return this._processId;
    },

    /*
    *    connect
    *
    *    connect to the native host.  This will also perform a version check and a host upgrade if necessary
    *    Possible response values:
    *
    *       OK
    *       E_NO_NATIVE_HOST      -- Could not connect to native host
    */
    connect: function(hostName, fnResponse) {
        this.connectImpl(hostName, fnResponse);
    },

    testForHost: function(fnResult) {
        this.testForHostImpl(fnResult);
    },

    disconnect: function() {
        this.disconnectImpl();
    },

    _bindTo: function(hostImpl) {
        // Pick up all the methods from the host implementation
        for (var k in hostImpl) {
            if (typeof this[k] == 'function') {
                this['base__' + this[k].name] = this[k];
            }
            this[k] = hostImpl[k];
        }
    },

    _init: function() {
        this.BW = chrome.extension.getBackgroundPage();
        window.Background = this.BW.Background;
        window.Settings = this.BW.Settings;
        window.addEventListener('unload', function() {
            this.sendMessage({ type: 'PAGE_UNLOADED' });
            this.onUnloadImpl();
        }.bind(this), true);

        if (!Settings.get('use-remote-host')) {
            this._bindTo(NativeHost_Messaging);
        } else {
            this._bindTo(RemoteHost_Messaging);
        }
        // Call the host-specific init
        this.hostInitImpl();
    }
}

HostMessaging._init();
