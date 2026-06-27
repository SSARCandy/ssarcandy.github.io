function highlightActiveTag(tagname) {
  for (const el of document.getElementsByClassName('article-tag-list-link')) {
    el.classList.toggle('active-tag', el.innerText === tagname);
  }
}

export {
  highlightActiveTag,
};