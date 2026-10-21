import { CLASSES, BRANCHES, ITEMS, RECIPES, MAX_LEVEL, MONSTERS, QUESTS, SAVE_KEY, CAMP } from './data.js';
export const xpForLevel = level => 50 + level * 24;
export function createPlayer(classId = 'warrior') {
  if (!CLASSES[classId]) throw new Error('알 수 없는 직업');
  const c = CLASSES[classId];
  return { classId, branch: null, level: 1, xp: 0, hp: c.hp, mana: c.mana, gold: 0,
    inventory: { [c.weapon]: 1, health: 5, mana: 3 }, equipment: { weapon: c.weapon, armor: null },
    stats: { kills: 0, gathers: 0, crafts: 0, chests: 0, advanced: 0, boss: 0 }, claimed: [], opened: [],
    position: { ...CAMP }, buffs: { food: 0, rage: 0, guard: 0 }, playtime: 0 };
}
export function attributes(p) {
  const c = CLASSES[p.classId], b = BRANCHES[p.branch] || {}, w = ITEMS[p.equipment.weapon] || {}, a = ITEMS[p.equipment.armor] || {};
  return { maxHp: c.hp + (p.level - 1) * 14 + (b.hp || 0) + (a.hp || 0), maxMana: c.mana + (p.level - 1) * 6 + (b.mana || 0),
    attack: Math.round((c.attack + (p.level - 1) * 3 + (w.attack || 0) + (b.attack || 0)) * (p.buffs.food > 0 ? 1.2 : 1) * (p.buffs.rage > 0 ? 1.6 : 1)),
    defense: Math.floor((p.level - 1) * .7) + (a.defense || 0) + (b.defense || 0) };
}
export function gainXp(p, amount) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  p.xp += amount; let levels = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; levels++; }
  if (p.level === MAX_LEVEL) p.xp = 0;
  if (levels) { const a = attributes(p); p.hp = a.maxHp; p.mana = a.maxMana; }
  return levels;
}
export function rollLoot(monsterId, rng = Math.random) {
  const result = {};
  for (const [id, chance, min, max] of MONSTERS[monsterId].drops) {
    if (rng() < chance) result[id] = min + Math.floor(Math.min(.99999999, Math.max(0, rng())) * (max - min + 1));
  }
  return result;
}
export function addItems(p, items) { for (const [id, count] of Object.entries(items)) if (ITEMS[id] && Number.isInteger(count) && count > 0) p.inventory[id] = (p.inventory[id] || 0) + count; }
export function canCraft(p, recipe) { return !!recipe && Object.entries(recipe.needs).every(([id,n]) => (p.inventory[id] || 0) >= n); }
export function craft(p, resultId) {
  const r = RECIPES.find(r => r.result === resultId);
  if (!canCraft(p, r)) return { ok: false, message: '재료가 부족합니다.' };
  for (const [id, n] of Object.entries(r.needs)) p.inventory[id] -= n;
  addItems(p, { [r.result]: r.count || 1 }); p.stats.crafts++;
  return { ok: true, message: `${ITEMS[r.result].name} 제작 완료` };
}
export function equip(p, id) {
  const item = ITEMS[id];
  if (!item || !p.inventory[id] || !['weapon','armor'].includes(item.type)) return { ok: false, message: '장착할 수 없는 아이템입니다.' };
  if (item.classId && item.classId !== p.classId) return { ok: false, message: '다른 직업의 무기입니다.' };
  if (p.level < item.level) return { ok: false, message: `${item.level}레벨부터 장착할 수 있습니다.` };
  p.equipment[item.type] = id;
  const a = attributes(p); p.hp = Math.min(p.hp, a.maxHp);
  return { ok: true, message: `${item.name} 장착` };
}
export function consume(p, id) {
  const item = ITEMS[id]; if (item?.type !== 'consumable' || !(p.inventory[id] > 0)) return { ok: false, message: '사용할 아이템이 없습니다.' };
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
    p.claimed.push(q.id); p.gold += q.gold; const levels = gainXp(p,q.xp); rewards.push({ ...q, levels });
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
    p.equipment = { weapon: CLASSES[p.classId].weapon, armor: null }; p.inventory[p.equipment.weapon] = Math.max(1,p.inventory[p.equipment.weapon] || 0);
    for (const slot of ['weapon','armor']) {
      const id = raw.equipment?.[slot], it = ITEMS[id];
      if (it?.type === slot && p.inventory[id] && p.level >= it.level && (!it.classId || it.classId === p.classId)) p.equipment[slot] = id;
    }
    for (const key of Object.keys(p.stats)) p.stats[key] = Math.floor(finite(raw.stats?.[key],0,1e7,0));
    p.claimed = Array.isArray(raw.claimed) ? [...new Set(raw.claimed.filter(id => QUESTS.some(q => q.id === id)))] : [];
    p.opened = Array.isArray(raw.opened) ? [...new Set(raw.opened.filter(id => typeof id === 'string' && /^chest-\d+$/.test(id)))].slice(0,100) : [];
    if (raw.position && Number.isFinite(raw.position.x) && Number.isFinite(raw.position.z)) p.position = { x: finite(raw.position.x,-310,310,0), z: finite(raw.position.z,-310,310,44) };
    const a = attributes(p); p.hp = finite(raw.hp,1,a.maxHp,a.maxHp); p.mana = finite(raw.mana,0,a.maxMana,a.maxMana);
    p.playtime = finite(raw.playtime,0,1e9,0);
    return p;
  } catch { return null; }
}
