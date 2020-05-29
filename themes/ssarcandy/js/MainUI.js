import { highlightActiveTag } from './Helper';

const w = window;
const d = document;
const body = d.body;
const $ = d.querySelector.bind(d);
const menu = d.getElementById('menu');
const main = d.getElementById('main');
const header = d.getElementById('header');
const mask = d.getElementById('mask');
const menuToggle = d.getElementById('menu-toggle');
const menuOff = d.getElementById('menu-off');
const loading = d.getElementById('loading');
const ua = navigator.userAgent;
const isMD = ua.indexOf('Mobile') !== -1 || ua.indexOf('Android') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1 || ua.indexOf('KFAPWI') !== -1;
const even = isMD ? 'touchstart' : 'click';
const docEl = ua.indexOf('Edge') == -1 ? d.documentElement : body;

const noop = function () { };

const offset = function (el) {
  let x = el.offsetLeft;
  let y = el.offsetTop;

  if (el.offsetParent) {
    const pOfs = offset(el.offsetParent);
    x += pOfs.x;
    y += pOfs.y;
  }

  return { x, y };
};

class Blog {
  constructor() {
    this.share();
  }

  toggleMenu(flag) {
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
  }

  fixedHeader(top) {
    if (top > header.clientHeight) {
      header.classList.add('fixed');
    } else {
      header.classList.remove('fixed');
    }
  }

  toc() {
    const toc = $('#post-toc');

    if (!toc || !toc.children.length) {
      return {
        fixed: noop,
        actived: noop,
      };
    }

    const bannerH = $('.content-header').clientHeight;
    const headerH = header.clientHeight;
    const titles = $('#post-content').querySelectorAll('h1, h2, h3, h4, h5, h6');

    toc.querySelector('a[href="#' + titles[0].id + '"]').parentNode.classList.add('active');

    return {
      fixed: function (top) {
        const margin = 20 - Math.min(top, bannerH-headerH );
        console.log(margin);

        toc.setAttribute('style', `margin-top: ${margin}px;`);
      },
      actived: function (top) {
        let activate_idx = -1;
        for (let i = 0; i < titles.length; i++) {
          const a = toc.querySelector('li.active');
          if (a) {a.classList.remove('active');}
          if (activate_idx == -1 && top < offset(titles[i]).y - 5) {
            activate_idx = Math.max(0, i-1);
          }
        }
        const active = toc.querySelector('a[href="#' + titles[activate_idx].id + '"]').parentNode;
        active.classList.add('active');
      },
    };
  }

  share() {
    const share = d.getElementById('global-share');
    const menuShare = d.getElementById('menu-share');

    function show() {
      mask.classList.add('in');
      mask.classList.add('hide');
      share.classList.add('in');
    }

    function hide() {
      share.classList.remove('in');
      mask.classList.remove('in');
      mask.classList.remove('hide');
    }

    menuShare.addEventListener(even, show, false);
    mask.addEventListener(even, hide, false);
  }
}

const blog = new Blog();

menu.addEventListener('touchmove', function (e) {
  e.preventDefault();
}, { passive: true });

w.addEventListener('load', function () {
  loading.classList.remove('active');
  const top = docEl.scrollTop;
  blog.toc().fixed(top);
  blog.toc().actived(top);

  // is /tags page, highlight active tag
  if (~w.location.pathname.indexOf('tags')) {
    const special_case_map = { 'c': 'c++' };
    const tagname = w.location.pathname.split('/')[2].replace('-', ' ');

    highlightActiveTag(special_case_map[tagname] || tagname);
  }
});

w.addEventListener('resize', function () {
  blog.toggleMenu();
});

menuToggle.addEventListener(even, function (e) {
  blog.toggleMenu(true);
  e.preventDefault();
}, false);

menuOff.addEventListener(even, function () {
  menu.classList.add('hide');
  main.classList.remove('offset-main');
}, false);

mask.addEventListener(even, function () {
  blog.toggleMenu();
}, false);

d.addEventListener('scroll', function () {
  const top = docEl.scrollTop;

  blog.fixedHeader(top);
  blog.toc().fixed(top);
  blog.toc().actived(top);
}, false);

const archive_articles = d.getElementsByClassName('archive-article');
for (let i = 0; i < archive_articles.length; i++) {
  archive_articles[i].onclick = function () {
    w.location.href = this.getAttribute('to');
  };
}

body.oncopy = function (e) {
  const origin_text = w.getSelection();
  const notice_text = origin_text.toString().length > 100 ? '\n\nSource: ' + w.location.href + '\n' : '';

  e.clipboardData.setData('text/plain', origin_text + notice_text);

  return false;
};