// Photo card: random photos from the Google Photos shared album(s), via the backend.
// Images load straight from Google's image servers (lh3.googleusercontent.com); each
// is shown whole ("contain") over a blurred copy of itself, so nothing gets cropped.
// Images are requested without a Referer: Google's image server refuses some referrers
// (e.g. localhost gets HTTP 429).
(function () {
  const cfg = window.DASH;
  const el = document.getElementById('photo');
  const BATCH = 30;

  let queue = [];
  let front = null; // the layer currently visible

  el.classList.add('photo-card');
  el.innerHTML = '<div class="photo-layer"></div><div class="photo-layer"></div>';
  const layers = [...el.querySelectorAll('.photo-layer')];

  // Request roughly twice the card size so it stays sharp on the TV.
  function sizedUrl(p) {
    const w = Math.round(el.clientWidth * 2);
    const h = Math.round(el.clientHeight * 2);
    return `${p.url}=w${w}-h${h}`;
  }

  // "Long Beach, CA · Aug 2022" (US places lose the ", USA").
  function caption(p) {
    const place = (p.place || '').replace(/, USA$/, '');
    const date = p.taken ? new Date(p.taken).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    return [place, date].filter(Boolean).map(esc).join(' · ');
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  async function refill() {
    try {
      queue = queue.concat(await cfg.api('photos', { n: BATCH }));
      return true;
    } catch (e) {
      console.warn('[dash] photos update failed:', e.message);
      return false;
    }
  }

  function load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error('image failed'));
      img.src = src;
    });
  }

  // Show the next photo once it has fully loaded, then crossfade to it.
  async function next(skips = 0) {
    if (queue.length < 2 && !(await refill()) && !queue.length) return false;
    const p = queue.shift();
    let src;
    try {
      src = await load(sizedUrl(p));
    } catch {
      if (skips >= 5) return false; // something is wrong; try again next round
      return next(skips + 1); // e.g. an expired URL: skip it
    }
    const back = layers.find((l) => l !== front);
    back.innerHTML = `<img class="photo-blur" src="${src}" alt="" referrerpolicy="no-referrer">
      <img class="photo-main" src="${src}" alt="" referrerpolicy="no-referrer">
      <div class="photo-caption">${caption(p)}</div>`;
    back.classList.add('shown');
    if (front) front.classList.remove('shown');
    front = back;
    return true;
  }

  if (!cfg.hasKey) return;
  cfg.poll(next, cfg.photoSeconds / 60);
})();
