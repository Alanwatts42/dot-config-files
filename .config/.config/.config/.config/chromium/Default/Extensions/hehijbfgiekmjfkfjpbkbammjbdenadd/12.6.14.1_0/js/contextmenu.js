/*
 * contextmenu.js
 *
 * Context menu support
 *
*/
var ContextMenu = {
    created: false,

    create: function(theBP) {
        if (this.created) {
            return;
        }
        this.created = true;

        function onContextClicked(info, tab) {
            var url = info.linkUrl || info.srcUrl || info.frameUrl || info.pageUrl || tab.url;
            switch(info.menuItemId) {
                case contextOpenIETab:
                    theBP.openWithIETab(null, url);
                    break;
                case contextOpenSameTab:
                    theBP.openWithIETab(tab.id, url);
                    break;
                case contextOptions:
                    theBP.onShowNormalOptions();
                    break;
            }
        };

        var contextTypes = [ 'page', 'frame', 'link', 'video' ];
        var contextParent = chrome.contextMenus.create({ type: "normal",  title: I18N("ctxIETabOptions"), contexts: contextTypes, onclick: onContextClicked });
        var contextOpenIETab = chrome.contextMenus.create({ type: "normal", title: I18N("ctxOpenIETab"), contexts: contextTypes, parentId: contextParent, onclick: onContextClicked });
        var contextOpenSameTab = chrome.contextMenus.create({ type: "normal", title: I18N("ctxOpenInCurrentTab"), contexts: contextTypes, parentId: contextParent, onclick: onContextClicked });
        // var contextOptions = chrome.contextMenus.create({ type: "normal", title: I18N("ctxOptions"), contexts: contextTypes, parentId: contextParent, onclick: onContextClicked });
    },

    remove: function() {
        this.created = false;
        chrome.contextMenus.removeAll();
    }
}
