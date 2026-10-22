import { WORLD_LIMIT,DUNGEON_FLOOR,validDungeonPosition } from './world-layout.js';
import { validSkyPosition } from './sky-layout.js';
import { CLASSES, BRANCHES, ITEMS, RECIPES, MAX_LEVEL, MONSTERS, QUESTS, SAVE_KEY, CAMP } from './data.js';
import { EQUIPMENT_SLOTS, STAT_NAMES, CLASS_STATS, MAIN_STAT, starterGear } from './equipment-data.js';
import { NPC_QUESTS } from './quest-data.js';
import { sanitizeDrop } from './loot.js';
export const xpForLevel = level => 50 + level * 24;
export function createPlayer(classId = 'warrior') {
  if (!CLASSES[classId]) throw new Error('알 수 없는 직업');
  const c = CLASSES[classId];
  const p={ classId, branch: null, level: 1, xp: 0, hp: c.hp, mana: c.mana, gold: 0,
    inventory: { [c.weapon]: 1, health: 5, mana: 3, ...Object.fromEntries(Object.values(starterGear(classId)).map(id=>[id,1])) }, equipment: { weapon: c.weapon, ...starterGear(classId) }, allocations:{strength:0,dexterity:0,intelligence:0,vitality:0}, perspective:'first',
    stats: { kills: 0, gathers: 0, crafts: 0, chests: 0, advanced: 0, boss: 0, alchemy: 0 }, quests: {}, killsByType: {}, groundLoot: [], claimed: [], opened: [],
    position: { ...CAMP },flight:null, buffs: { food: 0, rage: 0, guard: 0 }, playtime: 0 };const a=attributes(p);p.hp=a.maxHp;p.mana=a.maxMana;return p;
}
export function statPoints(p){return Math.max(0,(p.level-1)*3-Object.values(p.allocations||{}).reduce((sum,n)=>sum+n,0));}
export function attributes(p) {
  const c=CLASSES[p.classId],b=BRANCHES[p.branch]||{},bonus={strength:0,dexterity:0,intelligence:0,vitality:0};let gearHp=0,gearMana=0,gearAttack=0,gearDefense=0;
  for(const key of Object.keys(bonus))bonus[key]=p.allocations?.[key]||0;
  for(const id of Object.values(p.equipment)){const item=ITEMS[id];if(!item)continue;gearHp+=item.hp||0;gearMana+=item.mana||0;gearAttack+=item.attack||0;gearDefense+=item.defense||0;for(const key of Object.keys(bonus))bonus[key]+=item.stats?.[key]||0;}
  const primary=bonus[MAIN_STAT[p.classId]];
  return {...Object.fromEntries(Object.entries(bonus).map(([key,n])=>[key,CLASS_STATS[p.classId][key]+p.level-1+n])),
    maxHp:c.hp+(p.level-1)*14+(b.hp||0)+gearHp+bonus.vitality*8,
    maxMana:c.mana+(p.level-1)*6+(b.mana||0)+gearMana+bonus.intelligence*7,
    attack:Math.round((c.attack+(p.level-1)*3+gearAttack+(b.attack||0)+primary*1.5)*(p.buffs.food>0?1.2:1)*(p.buffs.rage>0?1.6:1)),
    defense:Math.floor((p.level-1)*.7)+gearDefense+(b.defense||0)+Math.floor(bonus.vitality*.25),
    critChance:Math.min(.5,.12+bonus.dexterity*.0035),critMultiplier:1.6+bonus.strength*.008,
    manaRegen:3.5+bonus.intelligence*.06,speedMultiplier:1+Math.min(.15,bonus.dexterity*.003)};
}
function clampVitals(p){const a=attributes(p);p.hp=Math.min(p.hp,a.maxHp);p.mana=Math.min(p.mana,a.maxMana);}
export function allocateStat(p,key){
  if(!Object.hasOwn(STAT_NAMES,key)||statPoints(p)<1)return {ok:false,message:'배분 가능한 능력치 포인트가 없습니다.'};
  p.allocations[key]++;return {ok:true,message:`${STAT_NAMES[key]} +1`};
}
export function resetStats(p){for(const key of Object.keys(STAT_NAMES))p.allocations[key]=0;clampVitals(p);return {ok:true,message:'능력치를 초기화했습니다. 포인트를 다시 배분하세요.'};}
export function unequip(p,slot){if(!Object.hasOwn(EQUIPMENT_SLOTS,slot)||slot==='weapon'||!p.equipment[slot])return {ok:false,message:'해제할 장비가 없습니다.'};p.equipment[slot]=null;clampVitals(p);return {ok:true,message:'장비를 해제했습니다.'};}
export function gainXp(p, amount) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  p.xp += amount; let levels = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; levels++; }
  if (p.level === MAX_LEVEL) p.xp = 0;
  if (levels) { const a = attributes(p); p.hp = a.maxHp; p.mana = a.maxMana; }
  return levels;
}
export const TEST_XP_MULTIPLIER=5, TEST_EQUIPMENT_MULTIPLIER=5;
export const effectiveDropChance=(id,chance)=>Math.min(1,chance*(['weapon','armor'].includes(ITEMS[id]?.type)?TEST_EQUIPMENT_MULTIPLIER:1));
export function awardXp(p,baseAmount){return gainXp(p,baseAmount*TEST_XP_MULTIPLIER);}
export function rollLoot(monsterId, rng = Math.random) {
  const result = {};
  for (const [id, chance, min, max] of MONSTERS[monsterId].drops) {
    if (rng() < effectiveDropChance(id,chance)) result[id] = min + Math.floor(Math.min(.99999999, Math.max(0, rng())) * (max - min + 1));
  }
  return result;
}
export function addItems(p, items) { for (const [id, count] of Object.entries(items)) if (ITEMS[id] && Number.isInteger(count) && count > 0) p.inventory[id] = (p.inventory[id] || 0) + count; }
export function canCraft(p, recipe) { return !!recipe && Object.entries(recipe.needs).every(([id,n]) => (p.inventory[id] || 0) >= n); }
export function craft(p, resultId) {
  const r = RECIPES.find(r => r.result === resultId);
  if (!canCraft(p, r)) return { ok: false, message: '재료가 부족합니다.' };
  for (const [id, n] of Object.entries(r.needs)) p.inventory[id] -= n;
  addItems(p, { [r.result]: r.count || 1 }); p.stats.crafts++; if(r.category==='alchemy')p.stats.alchemy++;
  return { ok: true, message: `${ITEMS[r.result].name} 제작 완료` };
}
export function equip(p, id) {
  const item = ITEMS[id];
  if (!item || !p.inventory[id] || !['weapon','armor'].includes(item.type)) return { ok: false, message: '장착할 수 없는 아이템입니다.' };
  if (item.classId && item.classId !== p.classId) return { ok: false, message: '다른 직업의 무기입니다.' };
  if (p.level < item.level) return { ok: false, message: `${item.level}레벨부터 장착할 수 있습니다.` };
  p.equipment[item.slot||item.type] = id;
  clampVitals(p);
  return { ok: true, message: `${item.name} 장착` };
}
export function consume(p, id) {
  const item = ITEMS[id]; if (item?.type !== 'consumable' || !(p.inventory[id] > 0)) return { ok: false, message: '사용할 아이템이 없습니다.' };
  if(item.recall){p.inventory[id]--;return {ok:true,recall:true,message:'새벽 야영지로 귀환했습니다.'};}
  const a = attributes(p);
  if (!item.buff && (!item.heal || p.hp >= a.maxHp) && (!item.mana || p.mana >= a.maxMana)) return { ok: false, message: '이미 충분히 회복되어 있습니다.' };
  p.inventory[id]--; if (item.heal) p.hp = Math.min(a.maxHp, p.hp + a.maxHp * item.heal);
  if (item.mana) p.mana = Math.min(a.maxMana, p.mana + a.maxMana * item.mana);
  if (item.buff) p.buffs.food = Math.max(p.buffs.food, item.buff);
  return { ok: true, message: `${item.name} 사용` };
}
export function advance(p, branch, atCamp) {
  if (!atCamp) return { ok: false, message: '새벽의 숲 야영지에서 전직할 수 있습니다.' };
  if (p.level < 10) return { ok: false, message: '10레벨부터 전직할 수 있습니다.' };
  if (p.branch || !CLASSES[p.classId].branches.includes(branch)) return { ok: false, message: '선택할 수 없는 전직입니다.' };
  p.branch = branch; p.stats.advanced = 1; const a = attributes(p); p.hp = a.maxHp; p.mana = a.maxMana;
  return { ok: true, message: `${BRANCHES[branch].name} 전직 완료!` };
}
export function damagePlayer(p, raw) {
  const a = attributes(p); const amount = Math.max(1, Math.round(Math.max(1,raw - a.defense) * (p.buffs.guard > 0 ? .4 : 1)));
  p.hp = Math.max(0, p.hp - amount); return amount;
}
export function claimQuests(p) {
  const rewards = [];
  for (const q of QUESTS) if (!p.claimed.includes(q.id) && p.stats[q.stat] >= q.target) {
    p.claimed.push(q.id); p.gold += q.gold; const levels = awardXp(p,q.xp); rewards.push({ ...q, xp:q.xp*TEST_XP_MULTIPLIER, levels });
  }
  return rewards;
}
export function savePlayer(p, storage = globalThis.localStorage) {
  try { storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: p, savedAt: Date.now() })); return true; } catch { return false; }
}
export function loadPlayer(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (!data || data.version !== 1 || !data.player || !CLASSES[data.player.classId]) return null;
    const raw = data.player, p = createPlayer(raw.classId);
    const finite = (n, min, max, fallback) => Number.isFinite(n) ? Math.max(min, Math.min(max,n)) : fallback;
    p.level = Math.floor(finite(raw.level, 1, MAX_LEVEL, 1));
    p.xp = finite(raw.xp,0,xpForLevel(p.level)-1,0); p.gold = Math.floor(finite(raw.gold,0,1e8,0));
    p.branch = CLASSES[p.classId].branches.includes(raw.branch) && p.level >= 10 ? raw.branch : null;
    p.inventory = {};
    if (raw.inventory && typeof raw.inventory === 'object') for (const [id,n] of Object.entries(raw.inventory)) if (ITEMS[id] && Number.isInteger(n) && n>0) p.inventory[id] = Math.min(n,99999);
    p.equipment = Object.fromEntries(Object.keys(EQUIPMENT_SLOTS).map(slot=>[slot,null]));p.equipment.weapon=CLASSES[p.classId].weapon; p.inventory[p.equipment.weapon] = Math.max(1,p.inventory[p.equipment.weapon] || 0);
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
      const id = raw.equipment?.[slot], it = ITEMS[id];
      if (it && (it.slot||it.type) === slot && p.inventory[id] && p.level >= it.level && (!it.classId || it.classId === p.classId)) p.equipment[slot] = id;
    }
    for (const key of Object.keys(p.stats)) p.stats[key] = Math.floor(finite(raw.stats?.[key],0,1e7,0));
    p.claimed = Array.isArray(raw.claimed) ? [...new Set(raw.claimed.filter(id => QUESTS.some(q => q.id === id)))] : [];
    p.opened = Array.isArray(raw.opened) ? [...new Set(raw.opened.filter(id => typeof id === 'string' && /^chest-\d+$/.test(id)))].slice(0,100) : [];
    if (raw.position && Number.isFinite(raw.position.x) && Number.isFinite(raw.position.z)) p.position = { x: finite(raw.position.x,-WORLD_LIMIT,WORLD_LIMIT,0), z: finite(raw.position.z,-WORLD_LIMIT,WORLD_LIMIT,44) };
    if(validDungeonPosition(raw.position))p.position={x:raw.position.x,z:raw.position.z,y:DUNGEON_FLOOR,realm:'dungeon'};
    p.flight=raw.flight&&p.position.realm!=='dungeon'&&Number.isFinite(raw.flight.y)?{y:finite(raw.flight.y,2.3,220,5)}:null;
    if(raw.position&&validSkyPosition(raw.position))p.position.y=raw.position.y;
    let budget=(p.level-1)*3;
    for(const key of Object.keys(STAT_NAMES)){const points=Math.floor(finite(raw.allocations?.[key],0,budget,0));p.allocations[key]=points;budget-=points;}
    p.perspective=raw.perspective==='third'?'third':'first';
    const a = attributes(p); p.hp = finite(raw.hp,1,a.maxHp,a.maxHp); p.mana = finite(raw.mana,0,a.maxMana,a.maxMana);
    for(const [type,n] of Object.entries(raw.killsByType||{}))if(MONSTERS[type])p.killsByType[type]=Math.floor(finite(n,0,1e7,0));
    for(const q of NPC_QUESTS){const entry=raw.quests?.[q.id];if(entry&&['active','completed'].includes(entry.status))p.quests[q.id]={status:entry.status,baseline:Math.floor(finite(entry.baseline,0,1e7,0))};}
    const dropIds=new Set();
    if(Array.isArray(raw.groundLoot))for(const rawDrop of raw.groundLoot){const drop=sanitizeDrop(rawDrop);if(drop&&!dropIds.has(drop.id)){p.groundLoot.push(drop);dropIds.add(drop.id);}}
    p.playtime = finite(raw.playtime,0,1e9,0);
    return p;
  } catch { return null; }
}
