import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const port=Number(arg('--port')??4173),host=arg('--host')??'127.0.0.1';
const prefix='/'+(arg('--base')??'').replace(/^\/+|\/+$/g,'')+(arg('--base')?'/':'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav'};
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('dist/index.html not found. Run npm ci and npm run build first.');
const server=http.createServer((req,res)=>{
  let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(prefix!=='/'&&requested===prefix.slice(0,-1)){res.writeHead(301,{Location:prefix});res.end();return;}
  if(!requested.startsWith(prefix)){res.writeHead(404);res.end('Not found');return;}
  const name=requested.slice(prefix.length)||'index.html';const target=path.resolve(root,name);
  const relative=path.relative(root,target);if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':name==='index.html'||name==='sw.js'?'no-cache':'public, max-age=600'});res.end(data);
  });
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});server.listen(port,host,()=>console.log(`加号的知识牌桌：http://${host}:${port}${prefix}\n按 Ctrl+C 停止。本地预览不等于公开HTTPS部署。`));
