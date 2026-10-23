const VERSION='tesseract-go-v1.0.2';
const FILES=['./','./index.html','./style.css','./app.mjs','./engine.mjs','./board.mjs','./clock.mjs','./ai.mjs','./ai-worker.mjs','./storage.mjs','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tesseract-go-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='activate-update')self.skipWaiting();});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location.href).pathname))return;e.respondWith(caches.open(VERSION).then(async c=>{const cached=await c.match(e.request,{ignoreSearch:true});if(cached)return cached;try{return await fetch(e.request);}catch{if(e.request.mode==='navigate')return c.match('./index.html');return Response.error();}}));});
