import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer,savePlayer,loadPlayer,awardXp,gainXp,effectiveDropChance,rollLoot } from '../src/state.js';
import { saveSlot,loadSlot,listSlots,selectSlot,activeSlot } from '../src/save-slots.js';
import { SAVE_KEY,MONSTERS,ITEMS } from '../src/data.js';
import { SKY_ISLANDS,SKY_ROPES,platformFloor,CLOUD_START } from '../src/sky-layout.js';
import { sculptGeometry } from '../src/sculpt.js';
import { NPC_QUESTS } from '../src/quest-data.js';
import { acceptQuest,turnInQuest } from '../src/quests.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('five save slots isolate characters, positions and unclaimed ground loot',()=>{
 const s=storage();for(let n=1;n<=5;n++){const p=createPlayer(['warrior','ranger','mage'][n%3]);p.gold=n*10;p.position={...CLOUD_START};p.groundLoot=[{id:'drop-'+n,type:'cloudray',...CLOUD_START,items:{crystal:n},gold:n}];assert.ok(saveSlot(p,n,s));}
 assert.equal(listSlots(s).length,5);for(let n=1;n<=5;n++){const p=loadSlot(n,s);assert.equal(p.gold,n*10);assert.deepEqual(p.position,CLOUD_START);assert.equal(p.groundLoot[0].y,66);assert.equal(p.groundLoot[0].items.crystal,n);}
 assert.ok(selectSlot(5,s));assert.equal(activeSlot(s),5);assert.equal(saveSlot(createPlayer(),6,s),false);assert.equal(selectSlot(0,s),false);assert.equal(loadSlot(0,s),null);
 const p=loadSlot(2,s);p.gold=999;saveSlot(p,2,s);assert.equal(loadSlot(1,s).gold,10);assert.equal(loadSlot(3,s).gold,30);
});
test('old single save migrates to slot one once without replacing existing slots or original',()=>{
 const s=storage(),p=createPlayer('mage');p.gold=127;savePlayer(p,s);const original=s.getItem(SAVE_KEY);assert.equal(loadSlot(1,s).gold,127);assert.equal(loadSlot(2,s),null);assert.equal(s.getItem(SAVE_KEY),original);
 const newer=createPlayer('ranger');newer.gold=991;saveSlot(newer,1,s);assert.equal(loadSlot(1,s).gold,991);assert.equal(s.getItem(SAVE_KEY),original);
});
test('damaged slot does not prevent other slots from loading; denied storage is playable',()=>{
 const s=storage();saveSlot(createPlayer('mage'),3,s);s.setItem('aetherwild.slot.2.v1','{bad');assert.equal(loadSlot(2,s),null);assert.equal(loadSlot(3,s).classId,'mage');
 const denied={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('full');}};assert.equal(loadSlot(1,denied),null);assert.equal(saveSlot(createPlayer(),1,denied),false);assert.equal(activeSlot(denied),1);
});
test('all real XP rewards multiply five times, with normal level thresholds preserved',()=>{
 const p=createPlayer(),baseline=createPlayer();awardXp(p,43);gainXp(baseline,215);assert.equal(p.level,baseline.level);assert.equal(p.xp,baseline.xp);
 const q=createPlayer();acceptQuest(q,'road','rhea');q.killsByType.slime=3;const before=createPlayer();gainXp(before,NPC_QUESTS.find(q=>q.id==='road').xp*5);
 const result=turnInQuest(q,'road','rhea');assert.ok(result.ok);assert.match(result.message,/EXP/);assert.equal(q.level,before.level);assert.equal(q.xp,before.xp);
});
test('equipment chances are exactly x5 with a hard 100% cap and materials are unchanged',()=>{
 assert.equal(effectiveDropChance('ironSword',.3),1);assert.equal(effectiveDropChance('health',.08),.08);
 for(const [type,m]of Object.entries(MONSTERS)){
  const gear=m.drops.filter(([id])=>['weapon','armor'].includes(ITEMS[id]?.type));assert.equal(gear.length,15);
  for(const [id,chance]of m.drops){const expected=['weapon','armor'].includes(ITEMS[id].type)?Math.min(1,chance*5):chance;assert.equal(effectiveDropChance(id,chance),expected);}
  const loot=rollLoot(type,()=>0);for(const [id]of gear)assert.equal(loot[id],1);
 }
});
test('sky floors are solid only below the supplied ceiling; rope exits land safely',()=>{
 for(const p of SKY_ISLANDS){assert.equal(platformFloor(p.x,p.z,p.y+.1),p.y);assert.equal(platformFloor(p.x,p.z,p.y-1),-Infinity);}
 for(const rope of SKY_ROPES){assert.equal(platformFloor(rope.exitX,rope.exitZ,rope.top+.1),rope.top);assert.equal(platformFloor(rope.x,rope.z,rope.bottom+.1),rope.bottom);}
 assert.equal(platformFloor(0,0),-Infinity);
});
test('elevated save positions validate against real island surfaces instead of trusting arbitrary altitude',()=>{
 const s=storage(),p=createPlayer();p.position={...CLOUD_START};saveSlot(p,1,s);assert.equal(loadSlot(1,s).position.y,66);
 p.position={x:0,z:44,y:999};saveSlot(p,1,s);assert.equal(loadSlot(1,s).position.y,undefined);
});
test('sculpted anatomy generates one connected indexed surface with normalized bone weights',()=>{
 const g=sculptGeometry('regression-connected',[[0,0,0,.6,.8,.45,0],[0,.8,0,.35,.45,.35,1]],.13,.18);
 assert.ok(g.userData.continuousSurface);assert.ok(g.attributes.position.count>300);const adjacent=new Map();for(let i=0;i<g.index.count;i+=3){const t=[0,1,2].map(j=>g.index.getX(i+j));for(const a of t){if(!adjacent.has(a))adjacent.set(a,new Set());for(const b of t)adjacent.get(a).add(b);}}
 const seen=new Set(),stack=[0];while(stack.length){const n=stack.pop();if(seen.has(n))continue;seen.add(n);stack.push(...adjacent.get(n));}assert.equal(seen.size,g.attributes.position.count);
 for(let i=0;i<g.attributes.skinWeight.count;i++){let sum=0;for(let j=0;j<4;j++)sum+=g.attributes.skinWeight.array[i*4+j];assert.ok(Math.abs(sum-1)<1e-5);}
});
