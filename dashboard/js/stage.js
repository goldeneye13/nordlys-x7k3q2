// Scale the fixed 1080x1920 stage to fit the window, so the same page works on the
// portrait TV (scale 1) and in a laptop browser for preview (scaled down, letterboxed).
(function () {
  const W = 1080, H = 1920;
  const stage = document.getElementById('stage');

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.setProperty('--scale', scale);
  }

  window.addEventListener('resize', fit);
  fit();

  document.getElementById('windy').src = window.DASH.windyUrl;
})();
