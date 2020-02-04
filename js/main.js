(function(w, d) {

    var body = d.body,
        $ = d.querySelector.bind(d),
        $$ = d.querySelectorAll.bind(d),
        gotop = d.getElementById('gotop'),
        menu = d.getElementById('menu'),
        main = d.getElementById('main'),
        header = d.getElementById('header'),
        mask = d.getElementById('mask'),
        menuToggle = d.getElementById('menu-toggle'),
        menuOff = d.getElementById('menu-off'),
        loading = d.getElementById('loading'),
        animate = w.requestAnimationFrame,
        ua = navigator.userAgent,
        isMD = ua.indexOf('Mobile') !== -1 || ua.indexOf('Android') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1 || ua.indexOf('KFAPWI') !== -1,
        even = isMD ? 'touchstart' : 'click',
        noop = function() {},
        offset = function(el) {
            var x = el.offsetLeft,
                y = el.offsetTop;

            if (el.offsetParent) {
                var pOfs = arguments.callee(el.offsetParent);
                x += pOfs.x;
                y += pOfs.y;
            }

            return {
                x: x,
                y: y
            };
        },
        docEl = ua.indexOf('Edge') == -1 ? d.documentElement : body;

    var Blog = {
        goTop: function() {
            var top = docEl.scrollTop;
            if (top > 400) {
                docEl.scrollTop = top - 400;
                animate(arguments.callee);
            } else {
                docEl.scrollTop = 0;
            }
        },
        toggleGotop: function(top) {
            if (top > w.innerHeight / 2) {
                gotop.classList.add('in');
            } else {
                gotop.classList.remove('in');
            }
        },
        toggleMenu: function(flag) {
            if (flag) {
                menu.classList.remove('hide');
                main.classList.add('offset-main');

                if (w.innerWidth < 1241) {
                    mask.classList.add('in');
                    menu.classList.add('show');
                }
            } else {
                menu.classList.add('hide');
                menu.classList.remove('show');
                mask.classList.remove('in');
                main.classList.remove('offset-main');
            }
        },
        fixedHeader: function(top) {
            if (top > header.clientHeight) {
                header.classList.add('fixed');
            } else {
                header.classList.remove('fixed');
            }
        },
        toc: (function () {
            var toc = $('#post-toc');

            if (!toc || !toc.children.length) {
                return {
                    fixed: noop,
                    actived: noop
                }
            }

            var bannerH = $('.content-header').clientHeight,
                headerH = header.clientHeight,
                titles = $('#post-content').querySelectorAll('h1, h2, h3, h4, h5, h6');

            toc.querySelector('a[href="#' + titles[0].id + '"]').parentNode.classList.add('active');

            return {
                fixed: function (top) {
                    top >= bannerH - headerH ? toc.classList.add('fixed') : toc.classList.remove('fixed')
                },
                actived: function (top) {
                    for (i = 0, len = titles.length; i < len; i++) {
                        if (top > offset(titles[i]).y - headerH - 5) {
                            toc.querySelector('li.active').classList.remove('active');

                            var active = toc.querySelector('a[href="#' + titles[i].id + '"]').parentNode;
                            active.classList.add('active');
                        }
                    }

                    if (top < offset(titles[0]).y) {
                        toc.querySelector('li.active').classList.remove('active');
                        toc.querySelector('a[href="#' + titles[0].id + '"]').parentNode.classList.add('active');
                    }
                }
            }
        })(),
        share: function() {

            var share = d.getElementById('global-share'),
                menuShare = d.getElementById('menu-share'),
                div = d.createElement('div'),
                sns = d.getElementsByClassName('share-sns'),
                summary, api;

            div.innerHTML = BLOG_SHARE.summary;
            summary = div.innerText;
            div = undefined;

            api = 'http://www.jiathis.com/send/?webid={service}&url=' + BLOG_SHARE.url + '&title=' + BLOG_SHARE.title + '&summary=' + summary + '&pic=' + location.protocol + '//' + location.host + BLOG_SHARE.pic;

            function goShare(service) {
                w.open(encodeURI(api.replace('{service}', service)));
            }

            function show() {
                mask.classList.add('in');
                share.classList.add('in');
            }

            function hide() {
                share.classList.remove('in');
                mask.classList.remove('in');
            }

            [].forEach.call(sns, function(el) {
                el.addEventListener('click', function() {
                    goShare(this.dataset.service);
                }, false);
            });

            menuShare.addEventListener(even, function() {
                show();
            }, false);

            mask.addEventListener(even, function() {
                hide();
            }, false);
        },
        search: function() {
            var searchWrap = d.getElementById('search-wrap');

            function toggleSearch() {
                searchWrap.classList.toggle('in');
            }

            d.getElementById('search').addEventListener(even, toggleSearch);
            d.getElementById('search').addEventListener(even, toggleSearch);
        }
    };

    menu.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: true });

    w.addEventListener('load', function() {
        loading.classList.remove('active');
        var top = docEl.scrollTop;
        Blog.toc.fixed(top);
        Blog.toc.actived(top);

        // is /tags page, highlight active tag
        if (~w.location.pathname.indexOf('tags')) {
          var special_case_map = { 'c': 'c++' };
          var tagname = w.location.pathname.split('/')[2].replace('-', ' ');

          tagname = special_case_map[tagname] || tagname;
          highlightActiveTag(tagname);
        }
    });

    w.addEventListener('resize', function() {
        Blog.toggleMenu();
    });

    gotop.addEventListener(even, function() {
        animate(Blog.goTop);
    }, false);

    menuToggle.addEventListener(even, function(e) {
        Blog.toggleMenu(true);
        e.preventDefault();
    }, false);

    menuOff.addEventListener(even, function() {
        menu.classList.add('hide');
        main.classList.remove('offset-main');
    }, false);

    mask.addEventListener(even, function() {
        Blog.toggleMenu();
    }, false);

    d.addEventListener('scroll', function() {
        var top = docEl.scrollTop;
        Blog.toggleGotop(top);
        Blog.fixedHeader(top);
        Blog.toc.fixed(top);
        Blog.toc.actived(top);
    }, false);

    if (typeof BLOG_SHARE !== 'undefined') {
        Blog.share();
    }

    var archive_articles = d.getElementsByClassName('archive-article');
    for (var i = 0; i < archive_articles.length; i++) {
      archive_articles[i].onclick = function () {
        w.location.href = this.getAttribute('to');
      };      
    }

    Waves.init();
    Waves.attach('.global-share li', ['waves-block']);
    Waves.attach('.article-tag-list-link, #page-nav a, #page-nav span', ['waves-button']);

    d.body.oncopy = function (e) {
        var origin_text = w.getSelection();
        var notice_text = origin_text.toString().length > 20 ? '\n\nSource: ' + w.location.href + '\n' : '';

        e.clipboardData.setData('text/plain', origin_text + notice_text);

        return false;
    }
})(window, document);
