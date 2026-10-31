// NovoDrift service worker: offline cache + automatic updates from files.json
const C='novodrift';
const NET_FIRST=/\.(html|json|webmanifest)$|\/$/;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html']).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim().then(()=>sync()))});
self.addEventListener('message',e=>{if(e.data==='check')e.waitUntil(sync())});
let busy=null;
function sync(){if(busy)return busy;busy=(async()=>{try{
 const c=await caches.open(C);const r=await fetch('files.json',{cache:'no-store'});if(!r.ok)return;const list=await r.json();
 const old=await c.match('__hashes').then(x=>x?x.json():{}).catch(()=>({}));const now={...old};let changed=false;
 for(const [f,h] of Object.entries(list.files)){
  if(old[f]===h&&await c.match(f))continue;
  try{const res=await fetch(f,{cache:'reload'});if(res.ok){await c.put(f,res);now[f]=h;if(old[f]&&old[f]!==h)changed=true}}catch(e){}
 }
 await c.put('__hashes',new Response(JSON.stringify(now)));
 if(changed){const cl=await self.clients.matchAll();cl.forEach(x=>x.postMessage('updated'))}
}finally{busy=null}})();return busy}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;
 if(req.mode==='navigate'||NET_FIRST.test(url.pathname)){
  e.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok&&req.mode==='navigate'){const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp))}return res}).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./index.html'))));return}
 e.respondWith(caches.match(req,{ignoreSearch:true}).then(r=>r||fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(req,cp))}return res})));
});
