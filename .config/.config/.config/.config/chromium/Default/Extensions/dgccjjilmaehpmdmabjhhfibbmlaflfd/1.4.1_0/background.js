chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {

  if(localStorage['blocked'] === undefined) {
    localStorage['blocked'] = "";
  }

  var host = urlDomain(tab.url);
  var title = '';
  if(hasValue(localStorage['blocked'], host)) {
      title = 'Enable on this site';
      localStorage['current_blocked'] = 'true';
  }
  else {
      title = 'Disable on this site';
      localStorage['current_blocked'] = 'false';
  }

  chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
            "title": title,
            "contexts": ["all"],
            "id": title
        }
  );

  if (changeInfo.status == 'complete') {
    chrome.tabs.executeScript(null, {file: "content_script.js"});
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(localStorage['disabled'] == 'true') {
    chrome.browserAction.setIcon({path:'glasses24-disabled.png'});
  }
  else {
    chrome.browserAction.setIcon({path:'glasses24.png'});
  }

  if (request.method == "getLocalStorage") {
    if((localStorage['disabled'] != undefined && localStorage['disabled'] == 'true') ||
        localStorage['current_blocked'] == 'true'
        )
    {
        sendResponse({});
    }
    else {
        sendResponse({
            data: (localStorage['settings'] || 'font-size:20px;line-height:1.5em')
        });
    }
  }
  else
    sendResponse({});
});

chrome.browserAction.onClicked.addListener(function (tab) {
    if (localStorage['disabled'] == 'undefined'){
        localStorage['disabled'] = 'true'
    }
    else {
        if(localStorage['disabled'] == 'true') {
            localStorage['disabled'] = 'false';
        }
        else {
            localStorage['disabled'] = 'true';
        }
    }
    var code = 'window.location.reload();';
    chrome.tabs.executeScript(tab.id, {code: code});
});



// add click event
chrome.contextMenus.onClicked.addListener(onClickHandler);

// The onClicked callback function.
function onClickHandler(info, tab) {
    if(info.menuItemId == 'Disable on this site'){
        localStorage['blocked'] = addValue(localStorage['blocked'], urlDomain(info.pageUrl));
    }
    else {
        localStorage['blocked'] = removeValue(localStorage['blocked'], urlDomain(info.pageUrl));
    }
};

function urlDomain(data) {
    var    a      = document.createElement('a');
    a.href = data;
    return a.hostname;
}

var addValue = function(list, value) {
    separator = ",";
    if(list == "") {
        return value;
    }

    var values = list.split(separator);
    values.push(value);
    return values.join(separator);
}

var hasValue = function(list, value) {
    separator = ",";
    var values = list.split(separator);
    for(var i = 0 ; i < values.length ; i++) {
        if(values[i] == value) {
            return true;
        }
    }
    return false;
}

var removeValue = function(list, value) {
    separator = ",";
    var values = list.split(separator);
    for(var i = 0 ; i < values.length ; i++) {
        if(values[i] == value) {
            values.splice(i, 1);
            return values.join(separator);
        }
    }
    return list;
}
