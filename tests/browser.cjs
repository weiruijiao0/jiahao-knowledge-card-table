const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'test-results'),KEY='jiahao-knowledge-table:v1';fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.TEST_URL||'http://127.0.0.1:4173';const edgeCandidate='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';const EDGE=process.env.TEST_BROWSER_EXE||(fs.existsSync(edgeCandidate)?edgeCandidate:undefined);
const report={startedAt:new Date().toISOString(),browser:'Edge / Chromium; mobile emulation, not a real iPhone',checks:[],levels:[],modes:{},layoutIssues:[],pageErrors:[],externalRequests:[],pending:['真实iPhone Safari','真实微信内置浏览器','中国大陆普通网络与正式HTTPS网址','实际玩家3–5分钟关卡时长']};
function ok(name,details){report.checks.push({name,status:'passed',details});console.log('PASS',name);}
async function state(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
async function tap(page,key){await page.locator(`[data-choice-key="${key}"]`).tap({timeout:6000});}
async function ready(page){
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)||'{}').active?.phase!=='collect',KEY);
  const s=(await state(page))?.active;if(!s)return;
  assert.notEqual(s.phase,'study','Questions must not start with an answer preview');
  await page.waitForFunction(k=>['choose','feedback','complete'].includes(JSON.parse(localStorage.getItem(k)||'{}').active?.phase),KEY);
  if((await state(page)).active.phase==='choose'){assert.equal(await page.locator('.study-zone,.study-card,.answer-feedback').count(),0,'No preview or explanation before selecting a card');}
}
async function layout(page,label){const result=await page.evaluate(()=>{
  const issues=[];if(document.documentElement.scrollWidth>innerWidth+1)issues.push({kind:'horizontal-scroll',value:document.documentElement.scrollWidth,width:innerWidth});
  for(const e of document.querySelectorAll('.answer-card .option-label')){const box=e.getBoundingClientRect(),card=e.closest('.card-front').getBoundingClientRect();if(box.bottom>card.bottom-4||box.top<card.top+2||box.left<card.left-1||box.right>card.right+1)issues.push({kind:'card-text-overflow',text:e.textContent,box:{top:box.top,bottom:box.bottom},card:{top:card.top,bottom:card.bottom}});if(parseFloat(getComputedStyle(e).fontSize)<16)issues.push({kind:'small-card-text',text:e.textContent});}
  return {issues,height:document.documentElement.scrollHeight,width:innerWidth,viewport:innerHeight};});
  if(result.issues.length)report.layoutIssues.push({label,...result});return result;
}
async function solve(page,wrongFirst=false){await ready(page);let data=await state(page);const s=data.active;if(s.phase==='complete')return;const t=s.tasks[s.index];report.modes[t.kind]=(report.modes[t.kind]||0)+1;await layout(page,`L${s.levelId}-Q${s.index+1}-${t.kind}`);
  if(t.kind==='matching'){
    const open=t.options.find(o=>o.key===s.openKeys[0]);
    const ids=[...t.pointIds].sort((a,b)=>(a===open?.pointId?-1:0)-(b===open?.pointId?-1:0));
    for(const id of ids){const pair=t.options.filter(o=>o.pointId===id);const current=(await state(page)).active;if(current.matchedKeys.includes(pair[0].key))continue;
      for(const item of pair){const st=(await state(page)).active;if(st.openKeys.includes(item.key))continue;await tap(page,item.key);}
    }
  }else if(t.kind==='keywords'){
    const keys=t.ordered?t.sequence:t.options.filter(o=>o.correct).map(o=>o.key);for(const key of keys){if(!(await state(page)).active.chosenKeys.includes(key))await tap(page,key);}
  }else{const answer=t.options.find(o=>wrongFirst?!o.correct:o.correct);await tap(page,answer.key);}
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.phase==='feedback',KEY);await layout(page,`L${s.levelId}-Q${s.index+1}-feedback`);
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:EDGE});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await context.addInitScript(()=>{const Base=window.AudioContext||window.webkitAudioContext;if(!Base)return;window.__qaAudio={gains:[],sources:[]};window.AudioContext=class extends Base{createGain(){const gain=super.createGain();window.__qaAudio.gains.push(gain);return gain;}createBufferSource(){const source=super.createBufferSource();window.__qaAudio.sources.push(source);return source;}};});
    const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))report.externalRequests.push(r.url());});
    await page.goto(BASE);await page.locator('.home-companion').waitFor();await page.screenshot({path:path.join(OUT,'01-home-390.png'),fullPage:true});ok('首页、角色与本地资源加载');
    await page.getByTestId('start').tap();
    await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.phase==='choose',KEY);await page.screenshot({path:path.join(OUT,'02-cards-390.png'),fullPage:true});ok('真实触摸发牌与翻牌动画',await layout(page,'first-deal'));
    assert.equal(await page.locator('.study-zone,.study-card,.answer-feedback').count(),0);assert.equal((await state(page)).records.K001.attempts,0);ok('首次进入直接出题，选牌前没有答案预览或解析');
    await solve(page,true);let saved=await state(page);assert.equal(saved.records.K001.latestCorrect,false);assert.equal(saved.active.tasks.length,10);assert.equal(saved.active.phase,'feedback');ok('答错可继续、进入复习并加入换角度回练');
    const before=saved.active;await page.reload();saved=await state(page);assert.equal(saved.active.index,before.index);assert.equal(saved.active.phase,'feedback');assert.equal(saved.records.K001.firstCorrect,false);ok('反馈页刷新恢复且保留首次结果');
    await page.getByRole('button',{name:'设置',exact:true}).tap();await page.getByRole('switch',{name:'轻轻的游戏音效'}).tap();await page.getByRole('switch',{name:'小屋背景音乐'}).tap();await page.waitForFunction(()=>window.__qaAudio?.gains.length===2&&window.__qaAudio.gains[0].gain.value===0&&window.__qaAudio.gains[1].gain.value>0);ok('音效关闭与背景音乐独立控制');
    await page.getByRole('switch',{name:'小屋背景音乐'}).tap();await page.getByRole('switch',{name:'动画轻一点'}).tap();await page.waitForFunction(()=>window.__qaAudio.gains.every(g=>g.gain.value===0));await page.screenshot({path:path.join(OUT,'03-settings.png'),fullPage:true});ok('静音后实际音频增益归零');
    await page.getByRole('button',{name:'关闭弹窗'}).tap();await page.getByTestId('next').tap();
    let checkedMatching=false,checkedKeywords=false;
    for(let level=1;level<=30;level++){
      if(level>1){await page.getByRole('button',{name:'再玩下一关'}).tap();}
      let guard=0;
      while((await state(page)).active.phase!=='complete'){
        if(++guard>14)throw new Error(`Level ${level} did not finish`);
        await ready(page);const snap=(await state(page)).active;const task=snap.tasks[snap.index];
        if(task.kind==='matching'&&!checkedMatching){const a=task.options.find(o=>o.side==='term');const b=task.options.find(o=>o.side==='meaning'&&o.pointId!==a.pointId);await tap(page,a.key);await tap(page,b.key);await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.openKeys.length===0,KEY);assert.ok((await state(page)).active.wrongPointIds.includes(a.pointId));assert.equal(await page.locator('.answer-card.bad').count(),0);ok('配对错牌温柔回收、保留待复习记录、可继续');const first=task.options[0];await tap(page,first.key);const snapshot=(await state(page)).active;await page.reload();assert.deepEqual((await state(page)).active.openKeys,snapshot.openKeys);checkedMatching=true;ok('记忆配对翻开的牌刷新恢复');await page.screenshot({path:path.join(OUT,'04-memory-pairs.png'),fullPage:true});}
        if(task.kind==='keywords'&&!checkedKeywords){const wrong=task.options.find(o=>!o.correct);await tap(page,wrong.key);assert.equal((await state(page)).active.chosenKeys.length,0);assert.ok((await state(page)).active.wrongPointIds.length>0);ok('关键词错误卡不混入答案且允许继续组牌');const key=task.ordered?task.sequence[0]:task.options.find(o=>o.correct).key;await tap(page,key);const snapshot=(await state(page)).active;await page.reload();assert.deepEqual((await state(page)).active.chosenKeys,snapshot.chosenKeys);checkedKeywords=true;ok('关键词组合的部分进度刷新恢复');await page.screenshot({path:path.join(OUT,'05-keywords.png'),fullPage:true});}
        await solve(page);if(task.kind==='scenario'&&level===21)await page.screenshot({path:path.join(OUT,'06-classroom-scene.png'),fullPage:true});await page.getByTestId('next').tap();
        await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active.phase!=='collect',KEY);
      }
      const ended=await state(page);assert.ok(ended.completedLevels.includes(level));report.levels.push({id:level,tasks:ended.active.tasks.length,results:ended.active.results.length,status:'completed'});
      if(level%5===0)console.log('LEVELS COMPLETED',level);
    }
    saved=await state(page);assert.equal(saved.completedLevels.length,30);assert.equal(Object.keys(saved.records).length,200);assert.ok(Object.values(saved.records).every(r=>r.attempts>0));assert.equal(Object.values(saved.records).filter(r=>r.status==='mastered').length,0);await page.screenshot({path:path.join(OUT,'07-final-celebration.png'),fullPage:true});ok('30关真实浏览器通玩、200知识点都有练习记录、最终奖励触发',{stars:saved.stars,records:200});
    await page.getByRole('button',{name:'再玩一局，和知识重逢'}).tap();assert.equal((await state(page)).active.levelId,0);await solve(page);ok('独立再玩一局入口可用');
    await page.getByRole('button',{name:'回到加号的牌桌'}).tap();await page.getByRole('button',{name:'知识图鉴',exact:true}).tap();await page.getByRole('textbox',{name:'搜索知识图鉴'}).fill('难经');assert.equal(await page.locator('.point-list>button').count(),1);await page.locator('.point-list>button').tap();await page.getByText('查看保留的资料原文').tap();assert.ok((await page.locator('.original-text').textContent()).includes('战国时期扁鹊所著'));assert.ok((await page.locator('.detail-card').textContent()).includes('托名'));ok('图鉴搜索、原文与校订分开保留');await page.getByRole('button',{name:'关闭弹窗'}).tap();
    await page.getByRole('button',{name:'设置',exact:true}).tap();const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'导出学习记录'}).tap();const download=await downloadEvent;const exportPath=path.join(OUT,'qa-export.json');await download.saveAs(exportPath);const exported=JSON.parse(fs.readFileSync(exportPath,'utf8'));assert.equal(exported.completedLevels.length,30);await page.locator('input[type=file]').setInputFiles(exportPath);await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).active===null,KEY);assert.equal((await state(page)).completedLevels.length,30);ok('存档导出及导入完整恢复');await page.getByRole('button',{name:'关闭弹窗'}).tap();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.getByTestId('start').waitFor();await page.getByTestId('start').tap();await ready(page);ok('首次缓存完成后离线刷新与进入游戏');await context.setOffline(false);
    await page.getByRole('button',{name:'回到加号的牌桌'}).tap();
    for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){
      await page.setViewportSize({width,height});await page.screenshot({path:path.join(OUT,`08-home-${width}x${height}.png`),fullPage:true});await layout(page,`home-${width}x${height}`);await page.getByTestId('start').tap();await ready(page);await layout(page,`play-${width}x${height}`);await page.screenshot({path:path.join(OUT,`09-play-${width}x${height}.png`),fullPage:true});await page.getByRole('button',{name:'回到加号的牌桌'}).tap();
    }
    ok('320/375/390/430宽度响应式检查');await context.close();
    const wechat=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.50'});const wp=await wechat.newPage();await wp.goto(BASE);await wp.getByTestId('start').tap();await ready(wp);await solve(wp);assert.equal((await state(wp)).active.phase,'feedback');ok('微信UA环境下的触摸核心流程（非真实微信）');await wechat.close();
    assert.equal(report.pageErrors.length,0,'Browser uncaught exceptions');assert.equal(report.externalRequests.length,0,'Unexpected external runtime dependencies');assert.equal(report.layoutIssues.length,0,JSON.stringify(report.layoutIssues.slice(0,5)));ok('无浏览器异常、无外部运行时请求、无卡牌文字溢出');
    report.status='passed';
  }catch(error){report.status='failed';report.error=error.stack;console.error(error);process.exitCode=1;}
  finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();console.log('REPORT',report.status,`${report.levels.length}/30 levels`,`${report.layoutIssues.length} layout issues`);}
})().catch(e=>{console.error(e);process.exitCode=1;});
