// Calendar agenda: today's (and tomorrow's) events via the Apps Script backend.
// Which calendars are shown, and their colours and icons, is set in the backend
// (apps-script/Calendar.js), since the calendar IDs shouldn't be public.
(function () {
  const cfg = window.DASH;
  const el = document.getElementById('calendar');
  const STALE_MS = 30 * 60 * 1000;

  const ICONS = {
    plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
    luggage: '<svg viewBox="0 0 24 24"><path d="M17 6h-2V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2 1 1 0 0 0 2 0h6a1 1 0 0 0 2 0 2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM9.5 18H8V9h1.5zm3.25 0h-1.5V9h1.5zm.75-12h-3V3.5h3zM16 18h-1.5V9H16z"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M14 6l-1-2H5v17h2v-7h5l1 2h7V6zm4 8h-4l-1-2H7V6h5l1 2h5z"/></svg>',
    ghost: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7v12l2.3-1.6L9.7 21l2.3-1.6 2.3 1.6 2.4-1.6L19 21V9a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="9.5" r="1.3" fill="#111"/><circle cx="14.5" cy="9.5" r="1.3" fill="#111"/></svg>',
  };

  let events = null; // last good data
  let lastOk = 0;
  let fetchedFor = ''; // local date the data was fetched for

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfDay = (d, plus = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + plus);
  const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  async function update() {
    const today = startOfDay(new Date());
    try {
      const data = await cfg.api('calendar', {
        from: today.toISOString(),
        to: startOfDay(today, 2).toISOString(),
      });
      events = data.events;
      lastOk = Date.now();
      fetchedFor = ymd(today);
    } catch (e) {
      console.warn('[dash] calendar update failed:', e.message);
    }
    render();
  }

  // Split into today and tomorrow. All-day events show under today if they span it,
  // under tomorrow only if they start tomorrow (so a multi-day trip isn't listed twice).
  // Timed events go under the day they start (ongoing ones under today) and drop off
  // once they end.
  function sections(now) {
    const today = ymd(now);
    const tomorrow = ymd(startOfDay(now, 1));
    const days = { [today]: [], [tomorrow]: [] };
    for (const ev of events) {
      if (ev.allDay) {
        if (ev.start <= today && today < ev.end) days[today].push(ev);
        else if (ev.start === tomorrow) days[tomorrow].push(ev);
        continue;
      }
      const startD = new Date(ev.start);
      const endD = new Date(ev.end);
      if (endD <= now) continue;
      const key = ymd(startD) < today ? today : ymd(startD);
      if (days[key]) days[key].push({ ...ev, startD, endD, ongoing: startD <= now });
    }
    const order = (a, b) => (b.allDay - a.allDay) || ((a.startD || 0) - (b.startD || 0)) || a.title.localeCompare(b.title);
    return { today: days[today].sort(order), tomorrow: days[tomorrow].sort(order), tomorrowKey: tomorrow };
  }

  function row(ev) {
    const time = ev.allDay
      ? '<div class="cal-time"><b>All day</b></div>'
      : `<div class="cal-time"><b>${fmtTime(ev.startD)}</b><span>${fmtTime(ev.endD)}</span></div>`;
    const icon = ICONS[ev.icon] || '';
    return `<div class="cal-row${ev.ongoing ? ' ongoing' : ''}" style="--c:${ev.color}">
        ${time}<div class="cal-icon">${icon}</div><div class="cal-title">${esc(ev.title)}</div>
      </div>`;
  }

  function render() {
    const now = new Date();
    const head = `<div class="cal-head"><span class="cal-date">${now.getDate()}</span>
      <span class="cal-day">Today</span>
      <span class="cal-weekday">${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>`;

    if (!cfg.hasKey) return void (el.innerHTML = head + '<div class="cal-empty">No key</div>');
    if (!events) return void (el.innerHTML = head + '<div class="cal-empty">Loading…</div>');

    const s = sections(now);
    let html = head + '<div class="cal-list">';
    html += s.today.length ? s.today.map(row).join('') : '<div class="cal-empty">Nothing else today</div>';
    if (s.tomorrow.length) {
      const d = new Date(s.tomorrowKey + 'T12:00:00');
      html += `<div class="cal-sep">Tomorrow · ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
      html += s.tomorrow.map(row).join('');
    }
    el.innerHTML = html + '</div>';
    el.classList.toggle('stale', Date.now() - lastOk > STALE_MS);
  }

  el.classList.add('cal');
  render();
  if (!cfg.hasKey) return;
  update();
  setInterval(update, 5 * 60 * 1000);
  // Re-render every minute so finished events drop off; refetch when the date changes.
  setInterval(() => (ymd(new Date()) !== fetchedFor ? update() : render()), 60 * 1000);
})();
