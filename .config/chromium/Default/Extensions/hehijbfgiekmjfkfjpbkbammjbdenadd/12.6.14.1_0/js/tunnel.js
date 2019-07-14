/*
 *
 * tunnel.js
 *
 * Manages remote proxy tunnels
 *
 * A single user only opens a single RDP session to the remote host
 *
 */
var Tunnel = {
    sockets: {},
    pendingMessages: {},
    pendingRequestUrls: {},
    pendingRequestIds: {},

    BAtoB64: function(bytes) {
        var len = bytes.byteLength;
        var binaryString = '';
        for (var i = 0; i < len; i++) {
            binaryString += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa( binaryString );
    },
    
    sendResponse: function(requestId, xhr) {
        // TODO:  Retrieve this
        var httpVersion = 'HTTP/1.1';
        var headers = '';
        if (xhr.webRequestHeaders) {
            headers = xhr.webRequestHeaders;
        } else {
            console.log('No webRequest headers?! for ' + xhr.msg.url)
            headers = xhr.getAllResponseHeaders();
        }
        headers = headers.replace('content-encoding: gzip\r\n', '');
        headers = headers.replace(/content-length: \d+/, 'content-length: ' + xhr.response.byteLength);
        headers = headers.replace('connection: Keep-Alive', '');
        headers = headers.replace(/content-encoding: [^\r\n]*/gm, '');
        headers += '\r\n';

        var b64Data = this.BAtoB64( new Uint8Array(xhr.response) );

        RemoteHostManager.sendProxyData(requestId, 'HTTP/1.1', xhr.status, xhr.statusText, headers, b64Data );
    },


    onProxyMessage: function(msg) {
        var xhr = new XMLHttpRequest();
        xhr.requestHeaders = msg.headers;
        xhr.responseType = "arraybuffer";
        this.pendingRequestUrls = this.pendingRequestUrls || {};
        this.pendingRequestUrls[msg.url] = xhr;
        xhr.msg = msg;
        xhr.theUrl = msg.url;
        xhr.open(msg.method, msg.url);
        xhr.onreadystatechange = function() {
            if (xhr.cancelled)
                return;
            if (xhr.readyState == 4) {
                this.sendResponse(msg.id, xhr);
            }
        }.bind(this);
        var body = null;
        if (msg.body)
        {
            body = window.atob(msg.body);
        }
        xhr.send(body);
    },

    getPendingRequestFromDetails: function(details, matchRequestId) {
        if ((details.frameId != 0) || (details.tabId != -1) || (details.type != 'xmlhttprequest') || (details.initiator + "/" != chrome.runtime.getURL('')))
            return null;

        var xhr = this.pendingRequestIds[details.requestId];
        if (!xhr) {
            xhr = this.pendingRequestUrls[details.url];
        }
        return xhr;
    },

    onBeforeRequest: function(details) {
        var xhr = this.getPendingRequestFromDetails(details);
        if (xhr) {
            xhr.requestId = details.requestId;
            this.pendingRequestIds[details.requestId] = xhr;
        }
    },

    sendRedirectResponse: function(xhr, details) {
        xhr.cancelled = true;
        delete this.pendingRequestUrls[xhr.msg.url];
        if (xhr.requestId && this.pendingRequestIds[xhr.requestId])
            delete this.pendingRequestIds[xhr.requestId];

        var allHeaders = xhr.webRequestHeaders + '\r\n';

        // TODO:  Retrieve this
        var httpVersion = 'HTTP/1.1';

        RemoteHostManager.sendProxyData(xhr.msg.id, 'HTTP/1.1', details.statusCode, details.statusLine, allHeaders, null );
    },

    onHeadersReceived: function(details) {
        // If we receive a redirect then actually redirect
        var xhr = this.getPendingRequestFromDetails(details, true);
        if (!xhr)
            return;
        // getAllResponseHeaders does not include cookies so we get all headers
        // from here
        xhr.webRequestHeaders = '';
        for (var i=0; i<details.responseHeaders.length; i++) {
            var header = details.responseHeaders[i];
            if (xhr.webRequestHeaders) {
                xhr.webRequestHeaders += '\r\n';
            }
            xhr.webRequestHeaders += header.name + ': ' + header.value;
        }
        if (details.statusCode > 299 && details.statusCode < 400) {
            this.sendRedirectResponse(xhr, details);
            return { cancel: true };
        }
    },

    onBeforeSendHeaders: function(details) {
        var xhr = this.getPendingRequestFromDetails(details, true);
        if (!xhr)
            return;

        var resultHeaders = [];
        var headers = xhr.requestHeaders.split('\r\n');
        for (var i=0; i<headers.length; i++) {
            var header = headers[i];
            var index = header.indexOf(':');
            if (index != -1) {
                var name = header.substring(0, index);
                var value = header.substring(index+1);
                resultHeaders.push({ name: name, value: value });
            }
        }

        return { requestHeaders: resultHeaders };
    },

    init: function() {
        if (!this.fnOnBeforeSendHeaders) {
            this.fnOnBeforeSendHeaders = this.onBeforeSendHeaders.bind(this);
            chrome.webRequest.onBeforeSendHeaders.addListener(
                this.fnOnBeforeSendHeaders,
                { urls: ["<all_urls>"], types: [ 'xmlhttprequest' ], tabId: -1 },
                [ 'blocking', 'requestHeaders' ]
            );
        }

        if (!this.fnOnBeforeRequest) {
            this.fnOnBeforeRequest = this.onBeforeRequest.bind(this);
            chrome.webRequest.onBeforeRequest.addListener(
                this.fnOnBeforeRequest,
                { urls: ["<all_urls>"], types: [ 'xmlhttprequest' ], tabId: -1 },
                [ 'blocking' ]
            );
        }

        if (!this.fnOnHeadersReceived) {
            this.fnOnHeadersReceived = this.onHeadersReceived.bind(this);
            chrome.webRequest.onHeadersReceived.addListener(
                this.fnOnHeadersReceived,
                { urls: ["<all_urls>"], types: ['xmlhttprequest' ], tabId: -1 },
                [ 'blocking', 'responseHeaders' ]
            );
        }
    }    
}

Tunnel.init();