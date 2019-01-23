"use strict";
if(!window.browser){window.browser=window.chrome;}

if ([ "text/plain", "text/markdown", "text/x-markdown", "text/vnd.daringfireball.markdown" ].indexOf(document.contentType)>-1) {
  main(window.marked, window.hljs);
}

function main(marked,hljs) {
  var md=null;

  // Add our stylesheets
  document.head.insertAdjacentHTML("beforeend", [ "css/default.css", "css/github.css", "css/markdown.css", "css/page.css" ]
      .map(function(href){return '<link rel="stylesheet" href="'+browser.runtime.getURL(href)+'"/>\n';}).join(""));
  // set enable state
  browser.storage.local.get(["enabled"], function(result) {
    document.body.setAttribute("class", result.enabled==true ? "enabled" : "disabled");
  });

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
  // listen enabled/disabled change
  browser.storage.onChanged.addListener(function(changes, namespace) {
    var change;
    if(namespace=="local"&&(change=changes.enabled)){
      document.body.setAttribute("class", change.newValue ? "enabled" : "disabled");
    }
  });

  // Recreate the body given some markdown text
  function render(markdown) {
    setReadyState("loading");
    var escaped=escapeHTML(markdown);
    var rendered = marked.parse(markdown);
    document.body.innerHTML = '<pre class="hljs markdown markdown-source">' + escaped + '</pre><article class="markdown-body">' + rendered + "</article>";
    md=markdown;
    setReadyState("complete");
  }

  function escapeHTML(text){
    return text.replace(/[<>&"]/g,function(c){
      switch(c){
        case "<":return "&lt;";
        case ">":return "&gt;";
        case "&":return "&amp;";
        case "\"":return "&quot;";
      }
    });
  }

  //fetch file and check file modification
  function reloadIfNeccessary() {
    if(document.hidden)
      return;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", location.href, true);
    xhr.onload = function() {
      console.log(xhr.getAllResponseHeaders());
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
      document.title="Loading..";
      break;
    case "complete":
      //set title
      var h1=document.body.querySelector('.markdown-body h1,.markdown-body h2');
      document.title=h1?h1.textContent:"";
      if(document.doctype==null){
        var doctype = document.implementation.createDocumentType("html", "-//W3C//DTD XHTML 1.0 Transitional//EN", "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd");
        document.insertBefore(doctype, document.childNodes[0]);
      }
      //set language
      if(browser.i18n.detectLanguage){
        browser.i18n.detectLanguage(md,function(result){
          var confident=result.languages.find(function(item){
            return item.percentage>70;
          });
          if(confident){
            document.documentElement.lang=confident.language;
          }
        });
      }
      //find broken link
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'),function(a){
        if(a.ownerDocument.getElementById(a.getAttribute("href").substring(1))==null){
          a.classList.add("broken");
        }
      });
      // disable href-textContent duplicated link
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="http://"],a[href^="https://"]'),function(a){
        if(a.getAttribute("href")==a.textContent){//FIXME
          a.removeAttribute("href");
        }
      });
      break;
    }
  }
}
