import { platformFloor } from './sky-layout.js';
export const WORLD_SIZE = 640;
export const WATER_LEVEL = -1.8;
const bump = (x,z,cx,cz,sx,sz) => Math.exp(-((x-cx)**2/(sx*sx) + (z-cz)**2/(sz*sz)));
export function heightAt(x,z) {
  return 3 + Math.sin(x*.018)*3 + Math.cos(z*.023)*2.2 + Math.sin(x*.055+z*.027)*.9
    + 25*bump(x,z,135,-40,85,95) + 65*bump(x,z,-110,-214,71,74)
    + 49*bump(x,z,165,-222,80,74) - 14*bump(x,z,-130,-32,60,53)
    + 8*bump(x,z,20,-160,100,57);
}
export function biomeAt(x,z) {
  const regions=[['cloud',174,154,74,66],['snow',-108,-215,155,120],['volcano',163,-220,150,126],['lake',-130,-32,108,105],['highland',135,-35,115,108]];
  let result='forest',best=1;
  for(const [id,cx,cz,rx,rz]of regions){const d=Math.hypot((x-cx)/rx,(z-cz)/rz)+Math.sin(x*.047+z*.021)*.045;if(d<best){best=d;result=id;}}
  return result;
}
export const isWater = (x,z) => Math.hypot(x+130,z+32)<69 && heightAt(x,z) < WATER_LEVEL;
export function seededRandom(seed = 82537) { let s = seed >>> 0; return () => { s = (Math.imul(1664525,s)+1013904223)>>>0; return s / 4294967296; }; }
export function slopeAt(x,z) { return Math.hypot((heightAt(x+1,z)-heightAt(x-1,z))/2,(heightAt(x,z+1)-heightAt(x,z-1))/2); }

export function surfaceAt(x,z,ceiling=Infinity){return Math.max(heightAt(x,z),platformFloor(x,z,ceiling));}
