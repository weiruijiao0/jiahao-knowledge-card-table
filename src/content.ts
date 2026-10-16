import rawPoints from './data/knowledge.json';
import rawLevels from './data/levels.json';
import type { Point,Level } from './model';
export const points=rawPoints as Point[];
export const levels=rawLevels as Level[];
export const byId=Object.fromEntries(points.map(p=>[p.id,p]));
