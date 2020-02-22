"use strict";

function checkForValidUrl(tabId, changeInfo, tab) {
    if (typeof tab.url != "undefined") {
        if (tab.url.indexOf("https://arxiv.org") > -1) {
            chrome.pageAction.show(tabId);
        } else {
            chrome.pageAction.hide(tabId);
        }
    }
};

chrome.tabs.onUpdated.addListener(checkForValidUrl);
