"use strict";
var browser=window.browser||window.chrome;

var settings={
  enabled: true,
  getIcon: function() {
    return { path: 'md.iconset/icon_38x38' + (this.enabled ? '' : '-off') + '.png' };
  }
};

// get initial enable/disable state and show corresponding icon
browser.storage.local.get(["enabled"], (result)=>{
  // Save our "enabled" state
  settings.enabled=typeof result.enabled=="boolean"?result.enabled:true;
  // Set the main icon on startup
  browser.browserAction.setIcon(settings.getIcon());
});

// if icon clicked, enabled or disable the markdown preview
browser.browserAction.onClicked.addListener((tab)=>{
  settings.enabled = !settings.enabled;
  browser.storage.local.set({enabled: settings.enabled}, ()=>{
    browser.browserAction.setIcon(settings.getIcon());
  });
});