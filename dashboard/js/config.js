// Dashboard settings. Everything here ends up in the public hosting repo — no secrets.
window.DASH = {
  windyUrl:
    'https://embed.windy.com/embed2.html?lat=40.173&lon=-50.871&zoom=2&level=surface&overlay=rain' +
    '&menu=&message=&marker=&calendar=now&pressure=true&type=map&location=coordinates&detail=' +
    '&detailLat=33.763&detailLon=-145.138&metricWind=default&metricTemp=default&radarRange=-1',

  // Reload the page when version.json changes (checked this often)...
  versionCheckMinutes: 5,
  // ...and once a night regardless, at this local time (24h).
  nightlyReload: { hour: 3, minute: 30 },
};
