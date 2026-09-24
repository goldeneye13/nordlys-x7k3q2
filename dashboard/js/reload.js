// Keep the kiosk current without touching the N150:
//  - reload when a newer version.json is deployed
//  - reload once a night regardless, to clear anything that went stale
//
// GitHub Pages lets browsers cache files for 10 minutes, so a plain reload can come back
// with a stale mix of old and new files. deploy.py stamps ?v=<version> onto every CSS/JS
// URL in index.html, and reloads here go to a new URL (?v=<version>) so index.html is
// fetched fresh too.
(function () {
  const cfg = window.DASH;
  // The version this page was built from (deploy.py's stamp), or null in local dev.
  const pageVersion = new URL(document.currentScript.src).searchParams.get('v');
  let seenVersion = null; // local dev: the first version.json we saw

  async function fetchVersion() {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('version.json ' + res.status);
    return (await res.json()).version;
  }

  function reloadFresh(version) {
    const url = new URL(location.href);
    url.searchParams.set('v', version || Date.now());
    location.replace(url.toString()); // keeps the #k=... fragment
  }

  async function checkVersion() {
    try {
      const v = await fetchVersion();
      const current = pageVersion || seenVersion;
      if (current === null) {
        seenVersion = v;
      } else if (v !== current) {
        // Already asked for this version but still got an older page? The CDN hasn't
        // caught up; wait for the next check instead of reloading in a loop.
        if (new URL(location.href).searchParams.get('v') === v) return;
        reloadFresh(v);
      }
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
    setTimeout(() => reloadFresh(), next - now);
  }

  checkVersion();
  setInterval(checkVersion, cfg.versionCheckMinutes * 60 * 1000);
  scheduleNightly();
})();
