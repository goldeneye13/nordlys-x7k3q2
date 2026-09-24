// Airport status cards: FAA NAS Status via the Apps Script backend.
(function () {
  const cfg = window.DASH;
  const STALE_MS = 30 * 60 * 1000;

  // Status glyphs: a check in a circle when clear, a "!" otherwise.
  const GLYPH = {
    ok: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5"/></svg>',
  };

  let lastOk = 0;

  function build(a) {
    const el = document.getElementById('airport-' + a.code.toLowerCase());
    el.classList.add('airport-card');
    el.innerHTML = `
      <div class="ap-glyph">${GLYPH.ok}</div>
      <div class="ap-id">
        <div class="ap-code">${a.code}</div>
        <div class="ap-name">${a.name}</div>
      </div>
      <div class="ap-status">
        <div class="ap-headline">${cfg.hasKey ? '…' : 'No key'}</div>
        <div class="ap-detail"></div>
      </div>`;
  }

  function render(s) {
    const el = document.getElementById('airport-' + s.code.toLowerCase());
    el.dataset.status = s.status;
    el.querySelector('.ap-glyph').innerHTML = s.status === 'ok' ? GLYPH.ok : GLYPH.alert;
    el.querySelector('.ap-headline').textContent = s.headline;
    el.querySelector('.ap-detail').textContent = s.detail + (s.more ? ` · +${s.more} more` : '');
  }

  async function update() {
    try {
      const data = await cfg.api('airports', { codes: cfg.airports.map((a) => a.code).join(',') });
      data.forEach(render);
      lastOk = Date.now();
    } catch (e) {
      console.warn('[dash] airports update failed:', e.message);
    }
    const stale = Date.now() - lastOk > STALE_MS;
    document.querySelectorAll('.airport-card').forEach((el) => el.classList.toggle('stale', stale && lastOk > 0));
  }

  cfg.airports.forEach(build);
  if (!cfg.hasKey) return;
  update();
  setInterval(update, cfg.airportRefreshMinutes * 60 * 1000);
})();
