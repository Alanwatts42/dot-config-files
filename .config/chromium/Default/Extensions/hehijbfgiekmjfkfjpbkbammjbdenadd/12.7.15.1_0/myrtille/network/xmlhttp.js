/*
    Myrtille: A native HTML4/5 Remote Desktop Protocol client.

    Copyright(c) 2014-2019 Cedric Coste

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/*****************************************************************************************************************************************************************************************************/
/*** XmlHttp                                                                                                                                                                                       ***/
/*****************************************************************************************************************************************************************************************************/

function XmlHttp(config, dialog, display, network)
{
    var xhr = null;
    var xhrStartTime = null;
    var xhrTimeout = null;
    var xhrTimeoutElapsed = false;

    var fullscreenPending = false;

    this.init = function()
    {
        try
        {
            xhr = this.createXhr();
            cleanup(false);
            //dialog.showDebug('xhr supported');
        }
        catch (exc)
        {
            alert('xmlhttp init error: ' + exc.message + ', please ensure it\'s enabled into the browser options');
            xhr = null;
            throw exc;
        }
    };

    this.createXhr = function()
    {
        // IE
        if (window.ActiveXObject)
	    {
		    try
		    {
                return new XMLHttpRequest();
		    }
		    catch (exc1)
		    {
                var MSXMLXMLHTTPPROGIDS = new Array('MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP');

                var ok = false;
                for (var i = 0; i < MSXMLXMLHTTPPROGIDS.length && !ok; i++)
                {
                    try
                    {
                        return new ActiveXObject(MSXMLXMLHTTPPROGIDS[i]);
                        ok = true;
                    }
                    catch (exc2)
                    {}
                }
                
                if (!ok)
                {
                    dialog.showDebug('xmlhttp create error: XMLHttpRequest ActiveX not supported');
                    throw exc1;
                }
            }
	    }
        // others
	    else if (window.XMLHttpRequest)
	    {
		    try
		    {
		        return new XMLHttpRequest();
		    }
            catch (exc3)
		    {
		        dialog.showDebug('xmlhttp create error: ' + exc3.Message);
		        throw exc3;
		    }
	    }
    }

    this.send = function(data, startTime)
    {
        try
        {
            // in case of xhr issue, the event data is not sent
            // if that occurs and a buffer is used (strongly advised when using xhr!), the buffer must not be cleared... the event data can still be sent on its next flush tick!
            // this can't be done if no buffer is used (the unsent event data is lost...)
            var buffer = network.getBuffer();
            if (buffer != null)
            {
                buffer.setClearBuffer(false);
            }

            if (xhr != null)
            {
                // give priority to fullscreen update requests (by design, unbuffered command for immediate consideration)
                // also give priority to mouse clicks because the remote session may become unstable if it does not receive a mouse button release following a mouse button click
                if (data != null && (data.indexOf(network.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text) != -1 ||
                    data.indexOf(network.getCommandEnum().SEND_MOUSE_LEFT_BUTTON.text) != -1 ||
                    data.indexOf(network.getCommandEnum().SEND_MOUSE_MIDDLE_BUTTON.text) != -1 ||
                    data.indexOf(network.getCommandEnum().SEND_MOUSE_RIGHT_BUTTON.text) != -1))
                {
                    //dialog.showDebug('xhr priority');
                    cleanup(false);
                }
                else
                {
                    //dialog.showDebug('xhr is busy');
                    return;
                }
            }

            xhr = this.createXhr();

            if (xhr == null)
            {
                //dialog.showDebug('failed to create xhr');
                return;
            }

            xhrStartTime = startTime;

            xhr.open('GET', config.getHttpServerUrl() + 'SendInputs.aspx' +
                '?data=' + (data == null ? '' : encodeURIComponent(data)) +
                '&imgIdx=' + display.getImgIdx() +
                '&imgReturn=' + (config.getNetworkMode() == config.getNetworkModeEnum().XHR ? 1 : 0) +
                '&noCache=' + startTime);

            xhrTimeout = window.setTimeout(function()
            {
                //dialog.showDebug('xhr timeout');
                cleanup(true);
            },
            config.getXmlHttpTimeout());

            xhr.onreadystatechange = function() { callback(); };

            xhr.send(null);

            if (buffer != null)
            {
                buffer.setClearBuffer(true);
            }
        }
        catch (exc)
        {
            dialog.showDebug('xmlhttp send error: ' + exc.message);
            cleanup(false);
        }
    };

    function callback()
    {
	    try
	    {
		    if (xhr.readyState == 4)
		    {
			    if (xhrTimeout != null)
			    {
			        window.clearTimeout(xhrTimeout);
				    xhrTimeout = null;
			    }

                if (xhr.status === 200 || xhr.statusKeys == 'OK')
                {
                    xhr.onreadystatechange = function() {};
                    
                    //dialog.showDebug('xmlhttp callback success');

                    if (config.getAdditionalLatency() > 0)
			        {
			            window.setTimeout(function() { processResponse(xhr.responseText); }, Math.round(config.getAdditionalLatency() / 2));
			        }
			        else
			        {
                        processResponse(xhr.responseText);
			        }
                }
			    else
			    {
                    //dialog.showDebug('xmlhttp callback error, status: ' + xhr.status + ', statusKeys: ' + xhr.statusKeys);
                    cleanup(false);
			    }
		    }
	    }
	    catch (exc)
	    {
		    dialog.showDebug('xmlhttp callback error: ' + exc.message);
            cleanup(false);
	    }
    }

    function processResponse(text)
    {
        try
        {
            //dialog.showDebug('xhr response:' + text);

            // update the average "latency"
            network.updateLatency(xhrStartTime);

            // release the xhr
            cleanup(false);

            // a previous xhr failed to return within a proper time fashion; now that one had returned successfully, lift the error status
            if (xhrTimeoutElapsed)
            {
                //dialog.showDebug('xhr ok');
                xhrTimeoutElapsed = false;
                dialog.hideMessage();
            }

            if (text != '')
            {
                // reload page
                if (text == 'reload')
                {
                    window.location.href = window.location.href;
                }
                // receive terminal data, send to xtermjs
                else if (text.length >= 5 && text.substr(0, 5) == "term|")
                {
                    display.getTerminalDiv().writeTerminal(text.substr(5, text.length - 5));
                }
                // remote clipboard
                else if (text.length >= 10 && text.substr(0, 10) == 'clipboard|')
                {
                    showDialogPopup('showDialogPopup', 'ShowDialog.aspx', 'Ctrl+C to copy to local clipboard (Cmd-C on Mac)', text.substr(10, text.length - 10), true);
                }
                // print job
                else if (text.length >= 9 && text.substr(0, 9) == 'printjob|')
                {
                    downloadPdf(text.substr(9, text.length - 9));
                }
                // connected session
                else if (text == 'connected')
                {
                    // if running myrtille into an iframe, register the iframe url (into a cookie)
                    // this is necessary to prevent a new http session from being generated when reloading the page, due to the missing http session id into the iframe url (!)
                    // multiple iframes (on the same page), like multiple connections/tabs, requires cookieless="UseUri" for sessionState into web.config
                    if (parent != null && window.name != '')
                    {
                        parent.setCookie(window.name, window.location.href);
                    }

                    // send settings and request a fullscreen update
                    network.initClient();
                }
                // disconnected session
                else if (text == 'disconnected')
                {
                    // if running myrtille into an iframe, unregister the iframe url
                    if (parent != null && window.name != '')
                    {
                        parent.eraseCookie(window.name);
                    }

                    // back to login screen
                    window.location.href = config.getHttpServerUrl();
                }
                // new image
                else
                {
                    var imgInfo = text.split(',');
                        
                    var idx = parseInt(imgInfo[0]);
                    var posX = parseInt(imgInfo[1]);
                    var posY = parseInt(imgInfo[2]);
                    var width = parseInt(imgInfo[3]);
                    var height = parseInt(imgInfo[4]);
                    var format = imgInfo[5];
                    var quality = parseInt(imgInfo[6]);
                    var fullscreen = imgInfo[7] == 'true';
                    var base64Data = imgInfo[8];

                    // update bandwidth usage
                    network.setBandwidthUsage(network.getBandwidthUsage() + base64Data.length);

                    // if a fullscreen request is pending, release it
                    if (fullscreen && fullscreenPending)
                    {
                        //dialog.showDebug('received a fullscreen update, divs will be cleaned');
                        fullscreenPending = false;
                    }

                    // add image to display
                    display.addImage(idx, posX, posY, width, height, format, quality, fullscreen, base64Data);

                    // if using divs and count reached a reasonable number, request a fullscreen update
                    if (config.getDisplayMode() != config.getDisplayModeEnum().CANVAS && display.getImgCount() >= config.getImageCountOk() && !fullscreenPending)
                    {
                        //dialog.showDebug('reached a reasonable number of divs, requesting a fullscreen update');
                        fullscreenPending = true;
                        network.send(network.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text + 'cleanup');
                    }
                }
            }
	    }
	    catch (exc)
	    {
		    dialog.showDebug('xmlhttp processResponse error: ' + exc.message);
            cleanup(false);
	    }
    }

    function cleanup(timeoutElapsed)
    {
        try
        {
            if (timeoutElapsed)
            {
                dialog.showMessage('xhr timeout (' + config.getXmlHttpTimeout() + ' ms). Please check your network connection', 0);
                xhrTimeoutElapsed = true;
            }

		    if (xhrTimeout != null)
		    {
			    window.clearTimeout(xhrTimeout);
			    xhrTimeout = null;
		    }

            if (xhr != null)
            {
                if (xhr.readyState == 1 || xhr.readyState == 2 || xhr.readyState == 3)
                {
                    //dialog.showDebug('aborting xhr');
                    xhr.abort();
                }
            }
            
            delete(xhr);
        }
	    catch (exc)
	    {
		    dialog.showDebug('xmlhttp cleanup error: ' + exc.message);
	    }

        xhr = null;
    }
}