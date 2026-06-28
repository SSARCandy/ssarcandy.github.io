import { highlightActiveTag } from './Helper';
import { msChar } from './icon';

const w = window;
const d = document;
const body = d.body;
const $ = d.querySelector.bind(d);
const menu = d.getElementById('menu');
const header = d.getElementById('header');
const mask = d.getElementById('mask');
const menuToggle = d.getElementById('menu-toggle');
const railToggle = d.getElementById('rail-toggle');
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

  setExpanded(expanded) {
    menu.classList.toggle('expanded', expanded);
    // Expand is modal on every screen size: dim the content behind a scrim.
    mask.classList.toggle('in', expanded);

    if (railToggle) {
      railToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      const icon = railToggle.querySelector('i');
      if (icon) { icon.textContent = expanded ? msChar('menu_open') : msChar('menu'); }
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
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
    const encoded = encodeURIComponent(titles[0].id);
    toc.querySelector('a[href="#' + encoded + '"]').parentNode.classList.add('active');

    return {
      fixed: function (top) {
        const margin = 20 - Math.min(top, bannerH-headerH );
        toc.setAttribute('style', `margin-top: ${margin}px;`);
      },
      actived: function (top) {
        let activate_idx = -1;
        for (let i = 0; i < titles.length; i++) {
          const a = toc.querySelector('li.active');
          if (a) { a.classList.remove('active'); }
          if (activate_idx == -1 && top < offset(titles[i]).y - 5) {
            activate_idx = Math.max(0, i-1);
          }
        }
        activate_idx = activate_idx === -1 ? titles.length - 1: activate_idx;
        const encoded = encodeURIComponent(titles[activate_idx].id);
        const active = toc.querySelector('a[href="#' + encoded + '"]').parentNode;
        active.classList.add('active');
      },
    };
  }

  // The app-bar share button fires the native share sheet directly (no menu). Bound on
  // 'click' — not the touchstart in `even` — because navigator.share() needs transient
  // user activation, which touchstart doesn't grant. Falls back to copying the URL.
  share() {
    const btn = d.getElementById('menu-share');
    if (!btn) { return; }

    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: d.title, url: w.location.href }).catch(noop);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(w.location.href);
      }
    }, false);
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
  blog.setExpanded(false);
});

// Rail menu button: toggle collapsed <-> expanded.
railToggle.addEventListener(even, function (e) {
  blog.setExpanded(!menu.classList.contains('expanded'));
  e.preventDefault();
}, false);

// Top app-bar hamburger (phones only): open the expanded modal drawer.
menuToggle.addEventListener(even, function (e) {
  blog.setExpanded(true);
  e.preventDefault();
}, false);

mask.addEventListener(even, function () {
  blog.setExpanded(false);
}, false);

d.addEventListener('scroll', function () {
  const top = docEl.scrollTop;

  blog.fixedHeader(top);
  blog.toc().fixed(top);
  blog.toc().actived(top);
}, { passive: true });

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