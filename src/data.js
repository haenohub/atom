import { ABYSS_ITEMS,ABYSS_MONSTERS,ABYSS_RECIPES } from './abyss-data.js';
import { CREATURE_INFO } from './creature-info.js';
import { GEAR_ITEMS, GEAR_RECIPES } from './equipment-data.js';
export const MAX_LEVEL = 20;
export const SAVE_KEY = 'aetherwild.save.v1';
export const CAMP = { x: 0, z: 44 };
export const RARITIES = { common: '#c9d6ca', uncommon: '#8dda95', rare: '#83c6f8', epic: '#c8a1ff', legendary: '#f4cf81' };
export const CLASSES = {
  warrior: { name: '전사', en: 'WARRIOR', symbol: '⚔', color: '#e6bc83', hp: 145, mana: 70, attack: 17, weapon: 'sword', description: '강철과 용기로 길을 여는 근접 전투의 달인.', branches: ['knight', 'berserker'] },
  ranger: { name: '궁수', en: 'RANGER', symbol: '➶', color: '#a6d2a0', hp: 110, mana: 95, attack: 15, weapon: 'bow', description: '바람을 읽고, 먼 거리에서 정확히 사냥합니다.', branches: ['warden', 'shadow'] },
  mage: { name: '마법사', en: 'MAGE', symbol: '✦', color: '#a9bef1', hp: 95, mana: 150, attack: 19, weapon: 'staff', description: '불과 얼음, 비전의 힘으로 자연을 다룹니다.', branches: ['archmage', 'elementalist'] },
};
export const BRANCHES = {
  knight: { name: '기사', description: '방어력 +8, 최대 체력 +45. 성역과 심판으로 전장을 지킵니다.', defense: 8, hp: 45 },
  berserker: { name: '광전사', description: '공격력 +12. 격노와 대지 분쇄로 적을 압도합니다.', attack: 12 },
  warden: { name: '레인저', description: '공격력 +7, 최대 체력 +25. 화살비와 폭풍 사격을 사용합니다.', attack: 7, hp: 25 },
  shadow: { name: '그림자사냥꾼', description: '공격력 +11. 그림자 화살 폭풍과 암살 표식을 사용합니다.', attack: 11 },
  archmage: { name: '대마법사', description: '공격력 +10, 최대 마나 +45. 운석과 비전 폭풍을 부릅니다.', attack: 10, mana: 45 },
  elementalist: { name: '원소술사', description: '방어력 +4, 최대 마나 +65. 번개와 정령을 다룹니다.', defense: 4, mana: 65 },
};
export const SKILLS = {
  warrior: [
    { name: '회전베기', level: 1, cost: 15, cooldown: 5, power: 1.9, range: 6, kind: 'aoe', color: 0xffd798, description: '주변 6m의 모든 적에게 공격력 190% 피해.' },
    { name: '돌진참', level: 4, cost: 20, cooldown: 8, power: 2.6, range: 18, kind: 'dash', color: 0xffb47a, description: '힘을 모아 최대 11m 돌진하고 경로의 적에게 260% 피해.' },
    { name: '강철 피부', level: 7, cost: 25, cooldown: 22, duration: 12, kind: 'guard', color: 0xd6e3f2, description: '12초 동안 받는 피해 60% 감소.' },
  ],
  ranger: [
    { icon: 'pierce', delivery: 'arrow', name: '관통화살', level: 1, cost: 12, cooldown: 4, power: 2.5, range: 45, kind: 'pierce', color: 0xbee4a3, description: '다음 화살을 관통화살로 교체. 일직선상의 적에게 250% 피해. 발사할 때 마나 소모.' },
    { icon: 'frostArrow', delivery: 'arrow', name: '서리화살', level: 4, cost: 20, cooldown: 9, power: 2.2, range: 45, radius: 5, kind: 'frost', color: 0x9eeaff, description: '다음 화살이 적에게 맞으면 반경 5m 서리 폭발. 범위의 모든 적에게 220% 피해와 6초 둔화.' },
    { name: '치유의 바람', level: 7, cost: 30, cooldown: 20, kind: 'heal', color: 0xaaffbf, description: '최대 체력의 40% 회복.' },
  ],
  mage: [
    { name: '불꽃의 장', icon: 'fireZone', targeted: true, level: 1, cost: 18, cooldown: 4, power: 2.8, range: 40, radius: 7, delay: .4, duration: 3, kind: 'fireZone', color: 0xff995b, description: '지면 지정. 반경 7m에 3초 동안 총 280% 화염 피해. 좌클릭으로 시전.' },
    { name: '서리 결계', icon: 'frostZone', targeted: true, level: 4, cost: 25, cooldown: 9, power: 1.8, range: 35, radius: 9, delay: .25, duration: 0, kind: 'frostZone', color: 0xa8e5ff, description: '지면 지정. 반경 9m에 180% 피해, 4초 빙결. 좌클릭으로 시전.' },
    { name: '비전 회복', level: 7, cost: 0, cooldown: 25, kind: 'restore', color: 0xcab6ff, description: '최대 마나의 45%와 체력의 20% 회복.' },
  ],
};
export const BRANCH_SKILLS = {
  knight: [ { name: '성역', kind: 'sanctuary', cost: 30, cooldown: 24, color: 0xffeeae, description: '체력 50% 회복, 12초 피해 60% 감소.' }, { name: '심판', kind: 'aoe', motion: 'judgment', power: 5.5, range: 14, cost: 40, cooldown: 18, color: 0xffdd84, description: '반경 14m에 550% 신성 피해.' } ],
  berserker: [ { name: '피의 격노', kind: 'rage', cost: 25, cooldown: 25, color: 0xff7777, description: '15초 공격력 60% 증가, 체력 15% 회복.' }, { name: '대지 분쇄', kind: 'leapSlam', targeted: true, power: 6, range: 30, radius: 10, cost: 40, cooldown: 18, color: 0xe9b172, description: '5번으로 높이 도약해 범위를 지정하고 좌클릭으로 돌격. 착지 반경 10m에 600% 피해와 4초 기절. 우클릭 취소.' } ],
  warden: [ { name: '화살비', icon: 'arrowRain', targeted: true, motion: 'bowSky', kind: 'arrowRain', power: 4.5, range: 55, radius: 8, delay: .3, duration: 0, cost: 30, cooldown: 13, color: 0xc4e8a0, description: '4번으로 지면 지정 후 좌클릭. 하늘로 활을 쏜 뒤 0.3초 후 반경 8m에 화살비, 450% 피해.' }, { name: '폭풍 사격', icon: 'stormArrow', delivery: 'arrow', kind: 'stormArrow', power: 7.5, range: 60, radius: 6, pullSpeed: 8, gravity: 0, cost: 40, cooldown: 16, color: 0xd9ffbc, description: '직선으로 날아가는 폭풍 화살. 경로 반경 6m의 모든 적에게 750% 피해를 한 번씩 주고 중심으로 끌어당깁니다.' } ],
  shadow: [ { name: '그림자 화살 폭풍', icon: 'arrowRain', targeted: true, motion: 'bowGround', kind: 'shadowVolley', power: 3.8, range: 35, radius: 8, delay: .3, duration: 0, cost: 25, cooldown: 10, color: 0xbc99ec, description: '4번으로 지면 지정 후 좌클릭. 바닥으로 활을 쏜 뒤 0.3초 후 반경 8m에서 그림자 화살이 솟아 380% 피해.' }, { name: '암살 표식', icon: 'shadowArrow', delivery: 'arrow', kind: 'chainArrow', power: 9, range: 45, bounceRange: 20, bounces: 5, cost: 40, cooldown: 18, color: 0xd6b7ff, description: '5번으로 화살 교체. 첫 적중 후 직전 대상의 20m 내 새 적에게 최대 5회 더 튕깁니다. 대상마다 900% 피해, 같은 적 재적중 없음.' } ],
  archmage: [ { name: '운석 낙하', icon: 'meteor', targeted: true, kind: 'meteorZone', power: 5.5, range: 50, radius: 10, delay: 1.1, duration: 0, cost: 38, cooldown: 13, color: 0xff885a, description: '지면 지정. 1.1초 후 반경 10m에 550% 피해. 좌클릭으로 시전.' }, { name: '비전 폭풍', icon: 'arcaneZone', targeted: true, kind: 'arcaneZone', power: 7, range: 45, radius: 13, delay: .5, duration: 3, cost: 55, cooldown: 20, color: 0xcab1ff, description: '지면 지정. 반경 13m에 3초 동안 총 700% 비전 피해.' } ],
  elementalist: [ { name: '뇌우의 장', icon: 'lightning', targeted: true, kind: 'lightningZone', power: 4.8, range: 45, radius: 11, delay: .45, duration: 0, cost: 32, cooldown: 12, color: 0xa9dfff, description: '지면 지정. 반경 11m 모든 적에게 480% 번개 피해.' }, { name: '정령의 축복', kind: 'blessing', cost: 40, cooldown: 30, color: 0xaaffd7, description: '체력 완전 회복, 15초 공격력 60% 증가.' } ],
};
export function skillsFor(player) {
  const base = SKILLS[player.classId];
  return [...base, ...(player.branch ? BRANCH_SKILLS[player.branch].map((s, i) => ({ ...s, level: i ? 15 : 10 })) : [
    { name: '전직 스킬', level: 10, description: '야영지에서 2차 전직 후 해금', locked: true },
    { name: '궁극기', level: 15, description: '야영지에서 2차 전직 후 해금', locked: true },
  ])];
}
const material = (name, icon, rarity = 'common') => ({ name, icon, rarity, type: 'material' });
export const ITEMS = {
  ...ABYSS_ITEMS,
  ...GEAR_ITEMS,
  recall: {name:'마을 귀환 주문서',type:'consumable',rarity:'uncommon',recall:true,description:'즉시 새벽 야영지로 귀환합니다. 사용 시 1개 소모.'},
  herb: material('야생초', '♧'), mushroom: material('숲 버섯', '♠'), wood: material('단단한 목재', '▥'), iron: material('철광석', '⬡'),
  slime: material('점액', '◉'), leather: material('가죽', '▱'), meat: material('생고기', '◈'), fang: material('송곳니', '⋀', 'uncommon'),
  water: material('물의 정수', '◊', 'uncommon'), crystal: material('수정', '◇', 'uncommon'), frost: material('서리꽃', '❄', 'rare'),
  fire: material('불의 정수', '♨', 'rare'), relic: material('고대 파편', '⟐', 'rare'), scale: material('비룡 비늘', '▰', 'epic'), star: material('별의 결정', '✧', 'epic'), heart: material('세계수의 심장', '❋', 'legendary'),
  health: { name: '회복약', icon: '♥', rarity: 'common', type: 'consumable', heal: .45, description: '최대 체력의 45% 회복' },
  mana: { name: '마나약', icon: '♦', rarity: 'common', type: 'consumable', mana: .5, description: '최대 마나의 50% 회복' },
  stew: { name: '숲 사냥꾼 스튜', icon: '♨', rarity: 'uncommon', type: 'consumable', heal: .6, buff: 120, description: '체력 60% 회복, 120초 공격력 +20%' },
  feast: { name: '서리꽃 구이', icon: '♨', rarity: 'rare', type: 'consumable', heal: 1, buff: 240, description: '체력 완전 회복, 240초 공격력 +20%' },
  elixir: { name: '별빛 영약', icon: '✦', rarity: 'epic', type: 'consumable', heal: 1, mana: 1, buff: 300, description: '체력·마나 완전 회복, 300초 공격력 +20%' },
  sword: { name: '여행자의 검', icon: '⚔', rarity: 'common', type: 'weapon', classId: 'warrior', attack: 0, level: 1 },
  bow: { name: '여행자의 활', icon: '➶', rarity: 'common', type: 'weapon', classId: 'ranger', attack: 0, level: 1 },
  staff: { name: '여행자의 지팡이', icon: '✦', rarity: 'common', type: 'weapon', classId: 'mage', attack: 0, level: 1 },
  ironSword: { name: '숲지기의 장검', icon: '⚔', rarity: 'uncommon', type: 'weapon', classId: 'warrior', attack: 12, level: 3 },
  ironBow: { name: '바람의 장궁', icon: '➶', rarity: 'uncommon', type: 'weapon', classId: 'ranger', attack: 12, level: 3 },
  crystalStaff: { name: '이슬 수정 지팡이', icon: '✦', rarity: 'uncommon', type: 'weapon', classId: 'mage', attack: 14, level: 3 },
  fireSword: { name: '여명의 칼날', icon: '⚔', rarity: 'epic', type: 'weapon', classId: 'warrior', attack: 40, level: 12 },
  fireBow: { name: '별을 쏘는 활', icon: '➶', rarity: 'epic', type: 'weapon', classId: 'ranger', attack: 40, level: 12 },
  fireStaff: { name: '천체의 지팡이', icon: '✦', rarity: 'epic', type: 'weapon', classId: 'mage', attack: 44, level: 12 },
  leatherArmor: { name: '이끼 가죽 갑옷', icon: '⬟', rarity: 'uncommon', type: 'armor', defense: 6, hp: 20, level: 2 },
  ironArmor: { name: '수호자의 흉갑', icon: '⬟', rarity: 'rare', type: 'armor', defense: 13, hp: 45, level: 7 },
  dragonArmor: { name: '비룡 비늘 갑옷', icon: '⬟', rarity: 'epic', type: 'armor', defense: 23, hp: 85, level: 14 },
};
export const RECIPES = [
  ...ABYSS_RECIPES,
  ...GEAR_RECIPES,
  { result: 'ironSword', category: 'smith', needs: { iron: 4, wood: 2, leather: 2 } },
  { result: 'ironBow', category: 'smith', needs: { wood: 5, leather: 3, fang: 1 } },
  { result: 'crystalStaff', category: 'smith', needs: { wood: 3, crystal: 2, water: 1 } },
  { result: 'leatherArmor', category: 'smith', needs: { leather: 4, slime: 2 } },
  { result: 'ironArmor', category: 'smith', needs: { iron: 8, leather: 4, crystal: 2 } },
  { result: 'fireSword', category: 'smith', needs: { iron: 12, fire: 3, relic: 3 } },
  { result: 'fireBow', category: 'smith', needs: { wood: 12, scale: 3, star: 1 } },
  { result: 'fireStaff', category: 'smith', needs: { crystal: 8, fire: 3, star: 1 } },
  { result: 'dragonArmor', category: 'smith', needs: { scale: 5, iron: 12, star: 2 } },
  { result: 'stew', category: 'cooking', needs: { meat: 2, mushroom: 2, herb: 1 } },
  { result: 'feast', category: 'cooking', needs: { meat: 3, frost: 2, mushroom: 2 } },
  { result: 'health', category: 'alchemy', needs: { herb: 3, slime: 1 }, count: 2 },
  { result: 'mana', category: 'alchemy', needs: { mushroom: 2, water: 1 }, count: 2 },
  { result: 'elixir', category: 'alchemy', needs: { frost: 3, star: 1, water: 2 } },
];
export const BIOMES = [
  {id:'dungeon',name:'심연의 교차로',en:'THE UNDERROOT',level:'8–20',x:0,z:0,color:'#ac8bc8'},
  {id:'cloud',name:'구름 정원',en:'CLOUD GARDEN',level:'8–18',x:170,z:160,color:'#a8dce1'},
  { id: 'forest', name: '새벽의 숲', en: 'DAWNWOOD', level: '1–4', x: 0, z: 50, color: '#8fbe83' },
  { id: 'lake', name: '거울 호수', en: 'MIRROR LAKE', level: '4–7', x: -130, z: -32, color: '#7fc4c1' },
  { id: 'highland', name: '바람 고원', en: 'WINDREACH', level: '7–11', x: 135, z: -35, color: '#c5bf94' },
  { id: 'snow', name: '은빛 설산', en: 'SILVERPEAK', level: '11–15', x: -108, z: -215, color: '#c7dce4' },
  { id: 'volcano', name: '잿불 황무지', en: 'EMBERFALL', level: '15–20', x: 163, z: -220, color: '#e1a085' },
];
export const MONSTERS = {
  ...ABYSS_MONSTERS,
  thornmantis:{name:'가시 낫사마귀',level:6,hp:155,attack:19,speed:3.8,range:3,color:0x617d46,shape:'mantis',scale:1.1,drops:[['fang',.8,1,2],['herb',1,2,3],['leather',.5,1,2]]},
  abyssserpent:{name:'심연 유리뱀',level:10,hp:310,attack:29,speed:3.7,range:3.8,color:0x538faf,shape:'serpent',scale:1.3,drops:[['water',1,2,4],['scale',.25,1,2],['crystal',.5,1,3]]},
  moonsphinx:{name:'월광 스핑크스',level:14,hp:465,attack:39,speed:4.1,range:3.6,color:0xb1a7d1,shape:'sphinx',scale:1.45,drops:[['leather',1,2,4],['relic',.45,1,2],['star',.15,1,1]]},
  emberarachnid:{name:'용암 갑주거미',level:16,hp:580,attack:45,speed:3.2,range:4,color:0xa75239,shape:'arachnid',scale:1.5,drops:[['fire',1,2,3],['iron',.75,2,4],['scale',.4,1,2]]},
  stormroc:{name:'폭풍 왕관조',level:19,hp:820,attack:55,speed:4.8,range:4.5,color:0x819fbd,shape:'roc',scale:1.8,drops:[['frost',1,2,4],['star',.3,1,2],['crystal',.6,2,4]]},
  cloudray:{name:'운무 가오리',level:8,hp:210,attack:23,speed:3.4,range:3,color:0xa4d8d3,shape:'ray',scale:1.2,drops:[['water',1,1,3],['crystal',.4,1,2]]},
  windstag:{name:'풍령 사슴',level:13,hp:380,attack:36,speed:4.8,range:3,color:0x82b7ac,shape:'stag',scale:1.25,drops:[['leather',1,2,4],['frost',.4,1,2],['star',.1,1,1]]},
  skywarden:{name:'천공 파수꾼',level:18,hp:720,attack:49,speed:3.1,range:4,color:0x94bfc9,shape:'golem',scale:1.7,drops:[['relic',1,1,3],['star',.3,1,2],['crystal',.8,2,4]]},
  slime: { name: '이끼 슬라임', level: 1, hp: 42, attack: 6, speed: 2.3, range: 2.4, color: 0x8fc979, shape: 'slime', scale: 1, drops: [['slime',1,1,2],['herb',.35,1,2],['health',.08,1,1]] },
  wolf: { name: '숲 늑대', level: 3, hp: 80, attack: 11, speed: 5.4, range: 2.7, color: 0x9c9e8b, shape: 'wolf', scale: 1, drops: [['leather',1,1,2],['meat',.65,1,2],['fang',.25,1,1]] },
  spirit: { name: '호수 정령', level: 5, hp: 115, attack: 15, speed: 3.5, range: 3, color: 0x86e1df, shape: 'spirit', scale: 1.1, drops: [['water',.75,1,2],['crystal',.35,1,2],['mana',.15,1,1]] },
  boar: { name: '가시 멧돼지', level: 7, hp: 170, attack: 22, speed: 4.3, range: 2.8, color: 0x9d816e, shape: 'boar', scale: 1.2, drops: [['leather',1,1,3],['meat',.8,1,3],['iron',.25,1,2]] },
  golem: { name: '바위 골렘', level: 9, hp: 280, attack: 30, speed: 2.8, range: 3.8, color: 0x8d9d91, shape: 'golem', scale: 1.5, drops: [['iron',1,2,4],['crystal',.45,1,3],['relic',.2,1,1]] },
  frostwolf: { name: '서리 늑대', level: 12, hp: 330, attack: 36, speed: 6, range: 3, color: 0xc7e5ed, shape: 'wolf', scale: 1.3, drops: [['frost',.65,1,3],['leather',1,2,4],['water',.4,1,2]] },
  guardian: { name: '수정 수호자', level: 15, hp: 510, attack: 43, speed: 3.2, range: 4, color: 0x99b9de, shape: 'golem', scale: 1.8, drops: [['crystal',1,2,5],['relic',.45,1,2],['star',.15,1,1]] },
  drake: { name: '잿불 비룡', level: 18, hp: 660, attack: 51, speed: 4.4, range: 4.5, color: 0xc76c4d, shape: 'drake', scale: 1.8, drops: [['fire',1,2,3],['scale',.6,1,3],['star',.25,1,1]] },
  ancient: { name: '고대 수호자', level: 20, hp: 1850, attack: 65, speed: 3.2, range: 5.5, color: 0x8e8270, shape: 'golem', scale: 3, boss: true, drops: [['relic',1,3,5],['star',1,1,3],['scale',.8,2,4],['heart',.25,1,1]] },
};
for(const [id,m]of Object.entries(MONSTERS))Object.assign(m,CREATURE_INFO[id]);
// One independent recall-scroll roll per kill; bosses guarantee one.
for(const m of Object.values(MONSTERS))m.drops.push(['recall',m.boss?1:m.level>=12?.22:.12,1,1]);
// Equipment base chances; test multiplier is applied only by rollLoot.
for(const m of Object.values(MONSTERS))for(const classId of ['warrior','ranger','mage']){
  const tier=m.level>=12?'epic':'basic';
  for(const slot of ['armor','helmet','gloves','boots'])m.drops.push([`${classId}_${tier}_${slot}`,m.boss?.04:m.level>=12?.012:.008,1,1]);
  const weapon=classId==='warrior'?(m.level>=12?'fireSword':'ironSword'):classId==='ranger'?(m.level>=12?'fireBow':'ironBow'):(m.level>=12?'fireStaff':'crystalStaff');
  m.drops.push([weapon,m.boss?.06:.015,1,1]);
}
export const QUESTS = [
  { id: 'first', name: '숲의 첫 발걸음', description: '몬스터 3마리 처치', target: 3, stat: 'kills', xp: 100, gold: 30 },
  { id: 'gather', name: '자연이 주는 선물', description: '채집물 5회 수집', target: 5, stat: 'gathers', xp: 100, gold: 30 },
  { id: 'craft', name: '모험가의 손길', description: '아이템 2회 제작', target: 2, stat: 'crafts', xp: 160, gold: 60 },
  { id: 'treasure', name: '잊힌 자취', description: '보물상자 3개 발견', target: 3, stat: 'chests', xp: 250, gold: 100 },
  { id: 'advance', name: '새로운 길', description: '10레벨 도달 후 야영지에서 2차 전직', target: 1, stat: 'advanced', xp: 400, gold: 150 },
  { id: 'boss', name: '세계수의 부름', description: '고대 수호자 또는 파이어 드래곤 처치', target: 1, stat: 'boss', xp: 1000, gold: 500 },
];
