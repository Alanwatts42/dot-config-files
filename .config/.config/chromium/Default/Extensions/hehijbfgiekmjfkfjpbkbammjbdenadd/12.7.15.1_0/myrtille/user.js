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
/*** User                                                                                                                                                                                          ***/
/*****************************************************************************************************************************************************************************************************/

function User(config, dialog, display, network)
{
    // adaptive fullscreen update
    var adaptiveFullscreenTimeout = null;

    // event handling
    var eventListener = function() {};
    this.addListener = function(eventType, listener, useCapture) { return eventListener(eventType, listener, useCapture); };

    // passive event listeners
    var passiveEventListeners = false;
    this.getPassiveEventListeners = function() { return passiveEventListeners; };

    // keyboard
    var keyboard = null;
    this.getKeyboard = function() { return keyboard; };

    // mouse
    var mouse = null;
    this.getMouse = function() { return mouse; };

    // touchscreen
    var touchscreen = null;
    this.getTouchscreen = function() { return touchscreen; };

    // send a right click on the next touch or left-click action
    var rightClickButton = null;
    this.getRightClickButton = function() { return rightClickButton; };

    // swipe up/down gesture management for touchscreen devices
    var verticalSwipeEnabled = true;
    this.getVerticalSwipeEnabled = function() { return verticalSwipeEnabled; };

    this.init = function()
    {
        try
        {
            // W3C standard
            if (window.addEventListener)
            {
                //dialog.showDebug('event handling: using window.addEventListener');
                //eventListener = window.addEventListener;
                eventListener = function (eventType, listener, useCapture)
                {
                    if (eventType == 'resize')
                        return window.addEventListener(eventType, listener, useCapture);
                    else
                        display.getCanvas().getCanvasObject().addEventListener(eventType, listener, useCapture);
                }
                checkPassiveEventListenersSupport();
            }
            // IE < 9
            else if (window.attachEvent && document.attachEvent)
            {
                //dialog.showDebug('event handling: using window.attachEvent and document.attachEvent');
                eventListener = function(eventType, listener, useCapture)
                {
                    // attachEvent wants 'oneventType' instead of 'eventType'
                    if (eventType == 'resize')
                    {
                        window.attachEvent('on' + eventType, listener, useCapture);
                    }
                    else
                    {
                        document.attachEvent('on' + eventType, listener, useCapture);
                    }
                };
            }

            if (config.getHostType() == config.getHostTypeEnum().RDP)
            {
                // responsive display
                eventListener('resize', function() { browserResize(); });

                keyboard = new Keyboard(config, dialog, display, network, this);
                keyboard.init();

                mouse = new Mouse(config, dialog, display, network, this);
                mouse.init();

                // even if possible to detect if the device has touchscreen capabilities, it would only be an assumption; so, implementing it by default, alongside with mouse...
                // that's anyway the right thing to do, as a device can have both mouse and touchscreen
                // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
                touchscreen = new Touchscreen(config, dialog, display, network, this);
                touchscreen.init();
            }
            else
            {
                // use xterm input handlers for SSH
                display.getTerminalDiv().init(network, this);
            }
        }
        catch (exc)
        {
            dialog.showDebug('user init error: ' + exc.message);
            throw exc;
        }
    };

    // check support of passive event listeners for better scroll performance
    // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    function checkPassiveEventListenersSupport()
    {
        try
        {
            // test via a getter in the options object to see if the passive property is accessed
            var opts = Object.defineProperty({}, 'passive', { get: function() { passiveEventListeners = true; }});
            window.addEventListener('testPassive', null, opts);
            window.removeEventListener('testPassive', null, opts);
        }
        catch (exc)
        {
            dialog.showDebug('user checkPassiveEventListenersSupport error: ' + exc.message);
        }

        //dialog.showDebug('passive event listeners: ' + passiveEventListeners);
    }

    this.toggleRightClick = function(button)
    {
        try
        {
            rightClickButton = button;
            rightClickButton.value = rightClickButton.value == 'Right-Click OFF' ? 'Right-Click ON' : 'Right-Click OFF';
            //dialog.showDebug('toggling ' + rightClickButton.value);
        }
        catch (exc)
        {
            dialog.showDebug('user toggleRightClick error: ' + exc.message);
        }
    };

    this.toggleVerticalSwipe = function(button)
    {
        try
        {
            if (display.isIEBrowser())
            {
                alert('this experimental feature is disabled on IE/Edge');
                return;
            }

            verticalSwipeEnabled = !verticalSwipeEnabled;
            button.value = verticalSwipeEnabled ? 'Vertical Swipe ON' : 'Vertical Swipe OFF';
            //dialog.showDebug('toggling ' + button.value);
        }
        catch (exc)
        {
            dialog.showDebug('user toggleVerticalSwipe error: ' + exc.message);
        }
    };

    function browserResize()
    {
        if (config.getBrowserResize() == config.getBrowserResizeEnum().NONE)
            return;

        try
        {
            var width = display.getBrowserWidth();
            var height = display.getBrowserHeight();

            // if scaling display and using a canvas, resize it
            if (config.getBrowserResize() == config.getBrowserResizeEnum().SCALE && config.getDisplayMode() == config.getDisplayModeEnum().CANVAS)
            {
                // in order to avoid flicker when resizing, creates a temporary canvas (same size as the actual canvas)
                var tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;

                // draw the temporary canvas over the actual canvas
                var tempContext = tempCanvas.getContext('2d');
                tempContext.drawImage(display.getCanvas().getCanvasObject(), 0, 0);

                // resize the actual canvas
                display.getCanvas().getCanvasObject().width = width;
                display.getCanvas().getCanvasObject().height = height;

                // restore the actual canvas context properties
                if (config.getImageDebugEnabled())
                {
                    display.getCanvas().getCanvasContext().lineWidth = 1;
                    display.getCanvas().getCanvasContext().strokeStyle = 'red';
                }

                // switch the canvas
                display.getCanvas().getCanvasContext().drawImage(tempCanvas, 0, 0);
            }

            var commands = new Array();

            // send the new browser resolution
            commands.push(network.getCommandEnum().SEND_BROWSER_RESIZE.text + width + 'x' + height);

            if (config.getBrowserResize() == config.getBrowserResizeEnum().SCALE)
            {
                //dialog.showDebug('scale fullscreen update');
                commands.push(network.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text + 'scale');
            }
            else
            {
                // disable the toolbar while reconnecting
                disableToolbar();
            }

            network.send(commands.toString());
        }
        catch (exc)
        {
            dialog.showDebug('user browserResize error: ' + exc.message);
        }
    }

    this.triggerActivity = function()
    {
        if (config.getAdaptiveFullscreenTimeout() == 0)
            return;

        try
        {
            //dialog.showDebug('user activity detected, sliding adaptive fullscreen update');

            if (adaptiveFullscreenTimeout != null)
            {
                window.clearTimeout(adaptiveFullscreenTimeout);
                adaptiveFullscreenTimeout = null;
            }

            adaptiveFullscreenTimeout = window.setTimeout(function()
            {
                //dialog.showDebug('adaptive fullscreen update');
                // network.send(network.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text + 'adaptive');
                var commands = [];
                var oldEncoding = config.getImageEncoding();
                var oldQuality = config.getImageQuality();
                // Use PNG for fullscreen update^M
                commands.push(network.getCommandEnum().SET_IMAGE_ENCODING.text + '1');
                commands.push(network.getCommandEnum().REQUEST_FULLSCREEN_UPDATE.text);

                // Restore the old encoding and quality
                commands.push(network.getCommandEnum().SET_IMAGE_ENCODING.text + oldEncoding.value);
                commands.push(network.getCommandEnum().SET_IMAGE_QUALITY.text + oldQuality);

                network.send(commands);

            },
            config.getAdaptiveFullscreenTimeout());
        }
        catch (exc)
        {
            dialog.showDebug('user triggerActivity error: ' + exc.message);
        }
    };

    this.cancelEvent = function(e)
    {
        //dialog.showDebug('event type: ' + e.type);

        // don't call prevent default when using passive event listeners
        // event capture and propagation are also superseded by such a configuration
        if (passiveEventListeners && (e.type == 'mousewheel' || e.type == 'touchmove' || e.type == 'touchstart' || e.type == 'touchend'))
        {
            //dialog.showDebug('prevent default not applicable');
            return;
        }

        // prevent default action
        if (e.preventDefault) e.preventDefault();   // DOM Level 2
        else e.returnValue = false;                 // IE

        // stop event propagation
        if (e.stopPropagation) e.stopPropagation(); // DOM Level 2
        else e.cancelBubble = true;                 // IE
    };
}