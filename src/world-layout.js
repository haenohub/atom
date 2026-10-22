export const WORLD_SIZE=1280;
export const WORLD_LIMIT=WORLD_SIZE/2-10;
export const DUNGEON_FLOOR=-48;
export const DUNGEON_CEILING=-31;
export const DUNGEON_ROUTES=[
 {id:'forest',name:'뿌리의 계단',biome:'forest',x:20,z:8,angle:0,color:0x8ccf91,monsters:['blackslime','blackslime'],settlement:[-38,115]},
 {id:'lake',name:'수몰 수도원 길',biome:'lake',x:-81,z:-25,angle:-Math.PI/3,color:0x79d6dc,monsters:['basilisk','basilisk'],settlement:[-250,-35]},
 {id:'highland',name:'바람 광산 길',biome:'highland',x:106,z:-10,angle:Math.PI/3,color:0xddc28b,monsters:['darkgolem','blackslime'],settlement:[275,-25]},
 {id:'snow',name:'얼어붙은 납골당',biome:'snow',x:-78,z:-162,angle:-Math.PI*2/3,color:0x9fc5fa,monsters:['ghost','ghost'],settlement:[-240,-345]},
 {id:'volcano',name:'잿불 지열 갱도',biome:'volcano',x:132,z:-173,angle:Math.PI*2/3,color:0xff946b,monsters:['darkgolem','basilisk'],settlement:[285,-345]},
 {id:'cloud',name:'천공의 나선 우물',biome:'cloud',x:201,z:138,y:83,angle:Math.PI,color:0xc9b1f6,monsters:['shadowguard','shadowguard'],settlement:[345,285]}
].map(r=>({...r,room:{x:Math.sin(r.angle)*110,z:Math.cos(r.angle)*110,r:16}}));
export function segmentDistance(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*t,z-az-dz*t);}
export function dungeonContains(x,z,margin=0){return Math.hypot(x,z)<28-margin||DUNGEON_ROUTES.some(({room:r})=>Math.hypot(x-r.x,z-r.z)<r.r-margin||segmentDistance(x,z,0,0,r.x,r.z)<6-margin);}
export function dungeonRoomAt(x,z){return DUNGEON_ROUTES.find(({room:r})=>Math.hypot(x-r.x,z-r.z)<r.r)||null;}
export function validDungeonPosition(p){return p?.realm==='dungeon'&&Number.isFinite(p.y)&&Math.abs(p.y-DUNGEON_FLOOR)<3&&dungeonContains(p.x,p.z,.5);}
export const OUTER_REGIONS=[
 {id:'forest',x:0,z:355,rx:330,rz:290}, {id:'lake',x:-385,z:-15,rx:245,rz:250},
 {id:'highland',x:380,z:-20,rx:245,rz:260},{id:'snow',x:-275,z:-410,rx:280,rz:235},
 {id:'volcano',x:300,z:-415,rx:285,rz:240},{id:'cloud',x:365,z:340,rx:235,rz:265}
];
