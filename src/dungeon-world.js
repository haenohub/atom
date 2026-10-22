import { architectureMaterial } from './architecture-material.js';
import * as THREE from 'three';
import { DUNGEON_ROUTES,DUNGEON_FLOOR,DUNGEON_CEILING } from './world-layout.js';
import { heightAt } from './terrain.js';
import { surfaceMaterial } from './surfaces.js';
import { loft,taperedCurve,mergeStaticParts,attach as add } from './modeling.js';
const box=new THREE.BoxGeometry(1,1,1);
export function buildDungeon(world){const group=new THREE.Group();group.name='underroot-dungeon';world.scene.add(group);world.dungeonGroup=group;world.dungeonColliders=[];const stone=architectureMaterial(0xb0a8b6),floor=architectureMaterial(0xaaa1af,{floor:true}),metal=surfaceMaterial('steel',0x767189);
 const block=(g,mat,p,s)=>add(g,box,mat,p,s),portal=(parent,x,y,z,id,name,realm,route)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);for(const side of [-1,1])block(g,stone,[side*2.5,2.5,0],[1,5,1.4]);add(g,new THREE.TorusGeometry(2.4,.45,9,40,Math.PI),stone,[0,3.2,0]);const glow=new THREE.MeshBasicMaterial({color:route.color,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide});add(g,new THREE.PlaneGeometry(3.7,4.2),glow,[0,2.2,0]);world.portals.push({id,type:'dungeon',realm,name,route:route.id,x,z,group:g,description:realm==='dungeon'?'E · '+route.name+' 출구로 돌아가기':'E · '+route.name+'을 따라 지하 던전 진입'});return g;};
 const disk=(x,z,r)=>{const g=add(group,new THREE.CircleGeometry(r,72),floor,[x,DUNGEON_FLOOR-.04,z]);g.rotation.x=-Math.PI/2;};disk(0,0,28);
 const center=new THREE.Group();center.position.y=DUNGEON_FLOOR;group.add(center);const roof=add(center,new THREE.SphereGeometry(28,48,20,0,Math.PI*2,0,Math.PI/2),stone,[0,12,0],[1,.35,1]);
 for(let k=0;k<72;k++){const a=k/72*Math.PI*2;if(DUNGEON_ROUTES.some(r=>Math.abs(Math.atan2(Math.sin(a-r.angle),Math.cos(a-r.angle)))<.23))continue;const x=Math.sin(a)*28,z=Math.cos(a)*28,w=block(center,stone,[x,7,z],[2.65,14,1]);w.rotation.y=a;world.dungeonColliders.push({x,z,y:DUNGEON_FLOOR,h:16,r:1});}
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2+.12;add(center,loft([[0,0,0,1.2,1.2],[0,1,0,1,1],[0,12,0,.85,.85],[0,14,0,1.4,1.4]],12),stone,[Math.sin(a)*22,0,Math.cos(a)*22]);world.dungeonColliders.push({x:Math.sin(a)*22,z:Math.cos(a)*22,y:DUNGEON_FLOOR,h:14,r:1.1});}
 // Glowing channels mark the fire dragon's arena without adding global light variants.
 const lava=new THREE.MeshStandardMaterial({color:0xdb6a34,emissive:0xc3481c,emissiveIntensity:1.15,roughness:.4});for(let k=0;k<3;k++){const ring=add(center,new THREE.TorusGeometry(5+k*5,.09,7,80),lava,[0,.015,0]);ring.rotation.x=Math.PI/2;}mergeStaticParts(center);
 for(const route of DUNGEON_ROUTES){const {room:r}=route;disk(r.x,r.z,r.r);const hall=new THREE.Group();hall.position.y=DUNGEON_FLOOR;hall.rotation.y=route.angle;group.add(hall);block(hall,floor,[0,-.18,66],[12,.3,88]);for(let side of [-1,1]){block(hall,stone,[side*6,5,66],[.7,10,88]);for(let zz=27;zz<=100;zz+=2){const p=new THREE.Vector3(side*6,0,zz).applyAxisAngle(new THREE.Vector3(0,1,0),route.angle);world.dungeonColliders.push({x:p.x,z:p.z,y:DUNGEON_FLOOR,h:11,r:.65});}}block(hall,stone,[0,10,66],[12,.6,88]);
  for(let zz=30;zz<100;zz+=10){for(const side of [-1,1])block(hall,stone,[side*5.5,2,zz],[.8,4,1]);add(hall,new THREE.TorusGeometry(5.5,.35,8,32,Math.PI),stone,[0,4,zz]);for(const side of [-1,1]){const emissive=new THREE.MeshStandardMaterial({color:route.color,emissive:route.color,emissiveIntensity:1.25});add(hall,new THREE.OctahedronGeometry(.16),emissive,[side*5,3,zz]);}}
  const room=new THREE.Group();room.position.set(r.x,DUNGEON_FLOOR,r.z);group.add(room);for(let k=0;k<40;k++){const a=k/40*Math.PI*2,px=Math.sin(a)*r.r,pz=Math.cos(a)*r.r;const rel=Math.atan2(Math.sin(a-route.angle-Math.PI),Math.cos(a-route.angle-Math.PI));if(Math.abs(rel)<.45)continue;const w=block(room,stone,[px,5,pz],[2.7,10,.7]);w.rotation.y=a;world.dungeonColliders.push({x:r.x+px,z:r.z+pz,y:DUNGEON_FLOOR,h:11,r:.85});}const cap=add(room,new THREE.CircleGeometry(r.r,48),stone,[0,10,0]);cap.rotation.x=Math.PI/2;
  const out=portal(group,r.x,DUNGEON_FLOOR,r.z+7,'dungeon-exit-'+route.id,route.name+' 귀환문','dungeon',route);out.rotation.y=route.angle;
  // Every above-ground entrance has its own stair-head and an unmistakable region sigil.
  const y=route.y??heightAt(route.x,route.z),entry=portal(world.scene,route.x,y,route.z,'dungeon-entry-'+route.id,route.name,'surface',route);for(let k=0;k<7;k++)block(entry,stone,[0,-k*.12,-k*.6],[4,.3,.65]);for(const side of [-1,1])add(entry,taperedCurve([[side*2.5,0,1],[side*3,3,1],[side*2.2,6,0]],[.3,.25,.1],20,8),metal);
  // Species are confined to distinct habitats and do not walk through corridor walls.
  route.monsters.forEach((type,i)=>{world.spawn(type,r.x+(i?4:-4),r.z-2,'abyss-'+route.id+'-'+i);const m=world.monsters.at(-1);m.realm='dungeon';m.floorY=DUNGEON_FLOOR;m.island={x:r.x,z:r.z,y:DUNGEON_FLOOR,r:r.r-2};m.group.position.y=DUNGEON_FLOOR;});
  world.chest(r.x+7,r.z-5,200+DUNGEON_ROUTES.indexOf(route),4);const chest=world.chests.at(-1);chest.realm='dungeon';chest.group.position.y=DUNGEON_FLOOR;
  mergeStaticParts(hall);mergeStaticParts(room);
 }
 world.spawn('firedragon',0,0,'abyss-fire-dragon');const boss=world.monsters.at(-1);boss.realm='dungeon';boss.floorY=DUNGEON_FLOOR;boss.island={x:0,z:0,y:DUNGEON_FLOOR,r:22};boss.group.position.y=DUNGEON_FLOOR;boss.breathCooldown=3;
 // Move only underground content under its own render layer; surface objects stay above.
 for(const m of world.monsters)if(m.realm==='dungeon')group.add(m.group);for(const c of world.chests)if(c.realm==='dungeon')group.add(c.group);group.visible=false;
}
