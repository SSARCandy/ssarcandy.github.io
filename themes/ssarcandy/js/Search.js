const searchIco = document.getElementById('search');
const searchWrap = document.getElementById('search-wrap');
const keyInput = document.getElementById('key');
const back = document.getElementById('back');
const searchPanel = document.getElementById('search-panel');
const searchResult = document.getElementById('search-result');

function searchItem({ path, title, tags, date }) {
  return `
<li class="item">
  <a href="/${path}">
      <div class="title ellipsis" title="${title}">${title}</div>
      <div class="flex-row flex-middle">
          <div class="tags ellipsis">
              ${tags}
          </div>
          <time class="flex-col time">${date}</time>
      </div>
  </a>
</li>`;
}

// Fetch /content.json once, then serve from the in-memory cache. Cached only on
// success, so a failed load retries on the next search.
let searchData;
function loadData() {
  if (searchData) return Promise.resolve(searchData);
  return fetch('/content.json')
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then((res) => {
      searchData = Array.isArray(res) ? res : res.posts;
      return searchData;
    });
}

const docEl = document[navigator.userAgent.indexOf('Firefox') !== -1 ? 'documentElement' : 'body'];

const Control = {
  show() {
    if (window.innerWidth < 760) docEl.classList.add('lock-size');
    searchPanel.classList.add('in');
  },
  hide() {
    if (window.innerWidth < 760) docEl.classList.remove('lock-size');
    searchPanel.classList.remove('in');
  },
};

function render(data) {
  if (!data.length) {
    searchResult.innerHTML = '<li class="tips"><i class="icon material-symbols-outlined">search_off</i><p>Results not found!</p></li>';
    return;
  }

  searchResult.innerHTML = data.map((post) => searchItem({
    title: post.title,
    path: post.path,
    date: new Date(post.date).toLocaleDateString(),
    tags: post.tags.map((tag) => `<span>#${tag.name}</span>`).join(''),
  })).join('');
}

function regtest(raw, regExp) {
  regExp.lastIndex = 0;
  return regExp.test(raw);
}

function matcher(post, regExp) {
  return regtest(post.title, regExp)
    || post.tags.some((tag) => regtest(tag.name, regExp))
    || regtest(post.text, regExp);
}

function search(e) {
  const key = this.value.trim();
  if (!key) return;

  const regExp = new RegExp(key.replace(/ /g, '|'), 'gmi');

  loadData()
    .then((data) => {
      render(data.filter((post) => matcher(post, regExp)));
      Control.show();
    })
    .catch((err) => console.error(err.message));

  e.preventDefault();
}

searchIco.addEventListener('click', () => {
  searchWrap.classList.toggle('in');
  keyInput.value = '';
  keyInput.focus();
});

back.addEventListener('click', () => {
  searchWrap.classList.remove('in');
  Control.hide();
});

document.addEventListener('click', (e) => {
  if (e.target.id !== 'key') {
    Control.hide();
  }
});

keyInput.addEventListener('input', search);
keyInput.addEventListener('click', search);
