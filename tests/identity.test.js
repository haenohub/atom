import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayer, attributes, equip, unequip, gainXp, statPoints, allocateStat, resetStats, savePlayer, loadPlayer, consume, rollLoot } from '../src/state.js';
import { ITEMS, MONSTERS } from '../src/data.js';
import { EQUIPMENT_SLOTS, MAIN_STAT } from '../src/equipment-data.js';
import { itemArt } from '../src/item-art.js';
import { followCamera } from '../src/camera.js';
import { heightAt } from '../src/terrain.js';
const roundTrip=p=>{let text;savePlayer(p,{setItem:(_,value)=>text=value});return loadPlayer({getItem:()=>text});};
for(const classId of ['warrior','ranger','mage'])test(`${classId}: five real equipment slots, class restriction, replacement and unequip`,()=>{
  const p=createPlayer(classId);assert.deepEqual(Object.keys(p.equipment),Object.keys(EQUIPMENT_SLOTS));assert.ok(Object.values(p.equipment).every(id=>p.inventory[id]===1));
  const base=attributes(p),helmet=p.equipment.helmet;assert.equal(unequip(p,'helmet').ok,true);assert.ok(attributes(p).defense<base.defense);assert.equal(p.inventory[helmet],1);assert.equal(equip(p,helmet).ok,true);assert.deepEqual(attributes(p),base);
  assert.equal(unequip(p,'weapon').ok,false);const other=classId==='warrior'?'mage':'warrior',otherId=`${other}_basic_armor`;p.inventory[otherId]=1;assert.equal(equip(p,otherId).ok,false);
  const epic=`${classId}_epic_armor`;p.inventory[epic]=1;assert.equal(equip(p,epic).ok,false);gainXp(p,2500);assert.ok(p.level>=12);const before=attributes(p);assert.equal(equip(p,epic).ok,true);assert.ok(attributes(p).attack>before.attack);assert.ok(attributes(p).defense>before.defense);assert.ok(attributes(p).maxHp>before.maxHp);
});
test('stat points cannot be spent early, overdrawn or created by resetting',()=>{
  const p=createPlayer();assert.equal(statPoints(p),0);assert.equal(allocateStat(p,'strength').ok,false);gainXp(p,74);assert.equal(p.level,2);assert.equal(statPoints(p),3);
  const before=JSON.stringify(p);assert.equal(allocateStat(p,'__proto__').ok,false);assert.equal(JSON.stringify(p),before);
  for(let i=0;i<3;i++)assert.equal(allocateStat(p,'strength').ok,true);assert.equal(statPoints(p),0);assert.equal(allocateStat(p,'dexterity').ok,false);resetStats(p);assert.equal(statPoints(p),3);resetStats(p);assert.equal(statPoints(p),3);
});
test('allocated primary stats improve actual damage; vitality, intellect and dexterity affect combat values',()=>{
  for(const classId of ['warrior','ranger','mage']){const p=createPlayer(classId);p.level=20;const before=attributes(p);allocateStat(p,MAIN_STAT[classId]);assert.ok(attributes(p).attack>before.attack);}
  const p=createPlayer();p.level=20;const a=attributes(p);allocateStat(p,'vitality');assert.equal(attributes(p).maxHp,a.maxHp+8);allocateStat(p,'intelligence');assert.equal(attributes(p).maxMana,a.maxMana+7);assert.ok(attributes(p).manaRegen>a.manaRegen);allocateStat(p,'dexterity');assert.ok(attributes(p).critChance>a.critChance);assert.ok(attributes(p).speedMultiplier>a.speedMultiplier);
});
test('equipment and stat resets clamp both HP and MP without healing exploits',()=>{
  const p=createPlayer('mage');p.level=20;for(let i=0;i<12;i++){allocateStat(p,'vitality');allocateStat(p,'intelligence');}p.hp=attributes(p).maxHp;p.mana=attributes(p).maxMana;resetStats(p);assert.equal(p.hp,attributes(p).maxHp);assert.equal(p.mana,attributes(p).maxMana);
  p.hp=1;allocateStat(p,'vitality');assert.equal(p.hp,1);unequip(p,'helmet');assert.ok(p.mana<=attributes(p).maxMana);
});
test('new save round trip preserves all slots, spent points and F1 preference',()=>{
  const p=createPlayer('ranger');p.level=10;allocateStat(p,'dexterity');allocateStat(p,'vitality');p.perspective='third';p.inventory.recall=2;
  const loaded=roundTrip(p);assert.deepEqual(loaded.equipment,p.equipment);assert.deepEqual(loaded.allocations,p.allocations);assert.equal(loaded.perspective,'third');assert.equal(loaded.inventory.recall,2);assert.equal(statPoints(loaded),25);
});
test('v0.3 migration keeps old armor and inventory, opens new slots and grants only earned stat points',()=>{
  const p=createPlayer();p.level=6;p.equipment={weapon:'sword',armor:'leatherArmor'};p.inventory={sword:1,leatherArmor:1,health:4};delete p.allocations;delete p.perspective;
  const loaded=roundTrip(p);assert.equal(loaded.equipment.armor,'leatherArmor');assert.equal(loaded.equipment.helmet,null);assert.equal(loaded.inventory.health,4);assert.equal(statPoints(loaded),15);assert.equal(loaded.perspective,'first');
  p.allocations={strength:999,dexterity:999,intelligence:999,vitality:-1};const hostile=roundTrip(p);assert.equal(Object.values(hostile.allocations).reduce((a,b)=>a+b),15);assert.equal(statPoints(hostile),0);
});
test('every item has its own valid image cell, all monster loot images are explicitly mapped',()=>{
  const ids=Object.keys(ITEMS),cells=ids.map(id=>{const a=itemArt(id);assert.ok(a.index>=0&&a.index<a.columns*a.columns);return `${a.sheet}:${a.index}`;});assert.equal(new Set(cells).size,ids.length);
  for(const m of Object.values(MONSTERS))for(const [id]of m.drops)assert.notEqual(`${itemArt(id).sheet}:${itemArt(id).index}`,'loot-icons.png:22','generic bag fallback');
});
test('recall scroll consumes one at full HP, missing item cannot be used and monsters actually roll it',()=>{
  const p=createPlayer();assert.equal(consume(p,'recall').ok,false);p.inventory.recall=2;assert.equal(consume(p,'recall').recall,true);assert.equal(p.inventory.recall,1);assert.equal(consume(p,'recall').ok,true);assert.equal(consume(p,'recall').ok,false);
  for(const [id,m]of Object.entries(MONSTERS)){const row=m.drops.find(([id])=>id==='recall');assert.ok(row);assert.equal(rollLoot(id,()=>0).recall,1);assert.equal(!!rollLoot(id,()=>.999999).recall,!!m.boss);}
});
test('third-person camera keeps player eye unchanged and retracts before terrain or obstacles',()=>{
  const eye=new THREE.Vector3(0,heightAt(0,44)+1.75,44),original=eye.clone(),target=new THREE.Vector3(0,eye.y,0),cam=new THREE.PerspectiveCamera();const free=followCamera(cam,eye,0,0,[],target);assert.ok(free>4);assert.deepEqual(eye,original);
  const blocked=followCamera(cam,eye,0,0,[{x:.3,z:46,r:1}],target);assert.ok(blocked<free&&blocked>=0);assert.ok(cam.position.y>=heightAt(cam.position.x,cam.position.z));assert.deepEqual(eye,original);
});
