// Calls to the Apps Script backend. The key is read from the URL fragment (#k=...),
// which browsers never send to the web host, so it stays out of the public repo and logs.
(function () {
  const key = new URLSearchParams(location.hash.slice(1)).get('k');
  const TIMEOUT_MS = 40 * 1000; // Apps Script cold starts can take ~30 s

  window.DASH.hasKey = !!key;

  // api('airports', { codes: 'LAX,DEN' }) -> data, or throws
  window.DASH.api = async function (route, params = {}) {
    if (!key) throw new Error('no key in URL (#k=...)');
    const q = new URLSearchParams({ k: key, r: route, ...params });
    const res = await fetch(window.DASH.backendUrl + '?' + q, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      // Apps Script sometimes answers with an HTML error page (HTTP 200).
      throw new Error('backend returned a non-JSON page');
    }
    if (!body.ok) {
      // A wrong key won't fix itself by retrying; let the cards say so.
      if (body.error === 'unauthorized') window.DASH.badKey = true;
      throw new Error(body.error || 'backend error');
    }
    return body.data;
  };

  // Poll `fn` every `minutes`; while it has never succeeded, retry every 30 s instead,
  // so one failed first load doesn't leave a card empty for the full interval.
  window.DASH.poll = function (fn, minutes) {
    const everyMs = Math.max(Number(minutes) * 60 * 1000 || 0, 10 * 1000); // never spin
    let everOk = false;
    let timer = null;
    async function run() {
      clearTimeout(timer);
      const ok = await fn();
      everOk = everOk || ok;
      timer = setTimeout(run, everOk ? everyMs : 30 * 1000);
    }
    run();
  };
})();
