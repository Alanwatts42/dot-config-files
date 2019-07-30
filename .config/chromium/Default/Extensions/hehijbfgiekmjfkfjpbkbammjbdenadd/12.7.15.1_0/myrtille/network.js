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
/*** Network                                                                                                                                                                                       ***/
/*****************************************************************************************************************************************************************************************************/

function Network(config, dialog, display)
{
    // xmlhttp
    var xmlhttp = null;
    this.getXmlhttp = function() { return xmlhttp; };

    // websockets
    var websocket = null;
    var audioWebsocket = null;

    // long-polling
    var longPolling = null;

    // buffer
    var buffer = null;
    this.getBuffer = function() { return buffer; };

    // periodical fullscreen update
    var periodicalFullscreenInterval = null;

    // average roundtrip duration
    var roundtripDurationAvg = null;
    this.getRoundtripDurationAvg = function() { return roundtripDurationAvg == null ? 0 : roundtripDurationAvg; };

    // roundtrip duration warning
    var roundtripDurationWarning = false;

    // bandwidth usage
    var bandwidthUsage = null;
    this.getBandwidthUsage = function() { return bandwidthUsage; };
    this.setBandwidthUsage = function(value) { bandwidthUsage = value; };
    var bandwidthUsageInterval = null;

    // bandwidth size
    var bandwidthSize = null;
    var bandwidthSizeInterval = null;

    // display tweaking
    var originalImageEncoding = config.getImageEncoding();
    var originalImageQuality = config.getImageQuality();
    var originalImageQuantity = config.getImageQuantity();

    /*
    prefixes (3 chars) are used to serialize commands with strings instead of numbers
    they make it easier to read log traces to find out which commands are issued
    they must match the prefixes used server side
    */
    var commandEnum =
    {
        // connection
        SEND_SERVER_ADDRESS: { value: 0, text: 'SRV' },
        SEND_VM_GUID: { value: 1, text: 'VMG' },
        SEND_USER_DOMAIN: { value: 2, text: 'DOM' },
        SEND_USER_NAME: { value: 3, text: 'USR' },
        SEND_USER_PASSWORD: { value: 4, text: 'PWD' },
        SEND_START_PROGRAM: { value: 5, text: 'PRG' },
        CONNECT_CLIENT: { value: 6, text: 'CON' },

        // browser
        SEND_BROWSER_RESIZE: { value: 7, text: 'RSZ' },

        // keyboard
        SEND_KEY_UNICODE: { value: 8, text: 'KUC' },
        SEND_KEY_SCANCODE: { value: 9, text: 'KSC' },

        // mouse
        SEND_MOUSE_MOVE: { value: 10, text: 'MMO' },
        SEND_MOUSE_LEFT_BUTTON: { value: 11, text: 'MLB' },
        SEND_MOUSE_MIDDLE_BUTTON: { value: 12, text: 'MMB' },
        SEND_MOUSE_RIGHT_BUTTON: { value: 13, text: 'MRB' },
        SEND_MOUSE_WHEEL_UP: { value: 14, text: 'MWU' },
        SEND_MOUSE_WHEEL_DOWN: { value: 15, text: 'MWD' },

        // control
        SET_SCALE_DISPLAY: { value: 16, text: 'SCA' },
        SET_RECONNECT_SESSION: { value: 17, text: 'RCN' },
        SET_IMAGE_ENCODING: { value: 18, text: 'ECD' },
        SET_IMAGE_QUALITY: { value: 19, text: 'QLT' },
        SET_IMAGE_QUANTITY: { value: 20, text: 'QNT' },
        SET_AUDIO_FORMAT: { value: 21, text: 'AUD' },
        SET_AUDIO_BITRATE: { value: 22, text: 'BIT' },
        SET_SCREENSHOT_CONFIG: { value: 23, text: 'SSC' },
        START_TAKING_SCREENSHOTS: { value: 24, text: 'SS1' },
        STOP_TAKING_SCREENSHOTS: { value: 25, text: 'SS0' },
        TAKE_SCREENSHOT: { value: 26, text: 'SCN' },
        REQUEST_FULLSCREEN_UPDATE: { value: 27, text: 'FSU' },
        REQUEST_REMOTE_CLIPBOARD: { value: 28, text: 'CLP' },
        CLOSE_CLIENT: { value: 29, text: 'CLO' }
    };

    if (Object.freeze)
    {
        Object.freeze(commandEnum);
    }

    this.getCommandEnum = function() { return commandEnum; };

    this.init = function()
    {
        try
        {
            if (config.getHostType() == config.getHostTypeEnum().RDP)
            {
                /* image mode

                ROUNDTRIP
                display images from raw data
                the simplest mode. each image is retrieved using a server call
                pros: reliable (works in all browsers); cons: slower in case of high latency connection (due to the roundrip time)

                BASE64
                display images from base64 data
                pros: avoid server roundtrips to retrieve images (direct injection into the DOM); cons: base64 encoding has an 33% overhead over binary
                IE6/7: not supported
                IE8: supported up to 32KB
                IE9: supported in native mode; not supported in compatibility mode (use IE7 engine)
                IE10+: supported
                please note that, even if base64 data is disabled or not supported by the client, the server will always send them in order to display images size and compute bandwidth usage, and thus be able to tweak the images (quality & quantity) if the available bandwidth gets too low
                it also workaround a weird glitch in IE7 that prevents script execution if code length is too low (when script code is injected into the DOM through long-polling)

                BINARY
                display images from binary data
                pros: no bandwidth overhead; cons: requires an HTML5 browser with websocket (and binary type) support
            
                AUTO (default)
                automatic detection of the best available mode (in order: ROUNDTRIP < BASE64 < BINARY)

                */

                var base64Available = true;
                var binaryAvailable = (window.WebSocket || window.MozWebSocket) && !config.getCompatibilityMode();

                switch (config.getImageMode())
                {
                    case config.getImageModeEnum().ROUNDTRIP:
                        break;

                    case config.getImageModeEnum().BASE64:
                        if (!base64Available)
                        {
                            config.setImageMode(config.getImageModeEnum().ROUNDTRIP);
                        }
                        break;
                    
                    case config.getImageModeEnum().BINARY:
                        if (!binaryAvailable)
                        {
                            if (!base64Available)
                            {
                                config.setImageMode(config.getImageModeEnum().ROUNDTRIP);
                            }
                            else
                            {
                                config.setImageMode(config.getImageModeEnum().BASE64);
                            }
                        }
                        break;
                    
                    default:
                        config.setImageMode((!binaryAvailable ? (!base64Available ? config.getImageModeEnum().ROUNDTRIP : config.getImageModeEnum().BASE64) : config.getImageModeEnum().BINARY));
                }

                dialog.showStat(dialog.getShowStatEnum().IMAGE_MODE, config.getImageMode());
            }

            /* network mode

            XHR
            XmlHttpRequest is the basic requirement mode. user inputs and display updates are sent/received through the same request/response
            pros: reliable; cons: slower in case of high latency connection (due to the roundrip time and many requests)

            LONGPOLLING
            long-polling is a combination of xhr (to send user inputs) and long lived connection (to receive display updates)
            pros: faster than xhr because doesn't rely on roundtrip (and even brings a parallelized processing); cons: some proxies will timeout the connection passed a certain time

            WEBSOCKET
            websocket is the nowadays preferred communication method
            pros: fast and stateful duplex communication; cons: requires HTML5 (the above 2 methods work with HTML4 browsers) and some proxies may filter/block the (still evolving) websocket protocol
            
            AUTO (default)
            automatic detection of the best available mode (in order: XHR < LP < WS)

            */

            var wsAvailable = (window.WebSocket || window.MozWebSocket) && !config.getCompatibilityMode();

            switch (config.getNetworkMode())
            {
                case config.getNetworkModeEnum().XHR:
                case config.getNetworkModeEnum().LONGPOLLING:
                    break;

                case config.getNetworkModeEnum().WEBSOCKET:
                    if (!wsAvailable)
                    {
                        config.setNetworkMode(config.getNetworkModeEnum().LONGPOLLING);
                    }
                    break;
                    
                default:
                    config.setNetworkMode(!wsAvailable ? config.getNetworkModeEnum().LONGPOLLING : config.getNetworkModeEnum().WEBSOCKET);
            }

            // xhr support is the minimal network requirement
            xmlhttp = new XmlHttp(config, dialog, display, this);
            xmlhttp.init();

            // use websocket if enabled
            if (config.getNetworkMode() == config.getNetworkModeEnum().WEBSOCKET)
            {
                // display and notifications
                websocket = new Websocket(config, dialog, display, this);
                websocket.init();
            }

            // websocket enabled and functional, RDP host
            // IETAB:  Audio not yet enabled on server
            if (false && config.getNetworkMode() == config.getNetworkModeEnum().WEBSOCKET && config.getHostType() == config.getHostTypeEnum().RDP)
            {
                // audio
                audioWebsocket = new AudioWebsocket(config, dialog, display, this);
                audioWebsocket.init();
            }
            else
            {
                // audio disabled
                config.setAudioFormat(config.getAudioFormatEnum().NONE);
            }

            // only websocket supports the binary image mode
            if (config.getNetworkMode() != config.getNetworkModeEnum().WEBSOCKET && config.getImageMode() == config.getImageModeEnum().BINARY)
            {
                config.setImageMode(!base64Available ? config.getImageModeEnum().ROUNDTRIP : config.getImageModeEnum().BASE64);
                dialog.showStat(dialog.getShowStatEnum().IMAGE_MODE, config.getImageMode());
            }
            
            // if not using websocket, use xhr and long-polling (or xhr only if XHR mode is specified)
            if (config.getNetworkMode() != config.getNetworkModeEnum().WEBSOCKET)
            {
                // if long-polling is enabled, updates are streamed into a zero sized iframe (with automatic (re)load)
                // otherwise (xhr only), they are returned within the xhr response
                if (config.getNetworkMode() == config.getNetworkModeEnum().LONGPOLLING)
                {
                    longPolling = new LongPolling(config, dialog, display, this);
                    longPolling.init();
                }

                // send settings and request a fullscreen update
                this.initClient();
            }
            else
            {
                // if using websocket, the connection remains open; there is no real need for a buffer
                config.setBufferEnabled(false);
            }

            dialog.showStat(dialog.getShowStatEnum().NETWORK_MODE, config.getNetworkMode());
            dialog.showStat(dialog.getShowStatEnum().AUDIO_FORMAT, config.getAudioFormat());
            dialog.showStat(dialog.getShowStatEnum().AUDIO_BITRATE, config.getAudioBitrate());

            // if using xhr only, force enable the user inputs buffer in order to allow polling update(s) even if the user does nothing ("send empty" feature, see comments in buffer.js)
            config.setBufferEnabled(config.getBufferEnabled() || config.getNetworkMode() == config.getNetworkModeEnum().XHR);
            if (config.getBufferEnabled())
            {
                buffer = new Buffer(config, dialog, this);
                buffer.init();
            }

            // periodical fullscreen update; to fix potential display issues and clean the browser DOM when divs are used
            // if the host is SSH, it will be used to detect if the client is still connected and to close the terminal otherwise
            if (periodicalFullscreenInterval != null)
            {
                window.clearInterval(periodicalFullscreenInterval);
                periodicalFullscreenInterval = null;
            }

            periodicalFullscreenInterval = window.setInterval(function()
            {
                //dialog.showDebug('periodical fullscreen update');
                doSend(commandEnum.REQUEST_FULLSCREEN_UPDATE.text + 'periodical');
            },
            config.getPeriodicalFullscreenInterval());

            // bandwidth usage per second; if the ratio goes up to 100% or above, tweak down the image quality & quantity to maintain a decent performance level
            if (bandwidthUsageInterval != null)
            {
                window.clearInterval(bandwidthUsageInterval);
                bandwidthUsageInterval = null;
            }

            bandwidthUsageInterval = window.setInterval(function()
            {
                //dialog.showDebug('checking bandwidth usage');
                dialog.showStat(dialog.getShowStatEnum().BANDWIDTH_USAGE, Math.ceil(bandwidthUsage / 1024));

                // throttle image quality & quantity depending on the bandwidth usage and average latency
                if (config.getHostType() == config.getHostTypeEnum().RDP)
                {
                    tweakDisplay();
                }

                // reset bandwidth usage
                bandwidthUsage = 0;
            },
            1000);

            // bandwidth size; 5MB test file (make sure not to set an interval too small as it may hinder performance if the bandwidth is weak; additionaly, the bandwidth is not meant to change very often...)
            updateBandwidth();

            if (bandwidthSizeInterval != null)
            {
                window.clearInterval(bandwidthSizeInterval);
                bandwidthSizeInterval = null;
            }

            bandwidthSizeInterval = window.setInterval(function()
            {
                updateBandwidth();
            },
            config.getBandwidthCheckInterval());
        }
        catch (exc)
        {
            dialog.showDebug('network init error: ' + exc.message);
            throw exc;
        }
    };


    this.initIETab = function () {
        if (this.fnFinishConnect) {
            this.fnFinishConnect('OK');
        }
    },
        
    this.initClient = function()
    {
        try
        {
            var commands = new Array();

            if (config.getHostType() == config.getHostTypeEnum().RDP)
            {
                //dialog.showDebug('sending display config');
                commands.push(commandEnum.SET_IMAGE_ENCODING.text + config.getImageEncoding().value);
                commands.push(commandEnum.SET_IMAGE_QUALITY.text + config.getImageQuality());
                commands.push(commandEnum.SET_IMAGE_QUANTITY.text + config.getImageQuantity());

                //dialog.showDebug('sending audio config');
                commands.push(commandEnum.SET_AUDIO_FORMAT.text + config.getAudioFormat().value);
                if (config.getAudioFormat() != config.getAudioFormatEnum().NONE)
                {
                    commands.push(commandEnum.SET_AUDIO_BITRATE.text + config.getAudioBitrate());
                }

                // set action on browser resize
                if (config.getBrowserResize() == null)
                {
                    switch (config.getDefaultResize())
                    {
                        case config.getBrowserResizeEnum().SCALE:
                            var width = display.getBrowserWidth();
                            var height = display.getBrowserHeight();
                            commands.push(commandEnum.SET_SCALE_DISPLAY.text + width + 'x' + height);
                            break;

                        case config.getBrowserResizeEnum().RECONNECT:
                            commands.push(commandEnum.SET_RECONNECT_SESSION.text + 1);
                            break;
                   
                        default:
                            commands.push(commandEnum.SET_RECONNECT_SESSION.text + 0);
                    }
                }
            }

            //dialog.showDebug('initial fullscreen update');
            commands.push(commandEnum.REQUEST_FULLSCREEN_UPDATE.text + 'initial');

            doSend(commands.toString());

            this.initIETab();
        }
        catch (exc)
        {
            dialog.showDebug('network initClient error: ' + exc.message);
            throw exc;
        }
    };

    this.updateLatency = function(startTime)
    {
        try
        {
            //dialog.showDebug('updateLatency startTime: ' + startTime);

            // check roundtrip start time
            if (startTime == null || startTime == '')
            {
                dialog.showDebug('updateLatency error: roundtrip start time is null or empty');
                return;
            }

            var now = new Date().getTime();
            if (now < startTime)
            {
                dialog.showDebug('updateLatency error: roundtrip start time inconsistency');
                return;
            }

            // update the average "latency" (so called for simplification...); in fact, the client/server roundtrip duration ≈ connection physical latency (up/down link) + simulated latency (if enabled) + server process time
            // also, it's not an real average (more a linearization...)
            var roundtripDuration = now - startTime;
            if (roundtripDurationAvg == null)
            {
                roundtripDurationAvg = roundtripDuration;
            }
            else
            {
                roundtripDurationAvg = Math.round((roundtripDurationAvg + roundtripDuration) / 2);
            }

            dialog.showStat(dialog.getShowStatEnum().LATENCY, roundtripDurationAvg);

            // if the "latency" is above a certain limit, display a warning message
            if (roundtripDurationAvg > config.getRoundtripDurationMax())
            {
                dialog.showMessage('latency warning (> ' + config.getRoundtripDurationMax() + ' ms). Please check your network connection', 0);
                roundtripDurationWarning = true;
            }
            else
            {
                if (roundtripDurationWarning)
                {
                    roundtripDurationWarning = false;
                    dialog.hideMessage();
                }
                
                // if using an inputs buffer, update its delay accordingly (the more "latency", the more bufferization... and inversely)
                if (config.getBufferEnabled())
                {
                    if (buffer.getSendEmptyBuffer())
                    {
                        buffer.setBufferDelay(config.getBufferDelayEmpty() + roundtripDurationAvg);
                    }
                    else
                    {
                        buffer.setBufferDelay(config.getBufferDelayBase() + roundtripDurationAvg);
                    }
                    dialog.showStat(dialog.getShowStatEnum().BUFFER, buffer.getBufferDelay());
                }
                else
                {
                    dialog.showStat(dialog.getShowStatEnum().BUFFER, 'NONE');
                }
            }
        }
        catch (exc)
        {
            dialog.showDebug('network updateLatency error: ' + exc.message);
        }
    };

    function updateBandwidth()
    {
        return;
        try
        {
            //dialog.showDebug('checking available bandwidth');

            var startTime = new Date().getTime();

            var img = new Image();

            img.onload = function()
            {
                var endTime = new Date().getTime();
                var duration = endTime - startTime;
                bandwidthSize = (5087765 * 1000) / duration;
                //dialog.showDebug('bandwidth check duration (ms): ' + duration + ', size (KB/s): ' + Math.ceil(bandwidthSize / 1024));
                dialog.showStat(dialog.getShowStatEnum().BANDWIDTH_SIZE, Math.ceil(bandwidthSize / 1024));
            }

            img.onabort = function()
            {
                dialog.showDebug('bandwidth check aborted');
            };

            img.onerror = function()
            {
                dialog.showDebug('bandwidth check error');
            };

            img.src = config.getHttpServerUrl() + 'img/bandwidthTest.png?noCache=' + startTime;   // 5MB file size
        }
        catch (exc)
        {
            dialog.showDebug('network updateBandwidth error: ' + exc.message);
        }
    }

    function tweakDisplay()
    {
        try
        {
            var commands = new Array();

            /*
            small bandwidth = lower quality
            latency shouldn't affect image quality because each update, whatever its size, will be received within the same delay (so better keep the best quality)
            for example, if latency = 100ms, both a 10KB and 100KB image will be received in 100ms (given the bandwidth is good enough)
            */

            var tweak = false;

            var bandwidthUsageRatio = bandwidthUsage != null && bandwidthSize != null && bandwidthSize > 0 ? Math.round((bandwidthUsage * 100) / bandwidthSize) : 0;
            if (bandwidthUsageRatio >= config.getImageTweakBandwidthHigherThreshold())
            {
                if (config.getImageQuality() != 10)
                {
                    config.setImageEncoding(config.getImageEncodingEnum().JPEG);
                    config.setImageQuality(10);
                    tweak = true;
                }
            }
            else if (bandwidthUsageRatio >= config.getImageTweakBandwidthLowerThreshold() && bandwidthUsageRatio < config.getImageTweakBandwidthHigherThreshold())
            {
                if (config.getImageQuality() != 25)
                {
                    config.setImageEncoding(config.getImageEncodingEnum().JPEG);
                    config.setImageQuality(25);
                    tweak = true;
                }
            }
            else if (config.getImageQuality() != originalImageQuality)
            {
                config.setImageEncoding(originalImageEncoding);
                config.setImageQuality(originalImageQuality);
                tweak = true;
            }

            if (tweak)
            {
                //dialog.showDebug('tweaking image quality: ' + config.getImageEncoding().text + ', ' + config.getImageQuality());
                commands.push(commandEnum.SET_IMAGE_ENCODING.text + config.getImageEncoding().value);
                commands.push(commandEnum.SET_IMAGE_QUALITY.text + config.getImageQuality());
            }

            /*
            small bandwidth = lower quantity
            latency is relevant there because each update, whatever its size, is affected by latency
            sending many updates may result in an increasing lag, so better reduce their number if the latency goes high
            for example, if latency = 100ms, 10 images will be received in 10 x 100 = 1000ms (1 sec)
            this is mitigated when using websockets or long-polling, because the connection remains open, but the latency still applies

            that said, it's also important to preserve the user experience as best as possible
            dropping some updates may help to restrain the lag but it will also disrupt the display, and the user might think its actions aren't processed (!)
            therefore, updates should only be dropped if their display rate is significant enough
            */

            // computed latency and display rate may change outside of this function; use snapshot values
            var latency = roundtripDurationAvg;
            var ips = display.getLastImgCountPerSec();

            //dialog.showDebug('latency: ' + latency + ', ips: ' + ips);

            tweak = false;

            if (bandwidthUsageRatio >= config.getImageTweakBandwidthHigherThreshold() ||
               (latency >= config.getImageTweakLatencyHigherThreshold() && ips >= config.getImageTweakLatencyCountPerSec()))
            {
                if (config.getImageQuantity() != 25)
                {
                    config.setImageQuantity(25);
                    tweak = true;
                }
            }
            else if ((bandwidthUsageRatio >= config.getImageTweakBandwidthLowerThreshold() && bandwidthUsageRatio < config.getImageTweakBandwidthHigherThreshold()) ||
                     (latency >= config.getImageTweakLatencyLowerThreshold() && latency < config.getImageTweakLatencyHigherThreshold() && ips >= config.getImageTweakLatencyCountPerSec()))
            {
                if (config.getImageQuantity() != 50)
                {
                    config.setImageQuantity(50);
                    tweak = true;
                }
            }
            else if (config.getImageQuantity() != originalImageQuantity)
            {
                config.setImageQuantity(originalImageQuantity);
                tweak = true;
            }

            if (tweak)
            {
                //dialog.showDebug('tweaking image quantity: ' + config.getImageQuantity());
                commands.push(commandEnum.SET_IMAGE_QUANTITY.text + config.getImageQuantity());
            }

            if (commands.length > 0)
            {
                doSend(commands.toString());
            }
        }
        catch (exc)
        {
            dialog.showDebug('network tweakDisplay error: ' + exc.message);
        }
    }

    this.processUserEvent = function(event, data)
    {
        try
        {
            // if using a buffer, bufferize the data
            if (config.getBufferEnabled())
            {
                //dialog.showDebug('buffering ' + event + ' event: ' + data);
                buffer.addItem(data);
            }
            // otherwise, send it over the network
		    else
            {
                //dialog.showDebug('sending ' + event + ' event: ' + data);
                doSend(data);
            }
        }
        catch (exc)
        {
            dialog.showDebug('network processUserEvent error: ' + exc.message);
        }
    };

    this.send = function(data, excludeImg)
    {
        doSend(data, excludeImg);
    };

    function doSend(data, excludeImg)
    {
        try
        {
            //dialog.showDebug('sending data: ' + data + ', img: ' + display.getImgIdx());

            var now = new Date().getTime();
            if (config.getAdditionalLatency() > 0)
            {
                window.setTimeout(function() { if (config.getNetworkMode() != config.getNetworkModeEnum().WEBSOCKET) { xmlhttp.send(data, now); } else { websocket.send(data, now, excludeImg); } }, Math.round(config.getAdditionalLatency() / 2));
            }
            else
            {
                if (config.getNetworkMode() != config.getNetworkModeEnum().WEBSOCKET) { xmlhttp.send(data, now); } else { websocket.send(data, now, excludeImg); }
            }
        }
        catch (exc)
        {
            dialog.showDebug('network send error: ' + exc.message);
        }
    }

    this.close = function()
    {
        try { websocket.close(); } catch(ex) { };
        websocket = null;
    }
}