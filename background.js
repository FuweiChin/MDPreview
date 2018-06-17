var settings={
  enabled: true,
  getIcon: function() {
    return { path: 'md.iconset/icon_38x38' + (this.enabled ? '' : '-off') + '.png' };
  }
};

chrome.storage.local.get(["enabled"], function(result) {
  // Save our "enabled" state
  settings.enabled=typeof result.enabled=="boolean"?result.enabled:true;
  // Set the main icon on startup
  chrome.browserAction.setIcon(settings.getIcon());
});

// Wait for clicks on our icon
chrome.browserAction.onClicked.addListener(function(tab) {
  // Flip state
  settings.enabled = !settings.enabled;
  // Save state and notify any running tab
  chrome.storage.local.set({enabled: settings.enabled}, function() {
    chrome.browserAction.setIcon(settings.getIcon());
  });
});