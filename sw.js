'use strict';

// Bump with each editor shell release. Old tabs finish using their original bundle.
const SHELL_VERSION = 'studioaccess3';
const scope = new URL(self.registration.scope);
const indexURL = new URL('index.html', scope).href;
const cachePrefix = 'form-studio-shell:' + scope.href + ':';
const cacheName = cachePrefix + SHELL_VERSION;
const lazyAsset = new URL('vendor/html2canvas.min.js', scope).href;
let preparing = null;

function editorAsset(url) {
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return false;
  const path = url.pathname.slice(scope.pathname.length);
  return /^[a-z0-9-]+\.(?:js|css)$/i.test(path) && path !== 'sw.js' || path === 'vendor/html2canvas.min.js';
}
function shellAssets(html) {
  // The published index is static. Preserve query strings so scripts and styles use
  // the same release as the document. The color sampler is the only lazy dependency.
  const urls = new Set([lazyAsset,new URL('Form-Studio-Handbook.pdf',scope).href,new URL('settings.html',scope).href,new URL('website-settings.js?v=studioaccess2',scope).href]);
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const script = /^<script\b/i.test(tag);
    if (!script && !/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const match = (script ? /\bsrc\s*=\s*["']([^"']+)["']/i : /\bhref\s*=\s*["']([^"']+)["']/i).exec(tag);
    if (!match) continue;
    const url = new URL(match[1], indexURL);
    if (!editorAsset(url)) throw Error('An editor dependency is outside its public shell.');
    urls.add(url.href);
  }
  for (const name of ['studio.js', 'studio.css', 'offline.js']) {
    const path = new URL(name, scope).pathname;
    if (!Array.from(urls).some(href => new URL(href).pathname === path)) throw Error('Incomplete editor document.');
  }
  return Array.from(urls);
}
async function shellComplete(cache) {
  const index = await cache.match(indexURL);
  if (!index) return false;
  const saved = new Set((await cache.keys()).map(request => request.url));
  return shellAssets(await index.text()).every(href => saved.has(href));
}
async function publicFile(url) {
  const res = await fetch(new Request(url, {cache:'reload', credentials:'omit', redirect:'error'}));
  const mime = res.headers.get('content-type') || '';
  if (!res.ok || res.type === 'opaque' || (new URL(url).pathname.endsWith('.html') ? !/text\/html/i.test(mime) : /text\/html/i.test(mime))) throw Error('An editor file could not be downloaded.');
  return res;
}
async function cacheShell() {
  const cache = await caches.open(cacheName);
  if (await shellComplete(cache)) return;
  const index = await publicFile(indexURL);
  const urls = shellAssets(await index.clone().text());
  const responses = await Promise.all(urls.map(publicFile));
  // Commit the index last. An interrupted or partial download never marks a new
  // version ready, and never removes an earlier working version.
  await Promise.all(urls.map((href, i) => cache.put(href, responses[i])));
  await cache.put(indexURL, index);
}
function prepareShell() {
  if (!preparing) preparing = cacheShell().finally(() => { preparing = null; });
  return preparing;
}
self.addEventListener('install', event => { event.waitUntil(prepareShell().then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'form-studio:offline-status' || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      if (event.data.repair) await prepareShell();
      port.postMessage({ready:await shellComplete(await caches.open(cacheName))});
    } catch { port.postMessage({ready:false}); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  const landing = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(indexURL).pathname);
  const accountPage=request.mode==='navigate' && url.pathname===new URL('account.html',scope).pathname;
  if(request.mode==='navigate' && url.pathname===new URL('settings.html',scope).pathname){
    event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(cacheName);return await cache.match(new URL('settings.html',scope).href)||Response.error()}));return;
  }
  if (accountPage || landing){event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(cacheName);return await cache.match(indexURL)||Response.error()}));return}
  if (!editorAsset(url) && url.href!==new URL('Form-Studio-Handbook.pdf',scope).href) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(landing ? indexURL : request)) || fetch(request);
  })());
});
