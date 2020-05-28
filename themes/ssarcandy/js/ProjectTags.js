import lunr from 'lunr';

const elements = document.getElementsByClassName('plugin');
const $input = document.getElementById('plugin-search-input');
const elementLen = elements.length;
const index = lunr.Index.load(window.SEARCH_INDEX);

function search(value) {
  const result = index.search(value);
  const len = result.length;
  const selected = {};
  const i = 0;

  for (i = 0; i < len; i++) {
    selected[result[i].ref] = true;
  }

  for (i = 0; i < elementLen; i++) {
    if (selected[i]) {
      addClass(elements[i], 'on');
    } else {
      removeClass(elements[i], 'on');
    }
  }
}

function displayAll() {
  for (const i = 0; i < elementLen; i++) {
    addClass(elements[i], 'on');
  }
}

function hashchange() {
  const hash = location.hash.substring(1);
  $input.value = hash;

  if (hash) {
    highlightActiveTag(hash);
    search(hash);
  } else {
    displayAll();
  }
}

$input.addEventListener('input', function () {
  const value = this.value;

  if (!value) return displayAll();
  search(value);
});

window.addEventListener('hashchange', hashchange);
hashchange();
