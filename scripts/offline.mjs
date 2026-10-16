import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=new URL('../dist/',import.meta.url);
const dir=decodeURIComponent(root.pathname).replace(/^\/([A-Za-z]:)/,'$1');
const all=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())walk(q);else if(e.name!=='sw.js')all.push(path.relative(dir,q).replaceAll('\\','/'));}}
walk(dir);const digest=crypto.createHash('sha256').update('cache-v2|');for(const file of all)digest.update(file).update(fs.readFileSync(path.join(dir,file)));const stamp=digest.digest('hex').slice(0,12);
const script=`const PREFIX='jiahao-card-table:'+self.registration.scope+':';
const CACHE=PREFIX+'${stamp}';
const FILES=${JSON.stringify(['./',...all.filter(x=>!x.startsWith('source/')).map(x=>'./'+x)])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{if(!r.ok)throw new Error('offline');return r;}).catch(async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(new URL('./index.html',self.registration.scope),{ignoreVary:true});if(!hit)return new Response('请联网打开一次加号的牌桌。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});return new Response(await hit.arrayBuffer(),{status:hit.status,statusText:hit.statusText,headers:hit.headers});}));return;}
e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreVary:true})).then(hit=>hit||fetch(e.request)));
});\n`;
fs.writeFileSync(path.join(dir,'sw.js'),script);console.log('Offline cache manifest:',all.length,'files; scope isolated.');
