!function(){var i,e=document.getElementById("search"),t=document.getElementById("search-wrap"),n=document.getElementById("key"),s=document.getElementById("back"),o=document.getElementById("search-panel"),c=document.getElementById("search-result"),r=document.getElementById("search-tpl").innerHTML;var a=document[-1!==navigator.userAgent.indexOf("Firefox")?"documentElement":"body"],u=function(){window.innerWidth<760&&a.classList.add("lock-size"),o.classList.add("in")},l=function(){window.innerWidth<760&&a.classList.remove("lock-size"),o.classList.remove("in")};function d(e,t){return t.lastIndex=0,t.test(e)}function f(e){var t=this.value.trim();if(t){var n=new RegExp(t.replace(/[ ]/g,"|"),"gmi");!function(t){if(i)t(i);else{var e=new XMLHttpRequest;e.open("GET","/content.json",!0),e.onload=function(){if(200<=this.status&&this.status<300){var e=JSON.parse(this.response);i=e instanceof Array?e:e.posts,t(i)}else console.error(this.statusText)},e.onerror=function(){console.error(this.statusText)},e.send()}}(function(e){!function(e){var t="";t=e.length?e.map(function(e){return function(e,n){return e.replace(/\{\w+\}/g,function(e){var t=e.replace(/\{|\}/g,"");return n[t]||""})}(r,{title:e.title,path:e.path,date:new Date(e.date).toLocaleDateString(),tags:e.tags.map(function(e){return"<span>#"+e.name+"</span>"}).join("")})}).join(""):'<li class="tips"><i class="icon icon-coffee icon-3x"></i><p>Results not found!</p></li>',c.innerHTML=t}(e.filter(function(e){return function(e,t){return d(e.title,t)||e.tags.some(function(e){return d(e.name,t)})||d(e.text,t)}(e,n)})),u()}),e.preventDefault()}}e.addEventListener("click",function(){t.classList.toggle("in"),n.value="",document.getElementById("key").focus()}),s.addEventListener("click",function(){t.classList.remove("in"),l()}),document.addEventListener("click",function(e){"key"!==e.target.id&&l()}),n.addEventListener("input",f),n.addEventListener("click",f)}();