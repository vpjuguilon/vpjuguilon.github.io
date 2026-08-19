(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('mode-toggle');
  if (!toggle) return;

  function currentMode() {
    var set = root.getAttribute('data-mode');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggle.addEventListener('click', function () {
    var next = currentMode() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-mode', next);
    try { localStorage.setItem('site-mode', next); } catch (e) {}
  });
})();
