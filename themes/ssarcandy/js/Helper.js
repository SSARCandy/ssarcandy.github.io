function addClass(elem, className) {
  const classList = elem.classList;

  if (!classList.contains(className)) {
    classList.add(className);
  }
}

function removeClass(elem, className) {
  const classList = elem.classList;

  if (classList.contains(className)) {
    classList.remove(className);
  }
}

function highlightActiveTag(tagname) {
  const tags = document.getElementsByClassName('article-tag-list-link');
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].innerText === tagname) {
      addClass(tags[i], 'active-tag');
    } else {
      removeClass(tags[i], 'active-tag');
    }
  }
}

export {
  addClass,
  removeClass,
  highlightActiveTag,
};