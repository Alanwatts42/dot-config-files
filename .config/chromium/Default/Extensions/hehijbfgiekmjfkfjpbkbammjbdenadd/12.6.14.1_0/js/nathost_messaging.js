/*
 * nativehost_messaging.js
 *
 * Code for communicating with the native host
 *
*/
var NativeHost_Messaging = {
    _port: null,
    _fnPortListener: null,

    sendMessageImpl: function(msg, fnResponse) {
        this._port.sendMessage(msg, fnResponse);
    },

    postMessageImpl: function(msg) {
        this._port.postMessage(msg);
    },

    isConnectedImpl: function() {
        return !!this._port;
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
    connectImpl: function(hostName, fnResponse) {
        NativeHostManager.getNativeHostPort(hostName, function(port) {
            this._port = port;
            if (port) {
                this._fnPortDisconnectListener = function() {
                    this._port = null;
                    this._postMessageToListeners({ type: '_DISCONNECTED' });
                }.bind(this);
                port.onDisconnect.addListener(this._fnPortDisconnectListener);
                this._fnPortListener = function(msg) {
                    this.onHostMessage(msg);
                }.bind(this);
                port.onMessage.addListener(this._fnPortListener);
                fnResponse('OK');
            } else {
                fnResponse('E_NO_NATIVE_HOST');
            }
        }.bind(this));
    },

    testForHostImpl: function(fnResult) {
        this.connect(function(result) {
            this.disconnect();
            fnResult(result == 'OK');
        }.bind(this), true);  // Skip the version check
    },

    disconnectImpl: function() {
        if (this._port) {
            try { this._port.disconnect(); } catch(ex) {}
            this._port = null;
        }
    },

    hostInitImpl: function() {
        this.BW = chrome.extension.getBackgroundPage();
        window.NativeHostManager = this.BW.NativeHostManager;

        // nathost_port already handles message correlation.  Stacking them
        // is not only redundant but will cause a conflict because we simply
        // add _callId to the messages.
        this._enableMessageCorrelation = false;
    },

    onUnloadImpl: function() {
        // Make sure nobody else uses this port while we are cleaning up
        var port = this._port;
        this._port = null;
        if (port) {
            try {
                if (this._fnPortListener)
                    port.onMessage.removeListener(this._fnPortListener);
                if (this._fnPortDisconnectListener)
                    port.onDisconnect.removeListener(this._fnPortDisconnectListener);
            } catch(ex) {}
            this._fnPortListener = null;
            this._fnPortDisconnectListener = null;
        }
    }
}
