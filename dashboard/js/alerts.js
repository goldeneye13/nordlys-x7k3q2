// Weather alert cards (National Weather Service, free, no key, CORS-enabled).
// Like Dakboard's alert squares: invisible while there's no alert for the location.
(function () {
  const cfg = window.DASH;
  const test = new URLSearchParams(location.hash.slice(1)).get('alertTest') === '1';

  // Most severe first; colours follow the usual warning palette.
  const SEVERITY = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
  const COLOR = { Extreme: '#b388ff', Severe: '#ff5252', Moderate: '#ffa726', Minor: '#ffd54f', Unknown: '#9e9e9e' };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function until(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return 'until ' + (sameDay ? time : d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + time);
  }

  function render(loc, alerts) {
    const el = document.getElementById('alert-' + loc.id);
    if (!alerts.length) {
      el.classList.remove('active');
      el.innerHTML = '';
      return;
    }
    alerts.sort((a, b) => (SEVERITY[b.severity] || 0) - (SEVERITY[a.severity] || 0));
    const a = alerts[0];
    el.style.setProperty('--al-color', COLOR[a.severity] || COLOR.Unknown);
    el.innerHTML = `
      <div class="al-where">${esc(loc.name)}${alerts.length > 1 ? ` · +${alerts.length - 1} more` : ''}</div>
      <div class="al-event">${esc(a.event)}</div>
      <div class="al-when">${esc(until(a.ends || a.expires))}</div>`;
    el.classList.add('active');
  }

  async function update() {
    let ok = true;
    await Promise.all(cfg.weatherAlerts.map(async (loc) => {
      if (test) {
        const ends = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
        return render(loc, [{ event: 'Heat Advisory (test)', severity: 'Moderate', ends }]);
      }
      try {
        const res = await fetch(`https://api.weather.gov/alerts/active?point=${loc.lat},${loc.lon}`,
          { headers: { Accept: 'application/geo+json' }, signal: AbortSignal.timeout(30 * 1000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const alerts = (await res.json()).features
          .map((f) => f.properties)
          .filter((p) => p.status === 'Actual' && p.messageType !== 'Cancel');
        render(loc, alerts);
      } catch (e) {
        ok = false; // keep whatever the card shows now
        console.warn(`[dash] alerts for ${loc.name} failed:`, e.message);
      }
    }));
    return ok;
  }

  cfg.weatherAlerts.forEach((loc) => document.getElementById('alert-' + loc.id).classList.add('alert-card'));
  cfg.poll(update, cfg.alertRefreshMinutes);
})();
