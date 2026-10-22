import { structureFloorAt } from './structure-floors.js';
import { platformFloor } from './sky-layout.js';
import { WORLD_SIZE,OUTER_REGIONS,DUNGEON_FLOOR,DUNGEON_CEILING,dungeonContains } from './world-layout.js';
export { WORLD_SIZE };
export const WATER_LEVEL = -1.8;
const bump = (x,z,cx,cz,sx,sz) => Math.exp(-((x-cx)**2/(sx*sx) + (z-cz)**2/(sz*sz)));
export function heightAt(x,z) {
  return 3 + Math.sin(x*.018)*3 + Math.cos(z*.023)*2.2 + Math.sin(x*.055+z*.027)*.9
    + 25*bump(x,z,135,-40,85,95) + 65*bump(x,z,-110,-214,71,74)
    + 49*bump(x,z,165,-222,80,74) - 14*bump(x,z,-130,-32,60,53)
    + 8*bump(x,z,20,-160,100,57)
    + 62*bump(x,z,-300,-430,130,130)+45*bump(x,z,340,-430,150,135)
    - 17*bump(x,z,-385,-15,100,100)+20*bump(x,z,400,-40,170,200)+15*bump(x,z,360,340,155,165);
}
const coreRegions=[{id:'forest',x:0,z:45,rx:155,rz:170},{id:'cloud',x:174,z:154,rx:74,rz:66},{id:'snow',x:-108,z:-215,rx:125,rz:100},{id:'volcano',x:163,z:-220,rx:120,rz:106},{id:'lake',x:-130,z:-32,rx:100,rz:95},{id:'highland',x:135,z:-35,rx:105,rz:98}];
export function biomeWeights(x,z){const w={forest:.025,lake:0,highland:0,snow:0,volcano:0,cloud:0};for(const r of [...coreRegions,...OUTER_REGIONS]){const d=((x-r.x)/r.rx)**2+((z-r.z)/r.rz)**2;w[r.id]+=Math.exp(-d*2.8);}const sum=Object.values(w).reduce((a,b)=>a+b,0);for(const id of Object.keys(w))w[id]/=sum;return w;}
export function biomeAt(x,z){const w=biomeWeights(x,z);return Object.keys(w).reduce((a,b)=>w[a]>w[b]?a:b);}
export const isWater = (x,z) => (Math.hypot(x+130,z+32)<69||Math.hypot(x+385,z+15)<100)&&heightAt(x,z)<WATER_LEVEL;
export function seededRandom(seed = 82537) { let s = seed >>> 0; return () => { s = (Math.imul(1664525,s)+1013904223)>>>0; return s / 4294967296; }; }
export function slopeAt(x,z) { return Math.hypot((heightAt(x+1,z)-heightAt(x-1,z))/2,(heightAt(x,z+1)-heightAt(x,z-1))/2); }

export function surfaceAt(x,z,ceiling=Infinity){if(ceiling<DUNGEON_CEILING+3)return DUNGEON_FLOOR;return Math.max(heightAt(x,z),platformFloor(x,z,ceiling),structureFloorAt(x,z,ceiling));}
