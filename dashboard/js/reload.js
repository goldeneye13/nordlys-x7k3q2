// Keep the kiosk current without touching the N150:
//  - reload when a newer version.json is deployed
//  - reload once a night regardless, to clear anything that went stale
(function () {
  const cfg = window.DASH;
  let loadedVersion = null;

  async function fetchVersion() {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('version.json ' + res.status);
    return (await res.json()).version;
  }

  async function checkVersion() {
    try {
      const v = await fetchVersion();
      if (loadedVersion === null) loadedVersion = v;
      else if (v !== loadedVersion) location.reload();
    } catch (e) {
      // Offline or file:// — try again next time.
      console.warn('[dash] version check failed:', e.message);
    }
  }

  function scheduleNightly() {
    const { hour, minute } = cfg.nightlyReload;
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    setTimeout(() => location.reload(), next - now);
  }

  checkVersion();
  setInterval(checkVersion, cfg.versionCheckMinutes * 60 * 1000);
  scheduleNightly();
})();
