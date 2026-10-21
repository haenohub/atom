import { effectiveDropChance,TEST_XP_MULTIPLIER } from '../src/state.js';
import fs from 'node:fs';
import { CLASSES, BRANCHES, SKILLS, BRANCH_SKILLS, MONSTERS, ITEMS, RECIPES, BIOMES } from '../src/data.js';
import { EQUIPMENT_SLOTS, STAT_NAMES } from '../src/equipment-data.js';
import { NPCS, NPC_QUESTS } from '../src/quest-data.js';
let md='# 콘텐츠 수치표\n\n`npm run docs`로 `src/data.js`와 `src/quest-data.js`에서 생성한 문서입니다. 실제 게임 내 도감과 제작 창도 같은 데이터를 사용합니다.\n\n';
md+='저장 슬롯은 총 5개이며 구버전 단일 저장은 1번으로 자동 이전됩니다. 테스트 경험치 배율은 모든 보상에 ×5입니다. 구름 정원의 부유섬은 고도 66~100m이며 야영지 동쪽 차원문으로 접근합니다.\n\n';
md+='## 지역\n\n| 지역 | 권장 레벨 | 중심 좌표 (x,z) |\n|---|---|---|\n';
for(const b of BIOMES)md+=`| ${b.name} | ${b.level} | ${b.x}, ${b.z} |\n`;
md+='\n## 기본 직업\n\n| 직업 | 기본 체력 | 기본 마나 | 기본 공격력 | 전직 |\n|---|---|---|---|---|\n';
for(const c of Object.values(CLASSES))md+=`| ${c.name} | ${c.hp} | ${c.mana} | ${c.attack} | ${c.branches.map(b=>BRANCHES[b].name).join(' / ')} |\n`;
md+='\n레벨마다 체력 +14, 마나 +6, 공격력 +3, 기본 방어력 floor((레벨−1)×0.7). 경험치 요구량은 50 + 현재 레벨×24. 최고 20레벨. 기본 치명타 확률 12%, 배율 160%. 장비·배분 민첩 1당 확률 +0.35%p(최대 50%), 장비·배분 힘 1당 치명타 배율 +0.8%p. 스킬·지속 피해도 동일 치명타 추첨을 사용합니다. 음식 버프 공격력 ×1.2, 격노 ×1.6.\n\n';
md+='마법사 Shift 텔레포트는 재사용 대기 0초이며 MP 15를 소모합니다. 그림자사냥꾼 10레벨 스킬은 즉시 전방 광역 공격으로 교체되었습니다. 장비 36종은 개별 착용 외형을 가지며 F1로 전신을 확인할 수 있습니다.\n\n';
md+='## 장비와 능력치\n\n무기·상의·투구·장갑·신발 5개 슬롯. 새 캐릭터는 직업별 기본 방어구 4개를 착용합니다. 새 직업별 방어구는 기본 12개/Lv.1, 영웅 12개/Lv.12이며 기존 무기·공용 방어구도 유지합니다. 제작 창에서는 현재 직업이 착용할 수 있는 제작식을 표시합니다.\n\n레벨당 배분 포인트 3개. 힘/민첩/지능/체력에 배분하고 무료 초기화할 수 있습니다. 직업 주 능력치는 전사=힘, 궁수=민첩, 마법사=지능입니다. 장비와 배분으로 추가한 주 능력치 1당 공격력 +1.5, 체력 1당 최대 HP +8 및 방어력 +0.25(내림), 지능 1당 최대 MP +7 및 초당 MP 회복 +0.06, 민첩 1당 이동속도 +0.3%(최대 +15%)입니다. 기존 레벨 기본 성장과 더해 적용합니다.\n\n| 장비 | 직업 | 슬롯 | 레벨 | 방어 | HP / MP | 능력치 |\n|---|---|---|---|---|---|---|\n';
for(const it of Object.values(ITEMS).filter(it=>it.slot))md+=`| ${it.name} | ${CLASSES[it.classId].name} | ${EQUIPMENT_SLOTS[it.slot]} | ${it.level} | ${it.defense} | ${it.hp||0} / ${it.mana||0} | ${Object.entries(it.stats).map(([key,n])=>STAT_NAMES[key]+' +'+n).join(', ')} |\n`;
md+='\nF1로 1인칭/3인칭을 전환하고 Alt+마우스로 3인칭 자유 시점을 사용할 수 있습니다. 전사는 기본 공격과 스킬의 준비/회복 동작을 다른 공격으로 캔슬할 수 있습니다. 취소한 미발동 타격은 제거되고 사용한 마나·스킬 재사용 시간은 유지합니다.\n\n';
md+='## 스킬\n\n| 직업 | 해금 레벨 | 스킬 | 마나 | 재사용(초) | 효과 |\n|---|---|---|---|---|---|\n';
for(const [id,skills]of Object.entries(SKILLS))for(const s of skills)md+=`| ${CLASSES[id].name} | ${s.level} | ${s.name} | ${s.cost} | ${s.cooldown} | ${s.description} |\n`;
for(const [id,skills]of Object.entries(BRANCH_SKILLS))for(const [i,s]of skills.entries())md+=`| ${BRANCHES[id].name} | ${i?15:10} | ${s.name} | ${s.cost} | ${s.cooldown} | ${s.description} |\n`;
md+='\n## 전직 보너스\n\n';for(const b of Object.values(BRANCHES))md+=`- **${b.name}**: ${b.description}\n`;
md+='\n## 몬스터와 드랍\n\n아래 아이템은 각각 독립적으로 추첨합니다. 예: 가죽 100%, 고기 65%인 늑대는 항상 가죽을 주며, 별도로 65% 확률로 고기를 줍니다. 수량 범위는 양 끝을 포함하는 균등 정수 추첨입니다. 골드는 3 + 몬스터 레벨×2, 경험치는 (26 + 몬스터 레벨×17) ×5. 장비 드랍만 기본 확률 ×5(최대 100%)이며 아래 표는 적용 확률과 기본 확률을 함께 표시한다. 몬스터 재생성 40초. 경험치는 처치 시 지급하며, 아이템과 골드는 바닥의 전리품 주머니에서 E로 획득합니다. 미수거 주머니는 저장·부활 후에도 남습니다. 마을 귀환 주문서는 Lv.1–9 몬스터 12%, Lv.12–18 몬스터 22%, 고대 수호자 100%로 독립 추첨하며 1개 드랍합니다. R 또는 가방에서 사용하면 한 장을 소모하여 새벽 야영지로 즉시 귀환합니다.\n\n';
for(const m of Object.values(MONSTERS).sort((a,b)=>a.level-b.level)){
  md+=`### ${m.name}${m.boss?' · 우두머리':''}\n\n${m.habitat} · ${m.description}\n\n레벨 ${m.level} · HP ${m.hp} · 공격력 ${m.attack} · 속도 ${m.speed}m/s · 공격 거리 ${m.range}m\n\n| 아이템 | 확률 | 수량 |\n|---|---|---|\n`;
  for(const [id,p,min,max]of m.drops)md+=`| ${ITEMS[id].name} | ${(effectiveDropChance(id,p)*100).toFixed(1)}%${['weapon','armor'].includes(ITEMS[id].type)?` (기본 ${(p*100).toFixed(1)}% ×5)`:''} | ${min===max?min:`${min}–${max}`} |\n`;
  md+='\n';
}
md+='## 제작식\n\n| 분야 | 결과 | 수량 | 재료 | 효과 / 능력치 |\n|---|---|---|---|---|\n';
for(const r of RECIPES){const it=ITEMS[r.result];md+=`| ${{smith:'대장',cooking:'요리',alchemy:'연금술'}[r.category]} | ${it.name} | ${r.count||1} | ${Object.entries(r.needs).map(([id,n])=>`${ITEMS[id].name} ×${n}`).join(', ')} | ${it.description|| (it.type==='weapon'?`공격력 +${it.attack}, ${CLASSES[it.classId].name}, Lv.${it.level}`:`방어력 +${it.defense}, 체력 +${it.hp}, Lv.${it.level}`)} |\n`;}
md+='\n## 채집과 상자\n\n채집물은 2–3개(균등 확률), 경험치 40(기본 8×5)을 지급하고 90초 뒤 재생합니다. 야생초/버섯/목재는 숲, 철광석은 고원, 서리꽃은 설산, 수정은 호수·고지대·황무지에서 얻습니다.\n\n상자 등급 t(1–5)의 확정 보상: 회복약 t개, 마나약 t개, 철광석 t+1개, 수정 t개, 골드 35t, 경험치 175t(기본 35t×5). 등급 3 이상은 고대 파편 t−2개, 4 이상은 별의 결정 1개 추가. 상자는 저장 슬롯당 한 번 개봉합니다.\n';
md+='\n## NPC 의뢰\n\n야영지 NPC에게 E로 대화하여 수락하고, 목표 달성 후 같은 NPC에게 보고해야 보상을 받습니다. 처치·제작 목표는 수락 이후부터 집계합니다. 납품은 현재 가방 수량을 확인하고 완료 보고 시 정확한 수량을 소모합니다. 의뢰는 한 번만 완료할 수 있습니다.\n\n| 의뢰 | NPC | 레벨 / 선행 | 목표 | 보상 |\n|---|---|---|---|---|\n';
for(const q of NPC_QUESTS)md+=`| ${q.name} | ${NPCS.find(n=>n.id===q.npc).name} | Lv.${q.level}${q.requires?' / '+NPC_QUESTS.find(p=>p.id===q.requires).name:''} | ${q.description} | ${q.xp*TEST_XP_MULTIPLIER} EXP, ${q.gold} G, ${Object.entries(q.items).map(([id,n])=>ITEMS[id].name+' ×'+n).join(', ')} |\n`;
fs.writeFileSync(new URL('../docs/CONTENT_REFERENCE.md',import.meta.url),md);
console.log('Generated docs/CONTENT_REFERENCE.md');
