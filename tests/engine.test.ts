import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advance, createSession, DAY, finishTask, freshSave, makeTask, practice, priorityPoints, safeSave } from '../src/engine.ts';
import type {Level,Point} from '../src/model.ts';
const points=JSON.parse(fs.readFileSync(new URL('../src/data/knowledge.json',import.meta.url),'utf8')) as Point[];
const levels=JSON.parse(fs.readFileSync(new URL('../src/data/levels.json',import.meta.url),'utf8')) as Level[];
function seed(value:number){return ()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
test('exactly 200 original IDs, source pages, complete metadata and 30 distinct completion messages',()=>{
  assert.equal(points.length,200);assert.deepEqual(points.map(p=>p.number),Array.from({length:200},(_,i)=>i+1));assert.equal(levels.length,30);
  assert.equal(new Set(levels.map(l=>l.completion)).size,30);assert.ok(levels.every(l=>l.completion.includes('加号')));
  for(const p of points){assert.ok(p.original&&p.explanation&&p.question);assert.equal(new Set([p.answer,...p.decoys]).size,4);assert.ok(p.sourcePage>=1&&p.sourcePage<=8);assert.ok(p.reviewPlanDays.length===4);}
  assert.deepEqual(points.filter(p=>p.duplicateOf).map(p=>p.number),[139,140,141]);
});
test('all 30 levels can enter and complete; first 25 introduce every source point; all five modes occur',()=>{
  let save=freshSave();const seen=new Set<string>();const kinds=new Set<string>();
  for(const level of levels){save.active=createSession(level,points,save,seed(level.id));assert.equal(save.active.phase,'shuffle');assert.ok(save.active.tasks.every(t=>!t.study));assert.ok(save.active.tasks.length>=5&&save.active.tasks.length<=10);
    while(save.active.phase!=='complete'){assert.notEqual(save.active.phase,'study');const task=save.active.tasks[save.active.index];kinds.add(task.kind);if(level.id<=25&&save.active.index<8)task.pointIds.forEach(id=>seen.add(id));save.active.phase='choose';save=finishTask(save,true,points);save=advance(save);}
    assert.ok(save.completedLevels.includes(level.id));
  }
  assert.equal(seen.size,200);assert.equal(Object.keys(save.records).length,200);assert.deepEqual([...kinds].sort(),['choice','keywords','matching','scenario','truth']);
  assert.equal(save.completedLevels.length,30);assert.equal(Object.values(save.records).filter(r=>r.status==='mastered').length,0);
});
test('every generated choice/truth/scenario has one correct answer; keyword ordering and pairing are unambiguous',()=>{
  for(let round=0;round<12;round++){const save=freshSave();for(const level of levels){const s=createSession(level,points,save,seed(round*31+level.id));for(const t of s.tasks){assert.ok(t.prompt&&t.explanation);if(['choice','truth','scenario'].includes(t.kind))assert.equal(t.options.filter(o=>o.correct).length,1);if(t.kind==='keywords'){assert.ok(t.options.some(o=>!o.correct));assert.equal(new Set(t.options.map(o=>o.label)).size,t.options.length);if(t.ordered)assert.deepEqual(t.sequence.map(key=>t.options.find(o=>o.key===key)!.label),points.find(p=>p.id===t.pointIds[0])!.parts);}if(t.kind==='matching'){for(const id of t.pointIds){const pair=t.options.filter(o=>o.pointId===id);assert.equal(pair.length,2);assert.notEqual(pair[0].side,pair[1].side);}assert.equal(new Set(t.options.filter(o=>o.side==='meaning').map(o=>o.label)).size,t.pointIds.length);}}}}
});
test('wrong answer keeps first result, schedules ten-minute review and does not block completion',()=>{
  let save=freshSave();save.active=createSession(levels[0],points,save,seed(123));save.active.phase='choose';const before=save.stars;
  save=finishTask(save,false,points,null,new Date('2026-10-16T08:00:00Z'));
  const r=save.records.K001;assert.equal(r.firstCorrect,false);assert.equal(r.latestCorrect,false);assert.equal(r.nextReviewAt,'2026-10-16T08:10:00.000Z');assert.equal(save.stars,before);assert.equal(save.active!.tasks.length,10);
  const one=save;assert.equal(finishTask(save,false,points),one);save=advance(save);assert.equal(save.active!.index,1);
  assert.equal(practice(r,true,new Date('2026-10-17T08:00:00Z')).firstCorrect,false);
});
test('review uses 1/3/7/14-day intervals, separate successful days, setbacks and hint-aware mastery',()=>{
  const first=new Date('2026-10-16T08:00:00Z');let r=practice(undefined,true,first);assert.equal(Date.parse(r.nextReviewAt!)-first.getTime(),DAY);
  for(let i=0;i<30;i++)r=practice(r,true,new Date(first.getTime()+i*1000));assert.equal(r.stage,1);assert.equal(r.status,'learning');
  for(const [offset,interval] of [[1,3],[4,7],[11,14]]){const date=new Date(first.getTime()+offset*DAY);r=practice(r,true,date);assert.equal(Date.parse(r.nextReviewAt!)-date.getTime(),interval*DAY);}
  assert.equal(r.status,'mastered');r=practice(r,false,new Date(first.getTime()+12*DAY));assert.equal(r.stage,0);assert.equal(r.status,'review');
  const aided=practice(undefined,true,first,true);assert.equal(aided.stage,0);assert.equal(aided.status,'review');assert.equal(aided.lastAided,true);
});
test('wrong answers outrank unseen and recently practiced points; independent replay remains available',()=>{
  const save=freshSave();save.records.K007=practice(undefined,false);save.records.K004=practice(undefined,true);
  assert.equal(priorityPoints(points,save.records)[0].id,'K007');const s=createSession(undefined,points,save,seed(7));assert.equal(s.isReview,true);assert.equal(s.levelId,0);assert.ok(s.tasks.some(t=>t.pointIds.includes('K007')));
});
test('save roundtrip preserves active task, selection and progress; imports validate and discard active content',()=>{
  const save=freshSave();save.active=createSession(levels[0],points,save,seed(10));save.active.phase='choose';save.active.chosenKeys=['o0'];save.records.K001=practice(undefined,false);save.completedLevels=[1,2];save.stars=17;
  const restored=safeSave(JSON.parse(JSON.stringify(save)),points)!;assert.equal(restored.active?.id,save.active.id);assert.deepEqual(restored.active?.chosenKeys,['o0']);assert.equal(restored.stars,17);assert.equal(restored.records.K001.firstCorrect,false);
  assert.equal(safeSave(save,points,false)!.active,null);assert.equal(safeSave({version:99},points),null);
});
test('legacy study-screen saves resume at the question without losing answers, stars or level progress',()=>{
  const save=freshSave();save.active=createSession(levels[3],points,save,seed(921));save.active.index=3;save.active.phase='study';save.active.tasks.forEach(t=>{t.study=true;});save.completedLevels=[1,2,3];save.stars=45;save.records.K001=practice(undefined,false);
  const restored=safeSave(JSON.parse(JSON.stringify(save)),points)!;
  assert.equal(restored.active!.phase,'choose');assert.equal(restored.active!.index,3);assert.equal(restored.active!.id,save.active.id);assert.deepEqual(restored.active!.tasks.map(t=>t.id),save.active.tasks.map(t=>t.id));assert.ok(restored.active!.tasks.every(t=>!t.study));assert.deepEqual(restored.completedLevels,[1,2,3]);assert.equal(restored.stars,45);assert.equal(restored.records.K001.firstCorrect,false);
});
test('answer positions vary and later question angles change instead of memorising card positions',()=>{
  const positions=new Set<number>();const rng=seed(8902831);for(let i=0;i<30;i++){const t=makeTask(points[20],'choice',points,0,rng);positions.add(t.options.findIndex(o=>o.correct));}assert.equal(positions.size,4);
  const first=makeTask(points[16],'choice',points,0,seed(1)),later=makeTask(points[16],'choice',points,1,seed(2));assert.notEqual(first.prompt,later.prompt);assert.notEqual(first.options.find(o=>o.correct)!.label,later.options.find(o=>o.correct)!.label);
  assert.equal(makeTask(points[20],'choice',points,1,seed(2)).kind,'truth');
});
