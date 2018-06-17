"use strict";

if ([ "text/plain", "text/markdown", "text/x-markdown", "text/vnd.daringfireball.markdown" ].indexOf(document.contentType)>-1) {
  main(window.marked, window.hljs, {
    enabled: true,
    watch: true,
    watchInterval: 3000
  });
}

function main(marked,hljs,settings) {
  var md=null;
  var watchHandle=undefined;

  setReadyState("loading");

  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState=="visible"){
      resume();
    }else{
      suspend();
    }
  });
  
  // Add our stylesheets
  document.head.insertAdjacentHTML("beforeend", [ "css/default.css", "css/github.css", "css/markdown.css", "css/page.css" ]
      .map(function(href){return '<link rel="stylesheet" href="'+chrome.extension.getURL(href)+'"/>';}).join(""));

  // Get a list of valid languages
  var languages = {};
  hljs.listLanguages().forEach(function(lang) {
    languages[lang.toLowerCase()] = lang;
  });

  // Set up marked with our highlight parser
  marked.setOptions({ 
    highlight: function(data, lang) {
      // Language case normalization
      lang = lang && lang.toLowerCase();
      // Wrap any known language in our HLJS tag (or no highlight)
      if (lang && languages[lang]) {
        var tmp = hljs.highlight(languages[lang], data, true);
        return '<code class="hljs ' + tmp.language + '">' + tmp.value + '</code>';
      } else {
        return '<code class="hljs">' + data + '</code>';
      }
    }
  });

  // Evaluate our root <pre>, containing the text
  var pre = document.body.getElementsByTagName("pre")[0];
  if (pre) {
    // Remember the original text we loaded
    md = pre&&pre.firstChild&&pre.firstChild.nodeValue||"";
    render(md);
  }

  // Add a listener waiting for enabled/disabled events
  chrome.storage.local.get(["enabled"], function(result) {
    settings.enabled=result.enabled===true;
    document.body.setAttribute("class", settings.enabled ? "enabled" : "disabled");
  });
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    var change;
    if(namespace=="local"&&(change=changes.enabled)){
      settings.enabled=change.newValue;
      document.body.setAttribute("class", settings.enabled ? "enabled" : "disabled");
    }
  });

  // Recreate the body given some markdown text
  function render(markdown) {
    setReadyState("interactive");
    var highlighted = hljs.highlight("markdown", markdown, true).value;
    var rendered = marked.parse(markdown);
    document.body.innerHTML = '<pre class="hljs markdown markdown-source">' + highlighted + '</pre><article class="markdown-body">' + rendered + "</article>";
    md=markdown;
    setReadyState("complete");
  }

  //fetch file and check file modification
  function reload() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", location.href, true);
    xhr.onload = function() {
      var text = xhr.responseText;
      if (text == md) return;
      console.debug("Changes detected on " + location.href);
      render(text);
    };
    xhr.send();
  }

  // update state to make page more responsive
  function setReadyState(readyState){
    switch(readyState){
    case "loading":
      document.body.style.visibility="hidden";
      document.title="Loading..";
      break;
    case "interactive":
      document.title="Processing..";
      break;
    case "complete":
      document.body.style.visibility="";
      //set title
      var h1=document.body.querySelector('.markdown-body h1,.markdown-body h2');
      document.title=h1?h1.textContent:"";
      //set language
      chrome.i18n.detectLanguage(md,function(result){
        var confident=result.languages.find(function(item){
          return item.percentage>70;
        })
        if(confident){
          document.documentElement.lang=confident.language;
        }
      });
      break;
    }
  }
  function suspend(){
    watchHandle=clearInterval(watchHandle);
  }
  function resume(){
    // Set a timer checking for file (only) changes
    if (location.protocol=="file:" && settings.watch) {
      console.debug("Checking for changes on "+location.href+" every "+(settings.watchInterval/1000)+" seconds");
      watchHandle=window.setInterval(reload, settings.watchInterval);
    }
  }
}
