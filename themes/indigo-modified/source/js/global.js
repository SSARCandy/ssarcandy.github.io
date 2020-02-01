function addClass(elem, className) {
  var classList = elem.classList;

  if (!classList.contains(className)) {
    classList.add(className);
  }
}

function removeClass(elem, className) {
  var classList = elem.classList;

  if (classList.contains(className)) {
    classList.remove(className);
  }
}

function highlightActiveTag(tagname) {
  var tags = document.getElementsByClassName('article-tag-list-link');
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].innerText === tagname) {
      addClass(tags[i], 'active-tag');
    } else {
      removeClass(tags[i], 'active-tag');
    }
  }
}