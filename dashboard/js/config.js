// Dashboard settings. Everything here ends up in the public hosting repo — no secrets.
window.DASH = {
  windyUrl:
    'https://embed.windy.com/embed2.html?lat=40.173&lon=-50.871&zoom=2&level=surface&overlay=rain' +
    '&menu=&message=&marker=&calendar=now&pressure=true&type=map&location=coordinates&detail=' +
    '&detailLat=33.763&detailLon=-145.138&metricWind=default&metricTemp=default&radarRange=-1',

  // City cards. id matches the element id "city-<id>" in index.html; tz drives the clock.
  cities: [
    { id: 'longbeach', name: 'Long Beach', lat: 33.7701, lon: -118.1937, tz: 'America/Los_Angeles', size: 'lg' },
    { id: 'denver',    name: 'Denver',     lat: 39.7392, lon: -104.9903, tz: 'America/Denver',      size: 'lg' },
    { id: 'panama',    name: 'Panama',     lat: 8.9824,  lon: -79.5199,  tz: 'America/Panama',      size: 'sm' },
    { id: 'wisconsin', name: 'Wisconsin',  lat: 44.3580, lon: -89.0859,  tz: 'America/Chicago',     size: 'sm' }, // Waupaca
    { id: 'dc',        name: 'DC',         lat: 38.9072, lon: -77.0369,  tz: 'America/New_York',    size: 'sm' },
    { id: 'ajijic',    name: 'Ajijic',     lat: 20.2986, lon: -103.2622, tz: 'America/Mexico_City', size: 'sm' },
  ],
  // Air quality location.
  aqi: { name: 'Long Beach', lat: 33.7701, lon: -118.1937 },

  // Apps Script web app (apps-script/). Public URL; every call also needs the key,
  // which comes only from the kiosk URL fragment: .../dashboard/#k=<key>
  backendUrl: 'https://script.google.com/macros/s/AKfycbzz2Zax2pPveW6B3jiyUlw5v_NGBmgf8Je903GoGxFV-1-uE3v7-v0tshdqFwudhYLwOw/exec',

  // Airport cards: id matches "airport-<code>" in index.html. FAA status only (US airports).
  airports: [
    { code: 'LAX', name: 'Los Angeles' },
    { code: 'DEN', name: 'Denver International' },
    { code: 'LGB', name: 'Long Beach' },
    { code: 'SNA', name: 'John Wayne · Orange County' },
  ],
  airportRefreshMinutes: 5,

  // Photo card: seconds per photo (album links are set in the backend).
  photoSeconds: 30,

  weatherRefreshMinutes: 15,
  aqiRefreshMinutes: 30,

  // Reload the page when version.json changes (checked this often)...
  versionCheckMinutes: 5,
  // ...and once a night regardless, at this local time (24h).
  nightlyReload: { hour: 3, minute: 30 },
};
