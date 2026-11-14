'use strict';

(() => {
  const label = document.getElementById('offlineStatus');
  const root = new URL('./', document.currentScript.src);
  const supported = window.isSecureContext && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);
  let ready = false, preparing = false, registration, activeCheck = 0;
  const watched = new WeakSet(), tracked = new WeakSet();

  function display(state) {
    const offline = !navigator.onLine;
    const text = ready ? (offline ? 'Offline · editor ready' : 'Ready offline')
      : state === 'working' ? 'Preparing offline…' : 'Offline editor not ready';
    const detail = ready ? 'You can close and reopen this editor in this browser without internet.'
      : !supported ? 'Offline reopening needs a browser that supports service workers on HTTPS.'
      : state === 'working' ? 'Keep this page open while this browser saves the editor files.'
      : 'Reconnect and reopen Form Studio to finish saving the editor files.';
    if (label) { label.textContent = text; label.title = detail; label.dataset.state = ready ? 'ready' : state; }
    const retry = document.querySelector('[data-offline-retry]');
    if (retry) retry.hidden = ready || !supported || offline || state !== 'unavailable';
  }
  function verify(worker, repair) {
    if (!worker) return;
    const current = ++activeCheck, channel = new MessageChannel();
    function finish(ok) {
      clearTimeout(timer); channel.port1.close();
      if (current !== activeCheck || worker !== registration?.active) return;
      ready = ok; display(ok ? 'ready' : 'unavailable');
    }
    const timer = setTimeout(() => finish(false), 30000);
    channel.port1.onmessage = event => finish(event.data?.ready === true);
    try { worker.postMessage({type:'form-studio:offline-status', repair}, [channel.port2]); }
    catch { finish(false); }
  }
  function observe(reg) {
    if (!reg || reg.scope !== root.href) return;
    registration = reg;
    function follow(worker) {
      if (!worker || tracked.has(worker)) return;
      tracked.add(worker);
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') verify(reg.active, navigator.onLine);
        if (worker.state === 'redundant' && !reg.active) { ready = false; display('unavailable'); }
      });
    }
    if (!watched.has(reg)) { watched.add(reg); reg.addEventListener('updatefound', () => follow(reg.installing)); }
    follow(reg.installing); follow(reg.waiting); follow(reg.active);
    if (reg.active?.state === 'activated') verify(reg.active, navigator.onLine);
  }
  async function prepare() {
    if (!supported) { display('unavailable'); return; }
    if (preparing) return;
    preparing = true;
    if (!ready) display(navigator.onLine ? 'working' : 'unavailable');
    try {
      const previous = await navigator.serviceWorker.getRegistration(root.href);
      observe(previous);
      if (previous?.scope !== root.href || navigator.onLine || !previous.active) {
        const reg = await navigator.serviceWorker.register(new URL('sw.js', root), {scope:root.href, updateViaCache:'none'});
        observe(reg);
        if (!reg.active && !reg.waiting && !reg.installing) display('unavailable');
      }
    } catch { if (!registration?.active) display('unavailable'); }
    finally { preparing = false; }
  }
  if (supported) navigator.serviceWorker.addEventListener('controllerchange', () => verify(registration?.active, navigator.onLine));
  window.addEventListener('online', prepare);
  window.addEventListener('offline', () => display(ready ? 'ready' : 'unavailable'));
  document.addEventListener('click', event => { if (event.target.closest?.('[data-offline-retry]')) prepare(); });
  prepare();
})();
