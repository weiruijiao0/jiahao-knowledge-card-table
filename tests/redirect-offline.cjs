const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const report={startedAt:new Date().toISOString(),checks:[],status:'running'};
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain;charset=utf-8'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/index.html'){res.writeHead(302,{Location:'/'});res.end();return;}
  const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
try{for(const engine of ['chromium','webkit']){const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.TEST_BROWSER_EXE||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'}:{})});
try{const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto(url);await page.getByTestId('start').waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const redirected=await page.evaluate(async()=>{const names=await caches.keys();for(const name of names){const c=await caches.open(name);const r=await c.match(new URL('./index.html',location.href),{ignoreVary:true});if(r)return r.redirected;}return false;});assert.equal(redirected,true,'The regression setup must cache a redirected homepage.');
  await context.setOffline(true);await page.reload();await page.getByTestId('start').waitFor();await page.getByTestId('start').tap();await page.locator('.play-table').waitFor();report.checks.push({engine,name:'Redirected homepage cache can restore game offline',status:'passed'});console.log('REDIRECT OFFLINE PASS',engine);
}finally{await browser.close();}}
report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;console.error(error);process.exitCode=1;}
finally{server.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'test-results/redirect-offline-report.json'),JSON.stringify(report,null,2));}})();
