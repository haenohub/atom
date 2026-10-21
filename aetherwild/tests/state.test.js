import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, attributes, xpForLevel, gainXp, rollLoot, addItems, canCraft, craft, equip, consume, advance, damagePlayer, claimQuests, savePlayer, loadPlayer } from '../src/state.js';
import { CLASSES, BRANCHES, MONSTERS, ITEMS, RECIPES, MAX_LEVEL, skillsFor, SAVE_KEY } from '../src/data.js';
import { seededRandom, heightAt, biomeAt, isWater } from '../src/terrain.js';

for(const id of Object.keys(CLASSES))test(`${id}: basic attributes, class weapon, skill unlocks`,()=>{
  const p=createPlayer(id),a=attributes(p);assert.equal(p.hp,a.maxHp);assert.equal(p.mana,a.maxMana);assert.equal(p.equipment.weapon,CLASSES[id].weapon);
  assert.deepEqual(skillsFor(p).map(s=>s.level),[1,4,7,10,15]);assert.equal(skillsFor(p)[3].locked,true);assert.ok(a.attack>0);
});
test('experience crosses multiple thresholds and caps at level 20',()=>{
  const p=createPlayer();p.hp=1;assert.equal(gainXp(p,xpForLevel(1)+xpForLevel(2)),2);assert.equal(p.level,3);assert.equal(p.xp,0);assert.equal(p.hp,attributes(p).maxHp);
  gainXp(p,1e8);assert.equal(p.level,MAX_LEVEL);assert.equal(p.xp,0);assert.equal(gainXp(p,-5),0);
});
for(const [id,m]of Object.entries(MONSTERS)){
  test(`${id}: exact probability boundaries and guaranteed drops`,()=>{
    const never=rollLoot(id,()=>.9999999),always=rollLoot(id,()=>0);
    for(const [item,chance,min,max]of m.drops){assert.ok(always[item]>=min&&always[item]<=max);assert.equal(Boolean(never[item]),chance===1);}
  });
  test(`${id}: observed drops follow declared independent probabilities`,()=>{
    const rng=seededRandom(42),n=12000,counts={};for(let i=0;i<n;i++){const loot=rollLoot(id,rng);for(const [key,value]of Object.entries(loot)){counts[key]=(counts[key]||0)+1;const row=m.drops.find(r=>r[0]===key);assert.ok(value>=row[2]&&value<=row[3]);}}
    for(const [key,chance]of m.drops)assert.ok(Math.abs((counts[key]||0)/n-chance)<.025,`${id}/${key}`);
  });
}
test('crafting failure is atomic, unknown recipes cannot be crafted',()=>{
  const p=createPlayer();p.inventory.iron=2;const before=JSON.stringify(p);assert.equal(craft(p,'ironSword').ok,false);assert.equal(craft(p,'unknown').ok,false);assert.equal(JSON.stringify(p),before);assert.equal(canCraft(p,null),false);
});
for(const recipe of RECIPES)test(`recipe ${recipe.result}: consumes exact ingredients and produces quantities`,()=>{
  const p=createPlayer();addItems(p,recipe.needs);const before=p.inventory[recipe.result]||0;assert.equal(canCraft(p,recipe),true);assert.equal(craft(p,recipe.result).ok,true);
  for(const [id]of Object.entries(recipe.needs))assert.equal(p.inventory[id],0);assert.equal(p.inventory[recipe.result],before+(recipe.count||1));assert.equal(p.stats.crafts,1);
});
test('equipment respects class and level and changes actual attributes',()=>{
  const p=createPlayer('warrior');addItems(p,{ironSword:1,ironBow:1,leatherArmor:1});const old=attributes(p);assert.equal(equip(p,'ironBow').ok,false);assert.equal(equip(p,'ironSword').ok,false);gainXp(p,200);assert.equal(equip(p,'ironSword').ok,true);assert.equal(equip(p,'leatherArmor').ok,true);assert.equal(attributes(p).attack,old.attack+(p.level-1)*3+12);assert.equal(attributes(p).defense,Math.floor((p.level-1)*.7)+6);
});
test('consumption uses inventory and buffs affect combat, guard reduces incoming damage',()=>{
  const p=createPlayer();const n=p.inventory.health;assert.equal(consume(p,'health').ok,false);assert.equal(p.inventory.health,n);p.hp=1;assert.equal(consume(p,'health').ok,true);assert.equal(p.inventory.health,n-1);assert.ok(p.hp>1);
  addItems(p,{stew:1});const atk=attributes(p).attack;consume(p,'stew');assert.ok(attributes(p).attack>atk);p.hp=100;const raw=damagePlayer(p,20);p.buffs.guard=12;assert.ok(damagePlayer(p,20)<raw);
});
for(const [id,c]of Object.entries(CLASSES))for(const branch of c.branches)test(`advancement ${branch}: level and camp gating, once only, skills and bonuses`,()=>{
  const p=createPlayer(id);assert.equal(advance(p,branch,true).ok,false);gainXp(p,1800);assert.ok(p.level>=10);assert.equal(advance(p,branch,false).ok,false);
  assert.equal(advance(p,branch,true).ok,true);assert.equal(p.branch,branch);assert.equal(p.stats.advanced,1);assert.equal(skillsFor(p).length,5);assert.equal(skillsFor(p)[3].locked,undefined);assert.equal(advance(p,branch,true).ok,false);assert.equal(p.hp,attributes(p).maxHp);
});
test('quests reward each milestone once',()=>{const p=createPlayer();p.stats.kills=3;const r=claimQuests(p);assert.equal(r.length,1);assert.equal(p.gold,30);assert.deepEqual(claimQuests(p),[]);});
test('save round trip preserves inventory, progression and opened treasures',()=>{
  const m=new Map(),storage={setItem:(k,v)=>m.set(k,v),getItem:k=>m.get(k)};const p=createPlayer('mage');gainXp(p,1800);advance(p,'archmage',true);p.opened=['chest-0'];p.position={x:120,z:-230};p.inventory.crystal=9;assert.equal(savePlayer(p,storage),true);const restored=loadPlayer(storage);assert.equal(restored.classId,'mage');assert.equal(restored.branch,'archmage');assert.equal(restored.inventory.crystal,9);assert.deepEqual(restored.position,p.position);assert.deepEqual(restored.opened,p.opened);
});
test('corrupt saves and unavailable storage are handled',()=>{
  assert.equal(loadPlayer({getItem:()=>'{broken'}),null);assert.equal(loadPlayer({getItem:()=>JSON.stringify({version:99})}),null);assert.equal(savePlayer(createPlayer(),{setItem:()=>{throw Error('full')}}),false);
  const p=createPlayer();p.level=999;p.hp=-30;p.inventory.health=-10;p.position={x:99999,z:-99999};const loaded=loadPlayer({getItem:()=>JSON.stringify({version:1,player:p})});assert.equal(loaded.level,20);assert.equal(loaded.hp,1);assert.equal(loaded.inventory.health,undefined);assert.equal(loaded.position.x,310);
});
test('all item references and recipe results exist',()=>{for(const m of Object.values(MONSTERS))for(const [id]of m.drops)assert.ok(ITEMS[id]);for(const r of RECIPES){assert.ok(ITEMS[r.result]);for(const id of Object.keys(r.needs))assert.ok(ITEMS[id]);}});
test('terrain is deterministic, continuous and has meaningful elevation and water',()=>{
  assert.equal(biomeAt(0,44),'forest');assert.equal(biomeAt(-130,-32),'lake');assert.equal(biomeAt(135,-35),'highland');assert.equal(biomeAt(-108,-215),'snow');assert.equal(biomeAt(163,-220),'volcano');
  assert.ok(heightAt(-108,-215)>heightAt(0,44)+45);assert.equal(isWater(-130,-32),true);assert.equal(isWater(0,44),false);assert.ok(Math.abs(heightAt(0,44)-heightAt(.1,44))<.2);
});
