const {webkit}=require('playwright');const path=require('node:path');const fs=require('node:fs');const assert=require('node:assert/strict');
const OUT=path.resolve(__dirname,'../test-results'),KEY='jiahao-knowledge-table:v1',BASE=process.env.TEST_URL||'http://127.0.0.1:4173';
const report={engine:'Playwright WebKit on Windows; Safari engine emulation, not a real iPhone',startedAt:new Date().toISOString(),checks:[],modes:[],errors:[],status:'running'};
const state=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function ready(p){await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.phase!=='collect',KEY);const s=(await state(p)).active;assert.notEqual(s.phase,'study');await p.waitForFunction(k=>['choose','feedback','complete'].includes(JSON.parse(localStorage.getItem(k)).active.phase),KEY);assert.equal(await p.locator('.study-zone,.study-card').count(),0);}
async function solve(p){await ready(p);const s=(await state(p)).active,t=s.tasks[s.index];report.modes.push(t.kind);const tap=key=>p.locator(`[data-choice-key="${key}"]`).tap();
  if(t.kind==='matching'){for(const id of t.pointIds){const pair=t.options.filter(o=>o.pointId===id);await tap(pair[0].key);await tap(pair[1].key);}}
  else if(t.kind==='keywords'){for(const key of t.ordered?t.sequence:t.options.filter(o=>o.correct).map(o=>o.key))await tap(key);}
  else await tap(t.options.find(o=>o.correct).key);
  await p.getByTestId('next').waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.getByTestId('next').tap();await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.phase!=='collect',KEY);
}
(async()=>{let browser;try{browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(BASE);await p.getByTestId('start').waitFor();await p.screenshot({path:path.join(OUT,'webkit-home.png'),fullPage:true});
  await p.getByRole('button',{name:'设置',exact:true}).tap();await p.getByRole('switch',{name:'动画轻一点'}).tap();await p.getByRole('button',{name:'关闭弹窗'}).tap();
  for(const level of [1,6,9,21,25,30]){await p.getByRole('button',{name:'回到加号的牌桌'}).tap();await p.getByRole('button',{name:'30关旅程',exact:true}).tap();await p.locator(`[data-level="${level}"]`).tap();let guard=0;
    while((await state(p)).active.phase!=='complete'){if(++guard>12)throw new Error('WebKit level stalled');await solve(p);}
    assert.ok((await state(p)).completedLevels.includes(level));report.checks.push({level,status:'completed'});console.log('WEBKIT LEVEL',level);
  }
  await p.screenshot({path:path.join(OUT,'webkit-final.png'),fullPage:true});const snapshot=await state(p);await p.reload();assert.deepEqual((await state(p)).completedLevels,snapshot.completedLevels);report.checks.push({name:'reload persistence',status:'passed'});
  await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await p.reload();await p.getByTestId('completion').waitFor();assert.equal((await state(p)).active.levelId,30);await context.setOffline(false);report.checks.push({name:'offline reload',status:'passed'});
  assert.equal(new Set(report.modes).size,5);assert.equal(report.errors.length,0);report.status='passed';console.log('WEBKIT passed all five modes, reload and offline cache');
}catch(e){report.status='failed';report.error=e.stack;console.error(e);process.exitCode=1;}finally{report.modes=[...new Set(report.modes)];report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'webkit-report.json'),JSON.stringify(report,null,2));await browser?.close();}})();
