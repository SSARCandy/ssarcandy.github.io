(function(e,t){var n=t.body,a=t.querySelector.bind(t),o=t.querySelectorAll.bind(t),s=t.getElementById("gotop"),c=t.getElementById("menu"),l=t.getElementById("header"),r=t.getElementById("mask"),d=t.getElementById("menu-toggle"),f=t.getElementById("menu-off"),u=t.getElementById("loading"),v=e.requestAnimationFrame,h=navigator.userAgent,g=h.indexOf("Mobile")!==-1||h.indexOf("Android")!==-1||h.indexOf("iPhone")!==-1||h.indexOf("iPad")!==-1||h.indexOf("KFAPWI")!==-1,m=g?"touchstart":"click",L=function(){},p=function(e){var t=e.offsetLeft,n=e.offsetTop;if(e.offsetParent){var i=arguments.callee(e.offsetParent);t+=i.x;n+=i.y}return{x:t,y:n}},E=h.indexOf("Firefox")!==-1?t.documentElement:n;var y={goTop:function(){var e=E.scrollTop;if(e>400){E.scrollTop=e-400;v(arguments.callee)}else{E.scrollTop=0}},toggleGotop:function(t){if(t>e.innerHeight/2){s.classList.add("in")}else{s.classList.remove("in")}},toggleMenu:function(t){if(t){c.classList.remove("hide");if(e.innerWidth<1241){r.classList.add("in");c.classList.add("show")}}else{c.classList.remove("show");r.classList.remove("in")}},fixedHeader:function(e){if(e>l.clientHeight){l.classList.add("fixed")}else{l.classList.remove("fixed")}},toc:function(){var e=a("#post-toc");if(!e||!e.children.length){return{fixed:L,actived:L}}var t=a(".content-header").clientHeight,n=l.clientHeight,s=a("#post-content").querySelectorAll("h1, h2, h3, h4, h5, h6");e.querySelector('a[href="#'+s[0].id+'"]').parentNode.classList.add("active");Array.prototype.forEach.call(o('a[href^="#"]'),function(e){e.addEventListener("click",function(e){e.preventDefault();var t=p(a('[id="'+decodeURIComponent(this.hash).substr(1)+'"]')).y-n;E.scrollTop=t})});return{fixed:function(i){i>=t-n?e.classList.add("fixed"):e.classList.remove("fixed")},actived:function(t){for(i=0,len=s.length;i<len;i++){if(t>p(s[i]).y-n-5){e.querySelector("li.active").classList.remove("active");var a=e.querySelector('a[href="#'+s[i].id+'"]').parentNode;a.classList.add("active")}}if(t<p(s[0]).y){e.querySelector("li.active").classList.remove("active");e.querySelector('a[href="#'+s[0].id+'"]').parentNode.classList.add("active")}}}}(),share:function(){var n=t.getElementById("global-share"),i=t.getElementById("menu-share"),a=t.createElement("div"),o=t.getElementsByClassName("share-sns"),s,c;a.innerHTML=BLOG_SHARE.summary;s=a.innerText;a=undefined;c="http://www.jiathis.com/send/?webid={service}&url="+BLOG_SHARE.url+"&title="+BLOG_SHARE.title+"&summary="+s+"&pic="+location.protocol+"//"+location.host+BLOG_SHARE.pic;function l(t){e.open(encodeURI(c.replace("{service}",t)))}function d(){r.classList.add("in");n.classList.add("in")}function f(){n.classList.remove("in");r.classList.remove("in")}[].forEach.call(o,function(e){e.addEventListener("click",function(){l(this.dataset.service)},false)});i.addEventListener(m,function(){d()},false);r.addEventListener(m,function(){f()},false)},search:function(){var e=t.getElementById("search-wrap");function n(){e.classList.toggle("in")}t.getElementById("search").addEventListener(m,n);t.getElementById("search").addEventListener(m,n)}};c.addEventListener("touchmove",function(e){e.preventDefault()});e.addEventListener("load",function(){u.classList.remove("active");var e=E.scrollTop;y.toc.fixed(e);y.toc.actived(e)});e.addEventListener("resize",function(){y.toggleMenu()});s.addEventListener(m,function(){v(y.goTop)},false);d.addEventListener(m,function(e){y.toggleMenu(true);e.preventDefault()},false);f.addEventListener(m,function(){c.classList.add("hide")},false);r.addEventListener(m,function(){y.toggleMenu()},false);t.addEventListener("scroll",function(){var e=E.scrollTop;y.toggleGotop(e);y.fixedHeader(e);y.toc.fixed(e);y.toc.actived(e)},false);if(typeof BLOG_SHARE!=="undefined"){y.share()}Waves.init();Waves.attach(".global-share li",["waves-block"]);Waves.attach(".article-tag-list-link, #page-nav a, #page-nav span",["waves-button"]);document.body.oncopy=function(e){var t=window.getSelection();var n=t.toString().length>20?"\n\nSource: "+window.location.href+"\n":"";e.clipboardData.setData("text/plain",t+n);return false}})(window,document);