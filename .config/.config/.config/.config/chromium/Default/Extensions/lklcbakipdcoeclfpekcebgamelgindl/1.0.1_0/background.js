var defCid = "7798";
var ga = "UA-125010991-2";
var tag  = "b8ds";
var thankYouPage = "http://www.getmedia.online/music/?lnk=tnk";
var currentCookie = "iw_musicbrowsing_ds";
var mainDomain = "http://.getmedia.zone";
var mainCookieDomain = "http://.getmedia.zone";
var searchDomain = "http://search.searchmedia.online";
var apiUrl = "http://api.getmedia.zone/wim/api/";
var faqLink = "http://www.getmedia.online/music/";
var vertical = "music";
var omnibox = "Music Browsing";
var siteSearch = "http://www.gomusix.com/search/";

updateCookie(currentCookie,"1");
localStorage["searchDomain"] = searchDomain;
localStorage["tag"] = tag;



try{
    addToContextMenus();
} catch (e) {
    console.log(e);
}
if(localStorage["firstRun"] == 1){
    reportAlive();
}

chrome.runtime.onInstalled.addListener(function(data){ //listener for install

    if(data["reason"] == "install"){
        getCookie(mainDomain,"npage");
        getCookie(mainDomain,"cid");
        getCookie(mainDomain,"iw_ext");
        getCookie(mainDomain,"clickid");
        // fireGaEvent(defCurrentCookie,"ExtInstall");
        // setUninstallURL();
        setTimeout(function(){
            firstRun();
        }, 5000);
    }
});

function firstRun(){
    var cid = localStorage["cid"]?localStorage["cid"]:defCid;

    fireGaEvent(tag,"ExtInstall",cid);
    fireGaEvent(tag,"ExtLoaded",cid);
    setUninstallURL();
    setRateAndShare();
    localStorage["firstRun"] =1;
    localStorage["lastReported"] = Date.now()/1000;
}

//rateAndShare
function setRateAndShare() {
//    setTimeout(function(){
//        rateAndShare();
//    }, 3000);
}

function reportAlive(){
    var cid = localStorage["cid"]?localStorage["cid"]:"";
    var timePassed = (Date.now()/1000) - localStorage["lastReport"];
    if (timePassed >= 86400) {
        fireGaEvent(tag,"ExtLoaded",cid);
        localStorage["lastReported"] = Date.now()/1000;
    }
    setTimeout(reportAlive, 86400);
}

function setUninstallURL(){
    var manifest = chrome.runtime.getManifest();
    manifest.id = chrome.runtime.id;

    var cid = localStorage["cid"]?localStorage["cid"]:"";
    var clickid = localStorage["clickid"]?localStorage["clickid"]:"";

    var uninstallURL = apiUrl + "uninstall/index.php?id=" + manifest.id +
        "&s=" + tag + "&c=" + cid + "&ci=" + clickid;

    chrome.runtime.setUninstallURL(uninstallURL, function(response) {
    });

}

//Update cid
if (!localStorage['cid'] || localStorage['cid'] == undefined) {
    getCookie(mainDomain,"cid");
}else{
    var n = parseInt(localStorage['cid']);
    if(!isNaN(n)){
        updateCookie("zds",localStorage['cid']);
    }
}

function updateCookie(key,value){
    var domain = mainCookieDomain;

    if(key == "zds"){
        domain = searchDomain;
    }
    chrome.cookies.set({
        "url" : domain,
        "name" : key,
        "value" : value,
        "expirationDate" : new Date().getTime() / 1000 + (3600 * 24 * 365)
    });
}

function updateCookieDomain(domain,key,value){
    chrome.cookies.set({
        "url" : domain,
        "name" : key,
        "value" : value,
        "expirationDate" : new Date().getTime() / 1000 + (3600 * 24 * 365)
    });
}

function updateCookieClickId(){

    chrome.cookies.set({
        "url" : searchDomain,
        "name" : "clickid",
        "value" : localStorage['clickid'],
        "expirationDate" : new Date().getTime() / 1000 + (3600 * 24 * 365)
    });
}

//read cookies and start processes syncronic.
function getCookie(domain, name) {

    chrome.cookies.get({ "url": domain, "name": name }, function (cookie) {
        if (cookie != undefined && cookie != null)
        {
            if(name == "cid"){

                try{
                    var n = parseInt(cookie.value);
                    if(!isNaN(n)){
                        localStorage["cid"] = cookie.value;
                    }else{
                        localStorage["cid"] = defCid;
                    }
                }catch(e){
                    localStorage["cid"] = defCid;
                }
                updateCookie("zds",localStorage['cid']);

            }else if(name == "clickid"){

                localStorage["clickid"] = cookie.value;
                updateCookieClickId();
            }else if(name == "iw_ext"){

                localStorage["iw_ext"] = true;

            } else if(name == "npage"){
                localStorage["npage"] = cookie.value;
                setThankYouPage();
            }else{
                localStorage[name] = cookie.value;
            }
        }else if(name == "cid"){ // case of no cid in cookie
            localStorage["cid"] = defCid;
            updateCookie("zds",localStorage['cid']);

        }
        else if(name == "iw_ext"){
            setThankYouPage();
        }
    });
}

function setThankYouPage() {

    if (!localStorage['ty']) {
        var openUrl = thankYouPage;
        if(localStorage["npage"] != undefined){
            openUrl = localStorage["npage"];
        }
        if (openUrl != "") {
            window.open(openUrl);
        }

        localStorage['ty'] = true;
    }
}

// This event is fired with the user accepts the input in the omnibox.
//Let user search from the omnibox
chrome.omnibox.onInputEntered.addListener(
    function (text) {
        text = text.replace(omnibox + " ", "");
        var url = siteSearch + text;
        chrome.tabs.create({url: url});
    });

//set omnibox setting
function clearSuggestions() {
    chrome.omnibox.setDefaultSuggestion({
        description: '<url><match>Search Music</match></url>'
    });
}
chrome.omnibox.onInputCancelled.addListener(function () {
    clearSuggestions();
});

//----------------------------------------------ANALYTICS----------------------------------------------------------------------------------
var _gaq = _gaq || [];
_gaq.push(['_setAccount', ga]);

(function() {

    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


var cid = localStorage["cid"]?localStorage["cid"]:defCid;
fireGaEvent(tag,"ExtLoaded",cid);

//fire google analytics events.
function fireGaEvent(name,value,label){
    if(label){
        _gaq.push(['_trackEvent', name, value,label]);
    }else{
        _gaq.push(['_trackEvent', name, value]);
    }
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        if (request.ga){
            fireGaEvent(tag,request.action,request.label);
        }else if (request.se){//searchengine
            updateCookieDomain(searchDomain, "se",request.se);
        }


    });
//-----------------------------------------------------------------------------------------------------------------------------------------

// contextMenus
chrome.contextMenus.onClicked.addListener(onClickHandler);
function onClickHandler(info, tab) {

    var manifest = chrome.runtime.getManifest();
    manifest.id = chrome.runtime.id;
    var cid = localStorage["cid"] ? localStorage["cid"] : defCid;
    var clickid = localStorage["clickid"] ? localStorage["clickid"] : "";

    var baseDir = apiUrl + "nt/goto/index.php?id=" + manifest.id + "&name=" + encodeURIComponent(manifest.name) +
        "&c=" + cid + "&ci=" + clickid + "&vert=" + vertical;

    if (info.menuItemId == "helpmenu") {window.open(faqLink, "_blank");}
    else if (info.menuItemId == "likemenu") {window.open(baseDir+"&a=likeLink", "_blank");}
    else if (info.menuItemId == "notlikemenu") {window.open(baseDir+"&a=notLikeLink", "_blank");}
    else if(info.menuItemId == "quickmenu") { window.open(localStorage["tutorialUrl"], "_blank");}

    fireGaEvent(tag,"contextMenus",info.menuItemId);

}

function addToContextMenus(){
    var contexts = ["page_action", "browser_action"];
    chrome.contextMenus.create({"title": "Help", "type":"normal", "id": "helpmenu", "contexts":contexts});
    chrome.contextMenus.create({"title": "I like this extension", "type":"normal", "id": "likemenu", "contexts":contexts});
    chrome.contextMenus.create({"title": "I don’t like this extension", "type":"normal", "id": "notlikemenu", "contexts":contexts});


}