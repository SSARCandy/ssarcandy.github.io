(function (w, d) {
  var menu = d.getElementById('menu');
  var main = d.getElementById('main');
  var mask = d.getElementById('mask');

  var manager = new Hammer.Manager(d);

  // Create a recognizer.
  var Pan = new Hammer.Pan({
    event: 'swipe_menu',
    threshold: 200,
  });

  // Add the recognizer to the manager.
  manager.add(Pan);

  function getStartPosition(e) {
    var delta_x = e.deltaX;
    var delta_y = e.deltaY;
    var final_x = e.srcEvent.pageX || e.srcEvent.screenX || 0;
    var final_y = e.srcEvent.pageY || e.srcEvent.screenY || 0;

    return {
      delta_x: delta_x,
      delta_y: delta_y,
      final_x: final_x,
      final_y: final_y,
      x: final_x - delta_x,
      y: final_y - delta_y,
    }
  };

  manager.on('swipe_menu', function (e) {
      // e.preventDefault();
      var info = getStartPosition(e);
      if (info.x <= 50) {
          // open menu
          menu.classList.remove('hide');
          main.classList.add('offset-main');

          if (w.innerWidth < 1241) {
              mask.classList.add('in');
              menu.classList.add('show');
          }
      }
  });
})(window, document);
