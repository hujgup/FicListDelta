//chrome.storage.local.clear(function() {}); // Enable this when debugging
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({
		url: "view.html"
	});
});