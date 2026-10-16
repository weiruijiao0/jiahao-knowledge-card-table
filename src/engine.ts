import type { Level, Mode, Point, RecordData, SaveData, Session, Task } from './model.ts';
export const STORAGE_KEY='jiahao-knowledge-table:v1';
export const DAY=86400000;
export const REVIEW_DAYS=[1,3,7,14];
export function blankRecord():RecordData {return {seen:false,attempts:0,firstCorrect:null,latestCorrect:null,lastPracticedAt:null,nextReviewAt:null,stage:0,correctDays:[],status:'new',wrongCount:0,lastAided:false};}
export function freshSave():SaveData {return {version:1,records:{},completedLevels:[],stars:0,settings:{sound:true,music:false,reducedMotion:false},active:null,lastVisit:new Date().toISOString()};}
export function localDay(date:Date){return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;}
export function practice(previous:RecordData|undefined,correct:boolean,now=new Date(),aided=false):RecordData {
  const r={...(previous??blankRecord())};const today=localDay(now);
  const newDay=!r.correctDays.includes(today);
  if(correct&&!aided&&newDay){r.correctDays=[...r.correctDays.slice(-13),today];r.stage=Math.min(4,r.stage+1);}
  if(!correct){r.stage=0;r.wrongCount+=1;}
  const delay=(!correct||aided)?10*60000:REVIEW_DAYS[Math.max(0,r.stage-1)]*DAY;
  const proposed=now.getTime()+delay;
  const due=correct&&!aided&&!newDay&&r.nextReviewAt?Math.min(new Date(r.nextReviewAt).getTime(),proposed):proposed;
  return {...r,seen:true,attempts:r.attempts+1,firstCorrect:r.firstCorrect??correct,latestCorrect:correct,lastPracticedAt:now.toISOString(),nextReviewAt:new Date(due).toISOString(),lastAided:aided,status:!correct||aided?'review':r.stage>=4&&r.correctDays.length>=4?'mastered':r.stage>=2?'familiar':'learning'};
}
export function shuffle<T>(input:T[],rng:()=>number=Math.random):T[]{const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeTask(p:Point,kind:Mode,all:Point[],variant=0,rng:()=>number=Math.random):Task {
  let prompt=p.question;let answer=p.answer;let decoys=p.decoys;
  if(variant%2===1&&kind==='choice'&&(p.title===p.answer||p.title.includes(p.answer)))kind='truth';
  if(variant%2===1&&kind==='choice'){
    const alternatives=shuffle(all.filter(q=>q.id!==p.id&&q.title!==p.title&&q.answer!==p.answer&&q.chapter!==p.chapter&&!(q.original+q.explanation).includes(p.answer.replace(/[《》]/g,''))),rng);
    const unique=[...new Set(alternatives.map(q=>q.title))].slice(0,3);
    prompt=`哪张知识牌对应“${p.answer}”？`;answer=p.title;decoys=unique;
  }
  let labels=[answer,...decoys];let correctFlags=[true,false,false,false];let ordered=false;let sequence:string[]=[];
  if(kind==='truth'){
    const isTrue=rng()>.5;prompt=`${p.question.replace(/[？?]$/,'')} → ${isTrue?p.answer:p.decoys[0]}。\n这张知识牌说得对吗？`;
    labels=['说得对','需要改一改'];correctFlags=[isTrue,!isTrue];
  }
  if(kind==='keywords'&&p.parts){
    const prefix=p.number===143?'激流三部曲':p.title;
    prompt=p.ordered?({83:'按从北到南，依次选出中国四大海。',91:'按殿试名次，依次选出三鼎甲。',155:'按顺序，选出前五个天干。',156:'按顺序，选出前五个地支。',191:'按离太阳由近到远，选出前四颗行星。',192:'按体积由大到小，选出前四颗行星。'} as Record<number,string>)[p.number]:`选齐属于“${prefix}”的 ${p.parts.length} 张牌。`;
    labels=[...p.parts,...(p.partDecoys??[])];correctFlags=labels.map((_,i)=>i<p.parts!.length);ordered=p.ordered;sequence=p.parts.map((_,i)=>`o${i}`);
  }else if(kind==='keywords'){kind='choice';}
  if(kind==='scenario'&&p.scenario)prompt=p.scenario;else if(kind==='scenario')kind='choice';
  const options=shuffle(labels.map((label,i)=>({key:`o${i}`,label,correct:correctFlags[i]})),rng);
  return {id:`${p.id}-${variant}-${Math.floor(rng()*1e9)}`,kind,pointIds:[p.id],prompt,options,ordered,sequence,explanation:p.explanation,study:false};
}
export function matchTask(pool:Point[],rng:()=>number=Math.random):Task {
  const chosen:Point[]=[];
  for(const p of shuffle(pool,rng)){if(p.answer.length<=12&&p.title.length<=10&&!chosen.some(q=>q.answer===p.answer||q.title===p.title)){chosen.push(p);if(chosen.length===3)break;}}
  if(chosen.length<2)throw new Error('Not enough distinct concepts for matching.');
  const options=shuffle(chosen.flatMap(p=>[{key:`${p.id}-term`,label:p.title,correct:true,pointId:p.id,side:'term' as const},{key:`${p.id}-meaning`,label:p.answer,correct:true,pointId:p.id,side:'meaning' as const}]),rng);
  return {id:`match-${Math.floor(rng()*1e9)}`,kind:'matching',pointIds:chosen.map(p=>p.id),prompt:'翻开两张牌，帮概念找到自己的意思。',options,ordered:false,sequence:[],explanation:'能把名字和意思连起来，就是一次扎实的回忆。',study:false};
}
export function priorityPoints(pool:Point[],records:SaveData['records'],now=Date.now()):Point[]{
  const rank=(p:Point)=>{const r=records[p.id];return !r?.seen?0:r.latestCorrect===false?400+(r.wrongCount||0):r.lastAided?300:r.nextReviewAt&&Date.parse(r.nextReviewAt)<=now?200+Math.min(50,(now-Date.parse(r.nextReviewAt))/DAY):r.status==='mastered'?1:20;};
  return [...pool].sort((a,b)=>rank(b)-rank(a)||Date.parse(records[a.id]?.lastPracticedAt??'1970-01-01')-Date.parse(records[b.id]?.lastPracticedAt??'1970-01-01'));
}
export function createSession(level:Level|undefined,all:Point[],save:SaveData,rng:()=>number=Math.random):Session {
  const isReview=!level||level.id>=26;const levelId=level?.id??0;
  const introduced=all.filter(p=>save.records[p.id]?.seen);
  const pool=level?all.filter(p=>level.pointIds.includes(p.id)):(introduced.length?introduced:all.slice(0,8));
  const extras=isReview?all.filter(p=>save.records[p.id]?.latestCorrect===false):[];
  const unique=[...new Map([...extras,...pool].map(p=>[p.id,p])).values()];
  const chosen=isReview?priorityPoints(shuffle(unique,rng),save.records).slice(0,8):pool;
  const tasks=chosen.map((p,i)=>{
    let kind:Mode='choice';
    if(levelId>=21&&p.scenario&&(i%3!==1||levelId>=26))kind='scenario';
    else if(levelId>=6&&p.parts&&(i%2===0||isReview))kind='keywords';
    else if(i%3===1)kind='truth';
    else if(levelId>10&&p.scenario&&i%3===2)kind='scenario';
    return makeTask(p,kind,all,isReview?save.records[p.id]?.attempts??1:0,rng);
  });
  const before=levelId>1?all.filter(p=>p.firstLevel<levelId):chosen;
  const reviewPool=introduced.length>=3?introduced:before.length>=3?before:chosen;
  if(levelId>=6||!level)tasks.push(matchTask(reviewPool,rng));
  else {const p=reviewPool[0]??chosen[0];const t=makeTask(p,'choice',all,1,rng);t.study=false;tasks.push(t);}
  if(isReview)tasks.push(matchTask(reviewPool,rng));
  return {id:`session-${Date.now()}-${Math.floor(rng()*1e6)}`,levelId,isReview,tasks,index:0,phase:'shuffle',results:[],selected:null,chosenKeys:[],openKeys:[],matchedKeys:[],wrongPointIds:[],aided:false,lastCorrect:true,streak:0,startedAt:new Date().toISOString(),completedAt:null,bonusInserted:false};
}
export function finishTask(save:SaveData,correct:boolean,all:Point[],selected:string|null=null,now=new Date()):SaveData {
  const current=save.active;if(!current||current.phase==='feedback'||current.phase==='complete')return save;
  const s={...current,selected,phase:'feedback' as const,lastCorrect:correct,streak:correct?current.streak+1:0};
  const t=s.tasks[s.index];const records={...save.records};let stars=save.stars;
  const results=t.pointIds.map(pointId=>({pointId,correct:t.kind==='matching'?!s.wrongPointIds.includes(pointId):correct,aided:s.aided}));
  for(const r of results){records[r.pointId]=practice(records[r.pointId],r.correct,now,r.aided);if(r.correct)stars++;}
  s.results=[...s.results,...results];
  if(!correct&&!s.bonusInserted&&s.tasks.length<10){const p=all.find(x=>x.id===results.find(r=>!r.correct)?.pointId);if(p){const retry=makeTask(p,p.parts?'keywords':'choice',all,1);retry.study=false;s.tasks=[...s.tasks,retry];s.bonusInserted=true;}}
  return {...save,records,stars,active:s};
}
export function advance(save:SaveData):SaveData {
  if(!save.active)return save;const s={...save.active};
  if(s.index>=s.tasks.length-1){
    s.phase='complete';s.completedAt=new Date().toISOString();
    const first=s.levelId>0&&!save.completedLevels.includes(s.levelId);
    return {...save,active:s,stars:save.stars+(first?5:0),completedLevels:first?[...save.completedLevels,s.levelId].sort((a,b)=>a-b):save.completedLevels};
  }
  s.index++;s.phase='shuffle';s.selected=null;s.chosenKeys=[];s.openKeys=[];s.matchedKeys=[];s.wrongPointIds=[];s.aided=false;
  return {...save,active:s};
}
export function safeSave(raw:unknown,all:Point[],allowSession=true):SaveData|null {
  if(!raw||typeof raw!=='object')return null;const x=raw as Partial<SaveData>;
  if(x.version!==1||!x.records||typeof x.records!=='object'||!Array.isArray(x.completedLevels))return null;
  const result=freshSave();
  for(const p of all){const r=x.records[p.id];if(!r||typeof r!=='object')continue;const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.floor(v)):0;
    const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
    const stage=Math.min(4,n(r.stage));const days=Array.isArray(r.correctDays)?r.correctDays.filter(y=>typeof y==='string'&&/^\d{4}-\d{1,2}-\d{1,2}$/.test(y)).slice(-14):[];
    result.records[p.id]={seen:r.seen===true,attempts:n(r.attempts),firstCorrect:typeof r.firstCorrect==='boolean'?r.firstCorrect:null,latestCorrect:typeof r.latestCorrect==='boolean'?r.latestCorrect:null,lastPracticedAt:date(r.lastPracticedAt),nextReviewAt:date(r.nextReviewAt),stage,correctDays:[...new Set(days)],status:r.latestCorrect===false||r.lastAided?'review':stage>=4&&days.length>=4?'mastered':stage>=2?'familiar':r.seen?'learning':'new',wrongCount:n(r.wrongCount),lastAided:r.lastAided===true};
  }
  result.completedLevels=[...new Set(x.completedLevels.filter(id=>Number.isInteger(id)&&id>=1&&id<=30))];
  result.stars=typeof x.stars==='number'&&Number.isFinite(x.stars)?Math.max(0,Math.floor(x.stars)):0;
  result.settings={sound:x.settings?.sound!==false,music:x.settings?.music===true,reducedMotion:x.settings?.reducedMotion===true};
  const active=x.active;
  if(allowSession&&active&&Array.isArray(active.tasks)&&active.tasks.length>=1&&active.tasks.length<=10&&Number.isInteger(active.index)&&active.index>=0&&active.index<active.tasks.length&&active.tasks.every(t=>['choice','truth','matching','keywords','scenario'].includes(t.kind)&&Array.isArray(t.pointIds)&&t.pointIds.every(id=>all.some(p=>p.id===id))&&Array.isArray(t.options)&&t.options.length>=2&&typeof t.prompt==='string')&&Array.isArray(active.results)&&Array.isArray(active.chosenKeys)&&Array.isArray(active.openKeys)&&Array.isArray(active.matchedKeys)&&Array.isArray(active.wrongPointIds)&&['study','shuffle','deal','choose','feedback','collect','complete'].includes(active.phase)){
    // Existing saves may be paused on the removed pre-answer study screen.
    result.active={...active,tasks:active.tasks.map(t=>({...t,study:false})),phase:['study','shuffle','deal','collect'].includes(active.phase)?'choose':active.phase};
  }
  return result;
}
