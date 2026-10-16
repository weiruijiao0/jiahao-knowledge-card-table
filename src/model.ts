export type Mode = 'choice'|'truth'|'matching'|'keywords'|'scenario';
export type Mood = 'idle'|'smile'|'wink'|'clap'|'correct'|'comfort'|'think'|'surprise'|'complete'|'sleepy';
export interface Point {
  id:string;number:number;title:string;original:string;sourcePage:number;chapter:string;keywords:string[];difficulty:number;
  question:string;answer:string;decoys:string[];explanation:string;flags:string[];confusions:string[];firstLevel:number;
  reviewPoolLevel:number;reviewPlanDays:number[];initialMastery:string;modes:string[];parts:string[]|null;ordered:boolean;
  partDecoys:string[]|null;scenario:string|null;duplicateOf:string|null;
}
export interface Level {id:number;title:string;chapter:string;kind:string;pointIds:string[];targetMinutes:number[];taskCount:number;completion:string;}
export interface RecordData {
  seen:boolean;attempts:number;firstCorrect:boolean|null;latestCorrect:boolean|null;lastPracticedAt:string|null;
  nextReviewAt:string|null;stage:number;correctDays:string[];status:'new'|'learning'|'review'|'familiar'|'mastered';
  wrongCount:number;lastAided:boolean;
}
export interface Option {key:string;label:string;correct:boolean;pointId?:string;side?:'term'|'meaning';}
export interface Task {id:string;kind:Mode;pointIds:string[];prompt:string;options:Option[];ordered:boolean;sequence:string[];explanation:string;study:boolean;}
export type Phase='study'|'shuffle'|'deal'|'choose'|'feedback'|'collect'|'complete';
export interface Session {
  id:string;levelId:number;isReview:boolean;tasks:Task[];index:number;phase:Phase;results:{pointId:string;correct:boolean;aided:boolean}[];
  selected:string|null;chosenKeys:string[];openKeys:string[];matchedKeys:string[];wrongPointIds:string[];aided:boolean;
  lastCorrect:boolean;streak:number;startedAt:string;completedAt:string|null;bonusInserted:boolean;
}
export interface Settings {sound:boolean;music:boolean;reducedMotion:boolean;}
export interface SaveData {version:1;records:Record<string,RecordData>;completedLevels:number[];stars:number;settings:Settings;active:Session|null;lastVisit:string;}
