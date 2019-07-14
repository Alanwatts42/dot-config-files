// Copyright Jason Savard
// Becareful because this common.js file is loaded on websites for content_scripts and we don't want errors here
const ls = localStorage;

function lsNumber(key) {
    if (ls[key]) {
        return parseFloat(ls[key]);
    }
}

var DetectClient = {};
DetectClient.isChrome = function() {
	return /chrome/i.test(navigator.userAgent) && !DetectClient.isEdge();
}
DetectClient.isFirefox = function() {
	return /firefox/i.test(navigator.userAgent);
}
DetectClient.isEdge = function() {
	return /edge/i.test(navigator.userAgent);
}
DetectClient.isWindows = function() {
	return /windows/i.test(navigator.userAgent);
}
DetectClient.isNewerWindows = function() {
	return navigator.userAgent.match(/Windows NT 1\d\./i) != null; // Windows NT 10+
}
DetectClient.isMac = function() {
	return /mac/i.test(navigator.userAgent);
}
DetectClient.isLinux = function() {
	return /linux/i.test(navigator.userAgent);
}
DetectClient.isOpera = function() {
	return /opera/i.test(navigator.userAgent);
}
DetectClient.isRockMelt = function() {
	return /rockmelt/i.test(navigator.userAgent);
}
DetectClient.isChromeOS = function() {
	return /cros/i.test(navigator.userAgent);
}
DetectClient.getChromeChannel = function() {
	return new Promise((resolve, reject) => {
		if (DetectClient.isChrome()) {
			$.getJSON("https://omahaproxy.appspot.com/all.json", data => {
				var versionDetected;
				var stableDetected = false;
				var stableVersion;
				
				for (var a=0; a<data.length; a++) {
		
					var osMatched = false;
					// patch because Chromebooks/Chrome OS has a platform value of "Linux i686" but it does say CrOS in the useragent so let's use that value
					if (DetectClient.isChromeOS()) {
						if (data[a].os == "cros") {
							osMatched = true;
						}
					} else { // the rest continue with general matching...
						if (navigator.userAgent.toLowerCase().indexOf(data[a].os) != -1) {
							osMatched = true;
						}
					}
					
					if (osMatched) {
						for (var b = 0; b < data[a].versions.length; b++) {
							if (data[a].versions[b].channel == "stable") {
								stableVersion = data[a].versions[b];
							}
							if (navigator.userAgent.indexOf(data[a].versions[b].previous_version) != -1 || navigator.userAgent.indexOf(data[a].versions[b].version) != -1) {
								// it's possible that the same version is for the same os is both beta and stable???
								versionDetected = data[a].versions[b];
								if (data[a].versions[b].channel == "stable") {
									stableDetected = true;
									resolve(versionDetected);
									return;
								}
							}
						}

						var chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+(.\d+)?(.\d+)?(.\d+)?)/i);
						if (chromeVersionMatch) {
							var currentVersionObj = parseVersionString(chromeVersionMatch[1]);
							var stableVersionObj = parseVersionString(stableVersion.previous_version);
							if (currentVersionObj.major < stableVersionObj.major) {
								resolve({ oldVersion: true, reason: "major diff" });
								return;
							} else if (currentVersionObj.major == stableVersionObj.major) {
								if (currentVersionObj.minor < stableVersionObj.minor) {
									resolve({ oldVersion: true, reason: "minor diff" });
									return;
								} else if (currentVersionObj.minor == stableVersionObj.minor) {
									/*
									if (currentVersionObj.patch < stableVersionObj.patch) {
										resolve({ oldVersion: true, reason: "patch diff" });
										return;
									}
									*/
									// commented above to ignore patch differences
									stableDetected = true;
									resolve(stableVersion);
									return;
								}
							}
						}
					}
				}
		
				// probably an alternative based browser like RockMelt because I looped through all version and didn't find any match
				if (data.length && !versionDetected) {
					resolve({channel:"alternative based browser"});
				} else {
					resolve(versionDetected);
				}
			});
		} else {
			reject("Not Chrome");
		}
	});
}

function getInternalPageProtocol() {
	var protocol;
	if (DetectClient.isFirefox()) {
		protocol = "moz-extension:";
	} else {
		protocol = "chrome-extension:";
	}
	return protocol;
}

function isInternalPage(url) {
	if (arguments.length == 0) {
		url = location.href;
	}
	return url && url.indexOf(getInternalPageProtocol()) == 0;
}

if (!window.bg) {
	if (chrome && chrome.extension && chrome.extension.getBackgroundPage) {
		window.bg = chrome.extension.getBackgroundPage();
	} else {
		console.warn("JError: no access to background");
	}
}

function customShowError(error) {
    $(document).ready(function() {
        $("body")
            .show()
            .removeAttr("hidden")
            .css("opacity", 1)
            .prepend( $("<div style='background:red;color:white;padding:5px;z-index:999'>").text(error) )
        ;
    });
}

function displayUncaughtError(errorStr) {
	if (window.polymerPromise2 && window.polymerPromise2.then) {
		polymerPromise2.then(() => {
			if (window.showError) {
                // must catch errors here to prevent onerror loop
                showError(errorStr, {
                    text: "Send feedback",
					onClick: () => {
						openUrl("https://jasonsavard.com/forum/categories/checker-plus-for-gmail-feedback?ref=send-feedback");
					}
                }).catch(e => {
                    console.error(e);
                    customShowError(errorStr);
                });
			} else {
				customShowError(errorStr);
			}
		}).catch(error => {
			customShowError(errorStr);
		});
	} else {
		customShowError(errorStr);
	}
}

window.onerror = function(msg, url, line) {
	var thisUrl = removeOrigin(url).substr(1); // also remove beginning slash '/'
	var thisLine;
	if (line) {
		thisLine = " (" + line + ") ";
	} else {
		thisLine = " ";
	}
	var action = thisUrl + thisLine + msg;
	
	sendGAError(action);
	
    var errorStr = msg + " (" + thisUrl + " " + line + ")";
    displayUncaughtError(errorStr);
	
	//return false; // false prevents default error handling.
};

window.addEventListener('unhandledrejection', function (event) {
    console.error("unhandledrejection", event);
    displayUncaughtError(event.reason.stack ? event.reason.stack : event.reason);
  
    // Prevent the default handling (error in console)
    //event.preventDefault();
});

// usage: [url] (optional, will use location.href by default)
function removeOrigin(url) {
	var linkObject;
	if (arguments.length && url) {
		try {
			linkObject = document.createElement('a');
			linkObject.href = url;
		} catch (e) {
			console.error("jerror: could not create link object: " + e);
		}
	} else {
		linkObject = location;
	}
	
	if (linkObject) {
		return linkObject.pathname + linkObject.search + linkObject.hash;
	} else {
		return url;
	}
}

//anonymized email by using only 3 letters instead to comply with policy
async function getUserIdentifier() {
	// seems it didn't exist sometimes!
	if (window && window.bg && window.getFirstActiveEmail) {
		var str = await getFirstActiveEmail(bg.accounts);
		if (str) {
			str = str.split("@")[0].substr(0,3);
		}
		return str;
	}
}

async function sendGAError(action) {
	// google analytics

	// commented because event quota was surpassed in analytics
	/*
	var JS_ERRORS_CATEGORY = "JS Errors";
	if (typeof sendGA != "undefined") {
		// only action (no label) so let's use useridentifier
		var userIdentifier = await getUserIdentifier();
		if (arguments.length == 1 && userIdentifier) {
			sendGA(JS_ERRORS_CATEGORY, action, userIdentifier);
		} else {
			// transpose these arguments to sendga (but replace the 1st arg url with category ie. js errors)
			// use slice (instead of sPlice) because i want to clone array
			var argumentsArray = [].slice.call(arguments, 0);
			// transpose these arguments to sendGA
			var sendGAargs = [JS_ERRORS_CATEGORY].concat(argumentsArray);
			sendGA.apply(this, sendGAargs);
		}
	}
	//return false; // false prevents default error handling.
	*/
}

function logError(action) {
	// transpose these arguments to console.error
	// use slice (instead of sPlice) because i want to clone array
	var argumentsArray = [].slice.call(arguments, 0);
	// exception: usually 'this' is passed but instead its 'console' because console and log are host objects. Their behavior is implementation dependent, and to a large degree are not required to implement the semantics of ECMAScript.
	console.error.apply(console, argumentsArray);
	
	sendGAError.apply(this, arguments);
}

var ONE_SECOND = 1000;
var ONE_MINUTE = 60000;
var ONE_HOUR = ONE_MINUTE * 60;
var ONE_DAY = ONE_HOUR * 24;
Calendar = function () {};

jQuery.fn.exists = function(){return jQuery(this).length>0;}
jQuery.fn.unhide = function() {
	this.removeAttr('hidden');
	return this;
}
jQuery.fn.hidden = function () {
	this.attr('hidden', true);
	return this;
}
var originalShow = jQuery.fn.show;
jQuery.fn.show = function(duration, callback) {
	if (!duration){
		originalShow.apply(this, arguments);
		this.removeAttr('hidden');
	} else {
		var that = this;
		originalShow.apply(this, [duration, function() {
			that.removeAttr('hidden');
			if (callback){
				callback.call(that);
			}
		}]);
	}
	return this;
};
jQuery.fn.textNodes = function() {
	var ret = [];

	(function(el){
		if (!el) return;
		if ((el.nodeType == 3)||(el.nodeName =="BR"))
			ret.push(el);
		else
			for (var i=0; i < el.childNodes.length; ++i)
				arguments.callee(el.childNodes[i]);
	})(this[0]);
	return $(ret);
}
jQuery.fn.hasHorizontalScrollbar = function() {
    var divnode = this[0];
    if (divnode && divnode.scrollWidth > divnode.clientWidth) {
        return true;
    } else {
    	return false;
    }
}

jQuery.fn.hasVerticalScrollbar = function(buffer) {
	if (!buffer) {
		buffer = 0;
	}
	
    var divnode = this[0];
    if (divnode.scrollHeight > divnode.clientHeight + buffer) {
        return true;
    } else {
    	return false;
    }
}

jQuery.fn.changeNode = function(newTagName) {
	if (this[0]) {
		var newNodeHTML = this[0].outerHTML;
		newNodeHTML = newNodeHTML.replace("<" + this[0].tagName.toLowerCase() + " ", "<" + newTagName + " ");
		newNodeHTML = newNodeHTML.replace("/" + this[0].tagName.toLowerCase() + ">", "/" + newTagName + ">");
		this.replaceWith( $(newNodeHTML) );
		return $(newNodeHTML);
	} else {
		return this;
	}
}

jQuery.fn.autoResize = function(options) {
	 
    // Just some abstracted details,
    // to make plugin users happy:
    var settings = $.extend({
        onResize : function(){},
        animate : true,
        animateDuration : 150,
        animateCallback : function() {},
        minHeight : 50,
        extraSpace : 0, // space at the bottom
        limit: 1000
    }, options);

    // Only textarea's auto-resize:
    this.filter('textarea').each(function(){

            // Get rid of scrollbars and disable WebKit resizing:
    	
        var textarea = $(this).css({resize:'none','overflow-y':'hidden'}),

            // Cache original height, for use later:
            origHeight = textarea.height(),

            // Need clone of textarea, hidden off screen:
            clone = (function(){

                // Properties which may effect space taken up by chracters:
                var props = ['height','padding','width','lineHeight','textDecoration','letterSpacing'],
                    propOb = {};

                // Create object of styles to apply:
                $.each(props, function(i, prop){
                    propOb[prop] = textarea.css(prop);
                });
                
                console.log("propob", propOb);

                // Clone the actual textarea removing unique properties
                // and insert before original textarea:
                return textarea.clone().removeAttr('id').removeAttr('name').css({
                    position: 'absolute',
                    top: 0,
                    left: -9999
                }).css(propOb).attr('tabIndex','-1').insertBefore(textarea);

            })(),
            lastScrollTop = null,
            updateSize = function() {

                // Prepare the clone:
                clone.height(0).val($(this).val()).scrollTop(10000);
                
                if (!origHeight) {
                	origHeight = settings.minHeight;
                }
                
                // Find the height of text:
                var scrollTop = Math.max(clone.scrollTop(), origHeight) + settings.extraSpace,
                    toChange = $(this).add(clone);
                
                // Don't do anything if scrollTip hasen't changed:
                if (lastScrollTop === scrollTop) { return; }
                lastScrollTop = scrollTop;

                // Check for limit:
                if ( scrollTop >= settings.limit ) {
                    $(this).css('overflow-y','');
                    return;
                }
                // Fire off callback:
                settings.onResize.call(this);

                // Either animate or directly apply height:
                toChange.stop().animate({height:scrollTop}, settings.animateDuration, settings.animateCallback);
                /*
                settings.animate && textarea.css('display') === 'block' ?
                    toChange.stop().animate({height:scrollTop}, settings.animateDuration, settings.animateCallback)
                    : toChange.height(scrollTop);
                */
            };

        // Bind namespaced handlers to appropriate events:
        textarea
            .off('.dynSiz')
            .on('keyup.dynSiz', updateSize)
            .on('keydown.dynSiz', updateSize)
            .on('change.dynSiz', updateSize);

    });

    // Chain:
    return this;

};
jQuery.fn.toggleAttr = function(attr, value) {
	return this.each(function() {
		var $this = $(this);
		if (value === false) {
			$this.removeAttr(attr);
		} else {
			if ($this.attr(attr) == undefined || value === true) {
				$this.attr(attr, "");
			} else {
				$this.removeAttr(attr);
			}
		}
	});
};

function seconds(seconds) {
	return seconds * ONE_SECOND;
}

function minutes(mins) {
	return mins * ONE_MINUTE;
}

function hours(hours) {
	return hours * ONE_HOUR;
}

function days(days) {
	return days * ONE_DAY;
}

async function loadLocaleMessages(locale) {
    locale = locale.toLowerCase();

    // only load locales from files if they are not using their browser language (because i18n.getMessage uses the browser language) 
    if (locale == chrome.i18n.getUILanguage() || locale == chrome.i18n.getUILanguage().substring(0, 2)) {
        // for english just use native calls to get i18n messages
        localeMessages = null;
    } else {
        //console.log("loading locale: " + locale);
        
        // i haven't created a en-US so let's avoid the error in the console and just push the callback
        if (locale != "en-us") {
            
            var lang;
            var region;
            
            locale = locale.replace("-", "_");
            lang = locale.split("_")[0].toLowerCase();
            region = locale.split("_")[1];
                
            async function readMessagesFile(lang, region) {
                var folderName;
                if (region) {
                    folderName = lang + "_" + region.toUpperCase();
                } else {
                    folderName = lang;
                }
                
                return ajax({
                    url: chrome.runtime.getURL("_locales/" + folderName + "/messages.json"),
                    dataType: "json",
                    timeout: 5000
                });
            }
            
            try {
                localeMessages = await readMessagesFile(lang, region);
            } catch (error) {
                // if we had region then try lang only
                if (region) {
                    console.log("Couldn't find region: " + region + " so try lang only: " + lang);
                    try {
                        localeMessages = await readMessagesFile(lang);
                    } catch (error) {
                        // always resolve
                        console.warn(error);
                    }
                } else {
                    console.warn("Lang not found: " + lang);
                }
            }
            
        }
    }
}

function getMessage(messageID, args) {
	if (messageID) {
		if (typeof localeMessages != 'undefined' && localeMessages != null) {
			var messageObj = localeMessages[messageID];	
			if (messageObj) { // found in this language
				var str = messageObj.message;
				
				// patch: replace escaped $$ to just $ (because chrome.i18n.getMessage did it automatically)
				if (str) {
					str = str.replace(/\$\$/g, "$");
				}
				
				if (args) {
					if (args instanceof Array) {
						for (var a=0; a<args.length; a++) {
							str = str.replace("$" + (a+1), args[a]);
						}
					} else {
						str = str.replace("$1", args);
					}
				}
				return str;
			} else { // default to default language
				return chromeGetMessage(messageID, args);
			}
		} else {
			return chromeGetMessage(messageID, args);
		}
	}
}

//patch: chrome.i18n.getMessage does pass parameter if it is a numeric - must be converted to str
function chromeGetMessage(messageID, args) {
	if (args && $.isNumeric(args)) {
		args = args + "";
	}
	return chrome.i18n.getMessage(messageID, args);
}

function getUniqueId() {
	return Math.floor(Math.random() * 100000);
}

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc, forceEnglish) {
		var dF = dateFormat;
		var i18n = forceEnglish ? dF.i18nEnglish : dF.i18n;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  i18n.dayNamesShort[D],
				dddd: i18n.dayNames[D],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  i18n.monthNamesShort[m],
				mmmm: i18n.monthNames[m],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

dateFormat.i18nEnglish = $.extend(true, {}, dateFormat.i18n);
dateFormat.i18nCalendarLanguage = $.extend(true, {}, dateFormat.i18n);

Date.prototype.isValid = function() {
	if (Object.prototype.toString.call(this) !== "[object Date]") {
		return false;
	}
	return !isNaN(this.getTime());
}

Date.prototype.addSeconds = function(seconds, cloneDate) {
	var date;
	if (cloneDate) {
		date = new Date(this);		
	} else {
		date = this;
	}
	date.setSeconds(date.getSeconds() + seconds, date.getMilliseconds());
	return date;
}

Date.prototype.subtractSeconds = function(seconds, cloneDate) {
	return this.addSeconds(-seconds, cloneDate);
}

// For convenience...
Date.prototype.format = function (mask, utc, forceEnglish) {
	return dateFormat(this, mask, utc, forceEnglish);
};

Date.prototype.formattedTime = function (twentyFourHourMode) {
	if (twentyFourHourMode) {
		return dateFormat(this, "HH:MM");
	} else {
		return dateFormat(this, "h:MMtt");
	}
};

Date.prototype.displayDate = function(params) {
	params = initUndefinedObject(params);
	
	// date
	var dateStr;
    if (this.isToday()) { // diffInHours() > -12
        dateStr = this.formattedTime(params.twentyFourHourMode);
	} else {
		if (params.relativeDays && this.isYesterday()) {
			dateStr = getMessage("yesterday");
		} else {
			dateStr = this.format("mmm d");
		}
	}
	return dateStr;
}

Date.parse = function(dateStr) {
	var DATE_TIME_REGEX = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.\d+(\+|-)(\d\d):(\d\d)$/;
	var DATE_TIME_REGEX_Z = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.\d+Z$/;
	var DATE_TIME_REGEX_Z2 = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)+Z$/;
	var DATE_MILLI_REGEX = /^(\d\d\d\d)(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/;
	var DATE_REGEX = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
	var DATE_NOSPACES_REGEX = /^(\d\d\d\d)(\d\d)(\d\d)$/;

	/* Convert the incoming date into a javascript date
	 * 2006-04-28T09:00:00.000-07:00
	 * 2006-04-28T09:00:00.000Z
	 * 2010-05-25T23:00:00Z (new one from jason)
	 * 2006-04-19
	 */
	var parts = DATE_TIME_REGEX.exec(dateStr);

	// Try out the Z version
	if (!parts) {
		parts = DATE_TIME_REGEX_Z.exec(dateStr);
	}
	if (!parts) {
		parts = DATE_TIME_REGEX_Z2.exec(dateStr);
	}

	if (exists(parts) && parts.length > 0) {
		var d = new Date();
		d.setUTCFullYear(parts[1], parseInt(parts[2], 10) - 1, parts[3]);
		d.setUTCHours(parts[4]);
		d.setUTCMinutes(parts[5]);
		d.setUTCSeconds(parts[6]);
		d.setUTCMilliseconds(0);

		var tzOffsetFeedMin = 0;
		if (parts.length > 7) {
			tzOffsetFeedMin = parseInt(parts[8],10) * 60 + parseInt(parts[9],10);
			if (parts[7] != '-') { // This is supposed to be backwards.
				tzOffsetFeedMin = -tzOffsetFeedMin;
			}
		}
		return new Date(d.getTime() + tzOffsetFeedMin * ONE_MINUTE); 
	}

	parts = DATE_MILLI_REGEX.exec(dateStr);
	if (exists(parts)) {
		var d = new Date();
		d.setFullYear(parts[1], parseInt(parts[2], 10) - 1, parts[3]);
		d.setHours(parts[4]);
		d.setMinutes(parts[5]);
		d.setSeconds(parts[6]);
		d.setMilliseconds(0);
		return d;
	}
	if (!parts) {
		parts = DATE_REGEX.exec(dateStr);
	}
	if (!parts) {
		parts = DATE_NOSPACES_REGEX.exec(dateStr);
	}
	if (exists(parts) && parts.length > 0) {
		return new Date(parts[1], parseInt(parts[2],10) - 1, parts[3]);
	}
	
	// Parse these strings...
	// Wed, Jan 25, 2012 at 1:53 PM
	// 25 janvier 2012 13:53
	// 25 января 2012 г. 13:53
	
	if (!isNaN(dateStr)) {
		return new Date(dateStr);
	}
	return null;
}

Date.prototype.resetTime = function () {
	this.setHours(0);
	this.setMinutes(0);
	this.setSeconds(0, 0); 
}

function today() {
	var date = new Date();
	date.resetTime();
	return date;
}

function yesterday() {
	var yest = new Date();
	yest.setDate(yest.getDate()-1);
	yest.resetTime();
	return yest;
}

function tomorrow() {
	var tom = new Date();
	tom.setDate(tom.getDate()+1);
	tom.resetTime();
	return tom;
}

function isToday(date) {
	var todayDate = today();
	return date.getFullYear() == todayDate.getFullYear() && date.getMonth() == todayDate.getMonth() && date.getDate() == todayDate.getDate();
}

function isTomorrow(date) {
	var tom = tomorrow();
	return date.getFullYear() == tom.getFullYear() && date.getMonth() == tom.getMonth() && date.getDate() == tom.getDate();
}

function isYesterday(date) {
	var yest = yesterday();
	return date.getFullYear() == yest.getFullYear() && date.getMonth() == yest.getMonth() && date.getDate() == yest.getDate();
}

function now() {
	return new Date();
}

Date.prototype.isToday = function () {
	return isToday(this);
};

Date.prototype.isTomorrow = function () {
	return isTomorrow(this);
};

Date.prototype.isYesterday = function () {
	return isYesterday(this);
};

Date.prototype.isSameDay = function (otherDay) {
	return this.getFullYear() == otherDay.getFullYear() && this.getMonth() == otherDay.getMonth() && this.getDate() == otherDay.getDate();
};

Date.prototype.isBefore = function(otherDate) {
	var paramDate;
	if (otherDate) {
		paramDate = new Date(otherDate);
	} else {
		paramDate = new Date();
	}	
	var thisDate = new Date(this);
	return thisDate.getTime() < paramDate.getTime();
};

Date.prototype.isAfter = function(otherDate) {
	return !this.isBefore(otherDate);
};

Date.prototype.diffInSeconds = function(otherDate) {
	var d1;
	if (otherDate) {
		d1 = new Date(otherDate);
	} else {
		d1 = new Date();
	}	
	var d2 = new Date(this);
	return (d2.getTime() - d1.getTime()) / ONE_SECOND;
};

Date.prototype.diffInMinutes = function(otherDate) {
	var d1;
	if (otherDate) {
		d1 = new Date(otherDate);
	} else {
		d1 = new Date();
	}	
	var d2 = new Date(this);
	return (d2.getTime() - d1.getTime()) / ONE_MINUTE;
};

Date.prototype.diffInHours = function(otherDate) {
	var d1;
	if (otherDate) {
		d1 = new Date(otherDate);
	} else {
		d1 = new Date();
	}	
	var d2 = new Date(this);
	return (d2.getTime() - d1.getTime()) / ONE_HOUR;
};

Date.prototype.diffInDays = function(otherDate) {
	var d1;
	if (otherDate) {
		d1 = new Date(otherDate);
	} else {
		d1 = new Date();
	}	
	d1.setHours(1);
	d1.setMinutes(1);
	var d2 = new Date(this);
	d2.setHours(1);
	d2.setMinutes(1);
	return (d2.getTime() - d1.getTime()) / ONE_DAY;
};

Date.prototype.daysInThePast = function() {
	return this.diffInDays() * -1;
};

Date.prototype.addDays = function(days) {
	var newDate = new Date(this);
	newDate.setDate(newDate.getDate()+days);
	return newDate;
}

Date.prototype.subtractDays = function(days) {
	return this.addDays(days*-1);
}



// Same as Array.prototype.unique but newer!
Object.defineProperty(Array.prototype, 'unique', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function() {
        var a = this.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i] === a[j])
                    a.splice(j--, 1);
            }
        }

        return a;
    }
});

// returns a subset of an object array with unique attributes, ex. [{type:"1"}, {type:"1"}, {type:"2"}}.unique(function(obj) {return obj.type}); // result: [1,2]
Array.prototype.uniqueAttr = function(getValueFunction) {
    var result = {};
    for(var i = 0; i < this.length; ++i) {
        var value = getValueFunction(this[i]);
        result[(typeof value) + ' ' + value] = value;
    }

    var retArray = [];

    for (key in result) {
        if (result.hasOwnProperty(key)) { 
            retArray.push(result[key]);
        }
    }

    return retArray;
}

Array.prototype.caseInsensitiveSort = function() {
	this.sort(function(a, b) {
	    if (a.toLowerCase() < b.toLowerCase()) return -1;
	    if (a.toLowerCase() > b.toLowerCase()) return 1;
	    return 0;
	})
	return this;
};
Array.prototype.first = function() {
	return this[0];
};
Array.prototype.last = function() {
	return this[this.length-1];
};
Array.prototype.isEmpty = function() {
	return this.length == 0;
};
Array.prototype.swap = function (x,y) {
	var b = this[x];
	this[x] = this[y];
	this[y] = b;
	return this;
}

Array.prototype.addItem = function(key, value) {
	for (var i=0, l=this.length; i<l; ++i) {
		if (this[i].key == key) {
			// found key so update value
			this[i].value = value;
			return;
		}
	}
	this.push({key:key, value:value});
}
Array.prototype.getItem = function(key) {
	for (var i=0, l=this.length; i<l; ++i) {
		if (this[i].key == key) {			
			return this[i].value;
		}
	}
}

// Convert associative javascript array to an object
Array.prototype.toObject = function() {
	var obj = new Object();
	for(var key in this){
		// exclude functions from object
		if (!$.isFunction(this[key])) {
			obj[key] = this[key];
		}
	}
	return obj;
}

String.prototype.parseUrl = function() {
	var a = document.createElement('a');
	a.href = this;
	return a;
}

String.prototype.replaceAll = function(find, replace) {
	var findEscaped = escapeRegExp(find);
	return this.replace(new RegExp(findEscaped, 'g'), replace);
}

String.prototype.chunk = function(size) {
	return this.match(new RegExp('.{1,' + size + '}', 'g'));
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.equalsIgnoreCase = function(str) {
	if (this && str) {
		return this.toLowerCase() == str.toLowerCase();
	}
}

String.prototype.hasWord = function(word) {
	return new RegExp("\\b" + word + "\\b", "i").test(this);
}

String.prototype.summarize = function(maxLength, EOM_Message) {
	if (!maxLength) {
		maxLength = 101;
	}
	var summary = this;
	if (summary.length > maxLength) {
		summary = summary.substring(0, maxLength);
		var lastSpaceIndex = summary.lastIndexOf(" ");
		if (lastSpaceIndex != -1) {
			summary = summary.substring(0, lastSpaceIndex);
			summary = $.trim(summary);
		}
		summary += "...";
	} else {
		if (EOM_Message) {
			summary += EOM_Message;
		}
	}
	
	// patch: do not why: but it seem that unless i append a str to summary, it returns an array of the letters in summary?
	return summary + "";
}

String.prototype.parseTime = function() {
	// examples...
	// italian time (no ampm on 12hour) 6 novembre 2015 12:03
	var d = new Date();
	var pieces;
	if (this.indexOf(":") != -1) { // "17 September 2015 at 20:56"
		pieces = this.match(/(\d+)([:|\.](\d\d))\s*(a|p)?/i);
	} else { // "2pm"
		pieces = this.match(/(\d+)([:|\.](\d\d))?\s*(a|p)?/i);
	}
	if (pieces && pieces.length >= 5) {
		// patch: had to use parseFloat instead of parseInt (because parseInt would return 0 instead of 9 when parsing "09" ???		
		var hours = parseFloat(pieces[1]);
		var ampm = pieces[4];
		
		// patch for midnight because 12:12am is actually 0 hours not 12 hours for the date object
		if (hours == 12) {
			if (ampm && ampm.toLowerCase().startsWith("a")) {
				hours = 0;
			} else {
				hours = 12;
			}
		} else if (ampm && ampm.toLowerCase().startsWith("p")) {
			hours += 12;
		}
		d.setHours(hours);		
		d.setMinutes( parseFloat(pieces[3]) || 0 );
		d.setSeconds(0, 0);
		return d;
	}
}

String.prototype.startsWith = function (str) {
	return this.indexOf(str) == 0;
};

String.prototype.endsWith = function (str) {
	return this.slice(-str.length) == str;
};

// remove entity codes
String.prototype.htmlToText = function() {
	/*
	var tmp = document.createElement("DIV");
	tmp.innerHTML = this;
	return tmp.textContent||tmp.innerText;
	*/
	
	// Firefox DOM insertion proof
	let text;
	try {
		// path for error "Cannot read property 'childNodes' of null" refer to https://jasonsavard.com/forum/discussion/comment/20586#Comment_20586
		text = $("<textarea/>").html(this).text().replace(/<br\s?\/?>/ig,"\n").replace(/<(?:.|\n)*?>/gm, '');
	} catch (e) {
		text = "";
	}
	return text;
}

String.prototype.htmlEntities = function() {
	return String(this).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

//remove entity codes
String.prototype.getFirstName = function() {
	return this.split(" ")[0];
}

/*
String.prototype.endsWith = function(suffix) {
	var indexOfSearchStr = this.indexOf(suffix, this.length - suffix.length); 
    return indexOfSearchStr != -1 && indexOfSearchStr == this.length - suffix.length;
};
*/

function parseHtml(html) {
	var dom = (new DOMParser()).parseFromString(html, "text/html");
	if (dom.documentElement.nodeName != "parsererror") {
		return dom;
	}
}

function parseHtmlToJQuery(html) {
	return $(parseHtml(html));
}

function initAnalytics() {
	if (DetectClient.isChrome()) {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = 'js/analytics.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
		$(document).ready(function() {
			$(document).on("click", "a, input, button", function() {
				processNodeForAnalytics(this);
			});
			$(document).on("change", "select", function() {
				processNodeForAnalytics(this);
			});
		});
	}
} 

function determineAnalyticsLabel(node) {
	var $node = $(node);
	var id = $node.attr("ga");
	if (id == "IGNORE") {
		return;
	}
	if (id) {
		return id;
	}
	id = $node.attr("id");
	if (id) {
		return id;
	}
	/*
	if ($node.hasClass("button") || $node.hasClass("icon")) {
		id = $node.attr("class").split(" ")[1];
		if (id) {
			return id;
		}
	}
	*/
	id = $node.attr("msg");
	if (id) {
		return id;
	}
	id = $node.attr("msgTitle");
	if (id) {
		return id;
	}
	id = $node.attr("href");
	// don't log # so dismiss it
	if (id) {
		if (id == "#") {
			return;
		} else {
			id = id.replace(/javascript\:/, "");
			// only semicolon so remove it and keep finding other ids
			if (id == ";") {
				return "";
			}
		}
	}
	id = $node.parent().attr("id");
	if (id) {
		return id;
	}
	id = $node.attr("class");
	if (id) {
		return id;
	}
}

function processNodeForAnalytics(node) {
	var $node = $(node);
	var label = null;
	var id = determineAnalyticsLabel(node);
	if (id) {
		if ($node.attr("type") != "text") {
			if ($node.attr("type") == "checkbox") {
				if (node.checked) {
					label = id + "_on";
				} else {
					label = id + "_off";
				}
			} else if (node.tagName == "SELECT") {
				label = $node.val();
			}
			var category = $node.closest("*[gaCategory]");
			var action = null;
			// if gaCategory specified
			if (category.length != 0) {
				category = category.attr("gaCategory");
				action = id;
			} else {
				category = id;
				action = "click";
			}
			
			if (label != null) {
				sendGA(category, action, label);
			} else {
				sendGA(category, action);
			}
		}
	}
}

//usage: sendGA('category', 'action', 'label');
//usage: sendGA('category', 'action', 'label', value);  // value is a number.
//usage: sendGA('category', 'action', {'nonInteraction': 1});
function sendGA(category, action, label, etc) {
	
	// Disables sending any analytics when using Firefox to comply with their policy
	if (DetectClient.isChrome()) {
		console.log("%csendGA: " + category + " " + action + " " + label, "font-size:0.6em");
	
		// patch: seems arguments isn't really an array so let's create one from it
		var argumentsArray = [].splice.call(arguments, 0);
	
		var gaArgs = ['send', 'event'];
		// append other arguments
		gaArgs = gaArgs.concat(argumentsArray);
		
		if (window && window.ga) {
			ga.apply(this, gaArgs);
		}
	}
	
}

async function initUI() {
    await storage.init();
    await loadLocaleMessages(await storage.get("language"));

    await initMisc();
	initMessages(); // must be before polymer loads to process templates etc.
	initMessagesInTemplates();
}

async function initMisc() {
	if (!await storage.get("console_messages")) {
		console.log = console.debug = function () {};
	}

    initCalendarNames(dateFormat.i18n);
    initOauthAPIs();
}

function openContributeDialog(key, monthly, footerText) {
	var dialogParams = {};
	
	if (monthly) {
		dialogParams.content = getMessage("extraFeaturesMonthlyBlurb");
		dialogParams.otherLabel = getMessage("monthlyContribution");
		dialogParams.otherLabel2 = getMessage("moreInfo");
	} else {
		dialogParams.title = getMessage("extraFeatures");
		dialogParams.content = getMessage("extraFeaturesPopup1") + "<br>" + getMessage("extraFeaturesPopup2");
		dialogParams.otherLabel = getMessage("contribute");
	}
	
	if (footerText) {
		dialogParams.content += "<br><br>" + footerText;
	}
	
	openGenericDialog(dialogParams).then(function(response) {
		if (response == "other") {
			var url = "donate.html?action=" + key;
			if (monthly) {
				url += "&contributionType=monthly";
			}
			openUrl(url);
		} else if (response == "other2") {
			openUrl("https://jasonsavard.com/wiki/Gmail_API_Quota?ref=contributeDialog");
		}
	});
}

async function setStorage(element, params) {
	var OFF_OR_DEFAULT = DEFAULT_SETTINGS_ALLOWED_OFF.indexOf(params.key) != -1 && (!params.value || DEFAULT_SETTINGS[params.key] == params.value);
	
	if (($(element).closest("[mustDonate]").length || params.mustDonate) && !donationClickedFlagForPreventDefaults && !OFF_OR_DEFAULT) {
		params.event.preventDefault();
		openContributeDialog(params.key);
		return Promise.reject(JError.DID_NOT_CONTRIBUTE);
	} else {
		if (params.account) {
			return params.account.saveSettingForLabel(params.key, params.label, params.value);
		} else {
			return storage.set(params.key, params.value);
		}
	}
}

function initPaperElement($nodes, params) {
	params = initUndefinedObject(params);
	
	$nodes.each(async (index, element) => {
		var $element = $(element);
		
		var key = $element.attr("indexdb-storage");
		var permissions;
		if (DetectClient.isChrome()) {
			permissions = $element.attr("permissions");
		}
		
		if (key && key != "language") { // ignore lang because we use a specific logic inside the options.js
			if (element.nodeName.equalsIgnoreCase("paper-checkbox")) {
				$element.attr("checked", toBool(await storage.get(key)));
			} else if (element.nodeName.equalsIgnoreCase("paper-listbox")) {
				element.setAttribute("selected", await storage.get(key));
			} else if (element.nodeName.equalsIgnoreCase("paper-radio-group")) {
				element.setAttribute("selected", await storage.get(key));
			} else if (element.nodeName.equalsIgnoreCase("paper-slider")) {
				element.setAttribute("value", await storage.get(key));
			} else if (element.nodeName.equalsIgnoreCase("paper-input")) {
				var value = await storage.get(key);
				if (value != null) {
					element.setAttribute("value", value);
				}
			}
		} else if (permissions) {
			chrome.permissions.contains({permissions: [permissions]}, function(result) {
				$element.attr("checked", result);
			});
		}

		// need a 1ms pause or else setting the default above would trigger the change below?? - so make sure it is forgotten
		setTimeout(function() {
			
			var eventName;
			if (element.nodeName.equalsIgnoreCase("paper-checkbox")) {
				eventName = "change";
			} else if (element.nodeName.equalsIgnoreCase("paper-listbox")) {
				eventName = "iron-activate";
			} else if (element.nodeName.equalsIgnoreCase("paper-radio-group")) {
				eventName = "paper-radio-group-changed";
			} else if (element.nodeName.equalsIgnoreCase("paper-slider")) {
				eventName = "change";
			} else if (element.nodeName.equalsIgnoreCase("paper-input")) {
				eventName = "change";
			}
			
			$element.on(eventName, function(event) {
				if (key || params.key) {
					
					var value;
					if (element.nodeName.equalsIgnoreCase("paper-checkbox")) {
						value = element.checked;
					} else if (element.nodeName.equalsIgnoreCase("paper-listbox")) {
						value = event.originalEvent.detail.selected;
					} else if (element.nodeName.equalsIgnoreCase("paper-radio-group")) {
						value = element.selected;
					} else if (element.nodeName.equalsIgnoreCase("paper-slider")) {
						value = $element.attr("value");
					} else if (element.nodeName.equalsIgnoreCase("paper-input")) {
						value = $element[0].value;
					}

					let storagePromise;
					
					if (key) {
						storagePromise = setStorage($element, {event:event, key:key, value:value});
					} else if (params.key) {
						params.event = event;
						params.value = value;
						storagePromise = setStorage($element, params);
					}
					
					storagePromise.catch(error => {
						console.error("could not save setting: " + error);
						if (element.nodeName.equalsIgnoreCase("paper-checkbox")) {
							element.checked = !element.checked;
						} else if (element.nodeName.equalsIgnoreCase("paper-listbox")) {
							$element.closest("paper-dropdown-menu")[0].close();
						}
						
						if (error != JError.DID_NOT_CONTRIBUTE) {
							showError(error);
						}
					});
				} else if (permissions) {
					if (element.checked) {
						chrome.permissions.request({permissions: [permissions]}, function(granted) {
							if (granted) {
								$element.attr("checked", granted);
							} else {
								$element.attr("checked", false);
								alert("Might not be supported by this OS");
							}
						});
					} else {			
						chrome.permissions.remove({permissions: [permissions]}, function(removed) {
							if (removed) {
								$element.attr("checked", false);
							} else {
								// The permissions have not been removed (e.g., you tried to remove required permissions).
								$element.attr("checked", true);
								alert("These permissions could not be removed, they might be required!");
							}
						});
					}
				}
			});
		}, 500);
	});
}

function initMessagesInTemplates(templates) {
	return new Promise((resolve, reject) => {
		if (templates) {
			for (let a = 0; a < templates.length; a++) {
				let node = templates[a].content.firstElementChild;
				if (node) {
					initMessages($(node).find("*"), true);
					let innerTemplates = templates[a].content.querySelectorAll("template");
					initMessagesInTemplates(innerTemplates);
				}
			}
		} else {
			templates = document.querySelectorAll("template");
			if (templates.length) {
				initMessagesInTemplates(templates);
			} else {
				resolve();
			}
		}
	});
}

function initCalendarNames(obj) {
	obj.dayNames = getMessage("daysArray").split(",");
	obj.dayNamesShort = getMessage("daysArrayShort").split(",");
	obj.monthNames = getMessage("monthsArray").split(",");
	obj.monthNamesShort = getMessage("monthsArrayShort").split(",");
}

function _changeMessages(selectorOrNode) {
	// options page only for now..
	if (location.href.indexOf("options.html") != -1 || location.href.indexOf("popup.html") != -1) {
		$("html").attr("dir", getMessage("dir"));
	}

	// used to target certain divs in a page for direction:rtl etc.
	$("html").addClass(getMessage("dir"));

	var $selector;
	if (selectorOrNode) {
		$selector = $(selectorOrNode);
	} else {
		$selector = $("*");
	}

	$selector.each(function () {
		var attr = $(this).attr("msg");
		if (attr) {
			var msgArg1 = $(this).attr("msgArg1");
			if (msgArg1) {
				$(this).text(getMessage(attr, msgArg1));
				var msgArg2 = $(this).attr("msgArg2");
				if (msgArg2) {
					$(this).text(getMessage(attr, [msgArg1, msgArg2]));
				}
			} else {
				// look for inner msg nodes to replace before...
				var innerMsg = $(this).find("*[msg]");
				if (innerMsg.exists()) {
					_changeMessages(innerMsg);
					var msgArgs = new Array();
					innerMsg.each(function (index, element) {
						msgArgs.push($(this)[0].outerHTML);
					});
					$(this).html(getMessage(attr, msgArgs));
				} else {
					if (this.nodeName == "PAPER-TOOLTIP") {
						var $innerNode = $(this).find(".paper-tooltip");
						if ($innerNode.length) {
							$innerNode.text(getMessage(attr));
						} else {
							$(this).text(getMessage(attr));
						}
					} else {
						$(this).text(getMessage(attr));
					}
				}
			}
		}
		attr = $(this).attr("msgTitle");
		if (attr) {
			var msgArg1 = $(this).attr("msgTitleArg1");
			if (msgArg1) {
				$(this).attr("title", getMessage($(this).attr("msgTitle"), msgArg1));
			} else {
				$(this).attr("title", getMessage(attr));
			}
		}
		attr = $(this).attr("msgLabel");
		if (attr) {
			var msgArg1 = $(this).attr("msgLabelArg1");
			if (msgArg1) {
				$(this).attr("label", getMessage($(this).attr("msgLabel"), msgArg1));
			} else {
				$(this).attr("label", getMessage(attr));
			}
		}
		attr = $(this).attr("msgText");
		if (attr) {
			var msgArg1 = $(this).attr("msgTextArg1");
			if (msgArg1) {
				$(this).attr("text", getMessage($(this).attr("msgText"), msgArg1));
			} else {
				$(this).attr("text", getMessage(attr));
			}
		}
		attr = $(this).attr("msgSrc");
		if (attr) {
			$(this).attr("src", getMessage(attr));
		}
		attr = $(this).attr("msgValue");
		if (attr) {
			$(this).attr("value", getMessage(attr));
		}
		attr = $(this).attr("msgPlaceholder");
		if (attr) {
			$(this).attr("placeholder", getMessage(attr));
		}
		attr = $(this).attr("msgHTML");
		if (attr) {
			$(this).html(getMessage(attr));
		}
		attr = $(this).attr("msgHALIGN");
		if (attr) {
			if ($("html").attr("dir") == "rtl" && attr == "right") {
				$(this).attr("horizontal-align", "left");
			} else {
				$(this).attr("horizontal-align", attr);
			}
		}
		attr = $(this).attr("msgPosition");
		if (attr) {
			if ($("html").attr("dir") == "rtl" && attr == "left") {
				$(this).attr("position", "right");
			} else if ($("html").attr("dir") == "rtl" && attr == "right") {
				$(this).attr("position", "left");
			} else {
				$(this).attr("position", attr);
			}
		}
	});

	function addWarning(attrName, warningMessage) {
		var $chromeOnlyNodes = $("[" + attrName + "]");

		if (!$chromeOnlyNodes.data("warningAdded")) {
			$chromeOnlyNodes.data("warningAdded", true);
			$chromeOnlyNodes.find("paper-tooltip").remove("paper-tooltip")

			if ($chromeOnlyNodes.length) {
				$chromeOnlyNodes
					.attr("disabled", "")
					.css({ opacity: 0.5 })
					.append("<paper-tooltip>" + warningMessage + "</paper-tooltip>")
					.click(function (e) {
						openGenericDialog({ content: warningMessage });
						e.preventDefault();
						return false;
					})
					;
			}
		}
	}

	if (!DetectClient.isChrome()) {
		addWarning("chrome-only", "Not supported by this browser!");
		if (DetectClient.isFirefox()) {
			addWarning("not-firefox", "Not supported by this browser!");
			$("[hide-from-firefox]").remove();
		}
    }
    
    if (!DetectClient.isWindows()) {
        $("[windows-only]").remove();
    }
}

function initMessages(selectorOrNode, beforePolymer) { // beforePolymer useful for replacing msgs inside templates before polymer
	// patch for mac small popup issue: needed a delay or wait for polymer to load before replacing html?
	// v2 introduced macPopupException
	// v1 only used beforePolymer
	let macPopupException = DetectClient.isMac() && window.fromToolbar;
	return new Promise((resolve, reject) => {
		if (window.polymerPromise && (!beforePolymer || macPopupException)) {
			polymerPromise.then(() => {
				if (DetectClient.isMac()) {
					setTimeout(() => {
						resolve();
					}, 150);
				} else {
					resolve();
				}
			});
		} else {
			resolve();
		}
	}).then(() => {
		_changeMessages(selectorOrNode);
	});
}

async function donationClicked(action, monthly) {
	if (await storage.get("donationClicked")) {
		return true;
	} else {
		openContributeDialog(action, monthly);
		return false;
	}
}

function getChromeWindows() {
	return new Promise((resolve, reject) => {
		chrome.windows.getAll(windows => {
			// keep only normal windows and not app windows like debugger etc.
			var normalWindows = windows.filter(thisWindow => {
				return thisWindow.type == "normal";
			});
			resolve(normalWindows);
		});
	});
}

function findTab(url) {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({url:url + "*"}, tabs => {
			if (chrome.runtime.lastError){
	            console.error(chrome.runtime.lastError.message);
	            resolve();
			} else {
				if (tabs.length) {
					var tab = tabs.last();
					console.log("force window found")
					chrome.tabs.update(tab.id, {active:true}, () => {
						if (chrome.runtime.lastError) {
							resolve();
						} else {
							// must do this LAST when called from the popup window because if set focus to a window the popup loses focus and disappears and code execution stops
							chrome.windows.update(tab.windowId, {focused:true}, () => {
								resolve({found:true, tab:tab});
							});
						}
					});
				} else {
					resolve();
				}
			}
		});
	});
}

//usage: openUrl(url, {urlToFind:""})
function openUrl(url, params) {
	return new Promise((resolve, reject) => {
		params = initUndefinedObject(params);
		if (window.inWidget) {
			top.location.href = url;
		} else {
			getChromeWindows().then(normalWindows => {
				if (normalWindows.length == 0) { // Chrome running in background
					var createWindowParams = {url:url};
					if (DetectClient.isChrome()) {
						createWindowParams.focused = true;
					}
					chrome.windows.create(createWindowParams, createdWindow => {
						findTab(url).then(response => {
							resolve(response);
						});
					});
				} else {
					new Promise((resolve, reject) => {
						if (params.urlToFind) {
							findTab(params.urlToFind).then(response => {
								resolve(response);
							});
						} else {
							resolve();
						}
					}).then(response => {
						if (response && response.found) {
							//chrome.tabs.update(response.tab.id, {url:url});
							return Promise.resolve(response);
						} else {
							return createTabAndFocusWindow(url);
						}
					}).then(response => {
						if (location.href.indexOf("source=toolbar") != -1 && DetectClient.isFirefox() && params.autoClose !== false) {
							window.close();
						}
						resolve();
					});
				}
			});
		}
	});
}

function createTabAndFocusWindow(url) {
	return new Promise((resolve, reject) => {
		new Promise((resolve, reject) => {
			if (DetectClient.isFirefox()) { // required for Firefox because when inside a popup the tabs.create would open a tab/url inside the popup but we want it to open inside main browser window 
				chrome.windows.getCurrent(thisWindow => {
					if (thisWindow && thisWindow.type == "popup") {
						chrome.windows.getAll({windowTypes:["normal"]}, windows => {
							if (windows.length) {
								resolve(windows[0].id)
							} else {
								resolve();
							}
						});
					} else {
						resolve();
					}
				});
			} else {
				resolve();
			}		
		}).then(windowId => {
			var createParams = {url:url};
			if (windowId != undefined) {
				createParams.windowId = windowId;
			}
			chrome.tabs.create(createParams, tab => {
				chrome.windows.update(tab.windowId, {focused:true}, () => {
					resolve(tab);
				});						
			});
		});
	});
}

function removeNode(id) {
	var o = document.getElementById(id);
	if (o) {
		o.parentNode.removeChild(o);
	}
}

function addCSS(id, css) {
	removeNode(id);
	var s = document.createElement('style');
	s.setAttribute('id', id);
	s.setAttribute('type', 'text/css');
	s.appendChild(document.createTextNode(css));
	(document.getElementsByTagName('head')[0] || document.documentElement).appendChild(s);
	return s;
}

function pad(str, times, character) { 
	var s = str.toString();
	var pd = '';
	var ch = character ? character : ' ';
	if (times > s.length) { 
		for (var i=0; i < (times-s.length); i++) { 
			pd += ch; 
		}
	}
	return pd + str.toString();
}

function toBool(str) {
	if ("false" === str || str == undefined) {
		return false;
	} else if ("true" === str) {
		return true;
	} else {
		return str;
	}
}

function getUrlValue(url, name, unescapeFlag) {
	if (url) {
	    var hash;
	    url = url.split("#")[0];
	    var hashes = url.slice(url.indexOf('?') + 1).split('&');
	    for(var i=0; i<hashes.length; i++) {
	        hash = hashes[i].split('=');
	        // make sure no nulls
	        if (hash[0] && name) {
				if (hash[0].toLowerCase() == name.toLowerCase()) {
					if (unescapeFlag) {
						return unescape(hash[1]);
					} else {
						return hash[1];
					}
				}
	        }
	    }
	    return null;
	}
}

function setUrlParam(url, param, value) {
	var params = url.split("&");
	for (var a=0; a<params.length; a++) {
		var idx = params[a].indexOf(param + "=");
		if (idx != -1) {
			var currentValue = params[a].substring(idx + param.length + 1);
			
			if (value == null) {
				return url.replace(param + "=" + currentValue, "");
			} else {
				return url.replace(param + "=" + currentValue, param + "=" + value);
			}
		}
	}
	
	// if there is a hash tag only parse the part before;
	var urlParts = url.split("#");
	var newUrl = urlParts[0];
	
	if (newUrl.indexOf("?") == -1) {
		newUrl += "?";
	} else {
		newUrl += "&";
	}
	
	newUrl += param + "=" + value;
	
	// we can not append the original hashtag (if there was one)
	if (urlParts.length >= 2) {
		newUrl += "#" + urlParts[1];
	}
	
	return newUrl;
}

function getCookie(c_name) {
	if (document.cookie.length>0) {
	  c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1) {
	    c_start=c_start + c_name.length+1;
	    c_end=document.cookie.indexOf(";",c_start);
	    if (c_end==-1) c_end=document.cookie.length;
	    return unescape(document.cookie.substring(c_start,c_end));
	    }
	  }
	return "";
}

function exists(o) {
	if (o) {
		return true;
	} else {
		return false;	
	}	
}

function getExtensionIDFromURL(url) {
	//"chrome-extension://dlkpjianaefoochoggnjdmapfddblocd/options.html"
	return url.split("/")[2]; 
}

function setTodayOffsetInDays(days) {
	var offset = new Date();
	offset.setDate(offset.getDate()+parseInt(days));
	localStorage["today"] = offset;
}

function clearTodayOffset() {
	localStorage.removeItem("today");
}

function addToArray(str, ary) {
	for (var a=0; a<ary.length; a++) {
		if (ary[a] == str) {
			return false;
		}
	}
	ary.push(str);
	return true;
}

function removeFromArray(str, ary) {
	for (var a=0; a<ary.length; a++) {
		if (ary[a] == str) {
			ary.splice(a, 1);
			return true;
		}
	}
	return false;
}

function isInArray(str, ary) {
	for (var a=0; a<ary.length; a++) {
		if (isSameUrl(ary[a], str)) {
			return true;
		}
	}
	return false;
}

function isSameUrl(url1, url2) {
	return removeProtocol(url1) == removeProtocol(url2);
}

function removeProtocol(url) {
	if (url) {
		return url.replace(/https?:\/\//g, "");
	} else {
		return url;
	}
}

function findTag(str, name) {
	if (str) {
		var index = str.indexOf("<" + name + " ");
		if (index == -1) {
			index = str.indexOf("<" + name + ">");
		}
		if (index == -1) {
			return null;
		}
		var closingTag = "</" + name + ">";
		var index2 = str.indexOf(closingTag);
		return str.substring(index, index2 + closingTag.length);
	}
}

function rotate(node, params) {
	// can't rotate <a> tags for some reason must be the image inside if so
	var rotationInterval;
	if (params && params.forever) {
		node.css({WebkitTransition: "all 10ms linear"});
		var degree = 0;
		rotationInterval = setInterval(function() {
	    	node.css({WebkitTransform: 'rotate(' + (degree+=2) + 'deg)'}); //scale(0.4) translateZ(0)
	    }, 2);
	} else {
		node.css({WebkitTransition: "all 1s ease-out"}); //all 1000ms linear
		node.css({WebkitTransform: "rotateZ(360deg)"}); //-webkit-transform: rotateZ(-360deg);
	}
	return rotationInterval;
}

function trimLineBreaks(str) {
	if (str) {
		str = str.replace(/^\n*/g, "");
		str = str.replace(/\n*$/g, "");
	}
	return str;
}

function cleanEmailSubject(subject) {
	if (subject) {
		subject = subject.replace(/^re: ?/i, "");
		subject = subject.replace(/^fwd: ?/i, "");
	}
	return subject;	
}

function extractEmails(text) {
	if (text) {
		return text.match(/([a-zA-Z0-9.!#$%^_+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
	}
}

function obscureEmails(str) {
    let matches = extractEmails(str);
    if (matches) {
        matches.forEach (email => {
            str = str.replace(email, email.split("@")[0].substr(0,3) + "...@cutoff.com");
        });
    }
    return str;
}

function getHost(url) {
	if (url) {
		var matches = url.match(/:\/\/([^\/?#]*)/);
		if (matches && matches.length >=2) {
			return matches[1];
		}
	}
}

function ellipsis(str, cutoffLength) {	
	if (str && str.length > cutoffLength) {
		str = str.substring(0, cutoffLength) + " ...";
	}
	return str;
}

// moved init analytics here/outside of initCommon becuase that was only being called if wrappeddb.open and (i think) that was causing missed analytics oninstall update events
if (typeof($) != "undefined") {
	if (location.href.indexOf("popup.") != -1 || location.href.indexOf("options.") != -1) {
		// For some reason including scripts for popup window slows down popup window reaction time, so only found that settimeout would work
		setTimeout(() => {
			initAnalytics();
		}, 1600);
	} else {
		initAnalytics();
	}		
}

//return 1st active tab
function getActiveTab() {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({'active': true, lastFocusedWindow: true}, function(tabs) {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError.message);
			} else {
				if (tabs && tabs.length >= 1) {
					resolve(tabs[0]);
				} else {
					reject("no tabs selected");
				}
			}
		});
	});
}

function beautify(string) {
    return string.replace(/([+.,])$/, '').replace(/^([+.,])/, '');
}

/*
 * -----------------------------------------------------------------------------
 *  Function for filtering text from "bad" characters and preppare text
 *  for Google Text to Speech API
 * -----------------------------------------------------------------------------
*/	
function filterTextForGoogleSpeech(text) {
	var j = 0,
	str = [],
	tmpstr =[],
	maxlength = 90, // Max length of one sentence this is Google's fault :)
	badchars = ["+","#","@","-","<",">","\n","!","?",":","&",'"',"  ","。"],
	replaces = [" plus "," sharp "," at ","","","","",".",".","."," and "," "," ","."];

	for(var i in badchars) // replacing bad chars
	{
		text = text.split(badchars[i]).join(replaces[i]);		
	}

	str = text.split(/([.,!?:])/i); // this is where magic happens :) :)

	for(var i in str) //join and group sentences
	{
		if(tmpstr[j] === undefined)
		{
			tmpstr[j] = '';
		}

		if((tmpstr[j]+str[i]).length < maxlength)
		{
			tmpstr[j] = tmpstr[j]+str[i].split(' ').join('+');
		}
		else
		{
			tmpstr[j] = beautify(tmpstr[j]);

			if(str[i].length < maxlength)
			{
				j++;
				tmpstr[j]=beautify(str[i].split(' ').join('+'));
			}
			else
			{
				sstr = split(str[i],maxlength);
				for(x in sstr)
				{
					j++;
					tmpstr[j] = beautify(sstr[x]);
				}
			}
		}
	}
	return tmpstr.filter(String);
}

function isDomainEmail(email) {
	if (email) {
		email = email.toLowerCase();
		var POPULAR_DOMAINS = ["zoho", "aim", "videotron", "icould", "inbox", "yandex", "rambler", "ya", "sbcglobal", "msn", "me", "facebook", "twitter", "linkedin", "email", "comcast", "gmx", "aol", "live", "google", "outlook", "yahoo", "gmail", "mail", "comcast", "googlemail", "hotmail"];
		
		var foundPopularDomainFlag = POPULAR_DOMAINS.some(function(popularDomain) {
			if (email.indexOf("@" + popularDomain + ".") != -1) {
				return true;
			}
		});
		
		return !foundPopularDomainFlag;
	}
}

function ChromeTTS() {
	
	var chromeTTSMessages = [];
	var speaking = false;
	
	ChromeTTS.queue = function(msg, params) {
		// this might have fixed the endless loop
		if (msg != null && msg != "") {
			params = initUndefinedObject(params);
			params.utterance = msg;
			chromeTTSMessages.push(params);
			return play();
		} else {
			return Promise.resolve();
		}
	};

	ChromeTTS.stop = function() {
		if (chrome.tts) {
			chrome.tts.stop();
		}
		chromeTTSMessages = [];
		speaking = false;
	};

	ChromeTTS.isSpeaking = function() {
		return speaking;
	}
	
	function setVoiceByLang(chromeTTSMessage, lang, voices) {
		var voiceFound = voices.find(voice => {
			return voice.lang && voice.lang.match(lang);
		});
		
		if (voiceFound) {
			chromeTTSMessage.voiceName = voiceFound.voiceName;
			chromeTTSMessage.extensionId = voiceFound.extensionId;
		}
	}

	function play() {
		return new Promise(async (resolve, reject) => {

            // must declare these here because chrome.tts.* had issues with async callbacks and trying to queue several phrases
            const voiceParams = await storage.get("notificationVoice");
            const volume = await storage.get("voiceSoundVolume") / 100;
            const pitch = parseFloat(await storage.get("pitch"));
            const rate = parseFloat(await storage.get("rate"));

			if (chromeTTSMessages.length) {
				chrome.tts.isSpeaking(speakingParam => {
					console.log(speaking + " : " + speakingParam);
					if (!speaking && !speakingParam) {
						
						var chromeTTSMessage = chromeTTSMessages[0];

						if (chromeTTSMessage.utterance) {
							// decoded etity codes ie. &#39; is ' (apostrohpe)
							chromeTTSMessage.utterance = chromeTTSMessage.utterance.htmlToText();
						} else {
							chromeTTSMessage.utterance = "";
						}

						// replace links with just domain ie. http://www.google.com/longpath/blah.html  >  google.com
						chromeTTSMessage.utterance = Autolinker.link( chromeTTSMessage.utterance, {
							stripPrefix : true,
						    replaceFn : function( autolinker, match ) {
						    	if (match.getType() == "url") {
						    		if (match.getUrl()) {
						    			return match.getUrl().parseUrl().hostname.replace("www.", "");
						    		}
						    	}
						    }
						});
						
						chromeTTSMessage.voiceName = voiceParams.split("___")[0];
						chromeTTSMessage.extensionId = voiceParams.split("___")[1];

						console.log("speak: " + chromeTTSMessage.utterance);
						speaking = true;
						chrome.tts.stop();
						
						chrome.i18n.detectLanguage(chromeTTSMessage.utterance, result => {
							chrome.tts.getVoices(voices => {
								var voiceUserChose = voices.find(voice => {
									return voice.voiceName == chromeTTSMessage.voiceName && voice.extensionId == chromeTTSMessage.extensionId;
								});
								
								if (!voiceUserChose || !voiceUserChose.lang) {
									// user chose voice with a lang (ie. native) don't use auto-detect because it does not have a fallback lang attribute
								} else if (chromeTTSMessage.forceLang) {
									if (voiceUserChose && voiceUserChose.lang && voiceUserChose.lang.match(chromeTTSMessage.forceLang)) {
										// since forced lang is same a user chosen lang then do nothing and use the user default
									} else {
										setVoiceByLang(chromeTTSMessage, chromeTTSMessage.forceLang, voices);
									}
								} else if (result.isReliable) {
									var detectedLang = result.languages.first().language;
									console.log("detectedLang: " + detectedLang);
									if (voiceUserChose && voiceUserChose.lang && voiceUserChose.lang.match(detectedLang)) {
										// do nothing
									} else {
										setVoiceByLang(chromeTTSMessage, detectedLang, voices);
									}
								} else if (chromeTTSMessage.defaultLang) {
									setVoiceByLang(chromeTTSMessage, chromeTTSMessage.defaultLang, voices);
								}
								
								// check the time between when we executed the speak command and the time between the actual "start" event happened (if it doesn't happen then let's break cause we could be stuck)
								var speakNotStartedTimer = setTimeout(function() {
									console.log("start event never happened: so stop voice");
									// stop will invoke the "interuppted" event below and it will process end/next speak events
									chrome.tts.stop();
								}, seconds(5));
							
								chrome.tts.speak(chromeTTSMessage.utterance, {
									voiceName: chromeTTSMessage.voiceName,
									extensionId : chromeTTSMessage.extensionId,
									//enqueue : true,
									volume: volume,
									pitch: pitch,
									rate: rate,
									onEvent: function(event) {
										console.log('event: ' + event.type);			
										if (event.type == "start") {
											clearTimeout(speakNotStartedTimer);
										} else if (event.type == "interrupted" || event.type == 'error' || event.type == 'end' || event.type == 'cancelled') {
											clearTimeout(speakNotStartedTimer);
											chromeTTSMessages.shift();
											speaking = false;

											// delay between plays
											setTimeout(function() {
												play().then(() => {
													resolve();
												}).catch(error => {
													reject(error);
												});
											}, chromeTTSMessage.noPause ? 1 : 150);
										}
									}
								}, function() {
									if (chrome.runtime.lastError) {
								        logError('speech error: ' + chrome.runtime.lastError.message);
									}
								});
							});
						});
					} else {
						console.log("already speaking, wait before retrying...");
						setTimeout(function() {
							play().then(() => {
								resolve();
							}).catch(error => {
								reject(error);
							});
						}, seconds(1));
					}
				});
			} else {
				resolve();
			}
		});
	}
}

function openWindowInCenter(url, title, specs, popupWidth, popupHeight) {
	var left = (screen.width/2)-(popupWidth/2);
	var top = (screen.height/2)-(popupHeight/2);
	//return window.open(url, title, specs + ", width=" + popupWidth + ", height=" + popupHeight + ", top=" + top + ", left=" + left)
	chrome.windows.create({url:url, top:Math.round(top), left:Math.round(left), width:Math.round(popupWidth), height:Math.round(popupHeight), type:"popup"});
}

function LineReader(str) {
	var SEP = "\r\n";
	this.currentIndex = 0;
	
	this.readLine = function() {
        // detect if at the end of string
        if (this.currentIndex == str.length) {
            return null;
        } else {
            var sepIndex = str.indexOf(SEP, this.currentIndex);
            if (sepIndex == -1) {
                // return the rest of the string
                var line = str.substr(this.currentIndex);
                this.currentIndex = str.length;
                return line;
            } else {
                var line = str.substring(this.currentIndex, sepIndex);
                this.currentIndex = sepIndex + SEP.length;
                return line;
            }
        }
	}
}

function parseBodyParts(jqXHR) {
	var httpResponses = [];
	
	var contentType = jqXHR.getResponseHeader("content-type"); // multipart/mixed; boundary=batch_Al0uYHFsObA=_AAFnntVKyPs=
	//console.log("contentType", contentType);
	var boundary = contentType.match(/.*\n?.*boundary=\"?([^\r\n\"']*)/i);
	if (boundary) {
		boundary = boundary[1];
	}
	
	//console.log("boundary: " + boundary);

	var bodyParts = jqXHR.responseText.split("--" + boundary);
	for (var a=0; a<bodyParts.length; a++) {
		//console.log("part: " + bodyParts[a].substr(0, 1000));
		
		if (bodyParts[a].length >= 10) { // because -- means end of body
			/* example:
			Content-Type: application/http
			
			HTTP/1.1 200 OK
			ETag: "gbmbZs68sGGWei7engZdferRE3M/kD5-Hkz3T496rt9xks8mnnwGENY"
			Content-Type: application/json; charset=UTF-8
			Date: Sun, 20 Jul 2014 15:56:25 GMT
			Expires: Sun, 20 Jul 2014 15:56:25 GMT
			Cache-Control: private, max-age=0
			Content-Length: 1186337
			
			bodyblahblah...
		 */

			var httpResponse = {};
			
			var emptyLines = 0;
			var lr = new LineReader(bodyParts[a]);
			while ((line = lr.readLine()) != null) {
				//console.log("line: " + "|" + line + "|");
				if (line == "") {
					emptyLines++;
					//console.log("empty line: " + emptyLines);
					if (emptyLines == 3) {
						//console.log("process body");
						httpResponse.body = bodyParts[a].substr(lr.currentIndex);
						break;
					}
				} else {
					if (line.indexOf("HTTP") != -1) {
						httpResponse.status = line;
						if (line.hasWord("200")) {
							httpResponse.statusText = "success";
						} else {
							httpResponse.statusText = line;
						}
					} else {
						// process other headers here...
						
					}
				}
			}
			
			/*
			// get first bunch of characters to parse
			var firstBunchOfLines = bodyParts[a].substring(0, 1000);
			// split lines into array
			firstBunchOfLines = firstBunchOfLines.match(/[^\r\n]+/g);
			*/
		
			httpResponses.push(httpResponse);			
		}
	}

	return httpResponses;
}

// mimics official Google gapi.client - https://developers.google.com/api-client-library/javascript/reference/referencedocs
function MyGAPIClient() {
}

MyGAPIClient.prototype = {
	request: function(args) {
		return args;
	}
}

// static method
MyGAPIClient.getHeaderValue = function(headers, name) {
	if (headers) {
		for (var a=0; a<headers.length; a++) {
			if (name.equalsIgnoreCase(headers[a].name)) {
				return headers[a].value;
			}
		}
	}
}

MyGAPIClient.getAllHeaderValues = function(headers, name) {
	var values = [];
	if (headers) {
		for (var a=0; a<headers.length; a++) {
			if (name.equalsIgnoreCase(headers[a].name)) {
				values.push(headers[a].value);
			}
		}
	}
	return values;
}

function HttpBatch() {
	var MAX_CALLS_PER_BATCH = 100;
	
	var httpRequests = [];
	var LF = "\n";
	var data = "";
	
	function addDataLine(str) {
		data += str + LF;
	}

	this.add = function(httpRequest, optParams) {
		if (httpRequests.length > MAX_CALLS_PER_BATCH) {
			throw new Error(JError.EXCEEDED_MAXIMUM_CALLS_PER_BATCH);
		} else {
			httpRequests.push(httpRequest);
		}
	};
	
	// Usage: params: .oauthRequest, .tokenResponse OR .email
	this.execute = async function(sendOAuthParams) {
        if (httpRequests.length) {
            var boundary = "batch_sep";
            
            var totalContentLength = 0;
            for (var a=0; a<httpRequests.length; a++) {
                addDataLine("");
                addDataLine("--" + boundary);
                addDataLine("Content-Type: application/http");
                addDataLine("");
                addDataLine(httpRequests[a].method + " " + httpRequests[a].path);
            }
            addDataLine("--" + boundary + "--");
            
            // if no token passed then use email
            var tokenResponse = sendOAuthParams.tokenResponse;
            if (!tokenResponse) {
                tokenResponse = await sendOAuthParams.oauthRequest.findTokenResponse({userEmail:sendOAuthParams.email});
            }
            
            const sendResponse = await sendOAuthParams.oauthRequest.send({
                tokenResponse:tokenResponse,
                type: "POST",
                url: GmailAPI.DOMAIN + "/batch/gmail/v1",
                contentType: "multipart/mixed",
                boundary: boundary,
                headers: {
                    "Content-Length": totalContentLength
                },
                processData: false,
                data: data
            });
            console.log("batch response", sendResponse);
            
            var httpResponses = parseBodyParts(sendResponse.jqXHR);
            var httpBodies = [];
            console.log("parsed parts parsed", httpResponses);
            
            httpResponses.forEach(function(httpResponse) {
                try {
                    httpResponse.body = JSON.parse(httpResponse.body);
                    if (httpResponse.statusText != "success") {
                        if (httpResponse.body.error) {
                            httpResponse.error = httpResponse.body.error.message;
                            httpResponse.code = httpResponse.body.error.code;
                            if (httpResponse.body.error.code == 404) {
                                httpResponse.body.jerror = JError.NOT_FOUND;
                                console.warn("might be permanently deleted: " + httpResponse.body.error.message);
                            } else {
                                logError("execute error: " + httpResponse.body.error.message + " data: " + data + " body: " + JSON.stringify(httpResponse.body));
                            }
                        } else {
                            throw new Error("error3 status: " + httpResponse.statusText);
                        }
                    }
                } catch (e) {
                    logError("execute error2: " + e + " httpResponse.error: " + httpResponse.error + " data: " + data + " body: " + JSON.stringify(httpResponse.body));
                    httpResponse.error = httpResponse.body;
                    httpResponse.body = {};
                    httpResponse.body.error = {message:httpResponse.error};
                }
                httpBodies.push(httpResponse.body);
            });
            // must match dummy resolve below if httpRequests.length == 0
            return {httpResponses:httpResponses, httpBodies:httpBodies};
        } else {
            // send out dummy 
            return {httpResponses:[], httpBodies:[]};
        }
	}

}

function getMyGAPIClient() {
	var mygapiClient = new MyGAPIClient();
	mygapiClient.HttpBatch = new HttpBatch();
	return mygapiClient;
}

function OAuthForDevices(params) {

	var that = this;

	var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
	var GOOGLE_TOKEN_URL = "https://www.googleapis.com/oauth2/v4/token";

	var GOOGLE_CLIENT_ID = "450788627700-m1vhpe3biqmp4vgaachs2us80updp12j.apps.googleusercontent.com";
	var GOOGLE_CLIENT_SECRET = "CedCVCHth4AolzroefqkhimX";

	var GOOGLE_OLD_CLIENT_ID = "450788627700.apps.googleusercontent.com";
	var GOOGLE_OLD_CLIENT_SECRET = "Wf-ObXmgsyANHeWZD-1AWJ2H";
	
	var GOOGLE_REDIRECT_URI = "https://jasonsavard.com/oauth2callback";

    const SCOPE = params.SCOPE;

    async function getTokenResponses() {
        return await storage.get(params.STORAGE_KEY) || [];
    }

    async function setTokenResponses(tokenResponses) {
        await storage.set(params.STORAGE_KEY, tokenResponses);
    }

    async function sequentialFunction(fn) {
        return new Promise(async (resolve, reject) => {
            if (that.sequentialFunctionPromise) {
                await that.sequentialFunctionPromise;
                await fn();
                that.sequentialFunctionPromise = null;
                resolve();
            } else {
                that.sequentialFunctionPromise = new Promise(async (resolve, reject) => {
                    await fn();
                    resolve();
                }).then(() => {
                    that.sequentialFunctionPromise = null;
                    resolve();
                })
            }
        });
    }
	
	this.getSecurityToken = function() {
		return ls[params.SECURITY_TOKEN_KEY];
    }
    
    this.removeSecurityToken = function() {
        ls.removeItem(params.SECURITY_TOKEN_KEY);
    }
	
	this.generateStateParam = function() {
        ls[params.SECURITY_TOKEN_KEY] = getUniqueId();
		return chrome.runtime.getURL("oauth2callback.html?security_token=" + ls[params.SECURITY_TOKEN_KEY]);
	}

	// return array
	this.getUserEmails = function() {
        alert("todo: must refactor because gettokenresponses is async")
        return getTokenResponses().map(tokenResponse => tokenResponse.userEmail);
	}

	if (params.getUserEmail) {
		// override default with this method
		this.getUserEmail = params.getUserEmail;
	} else {
		// default getUserEmail	
		this.getUserEmail = function(tokenResponse, sendOAuthRequest) {
			return new Promise((resolve, reject) => {
				sendOAuthRequest({tokenResponse:tokenResponse, url: GmailAPI.URL + "profile", noCache:true}).then(response => {
					var data = JSON.parse(response.jqXHR.responseText);
					response.userEmail = data.emailAddress;
					resolve(response);
				}).catch(error => {
					error += " (Could not get userinfo - email)";
					logError(error);
					reject(error);
				});
			});
		}
    }
    
    function setExpiryDate(tokenResponse) {
        // expires_in params is in seconds (i think)
        tokenResponse.expiryDate = new Date(Date.now() + (tokenResponse.expires_in * 1000));
    }

	this.openPermissionWindow = function(email) {
		return new Promise((resolve, reject) => {
			var url = GOOGLE_AUTH_URL + "?response_type=code&client_id=" + GOOGLE_CLIENT_ID + "&redirect_uri=" + GOOGLE_REDIRECT_URI + "&scope=" + encodeURIComponent(SCOPE) + "&state=" + encodeURIComponent(that.generateStateParam());
			
			var prompt = "consent";
			
			if (email) {
				url += "&login_hint=" + encodeURIComponent(email);
			} else {
				prompt += " select_account";
			}
			
			url += "&prompt=" + encodeURIComponent(prompt);
			url += "&access_type=offline"; // required when I used https://www.googleapis.com/oauth2/v4/token (instead of the old way https://accounts.google.com/o/oauth2/v2/auth) or else refresh_token was not returned
			url += "&include_granted_scopes=true";
			
			var width = 900;
			var height = 800;
			var left = (screen.width/2)-(width/2);
			var top = (screen.height/2)-(height/2);
			
			chrome.windows.create({url:url, top:Math.round(top), left:Math.round(left), width:Math.round(width), height:Math.round(height), type:"popup"}, function(newWindow) {
				resolve(newWindow);
			});
		});
	}
	
    function initError(params) {
        let error;
        let jqXHR = params.jqXHR;
        if (jqXHR) {
            error = new Error(jqXHR.statusText);
            error.jqXHR = jqXHR;
            // seems when offline the code 404 exists in the jqXHR.status so let's copy it to the response 
            error.code = jqXHR.status;
            if (jqXHR.responseJSON) {
                try {
                    error.message = jqXHR.responseJSON.error.message;
                    error.code = jqXHR.responseJSON.error.code;
                } catch (e) {
                    logError("error parsing error :) " + e);
                }
            }
        } else {
            error = new Error(params.errorMessage);
            error.code = params.code;
        }

		error.tokenResponse = params.tokenResponse;
		error.oauthAction = params.oauthAction;

		if (error == "invalid_grant" || error.code == ErrorCodes.BAD_REQUEST || error.code == ErrorCodes.UNAUTHORIZED) {
			error.message = "You need to re-grant access, it was probably revoked";
		}

		console.error("error getting data: " + error);
        return error;
	}

	this.generateURL = async function(userEmail, url) {
        var tokenResponse = await that.findTokenResponse({userEmail:userEmail});
        if (tokenResponse) {
            const response = await ensureToken(tokenResponse);
            // before when calling refreshtoken we used to call this method, notice the tokenResponse came from the response and not that one passed in... params.generatedURL = setUrlParam(url, "access_token", params.tokenResponse.access_token);
            response.generatedURL = setUrlParam(url, "access_token", tokenResponse.access_token);
            return response;
        } else {
            throw new Error("No tokenResponse found!");
        }
	}
	
	async function sendOAuthRequest(params) {
        if (!params.type) {
            params.type = "GET";
        }
        
        var accessToken;
        if (params.tokenResponse) {
            accessToken = params.tokenResponse.access_token;
        } else if (params.userEmail) {
            var tokenResponse = await that.findTokenResponse(params);
            accessToken = tokenResponse.access_token;
        }
        
        if (params.appendAccessToken) {
            params.data = initUndefinedObject(params.data);
            params.data.access_token = accessToken;
        }
        
        if (/delete/i.test(params.type)) {
            params.data = null;
        } else if (/post|patch/i.test(params.type)) {
            if (params.processData !== false) {
                params.data = JSON.stringify(params.data);
            }
        }
        
        console.log("sendOAuthRequest: " + params.userEmail + " url: " + params.url);
        
        var ajaxParams = {
            type: params.type,
            url: params.url,
            data: params.data,
            timeout: params.timeout ? params.timeout : 10000,
            beforeSend: function(jqXHR, settings) {
                jqXHR.setRequestHeader('Authorization', "Bearer " + accessToken);
            }
        };
        
        if (params.contentType) {
            ajaxParams.contentType = params.contentType;
        } else {
            ajaxParams.contentType = "application/json; charset=utf-8";
        }
        if (params.dataType) {
            ajaxParams.dataType = params.dataType;
        }
        if (params.processData != undefined) {
            ajaxParams.processData = params.processData;
        }
        if (params.boundary) {
            ajaxParams.contentType += "; boundary=" + params.boundary;
        }
        if (params.noCache) {
            ajaxParams.cache = false;
        }
        
        return new Promise((resolve, reject) => {
            // need to keep this as $.ajax because promise wrapper ajax() cannot return more than 1 parameter and we need the jqXHR object 
            $.ajax(ajaxParams).done((data, textStatus, jqXHR) => {
                resolve({data:data, jqXHR:jqXHR, textStatus:textStatus});
            }).fail((jqXHR, textStatus, errorThrown) => {
                let error = initError({
                    jqXHR: jqXHR
                });
                copyObj(params, error);
                reject(error);
            });
        });
	}
	
	async function ensureToken(tokenResponse) {
        if (tokenResponse.chromeProfile) {
            let scopes = SCOPE || Scopes.GMAIL_MODIFY; // legacy default to initial full scope (before i reduced them)
            let getAuthTokenParams = { interactive: false, scopes: scopes.split(" ") };
            try {
                tokenResponse.access_token = await getAuthToken(getAuthTokenParams);
                return {};
            } catch (errorMessage) {
                let error = initError({
                    errorMessage: errorMessage,
                    tokenResponse: tokenResponse,
                    oauthAction: "refreshToken"
                });
                if (error.indexOf("OAuth2 not granted or revoked") != -1) {
                    error.code = 401;
                }
                throw error;
            }
        } else if (isExpired(tokenResponse)) {
            console.log("token expired: ", tokenResponse);
            return refreshToken(tokenResponse);
        } else {
            return {};
        }
	}

	function refreshToken(tokenResponse) {
        console.log("refresh token: " + tokenResponse.userEmail + " now time: " + Date.now().toString());

        var data = {
            refresh_token:  tokenResponse.refresh_token,
            client_id:      GOOGLE_CLIENT_ID,
            client_secret:  GOOGLE_CLIENT_SECRET,
            grant_type:     "refresh_token"
        };

        // old OAuth client ID (in new way, I save the client id in tokenresponse)
        if (!tokenResponse.clientId) {
            data.client_id = GOOGLE_OLD_CLIENT_ID;
            data.client_secret = GOOGLE_OLD_CLIENT_SECRET;
        }

        return ajax({
            type: "POST",
            url: GOOGLE_TOKEN_URL,			
            data: data,
            dataType: "json",
            timeout: 5000
        }).then(async data => {
            tokenResponse.access_token = data.access_token;
            tokenResponse.token_type = data.token_type;
            tokenResponse.expires_in = data.expires_in;
            setExpiryDate(tokenResponse);
            console.log("in refresh: " + tokenResponse.expiryDate.toString());

            // patch #1 of 2 for access revoke concurrency issue, because array items were being overwritten : https://jasonsavard.com/forum/discussion/5171/this-access-was-revoked-error-keeps-happening-even-after-reinstalling-etc#latest
            // you can reproduce this by setting expired access tokens to ALL accounts and using old expiry dates and then reload the extension, it's intermittent
            await sequentialFunction(async () => {
                const tokenResponses = await getTokenResponses();
                const index = await that.findTokenResponseIndex(tokenResponse);
                tokenResponses[index] = tokenResponse;
                await setTokenResponses(tokenResponses);
            });

            return {tokenResponse:tokenResponse};
        }, jqXHR => {
            let error = initError({
                jqXHR: jqXHR,
                tokenResponse: tokenResponse,
                oauthAction: "refreshToken"
            });
            return Promise.reject(error);
        });
	}
	
	// private isExpired
	function isExpired(tokenResponse) {
        var SECONDS_BUFFER = -300; // 5 min. yes negative, let's make the expiry date shorter to be safe
		return !tokenResponse.expiryDate || now().isAfter(new Date(tokenResponse.expiryDate).addSeconds(SECONDS_BUFFER, true));
    }
    
    function getAuthToken(params) {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken(params, token => {
                if (chrome.runtime.lastError) {
                    console.info("getAuthToken error: " + chrome.runtime.lastError.message, token);
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve(token);
                }
            });
        });
    }

	// public method, meant to be called before sending multiple asynchonous requests to .send
	this.ensureTokenForEmail = async function(userEmails) {
        // if single email passed, put it into an array
        if (!$.isArray(userEmails)) {
            userEmails = [userEmails];
        }
        
        let responses = [];
        await asyncForEach(userEmails, async (userEmail, index) => {
            var tokenResponse = await that.findTokenResponse({userEmail:userEmail});
            if (tokenResponse) {
                let response = await ensureToken(tokenResponse);
                responses.push(response);
            } else {
                var error = Error("no token for: " + userEmail + ": might have not have been granted access");
                console.warn(error);
                throw error;
            }
        });

        if (responses.length == 1) {
            return responses.first();
        } else {
            return responses;
        }
	}		
	
	this.send = async function(params) {
        var tokenResponse;
        // if tokenresponse directly passsed here then use it, else let's use the userEmail to find the token
        if (params.tokenResponse) {
            tokenResponse = params.tokenResponse;
        } else {
            tokenResponse = await that.findTokenResponse(params);		
        }
        if (tokenResponse) {
            await ensureToken(tokenResponse);
            // patch #2 of 2 happened with 3+ accounts - access revoke concurrency issue : https://jasonsavard.com/forum/discussion/5171/this-access-was-revoked-error-keeps-happening-even-after-reinstalling-etc#latest
            params.tokenResponse = tokenResponse;
            return sendOAuthRequest(params);
        } else {
            var errorEmail;
            if (params.userEmail && params.userEmail.indexOf("@") != -1) {
                errorEmail = "(specific email)";
            } else {
                errorEmail = "(/mail/u/*)";
            }
            console.warn("no token response found for email2: " + errorEmail + " " + params.url);
            throw new Error(JError.NO_TOKEN_FOR_EMAIL);
        }
	}
	
	this.findTokenResponseIndex = async function(params) {
        const tokenResponses = await getTokenResponses();
        return tokenResponses.findIndex(element => element.userEmail == params.userEmail);
	}
	
	this.findTokenResponse = async function(params) {
		var index = await that.findTokenResponseIndex(params);
		if (index != -1) {
            const tokenResponses = await getTokenResponses();
			return tokenResponses[index];
		}
	}

	this.findTokenResponseByIndex = async function(index) {
        const tokenResponses = await getTokenResponses();
		return tokenResponses[index];
	}

	this.removeTokenResponse = async function(params) {
        const index = await that.findTokenResponseIndex(params);
        if (index != -1) {
            const tokenResponses = await getTokenResponses();
            tokenResponses.splice(index, 1);
            await setTokenResponses(tokenResponses);
        }
	}

	this.removeAllTokenResponses = async function() {
        await setTokenResponses([]);
	}

	this.removeAllCachedTokens = async function() {
        const tokenResponses = await getTokenResponses();
        const removeTokenPromises = tokenResponses.map(tokenResponse => removeCachedAuthToken(tokenResponse.access_token));
        return alwaysPromise(removeTokenPromises);
	}

	this.getAccessToken = async function(params) {
        that.code = params.code;
		console.log("get access token");
        let tokenResponse;
        
        if (params.code) {

            try {
                tokenResponse = await ajax({
                    type: "POST",
                    url: GOOGLE_TOKEN_URL,
                    data: {
                        code:           params.code,
                        client_id:      GOOGLE_CLIENT_ID,
                        client_secret:  GOOGLE_CLIENT_SECRET,
                        redirect_uri:   GOOGLE_REDIRECT_URI,
                        grant_type:     "authorization_code"
                    },
                    dataType: "json",
                    timeout: 8000
                });
    
                that.removeSecurityToken();
            } catch (jqXHR) {
                var error;
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    error = jqXHR.responseJSON.error.message;
                } else {
                    error = jqXHR.statusText;
                }
                throw new Error(error);
            }
        } else {
            if (params.refetch) {
                if (params.userEmail) {
                    const tokenResponse = await that.findTokenResponse({ userEmail: userEmail });
                    try {
                        await removeCachedAuthToken(tokenResponse.access_token);
                    } catch (error) {
                        // nothing
                        console.warn(error);
                    }
                } else {
                    await that.removeAllCachedTokens();
                }
            }

            tokenResponse = {
                chromeProfile: true
            };

            let getAuthTokenParams = {
                interactive: true,
                scopes: SCOPE.split(" ")
            };

            let token;
            try {
                token = await getAuthToken(getAuthTokenParams);
            } catch (error) {
                // patch seems even on success it would return an error, but calling it 2nd time would get the token
                getAuthTokenParams.interactive = false;
                token = await getAuthToken(getAuthTokenParams);
            }
            tokenResponse.access_token = token;
        }
        
        const response = await that.getUserEmail(tokenResponse, sendOAuthRequest);
        if (response.userEmail) {
            // add this to response
            tokenResponse.userEmail = response.userEmail;
            tokenResponse.clientId = GOOGLE_CLIENT_ID;
            tokenResponse.scopes = SCOPE;

            if (tokenResponse.expires_in) {
                setExpiryDate(tokenResponse);
            }

            const tokenResponses = await getTokenResponses();
            const index = await that.findTokenResponseIndex(response);
            if (index != -1) {
                // update if exists
                tokenResponses[index] = tokenResponse;
            } else {
                // add new token response
                tokenResponses.push(tokenResponse);
            }
            await setTokenResponses(tokenResponses);
            return { tokenResponse: tokenResponse };
        } else {
            throw new Error("Could not fetch email");
        }
	}
	
	this.sendImapRequest = function(email, data) {
		return new Promise(async (resolve, reject) => {
			console.log("sendImapRequest: " + email);
			var tokenResponse = await that.findTokenResponse({userEmail:email});
			
			ensureToken(tokenResponse).then(response => {
				var accountHeader = {tokenResponse:tokenResponse, userInfo:{email:tokenResponse.userEmail}};
				console.log("data sent:", data);
				$.ajax({
				   url: "https://apps.jasonsavard.com/gmail/ajax.php",
				   type: "post",
				   headers: {
					   misc:location.href,
					   ensureToken: false,
					   account: JSON.stringify(accountHeader) // must be a string not an object
				   },
				   data: data,
				   timeout: seconds(60),
				   complete: function(jqXHR, textStatus) {
					   resolve(jqXHR, textStatus);
				   }
			   });
			}).catch(function(error) {
				logError("error ensuring token for sendimap", error);
				reject(error);
			});			
		});
	}
	
}

function DetectSleepMode(wakeUpCallback) {
	var PING_INTERVAL = 60; // 1 minute
	var PING_INTERVAL_BUFFER = 15;
	
	var lastPingTime = new Date();
	var lastWakeupTime = new Date(1); // make the last wakeup time really old because extension starting up does not equal a wakeup 
	
	function lastPingIntervalToolLong() {
		return lastPingTime.diffInSeconds() < -(PING_INTERVAL+PING_INTERVAL_BUFFER);
	}
	
	this.ping = function() {
		if (lastPingIntervalToolLong()) {
			console.log("DetectSleepMode.wakeup time: " + new Date());
			lastWakeupTime = new Date();
			if (wakeUpCallback) {
				wakeUpCallback();
			}
		}
		lastPingTime = new Date();
	}
    
    chrome.alarms.create(Alarms.DETECT_SLEEP_MODE, { periodInMinutes: PING_INTERVAL / 60 });
	
	this.isWakingFromSleepMode = function() {
		console.log("DetectSleepMode.last ping: " + lastPingTime);
		console.log("last wakeuptime: " + lastWakeupTime);
		console.log("current time: " + new Date())
		// if last wakeup time was recently set than we must have awoken recently
		if (lastPingIntervalToolLong() || lastWakeupTime.diffInSeconds() >= -(PING_INTERVAL+PING_INTERVAL_BUFFER)) {
			return true;
		} else {
			return false;
		}
	}
}

function Controller() {
	
	// apps.jasonsavard.com server
	Controller.FULLPATH_TO_PAYMENT_FOLDERS = "https://apps.jasonsavard.com/";
	
	// jasonsavard.com server
	//Controller.FULLPATH_TO_PAYMENT_FOLDERS = "https://jasonsavard.com/apps.jasonsavard.com/";

	// internal only for now
	function callAjaxController(params) {
		return ajax({
			method: params.method ? params.method : "get",
			headers: {"misc":location.href},
			url: Controller.FULLPATH_TO_PAYMENT_FOLDERS + "controller.php",
			data: params.data,
			dataType: "json",
			timeout: seconds(10)
		});
	}

	Controller.ajax = function(params) {
		return callAjaxController(params);
	}

	Controller.verifyPayment = function(itemID, emails) {
		var data = {action:"verifyPayment", name:itemID, email:emails};
		return callAjaxController({data:data});
	}
	
	Controller.getSkins = function(ids, timeMin) {
		var data = {};
		data.action = "getSkins";
		data.extension = "gmail";
		data.ids = ids;
		if (timeMin) {
			data.timeMin = Math.round(new Date().diffInSeconds(timeMin)); // seconds elapsed since now
		}
		data.misc = location.href;
		
		return callAjaxController({data:data});
	}

	Controller.updateSkinInstalls = function(id, offset) {
		var data = {};
		data.action = "updateSkinInstalls";
		data.id = id;
		data.offset = offset;
		data.misc = location.href;
		
		// had to pass misc as parameter because it didn't seem to be passed with header above
		return callAjaxController({data:data});
	}

	Controller.processFeatures = async function() {
		await storage.set("donationClicked", true);
		chrome.runtime.sendMessage({command: "featuresProcessed"}, function(response) {});
	}

}

//see if the keypressed event equals the letter passed
function keydown(e, key, comboKeys) {
	if (e) {

		var keyMatched = false;
		var comboKeysMatched;

		if (typeof key == "string") {
			keyMatched = key.charCodeAt(0) == e.which;
		} else {
			keyMatched = key == e.keyCode;
		}

		if (keyMatched) {
			if (!comboKeys) {
				comboKeys = {};
			}
			if (comboKeys.ctrl == undefined) {
				comboKeys.ctrl = false;
			}
			if (comboKeys.shift == undefined) {
				comboKeys.shift = false;
			}
			if (comboKeys.alt == undefined) {
				comboKeys.alt = false;
			}
			
			comboKeysMatched = comboKeys.ctrl == isCtrlPressed(e) && comboKeys.shift == e.shiftKey && comboKeys.alt == e.altKey;
		}
		
		return keyMatched && comboKeysMatched;
		
	} else {
		return null;
	}
}

function clone(obj) {
	return $.extend(true, {}, obj);
}

function decodeUTF8(s) {
	return decodeURIComponent( escape(s) );
}

function replaceBase64UrlSafeCharacters(str) {
	if (str) {
		str = str.replace(/-/g, '+');
		str = str.replace(/_/g, '/');
	}
	return str;
}

function replaceBase64UrlUnsafeCharacters(str) {
	str = str.replace(/\+/g, '-');
	str = str.replace(/\//g, '_');
	return str;
}

function decodeBase64UrlSafe(str) {
	if (str) {
		str = replaceBase64UrlSafeCharacters(str);
		// Patch: Refer to unicode problem - https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
		return decodeURIComponent(escape(window.atob( str )));
	} else {
		return str;
	}
}

function encodeBase64UrlSafe(str) {
	str = btoa(unescape(encodeURIComponent( str )));
	str = replaceBase64UrlUnsafeCharacters(str);
	return str;
}

function nbsp(count) {
	var str = "";
	for (var a=0; a<count; a++) {
		str += "&nbsp;";
	}
	return str;
}

// usage: JSON.parse(str, dateReviver) find all date strings and turns them into date objects
function dateReviver(key, value) {
	// 2012-12-04T13:51:06.897Z
	if (typeof value == "string" && value.length == 24 && /\d{4}-\d{2}-\d{2}T\d{2}\:\d{2}\:\d{2}\.\d{3}Z/.test(value)) {
		return new Date(value);
	} else {
		return value;
	}
}

var syncOptions = (function() {
	var MIN_STORAGE_EVENTS_COUNT_BEFORE_SAVING = 4;
	var LOCALSTORAGE_CHUNK_PREFIX = "localStorageChunk";
	var INDEXEDDB_CHUNK_PREFIX = "indexedDBChunk";
	var saveTimeout;
	var paused;
	
	// ex. syncChunks(deferreds, localStorageChunks, "localStorageChunk", setDetailsSeparateFromChunks);
	function syncChunks(deferreds, chunks, chunkPrefix, details, setDetailsSeparateFromChunks) {
		
		var previousDeferredsCount = deferreds.length;
		
		$(chunks).each(function(index, chunk) {
			var itemToSave = {};
			
			// let's set details + chunk together
			if (!setDetailsSeparateFromChunks) {
				itemToSave["details"] = details;
			}
			
			itemToSave[chunkPrefix + "_" + index + "_" + details.chunkId] = chunk;
			
			console.log("trying to sync.set json length: ", chunkPrefix + "_" + index + "_" + details.chunkId, chunk.length + "_" + JSON.stringify(chunk).length);
			
			deferred = $.Deferred(function(def) {
				
				// firefox
				if (!chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE) {
					chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 1000000;
				}

				// to avoid problems with MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE let's spread out the calls
				var delay;
				var SYNC_OPERATIONS_BEFORE = 1; // .clear were done before
				if (SYNC_OPERATIONS_BEFORE + previousDeferredsCount + chunks.length > chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE) {
					delay = (previousDeferredsCount+index) * seconds(10); // makes only 6 calls per minute
				} else {
					delay = 0;
				}
				setTimeout(function() {					
					chrome.storage.sync.set(itemToSave, function() {
						if (chrome.runtime.lastError) {
							var error = "sync error: " + chrome.runtime.lastError.message;
							logError(error);
							def.reject(error);
						} else {											
							console.log("saved " + chunkPrefix + " " + index);
							def.resolve("success");
						}
					});
				}, delay);
			});
			deferreds.push(deferred);
		});
	}
	
	// usage: compileChunks(details, items, details.localStorageChunksCount, LOCALSTORAGE_CHUNK_PREFIX) 
	function compileChunks(details, items, chunkCount, prefix) {
		var data = "";
		for (var a=0; a<chunkCount; a++) {
			data += items[prefix + "_" + a + "_" + details.chunkId];
		}
		return JSON.parse(data);
	}
	
	function isSyncable(key) {
		return !key.startsWith("_") && syncOptions.excludeList.indexOf(key) == -1;
	}
	
	return { // public interface
		init: function(excludeList) {
			if (!excludeList) {
				excludeList = [];
			}
			
			// all private members are accesible here
			syncOptions.excludeList = excludeList;
		},
		storageChanged: async function(params) {
			if (!paused) {
				if (isSyncable(params.key)) {
					// we don't want new installers overwriting their synced data from previous installations - so only sync after certain amount of clicks by presuming their just going ahead to reset their own settings manually
					var storageEventsCount = await storage.get("_storageEventsCount");
					if (!storageEventsCount) {
						storageEventsCount = 0;
					}
					await storage.set("_storageEventsCount", ++storageEventsCount);
					
					// if loaded upon new install then we can proceed immediately to save settings or else want for minium storage event
					if (localStorage.lastSyncOptionsLoad || await storage.get("lastSyncOptionsSave") || storageEventsCount >= MIN_STORAGE_EVENTS_COUNT_BEFORE_SAVING) {
						console.log("storage event: " + params.key + " will sync it soon...");
						clearTimeout(saveTimeout);
						saveTimeout = setTimeout(function() {
							syncOptions.save("sync data: " + params.key);
						}, seconds(45));
					} else {
						console.log("storage event: " + params.key + " waiting for more storage events before syncing");
					}
				} else {
					//console.log("storage event ignored: " + params.key);
				}
			}
		},
		pause: function() {
			paused = true;
		},
		resume: function() {
			paused = false;
		},
		save: function(reason) {
			return new Promise(function(resolve, reject) {
				if (chrome.storage.sync) {
					// firefox
					if (!chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
						chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192;
					}
					// split it up because of max size per item allowed in Storage API
					// because QUOTA_BYTES_PER_ITEM is sum of key + value STRINGIFIED! (again)
					// watchout because the stringify adds quotes and slashes refer to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
					// so let's only use 80% of the max and leave the rest for stringification when the sync.set is called
					var MAX_CHUNK_SIZE = Math.floor(chrome.storage.sync.QUOTA_BYTES_PER_ITEM * 0.80);
		
					console.log("syncOptions: saving data reason: " + reason + "...");
					
					// process localStorage
					var localStorageItemsToSave = {};
					for (key in localStorage) {
						// don't incude storage options starting with _blah and use exclude list
						if (isSyncable(key)) {
							//console.log(key + ": " + localStorage[key]);
							localStorageItemsToSave[key] = localStorage[key];
						}
					}
					
					syncOptions.exportIndexedDB({}, function(exportIndexedDBResponse) {
						// remove all items first because we might have less "chunks" of data so must clear the extra unsused ones now
						chrome.storage.sync.clear(function() {
							if (chrome.runtime.lastError) {
								var error = "sync error: " + chrome.runtime.lastError.message;
								logError(error);
								reject(error);
							} else {
								try {
									var deferreds = new Array();
									var deferred;
									
									var chunkId = getUniqueId();
		
									var localStorageChunks = chunkObject(localStorageItemsToSave, MAX_CHUNK_SIZE);
									var indexedDBChunks = chunkObject(exportIndexedDBResponse.data, MAX_CHUNK_SIZE);
									
									var details = {chunkId:chunkId, localStorageChunksCount:localStorageChunks.length, indexedDBChunksCount:indexedDBChunks.length, extensionVersion:chrome.runtime.getManifest().version, lastSync:new Date().toJSON(), syncReason:reason};
									
									// can we merge details + first AND only chunk into one .set operation (save some bandwidth)
									var setDetailsSeparateFromChunks;
									
									if (localStorageChunks.length == 1 && indexedDBChunks.length == 1 && JSON.stringify(details).length + localStorageChunks.first().length + indexedDBChunks.first().length < MAX_CHUNK_SIZE) {
										setDetailsSeparateFromChunks = false;
									} else {
										setDetailsSeparateFromChunks = true;
		
										// set sync header/details...
										deferred = $.Deferred(function(def) {
											chrome.storage.sync.set({details:details}, function() {
												console.log("saved details");
												def.resolve("success");
											});
										});
										deferreds.push(deferred);
									}
									
									// in 1st call to syncChunks let's pass the last param setDetailsSeparateFromChunks
									// in 2nd call to syncChunks let's hard code setDetailsSeparateFromChunks to true
									syncChunks(deferreds, localStorageChunks, LOCALSTORAGE_CHUNK_PREFIX, details, setDetailsSeparateFromChunks);
									syncChunks(deferreds, indexedDBChunks, INDEXEDDB_CHUNK_PREFIX, details, true);
									
									$.when.apply($, deferreds)
										.done(() => {
											storage.setDate("lastSyncOptionsSave");
											console.log("sync done");
											resolve();
										})
										.fail(function(args) {
											console.log(arguments);
											
											// error occured so let's clear storage because we might have only partially written data
											chrome.storage.sync.clear();
											
											reject("jerror with sync deferreds");
										})
									;
								} catch (error) {
									reject(error);
								}
							}
						});
					});
				} else {
					reject(new Error("Sync is not supported!"));
				}
			});
		},
		fetch: function() {
			return new Promise(function(resolve, reject) {
				if (chrome.storage.sync) {
					console.log("syncOptions: fetch...");
					chrome.storage.sync.get(null, function(items) {
						if (chrome.runtime.lastError) {
							var error = "sync last error: " + chrome.runtime.lastError.message;
							reject(error);
						} else {
							console.log("items", items);
							if ($.isEmptyObject(items)) {
								reject("Could not find any synced data!<br><br>Make sure you sign in to Chrome on your other computer AND this one <a target='_blank' href='https://support.google.com/chrome/answer/185277'>More info</a>");
							} else {
								var details = items["details"];
								if (details.extensionVersion != chrome.runtime.getManifest().version) {
									reject({items:items, error:"Versions are different: " + details.extensionVersion + " and " + chrome.runtime.getManifest().version});
								} else {
									resolve(items);
								}
							}
						}
					});
				} else {
					reject(new Error("Sync is not supported!"));
				}
			});
		},
		load: function(items) {
			console.log("syncOptions: load...");
			return new Promise((resolve, reject) => {
				if (chrome.storage.sync) {
					if (items) {
						var details = items["details"]; 
						if (details) {
							// process localstorage					
							var dataObj;
							dataObj = compileChunks(details, items, details.localStorageChunksCount, LOCALSTORAGE_CHUNK_PREFIX);
							for (item in dataObj) {
								localStorage.setItem(item, dataObj[item]);
							}
							
							// process indexeddb
							if (details.indexedDBChunksCount) {
								dataObj = compileChunks(details, items, details.indexedDBChunksCount, INDEXEDDB_CHUNK_PREFIX);
								syncOptions.importIndexedDB(dataObj).then(() => {
									resolve(items);
								}).catch(error => {
									reject(error);
								})
							} else {
								resolve(items);
							}
							
							// finish stamp
							localStorage.lastSyncOptionsLoad = new Date();
							console.log("done");
						}
					} else {
						reject("No items found");
					}
				} else {
					reject(new Error("Sync is not supported!"));
				}
			});
		},
		exportIndexedDB: function(params, callback) {
			params = initUndefinedObject(params);
			
			db = wrappedDB.db;
			
		    if (!db) {
		    	callback({error: "jerror db not declared"});
		    	return;
		    }

		    //Ok, so we begin by creating the root object:
		    var data = {};
		    var promises = [];
		    for(var i=0; i<db.objectStoreNames.length; i++) {
		        //thanks to http://msdn.microsoft.com/en-us/magazine/gg723713.aspx
		        promises.push(

		            $.Deferred(function(defer) {

		                var objectstore = db.objectStoreNames[i];
		                console.log("objectstore: " + objectstore);

		                var transaction = db.transaction([objectstore], "readonly");  
		                var content = [];

		                transaction.oncomplete = function(event) {
		                    console.log("trans oncomplete for " + objectstore + " with " + content.length + " items");
		                    defer.resolve({name:objectstore, data:content});
		                };

		                transaction.onerror = function(event) {
		                	// Don't forget to handle errors!
		                	console.dir(event);
		                };

		                var handleResult = function(event) {  
		                	var cursor = event.target.result;  
		                	if (cursor) {
		                		//console.log(cursor.key + " " + JSON.stringify(cursor.value).length);
		                		
		                		// don't incude storage options starting with _blah and use exclud list
		                		if (cursor.key.startsWith("_") || (!params.exportAll && syncOptions.excludeList.indexOf(cursor.key) != -1)) {
		                			// exclude this one and do nothing
		                			console.log("excluding this key: " + cursor.key);
		                		} else {
		                			content.push({key:cursor.key,value:cursor.value});
		                		}
		                		
		                		cursor.continue();  
		                	}
		                };  

		                var objectStore = transaction.objectStore(objectstore);
		                objectStore.openCursor().onsuccess = handleResult;

		            }).promise()

		        );
		    }

		    $.when.apply($, promises)
		    	.done(function() {
			        // arguments is an array of structs where name=objectstorename and data=array of crap
			        // make a copy cuz I just don't like calling it argument
			        var dataToStore = arguments;
			        //serialize it
			        var serializedData = JSON.stringify(dataToStore);
			        console.log("datastore:", dataToStore);
			        console.log("length: " + serializedData.length);
			        
			        callback({data:dataToStore});
			        
			        //downloadObject(dataToStore, "indexedDB.json");
			        
			        //The Christian Cantrell solution
			        //var link = $("#exportLink");
			        //document.location = 'data:Application/octet-stream,' + encodeURIComponent(serializedData);
			        //link.attr("href",'data:Application/octet-stream,'+encodeURIComponent(serializedData));
			        //link.trigger("click");
			        //fakeClick(link[0]);
		   		})
		   		.fail(function(args) {
		   			console.log(args)
		   			console.log(arguments)
		   			callback({error:"jerror when exporting"});
		   		})
		    ;
		},
		importIndexedDB: function(obj) {
			return new Promise(function(resolve, reject) {
				// first (and only) item in array should be the "settings" objectstore that i setup when using the indexedb with this gmail checker
				var settingsObjectStore = obj[0];
				if (settingsObjectStore.name == storage.getStoreId()) {
					var promises = [];
					for (var a=0; a<settingsObjectStore.data.length; a++) {
						var key = settingsObjectStore.data[a].key;
						var value = settingsObjectStore.data[a].value.value;

	        			// could be excessive but i'm stringifing because i want parse with the datereviver (instead of interating the object myself in search of date strings)
	        			value = JSON.parse(JSON.stringify(value), dateReviver);
						
						console.log(key + ": " + value);
						promises.push( storage.set(key, value) );
					}
					Promise.all(promises).then(() => {
						resolve();
					}).catch(error => {
			   			console.error(error);
			   			reject("Problem importing settings: " + error);
					});
				} else {
					reject("Could not find 'settings' objectstore!");
				}
			});
		}
	};
})();

function generateBlob(data, mimeType) {
	var blob = new Blob([convertBase64ToBlob(data)], {type:mimeType});
	return blob;
}

function generateBlobUrl(data, mimeType) {
	var blob = generateBlob(data, mimeType);
	var blobUrl = window.URL.createObjectURL(blob);
	return blobUrl;
}

function downloadObject(data, filename) {
    if (!data) {
        console.error('No data')
        return;
    }

    if(!filename) filename = 'object.json'

    if(typeof data === "object"){
        data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], {type: 'text/json'}),
        e    = document.createEvent('MouseEvents'),
        a    = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

function downloadFile(data, mimeType, filename) {
	var blobUrl = generateBlobUrl(data, mimeType);
    var e = document.createEvent('MouseEvents');
    var a = document.createElement('a');

    a.download = filename;
    a.href = blobUrl;
    a.dataset.downloadurl =  [mimeType, a.download, a.href].join(':');
    
    // inside extenion popup windows CANNOT use .click() to execute on <a href="#"> instead must use e.init and e.dispatch event
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e);
}

function initUndefinedObject(obj) {
    if (typeof obj == "undefined") {
        return {};
    } else {
        return obj;
    }
}

function initUndefinedCallback(callback) {
    if (callback) {
        return callback;
    } else {
        return function() {};
    }
}

function chunkObject(obj, chunkSize) {
	var str = JSON.stringify(obj);
	return str.chunk(chunkSize);
}

function parseVersionString(str) {
    if (typeof(str) != 'string') { return false; }
    var x = str.split('.');
    // parse from string or default to 0 if can't parse
    var maj = parseInt(x[0]) || 0;
    var min = parseInt(x[1]) || 0;
    var pat = parseInt(x[2]) || 0;
    return {
        major: maj,
        minor: min,
        patch: pat
    }
}

function cmpVersion(a, b) {
    var i, cmp, len, re = /(\.0)+[^\.]*$/;
    a = (a + '').replace(re, '').split('.');
    b = (b + '').replace(re, '').split('.');
    len = Math.min(a.length, b.length);
    for( i = 0; i < len; i++ ) {
        cmp = parseInt(a[i], 10) - parseInt(b[i], 10);
        if( cmp !== 0 ) {
            return cmp;
        }
    }
    return a.length - b.length;
}

function gtVersion(a, b) {
    return cmpVersion(a, b) >= 0;
}

// syntax: ltVersion(details.previousVersion, "7.0.15")
function ltVersion(a, b) {
    return cmpVersion(a, b) < 0;
}

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function isHex(str) {
	return /^[0-9A-Fa-f]+$/.test(str);
}

function isOnline() {
	// patch because some distributions of linux always returned false for is navigator.online so let's force it to true
	if (DetectClient.isLinux()) {
		return true;
	} else {
		return navigator.onLine;
	}
}

async function countEvent(eventName) {
	var lsKey = "_countEvent_" + eventName;
	
	var countEvent;
	var countEventStr = await storage.get(lsKey);
	
	if (countEventStr) {
		countEvent = JSON.parse(countEventStr);
		countEvent.startDate = new Date(countEvent.startDate);

		if (countEvent.startDate.isToday()) {
			countEvent.count++;
		} else {
			sendGA("frequentCountEvent", "hit", eventName, countEvent.count);
			countEvent.startDate = new Date();
			countEvent.count = 1;
		}
	} else {
		countEvent = {startDate:new Date(), count:1};
	}

	await storage.set(lsKey, countEvent);
}

function convertBase64ToBlob(base64str, type) {
	var byteString = atob(base64str);

	// write the bytes of the string to an ArrayBuffer
	var ab = new ArrayBuffer(byteString.length);
	var ia = new Uint8Array(ab);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	
	// write the ArrayBuffer to a blob, and you're done
	return new Blob([ia], {type: type});
}

// cross OS used to determine if ctrl or mac key is pressed
function isCtrlPressed(e) {
	return e.ctrlKey || e.metaKey;
}

//make sure it's not a string or empty because it will equate to 0 and thus run all the time!!!
//make sure it's not too small like 0 or smaller than 15 seconds
function setIntervalSafe(func, time) {
	if (isNaN(time) || parseInt(time) < 1000) {
		throw Error("jerror with setinterval safe: " + time + " is NAN or too small");
	} else {
		return setInterval(func, time); 
	}
}

async function sleep(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function setTimeoutCatchable(fn, delay) {
    await sleep(delay);
    await fn();
}

function repaintNode(node) {
	node.style.display='none';
	node.offsetHeight; // no need to store this anywhere, the reference is enough
	node.style.display='';
}

function DateTimeHighlighter() {

	var myDateRegexs = new Array();

	function addDayTimeRegex(myDateRegexs, myDateRegex) {
		
		// next week
		var nextWeekDate = new Date(myDateRegex.date);
		if (today().diffInDays(nextWeekDate) > -7) {
			nextWeekDate.setDate(nextWeekDate.getDate() + 7);
		}

		var myDateRegexNextWeek = JSON.parse(JSON.stringify(myDateRegex));
		myDateRegexNextWeek.pattern = "next " + myDateRegexNextWeek.pattern;
		myDateRegexNextWeek.date = nextWeekDate;

		myDateRegexs.push(myDateRegexNextWeek);

		// this day
		myDateRegexs.push(myDateRegex);
	}

	function getTime(date, pieces, startTimeOffset) {
		var d = new Date(date);

		// patch: had to use parseFloat instead of parseInt (because parseInt would return 0 instead of 9 when parsing "09" ???		
		var pos;
		if (startTimeOffset != null) {
			pos = startTimeOffset;
		} else {
			pos = 1;
		}
		var hours = parseFloat(pieces[pos]);
		var pm = pieces[pos+3];

		if (pm && pm.toLowerCase().indexOf("h") != -1) {
			// 24 hour
			d.setHours(hours);
			d.setMinutes( parseFloat(pieces[pos+4]) || 0 );
		} else {
		
			if (hours >= 25) { //ie. 745pm was entered without the : (colon) so the hours will appear as 745 hours
				hours = parseFloat(pieces[pos].substring(0, pieces[pos].length-2));
				if (pm == "pm") {
					hours += 12;
				}
				var mins = pieces[pos].substring(pieces[pos].length-2);

				d.setHours(hours);
				d.setMinutes( parseFloat(mins) || 0 );
			} else {
				// patch for midnight because 12:12am is actually 0 hours not 12 hours for the date object
				if (hours == 12) {
					if (pm) {
						hours = 12;
					} else {
						hours = 0;
					}
				} else if (pm) {
					hours += 12;
				}
				d.setHours(hours);		
				//if ((pos+2) < pieces.length - ) {
				//}
				d.setMinutes( parseFloat(pieces[pos+2]) || 0 );
			}

		}

		d.setSeconds(0, 0);
		return d;
	}
	
	function getMonthNamePattern(monthNameIndex) {
		var monthName = dateFormat.i18nEnglish.monthNames[monthNameIndex];
		var monthNameShort = dateFormat.i18nEnglish.monthNamesShort[monthNameIndex];
		
		var monthNamePattern;
		
		// add 2nd language
		if (false && workerParams.i18nOtherLang) {
			var monthNameOtherLanguage = workerParams.i18nOtherLang.monthNames[monthNameIndex];
			var monthNameShortOtherLanguage = workerParams.i18nOtherLang.monthNamesShort[monthNameIndex];
			
			monthNamePattern = "(?:" + monthName + "|" + monthNameShort + "\\.?|" + monthNameOtherLanguage + "|" + monthNameShortOtherLanguage + "\\.?)"; //(?:\\.)
		} else {
			monthNamePattern = "(?:" + monthName + "|" + monthNameShort + "\\.?)";
		}
		return monthNamePattern;
	}

	DateTimeHighlighter.init = function() {
		//console.log("init called");
		var timePattern = "(?:at |from )?(\\d+)([:|\\.](\\d\\d))?(?:\\:\\d\\d)?\\s*(a(?:\\.)?m\\.?|p(?:\\.)?m\\.?|h(\\d+)?)?(ish)?";
		var timePatternSolo = "(\\d+)([:|\\.](\\d\\d))?\\s*(a(?:\\.)?m\\.?|p(?:\\.)?m|h(\\d+)?)(ish)?"; // ie. can't just be 10 must be 10PM OR AM

		var dateYearPattern = "(\\d+)(st|nd|rd|th)?(,|, | )(\\d{4})";
		var datePattern = "(\\d+)(st|nd|rd|th)?";
		
		var yearPattern = "(\\d{4})";

		var SEP = "(?:,|, | | on | around )?";
		var TO = "(?: to | untill | till | ?- ?| ?– ?)";

		for (var dayNameIndex=0; dayNameIndex<dateFormat.i18nEnglish.dayNames.length; dayNameIndex++) {
			var dayName = dateFormat.i18nEnglish.dayNames[dayNameIndex];
			var dayNameShort = dateFormat.i18nEnglish.dayNamesShort[dayNameIndex];
			
			var dayNamesSubPattern;
			var periodOfDay;
			
			// add 2nd language
			if (false && workerParams.i18nOtherLang) {
				var dayNameOtherLanguage = workerParams.i18nOtherLang.dayNames[dayNameIndex];
				var dayNameShortOtherLanguage = workerParams.i18nOtherLang.dayNamesShort[dayNameIndex];
				dayNamesSubPattern = "(?:" + dayName + "|" + dayNameShort + "\\.?|" + dayNameOtherLanguage + "|" + dayNameShortOtherLanguage + "\\.?)";
				periodOfDay = "(?: morning| " + workerParams.messages["morning"] + "| night| " + workerParams.messages["night"] + ")?";
			} else {
				dayNamesSubPattern = "(?:" + dayName + "|" + dayNameShort + "\\.?)";
				periodOfDay = "(?: " + getMessage("morning") + "| " + getMessage("night") + ")?"
			}
			
			var dayNamePattern = dayNamesSubPattern + periodOfDay;
			var dayNamePatternSolo = dayNamesSubPattern + periodOfDay;

			for (var monthNameIndex=0; monthNameIndex<dateFormat.i18nEnglish.monthNames.length; monthNameIndex++) {
				var monthNamePattern = getMonthNamePattern(monthNameIndex);

				// day + month + date + year + time (Friday, January 23rd, 2012 2pm - 4pm)
				myDateRegexs.push({pattern:dayNamePattern + SEP + monthNamePattern + SEP + dateYearPattern + SEP + timePattern + TO + timePattern, startTimeOffset:5, endTimeOffset:11, month:monthNameIndex, date:function(pieces, month) {
						var date = new Date();
						date.setMonth(month);
						date.setDate(pieces[1]);
						date.setYear(pieces[4]);
						return date;
					}, allDay:false});

				// day + month + date + year + time (Friday, January 23rd, 2012 at 2pm)
				myDateRegexs.push({pattern:dayNamePattern + SEP + monthNamePattern + SEP + dateYearPattern + SEP + timePattern, startTimeOffset:5, month:monthNameIndex, date:function(pieces, month) {
						var date = new Date();
						date.setMonth(month);
						date.setDate(pieces[1]);
						date.setYear(pieces[4]);
						return date;
					}, allDay:false});

				// day + month + date + time (Friday, January 23rd at 2pm)
				myDateRegexs.push({pattern:dayNamePattern + SEP + monthNamePattern + SEP + datePattern + SEP + timePattern, startTimeOffset:3, month:monthNameIndex, date:function(pieces, month) {
						var date = new Date();
						date.setMonth(month);
						date.setDate(pieces[1]);
						return date;
					}, allDay:false});

				// day + month + date (Friday, January 23rd) ** recent
				myDateRegexs.push({pattern:dayNamePattern + SEP + monthNamePattern + SEP + datePattern, month:monthNameIndex, date:function(pieces, month) {
						var date = new Date();
						date.setMonth(month);
						date.setDate(pieces[1]);
						return date;
					}, allDay:true});

				// day + date + month (Friday, 23 January) ** recent
				myDateRegexs.push({pattern:dayNamePattern + SEP + datePattern + SEP + monthNamePattern, month:monthNameIndex, date:function(pieces, month) {
						var date = new Date();
						date.setMonth(month);
						date.setDate(pieces[1]);
						return date;
					}, allDay:true});

			}
			
			var todayDayIndex = today().getDay();
			var daysAway = dayNameIndex-todayDayIndex;
			if (daysAway < 0) {
				daysAway = 7 + daysAway;
			}

			var date = today();
			date.setDate(date.getDate() + daysAway);
			
			// day + time - time (friday 10-11pm)
			addDayTimeRegex(myDateRegexs, {pattern:dayNamePattern + SEP + timePattern + TO + timePattern, date:date, startTimeOffset:1, endTimeOffset:7, allDay:false});
			
			// day + time (friday 10)
			addDayTimeRegex(myDateRegexs, {pattern:dayNamePattern + SEP + timePattern, date:date, startTimeOffset:1, allDay:false});

			// time + day (10pm friday)
			addDayTimeRegex(myDateRegexs, {pattern:timePattern + SEP + dayNamePattern, date:date, startTimeOffset:1, allDay:false});
			
			// day (friday)
			addDayTimeRegex(myDateRegexs, {pattern:dayNamePatternSolo, date:date, allDay:true});
		}

		for (var monthNameIndex=0; monthNameIndex<dateFormat.i18nEnglish.monthNames.length; monthNameIndex++) {
			var monthNamePattern = getMonthNamePattern(monthNameIndex);

			// April 8, 2012, 4:00pm - 6:00pm
			myDateRegexs.push({pattern:monthNamePattern + SEP + dateYearPattern + SEP + timePattern + TO + timePattern, startTimeOffset:5, endTimeOffset:11, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				date.setYear(pieces[4]);
				return date;
			}, allDay:false});
			
			// April 8, 2012, 4:00pm 
			myDateRegexs.push({pattern:monthNamePattern + SEP + dateYearPattern + SEP + timePattern, startTimeOffset:5, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				date.setYear(pieces[4]);
				return date;
			}, allDay:false});

			// 8 April 2012, 4:00pm 
			myDateRegexs.push({pattern:datePattern + SEP + monthNamePattern + SEP + yearPattern + SEP + timePattern, startTimeOffset:4, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				date.setYear(pieces[3]);
				return date;
			}, allDay:false});

			// April 8, 2012
			myDateRegexs.push({pattern:monthNamePattern + SEP + dateYearPattern, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				date.setYear(pieces[4]);
				return date;
			}, allDay:true});

			// 10 April, 2012 ** recent
			myDateRegexs.push({pattern:datePattern + SEP + monthNamePattern + SEP + yearPattern, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				date.setYear(pieces[3]);
				return date;
			}, allDay:true});

			// April 8, 4:00pm 
			myDateRegexs.push({pattern:monthNamePattern + SEP + datePattern + SEP + timePattern, startTimeOffset:3, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				return date;
			}, allDay:false});

			// April 22 
			myDateRegexs.push({pattern:monthNamePattern + SEP + datePattern, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				return date;
			}, allDay:true});

			// 20 - 22 April
			myDateRegexs.push({pattern:datePattern + TO + datePattern + SEP + monthNamePattern, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				return date;
			}, endDate:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[3]);
				return date;
			}, allDay:true});

			// 22 April
			myDateRegexs.push({pattern:datePattern + SEP + monthNamePattern, month:monthNameIndex, date:function(pieces, month) {
				var date = new Date();
				date.setMonth(month);
				date.setDate(pieces[1]);
				return date;
			}, allDay:true});
		}
		
		var tomorrowPattern;
		if (false && workerParams.i18nOtherLang) {
			tomorrowPattern = "(?:tomorrow|" + workerParams.messages["tomorrow"] + ")";
		} else {
			tomorrowPattern = getMessage("tomorrow");
		}

		myDateRegexs.push({pattern:tomorrowPattern + SEP + timePattern + TO + timePattern, startTimeOffset:1, endTimeOffset:7, date:tomorrow(), allDay:false});
		myDateRegexs.push({pattern:tomorrowPattern + SEP + timePattern, startTimeOffset:1, date:tomorrow(), allDay:false});

		myDateRegexs.push({pattern:timePattern + SEP + tomorrowPattern, startTimeOffset:1, date:tomorrow(), allDay:false});
		myDateRegexs.push({pattern:tomorrowPattern, date:tomorrow(), allDay:true});

		myDateRegexs.push({pattern:timePattern + TO + timePatternSolo, startTimeOffset:1, endTimeOffset:7, date:today(), allDay:false});
		myDateRegexs.push({pattern:timePatternSolo, startTimeOffset:1, date:today(), allDay:false});
	}

	DateTimeHighlighter.highlight = function(originalStr, highlightHandler) {
		if (originalStr) {
			var highlightedText = originalStr;
			var matchCount = 0;
	
			for (var a=0; a<myDateRegexs.length; a++) {
				var regex = new RegExp("\\b" + myDateRegexs[a].pattern + "\\b", "ig");
				var closeToPreviousReplacement = false;
	
				// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/replace
				highlightedText = highlightedText.replace(regex, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) { // match, p1, p2, p3, p#etc..., offset, string
					//log("regex/argss: ", match);
					var matchPosition;
					
					matchPosition = arguments[arguments.length-2];
	
					// make sure not already inside <A>
					var canBeReplaced = true;
					var beforeStr = highlightedText.substring(0, matchPosition);
					var openingTagIndex = beforeStr.lastIndexOf("<a ");
					var closingTagIndex = beforeStr.lastIndexOf("</a>");
					if (openingTagIndex != -1) {
						if (closingTagIndex != -1) {
							if (openingTagIndex < closingTagIndex) {
								// valid
							} else {
								canBeReplaced = false;
							}
						} else {
							canBeReplaced = false;
						}
					} else {
						// valid
					}
	
					if (canBeReplaced) {
						// make sure did NOT match an attribute within a tag ie. <div attr='3PM'>
						var tagNameStart = beforeStr.lastIndexOf("<");
						var tagNameEnd = beforeStr.lastIndexOf(">");
						if (tagNameStart != -1) {
							if (tagNameEnd != -1) {
								if (tagNameStart < tagNameEnd) {
									// valid
								} else {
									canBeReplaced = false;
								}
							} else {
								canBeReplaced = false;
							}
						}
					}
					
					if (!canBeReplaced) {
						return match;
					}
	
					matchCount++;
	
					// got here means wasn't too close to previous replacements
					var startTime;
					var endTime;
	
					if (typeof myDateRegexs[a].date == "function") {
						startTime = myDateRegexs[a].date(arguments, myDateRegexs[a].month);
					} else {
						startTime = myDateRegexs[a].date;
					}
	
					if (typeof myDateRegexs[a].endDate == "function") {
						endTime = myDateRegexs[a].endDate(arguments, myDateRegexs[a].month);
					}
	
					var pieces = arguments;
					//if (pieces && pieces.length >= 6) {
					if (myDateRegexs[a].startTimeOffset != null) {
						startTime = getTime(startTime, pieces, myDateRegexs[a].startTimeOffset);
					}
					if (myDateRegexs[a].endTimeOffset) {
						endTime = getTime(startTime, pieces, myDateRegexs[a].endTimeOffset);
					}
	
					// add starttime ane endtime to object (watch out because mydatereg has "functions" called startDATE and endDATE
					
					myDateRegexs[a].match = match;
					myDateRegexs[a].startTime = startTime;
					myDateRegexs[a].endTime = endTime;
					
					return highlightHandler(myDateRegexs[a]);
				});
			}
	
			// set to highligtext to null so the worker doesn't have to serialized the data transferred
			if (matchCount == 0) {
				highlightedText = null;
			}
			return {highlightedText:highlightedText, matchCount:matchCount};
		} else {
			// null passed so return zero mactchount
			return {matchCount:0};
		}
	}

	DateTimeHighlighter.init();

}

function openTemporaryWindowToRemoveFocus() {
	// open a window to take focus away from notification and there it will close automatically
	var win = window.open("about:blank", "emptyWindow", "width=1, height=1, top=-500, left=-500");
	win.close();
}

function getZoomFactor() {
	return new Promise(function(resolve, reject) {
		if (chrome.tabs && chrome.tabs.getZoomSettings) {
			chrome.tabs.getZoomSettings(function(zoomSettings) {
				if (chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError.message);
					resolve(window.devicePixelRatio);
				} else {
					resolve(zoomSettings.defaultZoomFactor);
				}
			});
		} else {
			resolve(window.devicePixelRatio);
		}
	});
}

//copy all the fields (not a clone, we are modifying the target so we don't lose a any previous pointer to it
function copyObj(sourceObj, targetObj) {
    for (var key in sourceObj) {
    	targetObj[key] = sourceObj[key];
    }
}

function saveToLocalFile(blob, filename) {
	return new Promise(function(resolve, reject) {
	    // file-system size with a little buffer
	    var size = blob.size + (1024/2);
	
	    var name = filename.split('.')[0];
	    if (name) {
	        name = name
	            .replace(/^https?:\/\//, '')
	            .replace(/[^A-z0-9]+/g, '-')
	            .replace(/-+/g, '-')
	            .replace(/^[_\-]+/, '')
	            .replace(/[_\-]+$/, '');
	        //name = '-' + name;
	    } else {
	        name = '';
	    }
	    
	    //name = name + '-' + Date.now();
	    
	    if (filename.split('.')[1]) {
	    	name += "." + filename.split('.')[1];
	    }
	
	    function onwriteend() {
		    // filesystem:chrome-extension://fpgjambkpmbhdocbdjocmmoggfpmgkdc/temporary/screencapture-test-png-1442851914126.png
	    	resolve('filesystem:' + getInternalPageProtocol() + '//' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name);
	    }
	
	    function errorHandler() {
	        reject();
	    }
	
	    window.webkitRequestFileSystem(window.TEMPORARY, size, function(fs){
	        fs.root.getFile(name, {create: true}, function(fileEntry) {
	            fileEntry.createWriter(function(fileWriter) {
	                fileWriter.onwriteend = onwriteend;
	                fileWriter.write(blob);
	            }, errorHandler);
	        }, errorHandler);
	    }, errorHandler);
	});
}

function blobToArrayBuffer(blob) {
	return new Promise(function(resolve, reject) {
		var fileReader = new FileReader();
		fileReader.onload = function() {
			resolve(this.result);
		};
		fileReader.onabort = fileReader.onerror = function(e) {
			reject(e);
		};
		fileReader.readAsArrayBuffer(blob);
	});
}

function blobToBase64(blob) {
	return new Promise(function(resolve, reject) {
		var fileReader = new FileReader();
		fileReader.onload = function() {
			resolve(this.result);
		};
		fileReader.onabort = fileReader.onerror = function(e) {
			reject(e);
		};
		fileReader.readAsDataURL(blob);
	});
}

// usage: getAllAPIData({oauthForDevices:oAuthForPeople, userEmail:userEmail, url:"https://people.googleapis.com/v1/people/me/connections?pageSize=100&requestMask.includeField=" + encodeURIComponent("person.emailAddresses,person.names"), itemsRootId:"connections"}) 
function getAllAPIData(params) {
	return new Promise((resolve, reject) => {
		if (params.nextPageToken) {
			params.url = setUrlParam(params.url, "pageToken", params.nextPageToken);
		}
		params.oauthForDevices.send(params).then(response => {
			var responseObj = response.data;
			if (!params.items) {
				params.items = [];
			}
			params.items = params.items.concat( responseObj[params.itemsRootId] );
			if (responseObj.nextPageToken) {
				params.nextPageToken = responseObj.nextPageToken;
				getAllAPIData(params).then(response => {
					resolve(response);
				}).catch(error => {
					reject(error);
				});
			} else {
				resolve({email:params.userEmail, items:params.items, nextSyncToken:responseObj.nextSyncToken});
			}
		}).catch(error => {
			reject(error);
		});
	});
}

function convertPlainTextToInnerHtml(str) {
	if (str) {
		return str.htmlEntities().replace(/\n/g, "<br/>");
	}
}

function insertScript(url) {
	return new Promise((resolve, reject) => {
		var script = document.createElement('script');
		script.async = true;
		script.src = url;
		script.onload = function (e) {
			resolve(e);
		};
		script.onerror = function (e) {
			reject(e);
		};
		(document.getElementsByTagName('head')[0]||document.getElementsByTagName('body')[0]).appendChild(script);	
	});
}

function insertImport(url, id) {
	return new Promise((resolve, reject) => {
		var link = document.createElement('link');
		if (id) {
			link.id = id;
		}
		link.rel = 'import';
		link.href = url;
		link.onload = function (e) {
			resolve(e);
		};
		link.onerror = function (e) {
			reject(e);
		};
		document.head.appendChild(link);
	});
}

function insertStylesheet(url, id) {
	var link = document.createElement('link');
	if (id) {
		link.id = id;
	}
	link.rel = 'stylesheet';
	link.href = url;
	document.head.appendChild(link);
}

function showMessageNotification(title, message, error, errorType) {
   var options = {
		   type: "basic",
		   title: title,
		   message: message,
		   iconUrl: Icons.NOTIFICATION_ICON_URL,
		   priority: 1
   }
   
   var notificationId;
   if (error) {
	   var buttonTitle;
	   
	   if (errorType == "extensionConflict") {
		   notificationId = "extensionConflict";
		   buttonTitle = "Click here to resolve issue";
	   } else if (errorType == "corruptProfile") {
		   notificationId = "corruptProfile";
		   buttonTitle = "Click for a solution";
	   } else {
		   notificationId = "error";
		   buttonTitle = "If this is frequent then click here to report it";
	   }

	   if (DetectClient.isChrome()) {
		   options.contextMessage = "Error: " + error;
		   options.buttons = [{title:buttonTitle}];
	   } else {
		   options.message += " Error: " + error;
	   }
   } else {
	   notificationId = "message";
   }
   
   chrome.notifications.create(notificationId, options, function(notificationId) {
	   if (chrome.runtime.lastError) {
		   console.error(chrome.runtime.lastError.message);
	   } else {
		   setTimeout(function () {
			   chrome.notifications.clear(notificationId);
		   }, error ? seconds(15) : seconds(5));
	   }
   });
}

function showCouldNotCompleteActionNotification(error, extensionConflict) {
	if (extensionConflict) {
		showMessageNotification("Error with last action.", "Try again.", error, "extensionConflict");
	} else {
		showMessageNotification("Error with last action.", "Try again or sign out and in.", error);
	}
}

function ajax(params) {
	return Promise.resolve($.ajax(params));
}

function getPreferredLanguage() {
	if (navigator.languages && navigator.languages.length) {
		return navigator.languages[0];
	} else {
		return navigator.language;
	}
}

/* 
   From: http://setthebarlow.com/indexeddb/ 
*/

var wrappedDB = {};
wrappedDB.db = null;
wrappedDB.opened = false;

wrappedDB.syncExternally = async function(key) {
	chrome.runtime.sendMessage({command:"indexedDBSettingSaved", key:key});
}

wrappedDB.open = function(dbName, storeId) {
	return new Promise((resolve, reject) => {
		function createObjectStore(db) {
			return new Promise((resolve, reject) => {
				if (db.objectStoreNames.contains(storeId)) {
					console.log("delete object store");
					db.deleteObjectStore(storeId);
				}
				console.log("creating object store");
				var objectStore = db.createObjectStore(storeId, {keyPath: "key"}); // Create unique identifier for store
				console.log("objectStore", objectStore)

				objectStore.transaction.oncomplete = function() {
					console.log("object store oncomplete");
					wrappedDB.db = db;
					wrappedDB.opened = true;		
					resolve();
				}
				objectStore.transaction.onerror = function(e) {
					var error = "Error in creating object store: " + objectStore.transaction.error;
					logError(error);
					reject(error);
				}			
			});
		}
		
		var request = indexedDB.open(dbName);
		//throw new Error("Simulated corrupt indexeddb error");
		
		request.onsuccess = function(e) {
			wrappedDB.db = e.target.result;
			wrappedDB.opened = true;
			resolve();
		};

	    request.onupgradeneeded = function (e) {
	    	console.log("onupgradeneeded: " + storeId);
			var db = e.target.result;
			createObjectStore(db).then(() => {
				resolve();
			}).catch(error => {
				reject(error);
			});
	    };

	    request.onblocked = function(e) {
	    	reject("Database version can't be upgraded because it's open somewhere else. " + e.target.error);
	    };		
	    
	    request.onerror = function(e) {
	    	reject(e.target.error);
	    };		
	});
}

wrappedDB.putObject = function(storeId, key, value) {
	return new Promise((resolve, reject) => {
		if (wrappedDB.opened === false) {
			reject(new Error("DB not opened"));
		} else {
			var db = wrappedDB.db;
			var trans = db.transaction([storeId], "readwrite");
		   
			trans.onabort = function(e) {
				var error = "trans abort: " + e.target.error;
				reject(error);
			};

			var store = trans.objectStore(storeId);
		 
			var data = {
				"key": key,
				"value": value
			};
		 
			var request = store.put(data);
			request.onsuccess = async function(e) {
				await wrappedDB.syncExternally(key);
				resolve();
			};
			request.onerror = function(e) {
				var error = "Error storing object with key: " + key + " " + e.target.error;
				logError(error);
				reject(error);
			};
		}
	});
};
 
wrappedDB.deleteSetting = function(storeId, key) {
	return new Promise((resolve, reject) => {
		if (wrappedDB.opened === false) {
			reject(new Error("DB not opened"));
		} else {
			var db = wrappedDB.db;
			var trans = db.transaction([storeId], "readwrite");

			trans.onabort = function(e) {
				var error = "trans abort: " + e.target.error;
				reject(error);
			};
			
			var store = trans.objectStore(storeId);
			 
			var request = store.delete(key);
			request.onsuccess = async function(e) {
				await wrappedDB.syncExternally(key);
				resolve();
			};
			request.onerror = function(e) {
				var error = "Error deleting object with key: " + key + " " + e.target.error;
				logError(error);
				reject(error);
			};			
		}
	});
};
 
wrappedDB.readAllObjects = function(storeId) {
	return new Promise((resolve, reject) => {
		if (wrappedDB.opened === false) {
			reject(new Error("DB not opened"));
		} else {
			var db = wrappedDB.db;
			var trans = db.transaction([storeId], "readonly");
			var objectStore = trans.objectStore(storeId);
		 
			objectStore.getAll().onsuccess = function(event) {
				resolve(event.target.result);
			};
		}
	});
};

wrappedDB.readObject = function(storeId, key) {
	return new Promise((resolve, reject) => {
		if (wrappedDB.opened === false) {
			reject("wrappedDB not opened");
		} else {
			var trans = wrappedDB.db.transaction([storeId], "readonly");
			var store = trans.objectStore(storeId);
			
			var request = store.get(key);
			request.onsuccess = function(e) {
				if (this.result) {
					resolve(this.result.value);
				} else {
					resolve();
				}
			};
			request.onerror = function(e) {
				var error = "Error reading object with key: " + key + " " + e.target.error;
				logError(error);
				reject(error);
			};
		}
	});
};

function IndexedDBStorage() {
    var that = this;

    //var cache;
    var storeId = "settings";
    this.loaded = false;

    /*
    async function loadFromDB() {
        const response = await wrappedDB.readAllObjects(storeId);
        cache = {};
        if (response) {
            response.forEach(obj => {
                cache[obj.key] = obj.value;
            });
        }
    }
    */

    this.getStoreId = function () {
        return storeId;
    };

    this.isExtraFeature = function (key) {
        return that.extraFeatures.indexOf(key) != -1;
    };

    this.get = async key => {
        let value = await wrappedDB.readObject(storeId, key);
        if (value === undefined) {
            const defaultForOauth = that.defaultsForOauth[key];
            if (defaultForOauth != undefined && await that.get("accountAddingMethod") == "oauth") {
                value = defaultForOauth;
            } else {
                value = that.defaults[key];
            }
        }
        return value;
    };

    this.getRaw = async key => {
        return await wrappedDB.readObject(storeId, key);
    };

    this.set = function (key, value) {
        return wrappedDB.putObject(storeId, key, value);
    };

    this.enable = function (key) {
        return that.set(key, true);
    };

    this.disable = function (key) {
        return that.set(key, false);
    };

    this.setDate = function (key) {
        return that.set(key, new Date());
    };

    this.firstTime = function (key) {
        if (that.get("_" + key)) {
            return false;
        } else {
            that.setDate("_" + key);
            return true;
        }
    };

    this.remove = function (key) {
        // remove it from indexeddb
        return wrappedDB.deleteSetting(storeId, key);
    };

    this.init = function () {
        console.log("storage.init()");

        this.defaults = DEFAULT_SETTINGS;
        this.defaultsForOauth = DEFAULT_SETTINGS_FOR_OAUTH;
        this.extraFeatures = SETTINGS_EXTRA_FEATURES;

        var DBNAME = "MCP_DB";

        return wrappedDB.open(DBNAME, storeId).then(() => {
            // nothing
        }, error => { // note: this is a onRejected else
            console.error(error);
            showMessageNotification("Corrupted profile", "Click for more info", error, "corruptProfile");
            return Promise.reject("Corrupted profile");
        });
    };
}

var storage = new IndexedDBStorage();

function ensureGCMRegistration() {
	return new Promise(async (resolve, reject) => {
        const registrationId = await storage.get("registrationId");
		if (registrationId) {
			console.log("reusing gcm regid");
			resolve(registrationId);
		} else {
			if (chrome.instanceID) {
                chrome.instanceID.getToken({
                    authorizedEntity: GCM_SENDER_ID,
                    scope: "GCM"
                }, async token => {
                    console.log("register gcm");
                    clearTimeout(window.instanceIdTimeout);
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        reject(chrome.runtime.lastError.message);
                    } else {
                        console.log("token", token);
                        await storage.set("registrationId", token);
                        resolve(token);
                    }
                });
                
                // seems Brave browser doesn't respond to success or failure
                window.instanceIdTimeout = setTimeout(() => {
                    const error = new Error("instanceID not responding");
                    reject(error);
                }, seconds(2));
			} else {
				const error = new Error("GCM not supported");
				console.warn(error);
				reject(error);
			}
		}
	});
}

function removeCachedAuthToken(token) {
	return new Promise((resolve, reject) => {
        if (chrome.identity) {
            chrome.identity.removeCachedAuthToken({ token: token }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
	});
}

//syntax: alwaysPromise(Promise)
//syntax: alwaysPromies(Promise[])
function alwaysPromise(promises) {
	return new Promise((resolve, reject) => {
        var successfulPromises = [];
        var failedPromises = [];

        // if param is single promise then push it into an array
        if (typeof promises.then == 'function') {
        	promises = [promises];
        }
        
        function checkIfAllComplete() {
        	if (successfulPromises.length + failedPromises.length == promises.length) {
               	resolve({successful:successfulPromises, failures:failedPromises});
            }
        }
        
        if (promises.length) {
            promises.forEach(promise => {
                promise.then(response => {
                    successfulPromises.push(response);
                    checkIfAllComplete();
                }).catch(error => {
                    failedPromises.push(error);
                    checkIfAllComplete();
                });
            });        
        } else {
        	checkIfAllComplete();
        }
    });
}


var HAS_NEW_MOUSE = (function () {
	var has = false;
	try {
		has = Boolean(new MouseEvent('x'));
	} catch (_) { }
	return has;
})();

/**
   * Fires a mouse event on a specific node, at a given set of coordinates.
   * This event bubbles and is cancellable.
   *
   * @param {string} type The type of mouse event (such as 'tap' or 'down').
   * @param {{ x: number, y: number }} xy The (x,y) coordinates the mouse event should be fired from.
   * @param {!Element} node The node to fire the event on.
   */
function makeMouseEvent(type, xy, node) {
	var props = {
		bubbles: true,
		cancelable: true,
		clientX: xy.x,
		clientY: xy.y,
		// Allow event to go outside a ShadowRoot.
		composed: true,
		// Make this a primary input.
		buttons: 1 // http://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
	};
	var e;
	if (HAS_NEW_MOUSE) {
		e = new MouseEvent(type, props);
	} else {
		e = document.createEvent('MouseEvent');
		e.initMouseEvent(
			type, props.bubbles, props.cancelable,
			null, /* view */
			null, /* detail */
			0,    /* screenX */
			0,    /* screenY */
			props.clientX, props.clientY,
			false, /*ctrlKey */
			false, /*altKey */
			false, /*shiftKey */
			false, /*metaKey */
			0,     /*button */
			null   /*relatedTarget*/);
	}
	node.dispatchEvent(e);
}

// firefox patch unobserved error which was thrown when calling $(node).empty()
function jqueryEmpty($node) {
	if ($node && $node.length) {
		$node.html("");
	}
}

function getDataUrl(canvas) {
	return new Promise(async (resolve, reject) => {
		if ('toDataURL' in canvas) { // regular canvas element
			resolve(canvas.toDataURL());
		} else { // OffscreenCanvas
			const blob = await canvas.convertToBlob();
			const reader = new FileReader();
			reader.addEventListener('load', () => {
				resolve(reader.result);
			});
			reader.addEventListener('error', error => {
				reject(error);
			});
			reader.readAsDataURL(blob);
		}
	});
}

function getPopupWindow() {
    return chrome.extension.getViews().find(thisWindow => {
        return thisWindow.location.href.indexOf("popup.html") != -1;
    });
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}