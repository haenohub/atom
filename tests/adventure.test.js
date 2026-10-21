import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, savePlayer, loadPlayer, craft } from '../src/state.js';
import { NPCS, NPC_QUESTS } from '../src/quest-data.js';
import { questStatus, questProgress, acceptQuest, turnInQuest, npcMarker } from '../src/quests.js';
import { sanitizeDrop, collectDrop } from '../src/loot.js';
import { warriorAction, warriorPose } from '../src/motion.js';
import { ITEMS, BRANCH_SKILLS } from '../src/data.js';
const q=id=>NPC_QUESTS.find(q=>q.id===id);
const roundTrip=p=>{let data;savePlayer(p,{setItem:(_,v)=>data=v});return loadPlayer({getItem:()=>data});};
test('NPC kill quest counts only kills after acceptance and requires correct quest giver',()=>{
  const p=createPlayer();p.killsByType.slime=9;
  assert.equal(acceptQuest(p,'road','elia').ok,false);assert.equal(acceptQuest(p,'road','rhea').ok,true);
  assert.equal(questProgress(p,q('road')),0);p.killsByType.wolf=10;assert.equal(questProgress(p,q('road')),0);
  assert.equal(acceptQuest(p,'road','rhea').ok,false);p.killsByType.slime+=3;
  assert.equal(questStatus(p,q('road')),'ready');assert.equal(npcMarker(p,'rhea'),'?');
  assert.equal(turnInQuest(p,'road','toren').ok,false);
  const hp=p.inventory.health,result=turnInQuest(p,'road','rhea');assert.equal(result.ok,true);assert.equal(p.inventory.health,hp+2);
  const gold=p.gold,xp=p.xp;assert.equal(turnInQuest(p,'road','rhea').ok,false);assert.equal(p.gold,gold);assert.equal(p.xp,xp);
});
test('delivery checks current inventory and consumes exactly once only on report',()=>{
  const p=createPlayer();p.inventory.herb=4;acceptQuest(p,'herbs','elia');assert.equal(questStatus(p,q('herbs')),'ready');
  p.inventory.herb=3;const gold=p.gold;assert.equal(turnInQuest(p,'herbs','elia').ok,false);assert.equal(p.inventory.herb,3);assert.equal(p.gold,gold);
  p.inventory.herb=6;assert.equal(turnInQuest(p,'herbs','elia').ok,true);assert.equal(p.inventory.herb,2);assert.equal(p.gold,25);
});
test('quest chains enforce both level and prerequisite completion',()=>{
  const p=createPlayer();p.level=20;assert.equal(questStatus(p,q('fangs')),'locked');assert.equal(acceptQuest(p,'fangs','rhea').ok,false);
  p.quests.road={status:'completed',baseline:0};p.level=1;assert.equal(questStatus(p,q('fangs')),'locked');p.level=3;assert.equal(questStatus(p,q('fangs')),'available');
});
test('alchemy objective advances only through successful alchemy after accepting',()=>{
  const p=createPlayer();p.quests.herbs={status:'completed',baseline:0};p.stats.alchemy=3;acceptQuest(p,'brewer','elia');
  assert.equal(craft(p,'health').ok,false);assert.equal(questProgress(p,q('brewer')),0);
  p.inventory.herb=20;p.inventory.slime=20;assert.equal(craft(p,'health').ok,true);assert.equal(questStatus(p,q('brewer')),'ready');
});
test('all NPC quest rewards reference real content and each quest has a unique reachable giver',()=>{
  assert.equal(new Set(NPC_QUESTS.map(q=>q.id)).size,6);
  for(const quest of NPC_QUESTS){assert.ok(NPCS.some(n=>n.id===quest.npc));for(const id of Object.keys(quest.items))assert.ok(ITEMS[id]);if(quest.requires)assert.ok(q(quest.requires));}
});
test('ground drops are separate from inventory and collecting is atomic and idempotent',()=>{
  const p=createPlayer(),bag={id:'drop-1',type:'wolf',x:2,z:3,items:{fang:2,leather:1},gold:9};p.groundLoot.push(bag);
  assert.equal(p.inventory.fang,undefined);assert.equal(p.gold,0);assert.deepEqual(collectDrop(p,bag.id),bag);
  assert.equal(p.inventory.fang,2);assert.equal(p.gold,9);assert.equal(collectDrop(p,bag.id),null);assert.equal(p.gold,9);
});
test('active/completed quests and uncollected bags survive save reload; bags cannot duplicate',()=>{
  const p=createPlayer();acceptQuest(p,'road','rhea');p.killsByType.slime=2;p.quests.herbs={status:'completed',baseline:0};
  const bag={id:'drop-1',type:'slime',x:0,z:44,items:{slime:2},gold:5};p.groundLoot.push(bag,bag);
  const loaded=roundTrip(p);assert.equal(questProgress(loaded,q('road')),2);assert.equal(questStatus(loaded,q('herbs')),'completed');assert.equal(loaded.groundLoot.length,1);
  collectDrop(loaded,bag.id);const again=roundTrip(loaded);assert.equal(again.groundLoot.length,0);assert.equal(again.inventory.slime,2);assert.equal(again.gold,5);
});
test('v0.2 saves migrate without resetting character progression or granting quest rewards',()=>{
  const p=createPlayer('ranger');p.level=8;p.gold=100;delete p.quests;delete p.groundLoot;delete p.killsByType;delete p.stats.alchemy;
  const loaded=roundTrip(p);assert.equal(loaded.level,8);assert.equal(loaded.gold,100);assert.deepEqual(loaded.quests,{});assert.deepEqual(loaded.groundLoot,[]);assert.equal(loaded.stats.alchemy,0);
});
test('malformed dropped items and off-world drop records cannot enter saves',()=>{
  assert.equal(sanitizeDrop({id:'x',x:Infinity,z:0}),null);assert.equal(sanitizeDrop({id:'x',x:999,z:0,items:{herb:2}}),null);
  const bag=sanitizeDrop({id:'x',x:0,z:0,items:{herb:2,missing:99,wood:-1},gold:-4});assert.deepEqual(bag.items,{herb:2});assert.equal(bag.gold,0);
});
test('warrior combo alternates sweep direction and recovers fully with distinct skill poses',()=>{
  const a=warriorAction('basic',0),b=warriorAction('basic',1);a.age=b.age=.25;
  assert.ok(warriorPose(a).x*warriorPose(b).x<0);assert.ok(a.impact>0&&a.impact<a.duration);
  for(const kind of ['basic','aoe','dash','guard','sanctuary','rage','freeze','judgment']){
    const action=warriorAction(kind);for(let t=0;t<=action.duration;t+=.02){action.age=t;assert.ok(Object.values(warriorPose(action)).every(Number.isFinite));}
    action.age=action.duration;assert.ok(Object.values(warriorPose(action)).every(v=>Math.abs(v)<1e-10));
  }
  assert.equal(BRANCH_SKILLS.knight[1].motion,'judgment');const heavy=warriorAction(BRANCH_SKILLS.knight[1].motion);heavy.age=heavy.impact;assert.ok(warriorPose(heavy).y>0);assert.notDeepEqual(warriorPose(null,true),warriorPose(null));
});
