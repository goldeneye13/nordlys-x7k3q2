// City cards (clock, current weather, 3-day forecast) and the air quality card. Data: Open-Meteo forecast and air-quality APIs (free, no key).
(function () {
  const cfg = window.DASH;
  const STALE_MS = 60 * 60 * 1000; // dim a card whose data is over an hour old

  // --- WMO weather code -> Meteocons icon -------------------------------------
  function iconName(code, isDay = true) {
    const dn = isDay ? 'day' : 'night';
    if (code === 0) return `clear-${dn}`;
    if (code === 1 || code === 2) return `partly-cloudy-${dn}`;
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet';
    if (code >= 61 && code <= 65) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return `partly-cloudy-${dn}-rain`;
    if (code === 85 || code === 86) return `partly-cloudy-${dn}-snow`;
    if (code === 95) return `thunderstorms-${dn}-rain`;
    if (code === 96 || code === 99) return 'hail';
    return 'not-available';
  }
  const icon = (name, cls = 'icon') => `<img class="${cls}" src="icons/${name}.svg" alt="">`;
  const deg = (v) => (v == null ? '--' : Math.round(v) + '°');

  // --- Card skeletons (built once; data and clocks fill them in) -------------
  function buildCity(c) {
    const el = document.getElementById('city-' + c.id);
    const now = `
      <div class="now">
        <div class="clock" data-tz="${c.tz}"><span class="hm">--:--</span><span class="ampm"></span></div>
        <div class="temp">--</div>
        ${icon('not-available', 'icon wx')}
      </div>`;
    if (c.size === 'lg') {
      el.innerHTML = `<div class="name">${c.name}</div>${now}
        <div class="forecast">${[0, 1, 2].map(() => `
          <div class="day">
            <div class="dname">--</div>
            ${icon('not-available', 'icon dicon')}
            <div class="pop">${icon('raindrop', 'icon mini')}<span>--</span></div>
            <div class="hilo"><span class="hi">--</span><span class="lo">--</span></div>
          </div>`).join('')}
        </div>`;
    } else {
      el.innerHTML = `<div class="name">${c.name}</div>${now}`;
    }
    el.classList.add('city');
  }

  function buildAqi() {
    document.getElementById('aqi').innerHTML = `
      <div class="aqi-value">--</div>
      <div class="aqi-text">
        <div class="aqi-cat">Air quality</div>
        <div class="aqi-sub">${cfg.aqi.name} · US AQI</div>
      </div>`;
  }

  // --- Clocks ----------------------------------------------------------------
  const clockFmt = {};
  function tickClocks() {
    const now = new Date();
    document.querySelectorAll('.clock').forEach((el) => {
      const tz = el.dataset.tz;
      clockFmt[tz] ??= new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
      const parts = clockFmt[tz].formatToParts(now);
      const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
      el.querySelector('.hm').textContent = `${get('hour')}:${get('minute')}`;
      el.querySelector('.ampm').textContent = get('dayPeriod');
    });
  }

  // --- Weather ---------------------------------------------------------------
  function dayLabel(isoDate, i) {
    if (i === 0) return 'Today';
    return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }

  async function updateWeather() {
    const cs = cfg.cities;
    const q = new URLSearchParams({
      latitude: cs.map((c) => c.lat).join(','),
      longitude: cs.map((c) => c.lon).join(','),
      current: 'temperature_2m,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
      forecast_days: '3',
    });
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?' + q);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let data = await res.json();
      if (!Array.isArray(data)) data = [data];
      cs.forEach((c, i) => renderCity(c, data[i]));
      markFresh(cs.map((c) => 'city-' + c.id));
    } catch (e) {
      console.warn('[dash] weather update failed:', e.message);
    }
  }

  function renderCity(c, d) {
    const el = document.getElementById('city-' + c.id);
    const cur = d.current;
    el.querySelector('.temp').textContent = deg(cur.temperature_2m);
    el.querySelector('.wx').src = `icons/${iconName(cur.weather_code, cur.is_day === 1)}.svg`;
    if (c.size !== 'lg') return;
    el.querySelectorAll('.day').forEach((day, i) => {
      const dd = d.daily;
      day.querySelector('.dname').textContent = dayLabel(dd.time[i], i);
      day.querySelector('.dicon').src = `icons/${iconName(dd.weather_code[i])}.svg`;
      day.querySelector('.pop span').textContent = (dd.precipitation_probability_max[i] ?? 0) + '%';
      day.querySelector('.hi').textContent = Math.round(dd.temperature_2m_max[i]);
      day.querySelector('.lo').textContent = Math.round(dd.temperature_2m_min[i]);
    });
  }

  // --- Air quality -----------------------------------------------------------
  const AQI_BANDS = [
    [50, 'Good', '#00c853', '#fff'],
    [100, 'Moderate', '#ffd600', '#111'],
    [150, 'Unhealthy for sensitive groups', '#ff7e00', '#111'],
    [200, 'Unhealthy', '#e53935', '#fff'],
    [300, 'Very unhealthy', '#8f3f97', '#fff'],
    [Infinity, 'Hazardous', '#7e0023', '#fff'],
  ];

  async function updateAqi() {
    const q = new URLSearchParams({ latitude: cfg.aqi.lat, longitude: cfg.aqi.lon, current: 'us_aqi,pm2_5' });
    try {
      const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?' + q);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cur = (await res.json()).current;
      const aqi = Math.round(cur.us_aqi);
      const [, label, bg, fg] = AQI_BANDS.find(([max]) => aqi <= max);
      const el = document.getElementById('aqi');
      const v = el.querySelector('.aqi-value');
      v.textContent = aqi;
      v.style.background = bg;
      v.style.color = fg;
      el.querySelector('.aqi-cat').textContent = label;
      el.querySelector('.aqi-sub').textContent =
        `${cfg.aqi.name} · US AQI · PM2.5 ${cur.pm2_5.toFixed(1)} µg/m³`;
      markFresh(['aqi']);
    } catch (e) {
      console.warn('[dash] AQI update failed:', e.message);
    }
  }

  // --- Staleness: keep last good data, but dim it if it gets old --------------
  const lastOk = {};
  function markFresh(ids) {
    const t = Date.now();
    ids.forEach((id) => (lastOk[id] = t));
  }
  function checkStale() {
    const t = Date.now();
    Object.entries(lastOk).forEach(([id, ok]) =>
      document.getElementById(id).classList.toggle('stale', t - ok > STALE_MS));
  }

  // --- Start -----------------------------------------------------------------
  cfg.cities.forEach(buildCity);
  buildAqi();

  tickClocks();
  setInterval(tickClocks, 1000);

  updateWeather();
  setInterval(updateWeather, cfg.weatherRefreshMinutes * 60 * 1000);
  updateAqi();
  setInterval(updateAqi, cfg.aqiRefreshMinutes * 60 * 1000);
  setInterval(checkStale, 60 * 1000);
})();
