// Calls to the Apps Script backend. The key is read from the URL fragment (#k=...),
// which browsers never send to the web host, so it stays out of the public repo and logs.
(function () {
  const key = new URLSearchParams(location.hash.slice(1)).get('k');

  window.DASH.hasKey = !!key;

  // api('airports', { codes: 'LAX,DEN' }) -> data, or throws
  window.DASH.api = async function (route, params = {}) {
    if (!key) throw new Error('no key in URL (#k=...)');
    const q = new URLSearchParams({ k: key, r: route, ...params });
    const res = await fetch(window.DASH.backendUrl + '?' + q);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || 'backend error');
    return body.data;
  };
})();
