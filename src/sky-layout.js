// Every horizontal gap is <= 2.8 m. Raising routes use climbable ropes.
export const CLOUD_ENTRY={x:14,z:42};
export const SKY_ISLANDS=[
 {id:'landing',x:148,z:174,y:66,r:9},
 {id:'hop-1',x:148,z:160,y:67,r:3},
 {id:'hop-2',x:154,z:154,y:68,r:3},
 {id:'orchard',x:166,z:149,y:68,r:9},
 {id:'terrace',x:178,z:142,y:82,r:7},
 {id:'hop-3',x:188,z:141,y:83,r:2.5},
 {id:'sanctum',x:201,z:138,y:83,r:8},
 {id:'crown',x:212,z:131,y:100,r:8}
];
export const SKY_ROPES=[
 {id:'rope-1',x:173,z:149,bottom:68,top:82,exitX:175,exitZ:146},
 {id:'rope-2',x:207,z:135,bottom:83,top:100,exitX:210,exitZ:133}
];
export function islandAt(x,z){return SKY_ISLANDS.find(p=>Math.hypot(x-p.x,z-p.z)<=p.r)||null;}
export function platformFloor(x,z,ceiling=Infinity){let best=-Infinity;for(const p of SKY_ISLANDS)if(p.y<=ceiling&&Math.hypot(x-p.x,z-p.z)<=p.r)best=Math.max(best,p.y);return best;}
export function validSkyPosition(pos){const p=islandAt(pos.x,pos.z);return !!p&&Number.isFinite(pos.y)&&pos.y>=p.y-.2&&pos.y<p.y+5;}
export const CLOUD_START={x:148,z:177,y:66};
