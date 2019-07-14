chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
  window.customizePage(response.data)
});
