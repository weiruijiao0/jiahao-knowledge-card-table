import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { audio } from './audio';
import { byId, levels, points } from './content';
import { advance, blankRecord, createSession, finishTask, freshSave, priorityPoints, safeSave, STORAGE_KEY } from './engine';
import type { Mood, Point, SaveData, Session, Task } from './model';
import './style.css';

const moodIndex:Record<Mood,number>={idle:0,smile:1,wink:2,clap:3,correct:4,comfort:5,think:6,surprise:7,complete:8,sleepy:9};
const labels={choice:'翻牌选一张',truth:'真假双牌',matching:'记忆配对',keywords:'关键词组牌',scenario:'课堂情境牌'};
const statusLabel={new:'还没见面',learning:'初次熟悉',review:'再见一次',familiar:'渐渐熟悉',mastered:'稳定记住'};
const short=(s:string,n=88)=>s.length>n?s.slice(0,n)+'…':s;
let initialNotice='';
function load():SaveData {
  try{
    const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return freshSave();
    try{const primary=safeSave(JSON.parse(raw),points);if(primary)return primary;}catch{/* Try the independent previous-write backup. */}
    const backup=localStorage.getItem(STORAGE_KEY+':backup');
    if(backup){try{const recovered=safeSave(JSON.parse(backup),points);if(recovered){initialNotice='加号，已恢复上一次可用存档。';return recovered;}}catch{/* The original record remains available for manual export. */}}
    initialNotice='原存档暂时无法读取，可以导入之前的备份。';return freshSave();
  }catch{initialNotice='此浏览器暂时无法读取存档，建议导出记录留一份。';return freshSave();}
}
function Icon({name,size=22}:{name:string;size?:number}){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
  const paths:Record<string,React.ReactNode>={star:<path d="m12 2 3 6 6.5 1-4.7 4.6L18 20l-6-3.1L6 20l1.2-6.4L2.5 9 9 8Z"/>,plus:<><rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M8 12h8m-4-4v8"/></>,settings:<><path d="m9 3-1 3-3 1-1 3 2 2-1 3 2 3 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="11" r="3"/></>,home:<><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/></>,map:<><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/></>,repeat:<><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/></>,book:<><path d="M12 5C9 2 4 3 3 4v15c2-2 6-2 9 0 3-2 7-2 9 0V4c-2-1-6-2-9 1Zm0 0v14"/></>,arrow:<><path d="M4 12h16m-6-6 6 6-6 6"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,check:<path d="m5 12 4 4L19 6"/>,leaf:<><path d="M19 3C5 2 2 8 6 15c6 5 14 1 13-12ZM4 21 16 7"/></>,spark:<><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,sound:<><path d="M4 9h4l5-4v14l-5-4H4Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,moon:<path d="M20 15a9 9 0 0 1-11-11A9 9 0 1 0 20 15Z"/>,download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,heart:<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>,search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>};
  return <svg {...common}>{paths[name]??paths.spark}</svg>;
}
function Companion({mood='idle',className=''}:{mood?:Mood;className?:string}){const index=moodIndex[mood];return <div role="img" aria-label={`陪伴加号的角色：${({idle:'待机',smile:'微笑',wink:'眨眼',clap:'鼓掌',correct:'庆祝答对',comfort:'温柔安慰',think:'思考',surprise:'惊喜',complete:'通关庆祝',sleepy:'打哈欠'})[mood]}`} className={`companion mood-${mood} ${className}`} style={{backgroundPosition:`${index%5*25}% ${index>=5?100:0}%`}}/>;}
function App(){
  const [save,setSave]=useState<SaveData>(load);
  const [view,setView]=useState<'home'|'play'>(()=>save.active?'play':'home');
  const [modal,setModal]=useState<'levels'|'review'|'collection'|'settings'|'point'|null>(null);
  const [detail,setDetail]=useState<Point>(points[0]);const [search,setSearch]=useState('');const [notice,setNotice]=useState(initialNotice);
  const [offline,setOffline]=useState(false);const [homeMood,setHomeMood]=useState<Mood>('idle');
  const [storageOkay,setStorageOkay]=useState(!initialNotice.includes('无法'));
  const [shake,setShake]=useState('');const [hint,setHint]=useState(false);const modalRef=useRef<HTMLDivElement>(null);const inputRef=useRef<HTMLInputElement>(null);
  const s=save.active;const task=s?.tasks[s.index];
  const seen=points.filter(p=>save.records[p.id]?.seen).length;
  const mastered=points.filter(p=>save.records[p.id]?.status==='mastered').length;
  const wrong=points.filter(p=>save.records[p.id]?.latestCorrect===false);
  const due=points.filter(p=>save.records[p.id]?.nextReviewAt&&Date.parse(save.records[p.id].nextReviewAt!)<=Date.now());
  const nextLevel=levels.find(l=>!save.completedLevels.includes(l.id))??levels[29];
  function change(fn:(prev:SaveData)=>SaveData){setSave(prev=>{const next=fn(prev);try{const previous=localStorage.getItem(STORAGE_KEY);if(previous)localStorage.setItem(STORAGE_KEY+':backup',previous);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setStorageOkay(true);}catch{setStorageOkay(false);setNotice('加号，当前浏览器无法保存。请在设置里导出记录，留一份备份。');}return next;});}
  function patchSession(patch:Partial<Session>){change(prev=>prev.active?{...prev,active:{...prev.active,...patch}}:prev);}
  useEffect(()=>{audio.set(save.settings.sound,save.settings.music);},[save.settings.sound,save.settings.music]);
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(id);},[notice]);
  useEffect(()=>{let ticks=0;const id=setInterval(()=>{if(view==='home'&&!modal){ticks++;setHomeMood(ticks%5===0?'sleepy':ticks%3===0?'wink':'idle');}},12000);return()=>clearInterval(id);},[view,modal]);
  useEffect(()=>{const handler=()=>{if(document.hidden)audio.suspend();};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler);},[]);
  useEffect(()=>{
    if(!s||view!=='play')return;
    if(s.phase==='shuffle'){void audio.play('shuffle');const id=setTimeout(()=>patchSession({phase:'deal'}),save.settings.reducedMotion?0:170);return()=>clearTimeout(id);}
    if(s.phase==='deal'){void audio.play('deal');const id=setTimeout(()=>{patchSession({phase:'choose'});void audio.play('flip');},save.settings.reducedMotion?0:560);return()=>clearTimeout(id);}
    if(s.phase==='collect'){const id=setTimeout(()=>change(advance),save.settings.reducedMotion?0:190);return()=>clearTimeout(id);}
  },[s?.phase,s?.index,s?.id,view,save.settings.reducedMotion]);
  useEffect(()=>{
    if(!s||!task||view!=='play'||s.phase==='complete')return;
    const unseen=task.pointIds.filter(id=>!save.records[id]?.seen);
    if(unseen.length)markSeen(unseen);
  },[s?.id,s?.index,view,save.records]);
  useEffect(()=>{setHint(false);setShake('');},[s?.index,s?.id]);
  useEffect(()=>{
    if(!s||s.phase!=='complete')return;void audio.play('complete');
  },[s?.phase==='complete',s?.id]);
  useEffect(()=>{
    if(!s||s.phase!=='choose'||s.openKeys.length!==2||s.matchedKeys.includes(s.openKeys[0]))return;
    const id=setTimeout(()=>{patchSession({openKeys:[]});setShake('');},650);return()=>clearTimeout(id);
  },[s?.openKeys.join(','),s?.phase]);
  useEffect(()=>{if(!modal)return;const previous=document.activeElement as HTMLElement|null;modalRef.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setModal(null);return;}if(e.key==='Tab'){const items=Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button,input,[tabindex="0"],a[href]')??[]).filter(el=>!el.hasAttribute('disabled'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};},[modal]);
  useEffect(()=>{if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(()=>navigator.serviceWorker.ready).then(()=>setOffline(true)).catch(()=>{});}},[]);
  function markSeen(ids:string[]){change(prev=>{const records={...prev.records};for(const id of ids){const r=records[id]??blankRecord();if(!r.seen)records[id]={...r,seen:true,status:'learning'};}return {...prev,records};});}
  function start(levelId?:number){void audio.unlock();change(prev=>({...prev,active:createSession(levelId?levels[levelId-1]:undefined,points,prev)}));setView('play');setModal(null);}
  function finish(correct:boolean,selected:string|null=null){change(prev=>finishTask(prev,correct,points,selected));void audio.play(correct?(s&&s.streak>=2?'streak':'correct'):'wrong');}
  function pick(key:string){
    if(!s||!task||s.phase!=='choose')return;void audio.play('select');
    const option=task.options.find(o=>o.key===key)!;
    if(task.kind==='matching'){
      if(s.matchedKeys.includes(key)||s.openKeys.includes(key))return;
      const previous=s.openKeys.length===1?task.options.find(o=>o.key===s.openKeys[0]):null;
      if(!previous){patchSession({openKeys:[key]});void audio.play('flip');return;}
      if(previous.pointId===option.pointId&&previous.side!==option.side){
        const matched=[...s.matchedKeys,previous.key,key];
        patchSession({openKeys:[],matchedKeys:matched});void audio.play('correct');
        if(matched.length===task.options.length)finish(s.wrongPointIds.length===0);
      }else{patchSession({openKeys:[previous.key,key],wrongPointIds:[...new Set([...s.wrongPointIds,previous.pointId!,option.pointId!])]});setShake(key);void audio.play('wrong');}
    }else if(task.kind==='keywords'){
      if(s.chosenKeys.includes(key))return;
      const correct=option.correct&&(!task.ordered||task.sequence[s.chosenKeys.length]===key);
      if(!correct){patchSession({wrongPointIds:task.pointIds});setShake(key);setTimeout(()=>setShake(''),400);void audio.play('wrong');return;}
      const chosen=[...s.chosenKeys,key];patchSession({chosenKeys:chosen});
      if(chosen.length===task.options.filter(o=>o.correct).length)finish(s.wrongPointIds.length===0);
    }else finish(option.correct,key);
  }
  function showPoint(p:Point){setDetail(p);setModal('point');markSeen([p.id]);}
  function resume(){setView('play');setModal(null);}
  function download(){const blob=new Blob([JSON.stringify({...save,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`加号的知识牌桌-存档-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);setNotice('存档已导出。换设备时，可以在这里导入。');}
  async function importFile(file:File|undefined){if(!file)return;if(file.size>2000000){setNotice('这份文件太大了，请选择本游戏导出的JSON存档。');return;}try{const incoming=safeSave(JSON.parse(await file.text()),points,false);if(!incoming)throw new Error();change(()=>incoming);setView('home');setNotice('加号，你的学习记录已经回到牌桌上啦！');}catch{setNotice('没有识别出有效存档，当前学习记录已保留。');}if(inputRef.current)inputRef.current.value='';}
  const mood:Mood=s?.phase==='complete'?'complete':s?.phase==='feedback'?(s.lastCorrect?s.streak>=3?'surprise':s.streak===2?'clap':'correct':'comfort'):hint?'think':s?.phase==='choose'?'idle':'wink';
  const bubble=s?.phase==='feedback'?(s.lastCorrect?(s.streak>=3?`加号连对${s.streak}题啦！鼓掌鼓掌！`:'哇！加号这张牌出得漂亮！'):'没关系呀加号，这张牌有点狡猾。'):task?.kind==='matching'?'加号，把名字和意思牵牵手～':'加号别急，我陪你慢慢翻。';
  function renderCards(t:Task,session:Session){return <div className={`cards-grid kind-${t.kind} phase-${session.phase}`} aria-label={labels[t.kind]}>
    {t.options.map((o,i)=>{const feedback=session.phase==='feedback'||session.phase==='collect';const isMatch=t.kind==='matching';const matched=session.matchedKeys.includes(o.key);const turned=!isMatch||session.openKeys.includes(o.key)||matched||feedback;const chosen=session.chosenKeys.includes(o.key)||session.selected===o.key;const good=feedback&&o.correct&&!isMatch||matched;const bad=feedback&&session.selected===o.key&&!o.correct;return <button key={o.key} data-choice-key={o.key} className={`answer-card ${turned?'turned':''} ${chosen?'chosen':''} ${good?'good':''} ${bad||shake===o.key?'bad shake':''} ${matched?'matched':''}`} style={{'--i':i,'--tilt':`${i%2===0?-2:2}deg`} as React.CSSProperties} disabled={session.phase!=='choose'||matched||(t.kind==='keywords'&&chosen)} onClick={()=>pick(o.key)} aria-label={isMatch&&!turned?`翻开第${i+1}张配对牌`:o.label} aria-pressed={chosen||isMatch&&turned}>
      <span className="card-back"><Icon name="spark" size={30}/><span>加号的小幸运</span></span>
      <span className="card-front"><span className="card-index">{isMatch?'✦':t.kind==='truth'?(i===0?'✓':'↺'):String(i+1).padStart(2,'0')}</span><span className="option-label">{o.label}</span><span className="card-corner">{good?<Icon name="check" size={16}/>:t.kind==='keywords'&&chosen?session.chosenKeys.indexOf(o.key)+1:'✧'}</span></span>
    </button>;})}</div>;}
  return <div className={`app-shell ${save.settings.reducedMotion?'reduce-motion':''} view-${view}`} onPointerDown={()=>void audio.unlock()}>
    <div className="room-backdrop" aria-hidden="true"/><div className="room-wash" aria-hidden="true"/>
    <header className="topbar"><button className="brand" onClick={()=>setView('home')} aria-label="回到加号的牌桌"><span className="brand-mark"><Icon name="plus" size={24}/></span><span>加号的<span className="brand-sub">知识牌桌</span></span></button><div className="top-actions"><span className="star-counter"><Icon name="star" size={17}/><strong data-testid="stars">{save.stars}</strong></span><button className="icon-button" onClick={()=>setModal('settings')} aria-label="设置"><Icon name="settings"/></button></div></header>
    {view==='home'?<main className="home-screen">
      <div className="private-label"><span/> ONLY FOR 加号 <span/></div>
      <h1>把今天的知识<br/>轻轻<span>翻开。</span></h1><p className="home-subtitle">一张小牌，一点收获。我们慢慢来。</p>
      <div className="home-companion"><span className="floating-star star-one">✦</span><span className="floating-star star-two">✧</span><div className="welcome-bubble">欢迎回来，加号！<span>今天也来翻几张牌吧～</span><i>♡</i></div><Companion mood={homeMood}/><span className="cushion"/></div>
      <section className="home-table" aria-label="开始游戏"><div className="wood-edge"/><div className="table-heading"><span><Icon name="leaf" size={16}/> 你的专属学习小屋</span><span>文化素养 · 200张知识卡</span></div>
        <div className="preview-cards" aria-hidden="true"><div className="preview-card left"><span>文</span><small>与经典相遇</small></div><div className="preview-card center"><Icon name="star" size={36}/><small>每一小步，都闪光</small></div><div className="preview-card right"><span>知</span><small>把星河收好</small></div></div>
        <button className="primary-button start-button" onClick={()=>s&&s.phase!=='complete'?resume():start(nextLevel.id)} data-testid="start"><span>{s&&s.phase!=='complete'?'继续这局小牌':'开始发牌'}<small>{s&&s.phase!=='complete'?`第${s.levelId||'复习'}关 · 已完成${s.index}/${s.tasks.length}个小任务`:`第${nextLevel.id}关 · ${nextLevel.title}`}</small></span><Icon name="arrow" size={25}/></button>
        <div className="home-progress"><span>已认识 <b>{seen}</b> / 200 张</span><span>{save.completedLevels.length} / 30 关</span></div><div className="progress-track"><span style={{width:`${seen/2}%`}}/></div>
      </section><p className="home-footnote"><Icon name="heart" size={12}/> 没有倒计时，你的每一小步都算数</p>
    </main>:s&&task?<main className="play-screen">
      {s.phase==='complete'?<section className={`completion ${s.levelId===30?'final-completion':''}`} data-testid="completion"><div className="completion-stars" aria-hidden="true">✦　✧　✦</div><Companion mood="complete"/><p className="eyebrow">{s.levelId===30?'ALL 30 LEVELS COMPLETE':'A LITTLE MOMENT TO CELEBRATE'}</p><h1>{s.levelId===30?'加号，星光都属于你。':s.isReview?'又熟悉了一点点！':`第 ${s.levelId} 关，漂亮收牌！`}</h1><p className="completion-copy">{s.levelId?levels[s.levelId-1].completion:'加号，这次重逢也很棒！记忆不是一次就永远记住，而是每次见面都更熟一点。'}</p><div className="completion-stats"><span><b>{s.results.filter(r=>r.correct).length}</b>次答对</span><span><b>{s.results.length}</b>次练习</span><span><b>✦</b>{s.levelId?'关卡贴纸':'复习小星星'}</span></div>{s.levelId>0&&s.levelId%5===0&&<div className="badge-unlock"><Icon name="star"/> 解锁知识徽章 · {['萌芽','山河','寻知','博览','星河','陪伴'][s.levelId/5-1]}</div>}
        <button className="primary-button" onClick={()=>s.levelId>0&&s.levelId<30?start(s.levelId+1):start()}>{s.levelId>0&&s.levelId<30?'再玩下一关':'再玩一局，和知识重逢'}<Icon name="arrow"/></button><button className="text-button" onClick={()=>setView('home')}>把星星收好，休息一下</button><div className="confetti" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i} style={{'--n':i} as React.CSSProperties}>✦</i>)}</div>
      </section>:<>
        <div className="level-status"><button onClick={()=>setModal('levels')}><Icon name="map" size={16}/> {s.levelId?`第 ${s.levelId} 关`:'再玩一局'}<span>{s.levelId?levels[s.levelId-1].title:'和老朋友重逢'}</span></button><span>{s.index+1} / {s.tasks.length}</span></div><div className="task-progress">{s.tasks.map((_,i)=><span key={i} className={i<s.index?'done':i===s.index?'current':''}/>)}</div>
        <section className="companion-strip"><Companion mood={mood}/><div className="speech-bubble" aria-live="polite">{bubble}<small>{s.streak>=3&&s.phase==='feedback'?'这份小进步，值得一颗亮亮的星星。':'不赶时间，记住一点点就很好。'}</small></div></section>
        <section className={`play-table phase-${s.phase}`}>
          <div className="table-rim"/><div className="table-meta"><span className="mode-label"><Icon name={task.kind==='scenario'?'book':task.kind==='matching'?'repeat':'spark'} size={15}/>{labels[task.kind]}</span><div className={`deck ${s.phase==='shuffle'?'shuffling':''}`} aria-hidden="true"><span/><span/><span>✦</span></div></div>
          <>
            <div className="question-wrap"><h2 className="question" data-testid="question">{task.prompt}</h2>{task.kind==='matching'&&<p className="question-help">翻开 · 记住 · 找到同一组</p>}{task.kind==='keywords'&&<p className="question-help">{task.ordered?'按顺序点牌':'点出全部正确关键词'} · 已选 {s.chosenKeys.length} / {task.options.filter(o=>o.correct).length}</p>}</div>
            {renderCards(task,s)}
            {s.phase==='shuffle'||s.phase==='deal'?<button className="skip-deal" onClick={()=>patchSession({phase:'choose'})}>轻点跳过发牌动画</button>:null}
            <div className={`feedback-zone ${s.phase==='feedback'?'revealed':''}`}>
              {s.phase==='feedback'?<><div className={`answer-feedback ${s.lastCorrect?'success':'gentle'}`} aria-live="polite"><div className="feedback-title"><Icon name={s.lastCorrect?'spark':'heart'} size={18}/><b>{s.lastCorrect?'太棒啦，加号！':'再记住一次就好啦，加号。'}</b>{s.lastCorrect&&<span>+{task.pointIds.length} ✦</span>}</div><p>{task.kind==='matching'?short(task.pointIds.map(id=>`${byId[id].title} → ${byId[id].answer}`).join('；'),65):short(task.explanation,65)}</p><button className="inline-link" onClick={()=>showPoint(byId[task.pointIds[0]])}>展开知识牌</button></div><button className="primary-button next-button" data-testid="next" onClick={()=>patchSession({phase:'collect'})}>{s.index===s.tasks.length-1?'收好星星，完成这一关':'收牌，下一张'}<Icon name="arrow"/></button></>:<div className="hint-zone">{hint?<p className="hint-text">{task.kind==='matching'?'名字牌与意思牌配成一组。也可以打开知识牌再看一眼。':task.kind==='keywords'?`一起回想：${byId[task.pointIds[0]].parts?.join(' · ')}`:`把“${byId[task.pointIds[0]].title}”和“${byId[task.pointIds[0]].answer}”连起来记。`}</p>:<p>凭印象选一张就好，我一直都在。</p>}<button className="hint-button" disabled={s.phase!=='choose'} onClick={()=>{setHint(true);patchSession({aided:true});setHomeMood('think');}}><Icon name="leaf" size={16}/> 悄悄提示</button>{hint&&task.kind==='matching'&&<button className="inline-link" onClick={()=>showPoint(byId[task.pointIds[0]])}>看看知识牌</button>}</div>}
            </div>
          </>
        </section>
      </>}
    </main>:<main className="empty-state"><p>加号，牌桌已经准备好啦。</p><button className="primary-button" onClick={()=>start(nextLevel.id)}>开始发牌</button></main>}
    {(view==='home'||s?.phase==='complete')&&<nav className="bottom-nav" aria-label="主要导航"><button className={view==='home'?'active':''} onClick={()=>setView('home')}><Icon name="home"/><span>牌桌</span></button><button onClick={()=>setModal('levels')}><Icon name="map"/><span>30关旅程</span></button><button onClick={()=>setModal('review')}><Icon name="repeat"/><span>再玩一局</span>{wrong.length>0&&<i/>}</button><button onClick={()=>setModal('collection')}><Icon name="book"/><span>知识图鉴</span></button></nav>}
    {view==='play'&&s?.phase!=='complete'&&<div className="play-footer"><button onClick={()=>setView('home')}><Icon name="home" size={15}/>回小屋</button><span><span className="saved-dot"/>{storageOkay?'进度自动保存':'暂未保存，请导出'}</span><button onClick={()=>setModal('review')}><Icon name="repeat" size={15}/>复习</button></div>}
    {notice&&<div className="toast" role="status">{notice}</div>}
    {modal&&<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><section className={`modal modal-${modal}`} role="dialog" aria-modal="true" aria-label={modal==='levels'?'30关旅程':modal==='review'?'再玩一局':modal==='settings'?'设置':modal==='point'?'完整知识牌':'知识图鉴'} ref={modalRef} tabIndex={-1}>
      <div className="modal-heading"><div><p className="eyebrow">加号的专属小屋</p><h2>{modal==='levels'?'30站，慢慢走':modal==='review'?'和知识，再见一面':modal==='settings'?'让牌桌舒服一点':modal==='point'?detail.title:'知识小图鉴'}</h2></div><button className="icon-button" aria-label="关闭弹窗" onClick={()=>setModal(null)}><Icon name="close"/></button></div>
      <div className="modal-body">
        {modal==='levels'&&<><p className="modal-intro">每关约3–5分钟。随时可以停下来，星星会好好等你。</p><div className="journey-progress"><b>{save.completedLevels.length}</b> / 30 关已完成 <span>✦ 你的每一步都算数</span></div><div className="level-grid">{levels.map(l=><button key={l.id} className={`level-tile ${save.completedLevels.includes(l.id)?'finished':''}`} onClick={()=>start(l.id)} data-level={l.id}><span className="level-seal">{save.completedLevels.includes(l.id)?<Icon name="check" size={18}/>:String(l.id).padStart(2,'0')}</span><span><small>{l.id>=26?'综合复习':l.chapter}</small><b>{l.title}</b></span><span className="level-star">{save.completedLevels.includes(l.id)?'✦':'›'}</span></button>)}</div></>}
        {modal==='review'&&<><div className="review-hero"><Companion mood={wrong.length?'comfort':'smile'}/><p>加号，记忆也喜欢重逢。<br/><span>错过一张牌没关系，我们会再见。</span></p></div><div className="review-counts"><span><b>{wrong.length}</b>张想再认识</span><span><b>{due.length}</b>张到了复习时机</span><span><b>{mastered}</b>张稳定记住</span></div><button className="primary-button" onClick={()=>start()}>再玩一局 <Icon name="repeat"/></button><p className="modal-intro">优先安排答错、用过提示和到期的牌。每次换个角度，不用自己整理错题本。</p><div className="review-list">{priorityPoints(points.filter(p=>save.records[p.id]?.seen),save.records).slice(0,8).map(p=><button key={p.id} onClick={()=>showPoint(p)}><span><b>{p.title}</b><small>{statusLabel[save.records[p.id].status]} · 已练{save.records[p.id].attempts}次</small></span><span>{save.records[p.id].latestCorrect===false?'再记一次':save.records[p.id].nextReviewAt?Date.parse(save.records[p.id].nextReviewAt!)<=Date.now()?'适合现在复习':new Date(save.records[p.id].nextReviewAt!).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})+'再见':'还没练习'} ›</span></button>)}</div><p className="soft-note">间隔按1、3、7、14天调整；同一天反复答对不会直接升为稳定掌握。</p></>}
        {modal==='collection'&&<><div className="collection-summary"><span><b>{seen}</b> / 200张已见面</span><span><Icon name="star" size={16}/>{save.completedLevels.length}枚贴纸</span></div><div className="badge-row">{['萌芽','山河','寻知','博览','星河','陪伴'].map((b,i)=><div className={save.completedLevels.includes((i+1)*5)?'unlocked':''} key={b}><Icon name="star" size={25}/><span>{b}</span><small>第{(i+1)*5}关</small></div>)}</div><label className="search-box"><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="找一个名字、作品或关键词" aria-label="搜索知识图鉴"/></label><div className="point-list">{points.filter(p=>(p.title+p.answer+p.chapter+p.original).includes(search.trim())).map(p=><button className={save.records[p.id]?.seen?'seen':''} key={p.id} onClick={()=>showPoint(p)}><span className="point-number">{String(p.number).padStart(3,'0')}</span><span><b>{p.title}</b><small>{p.chapter} · {statusLabel[save.records[p.id]?.status??'new']}</small></span><span className="point-star">{save.records[p.id]?.status==='mastered'?'✦':'›'}</span></button>)}</div></>}
        {modal==='point'&&<><div className="detail-meta"><span>{detail.id} · 原件第{detail.sourcePage}页</span><span>首次第{detail.firstLevel}关</span></div><div className="detail-card"><Icon name="spark" size={28}/><p>{detail.explanation}</p></div>{detail.flags.length>0&&<p className="source-flag">资料标记：{detail.flags.join('、')}</p>}<details><summary>查看保留的资料原文</summary><p className="original-text">{detail.original}</p></details><div className="detail-stat"><p>练习次数 <b>{save.records[detail.id]?.attempts??0}</b></p><p>第一次练习 <b>{save.records[detail.id]?.firstCorrect===null||save.records[detail.id]?.firstCorrect===undefined?'还没开始':save.records[detail.id]?.firstCorrect?'答对啦':'再认识一次'}</b></p><p>最近一次 <b>{save.records[detail.id]?.latestCorrect===null||save.records[detail.id]?.latestCorrect===undefined?'还没开始':save.records[detail.id]?.latestCorrect?'答对啦':'待复习'}</b></p><p>掌握状态 <b>{statusLabel[save.records[detail.id]?.status??'new']}</b></p><p>下次建议复习 <b>{save.records[detail.id]?.nextReviewAt?new Date(save.records[detail.id].nextReviewAt!).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'练习后安排'}</b></p></div><p className="soft-note">原文单独保留，校订后的学习说明用于出题。资料不是2027年官方考纲。</p></>}
        {modal==='settings'&&<><div className="settings-companion"><Companion mood="sleepy"/><p>加号，舒服最重要。<span>想安静一点，也完全可以。</span></p></div>{([{key:'sound',title:'轻轻的游戏音效',sub:'洗牌、发牌、翻牌与小小庆祝',icon:'sound'},{key:'music',title:'小屋背景音乐',sub:'一段原创、柔和的循环旋律',icon:'moon'},{key:'reducedMotion',title:'动画轻一点',sub:'缩短发牌过程，减少动态效果',icon:'leaf'}] as const).map(x=><div className="setting-row" key={x.key}><Icon name={x.icon}/><div><b>{x.title}</b><small>{x.sub}</small></div><button className={`toggle ${save.settings[x.key]?'on':''}`} role="switch" aria-checked={save.settings[x.key]} aria-label={x.title} onClick={()=>change(prev=>({...prev,settings:{...prev.settings,[x.key]:!prev.settings[x.key]}}))}><span/></button></div>)}<div className="storage-note"><span className="saved-dot"/><b>进度保存在这个浏览器</b><p>换设备、清理浏览器数据或更换网站地址前，先导出一份记录。隐私浏览的数据可能不会长期保留。</p></div><div className="backup-actions"><button onClick={download}><Icon name="download" size={18}/>导出学习记录</button><button onClick={()=>inputRef.current?.click()}><Icon name="repeat" size={18}/>导入存档</button><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={e=>void importFile(e.target.files?.[0])}/></div><p className="offline-note">{offline?'这台设备已缓存游戏资源，可离线再玩。':'离线缓存需在HTTPS网址首次加载完成后准备。'}</p><p className="soft-note">只为加号制作 · 文化素养200常识<br/>不需要账号，没有广告，也没有倒计时。<br/><a className="inline-link" href="./open-source.html" target="_blank" rel="noopener noreferrer">开源代码与许可</a></p></>}
      </div>
    </section></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
