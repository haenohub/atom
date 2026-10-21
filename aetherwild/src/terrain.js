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
  if (z < -146) return x < 15 ? 'snow' : 'volcano';
  if (x < -65 && z < 65) return 'lake';
  if (x > 70 && z < 65) return 'highland';
  return 'forest';
}
export const isWater = (x,z) => Math.hypot(x+130,z+32)<69 && heightAt(x,z) < WATER_LEVEL;
export function seededRandom(seed = 82537) { let s = seed >>> 0; return () => { s = (Math.imul(1664525,s)+1013904223)>>>0; return s / 4294967296; }; }
export function slopeAt(x,z) { return Math.hypot((heightAt(x+1,z)-heightAt(x-1,z))/2,(heightAt(x,z+1)-heightAt(x,z-1))/2); }
