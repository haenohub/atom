import fs from 'node:fs';
import { CLASSES, BRANCHES, SKILLS, BRANCH_SKILLS, MONSTERS, ITEMS, RECIPES, BIOMES } from '../src/data.js';
let md='# 콘텐츠 수치표\n\n`npm run docs`로 `src/data.js`에서 생성한 문서입니다. 실제 게임 내 도감과 제작 창도 같은 데이터를 사용합니다.\n\n';
md+='## 지역\n\n| 지역 | 권장 레벨 | 중심 좌표 (x,z) |\n|---|---|---|\n';
for(const b of BIOMES)md+=`| ${b.name} | ${b.level} | ${b.x}, ${b.z} |\n`;
md+='\n## 기본 직업\n\n| 직업 | 기본 체력 | 기본 마나 | 기본 공격력 | 전직 |\n|---|---|---|---|---|\n';
for(const c of Object.values(CLASSES))md+=`| ${c.name} | ${c.hp} | ${c.mana} | ${c.attack} | ${c.branches.map(b=>BRANCHES[b].name).join(' / ')} |\n`;
md+='\n레벨마다 체력 +14, 마나 +6, 공격력 +3, 기본 방어력 floor((레벨−1)×0.7). 경험치 요구량은 50 + 현재 레벨×24. 최고 20레벨. 기본 공격 치명타 확률 12%, 배율 160%. 스킬·지속 피해도 동일 치명타 추첨을 사용합니다. 음식 버프 공격력 ×1.2, 격노 ×1.6.\n\n';
md+='## 스킬\n\n| 직업 | 해금 레벨 | 스킬 | 마나 | 재사용(초) | 효과 |\n|---|---|---|---|---|---|\n';
for(const [id,skills]of Object.entries(SKILLS))for(const s of skills)md+=`| ${CLASSES[id].name} | ${s.level} | ${s.name} | ${s.cost} | ${s.cooldown} | ${s.description} |\n`;
for(const [id,skills]of Object.entries(BRANCH_SKILLS))for(const [i,s]of skills.entries())md+=`| ${BRANCHES[id].name} | ${i?15:10} | ${s.name} | ${s.cost} | ${s.cooldown} | ${s.description} |\n`;
md+='\n## 전직 보너스\n\n';for(const b of Object.values(BRANCHES))md+=`- **${b.name}**: ${b.description}\n`;
md+='\n## 몬스터와 드랍\n\n아래 아이템은 각각 독립적으로 추첨합니다. 예: 가죽 100%, 고기 65%인 늑대는 항상 가죽을 주며, 별도로 65% 확률로 고기를 줍니다. 수량 범위는 양 끝을 포함하는 균등 정수 추첨입니다. 골드는 3 + 몬스터 레벨×2, 경험치는 26 + 몬스터 레벨×17. 몬스터 재생성 40초.\n\n';
for(const m of Object.values(MONSTERS)){
  md+=`### ${m.name}${m.boss?' · 우두머리':''}\n\n레벨 ${m.level} · HP ${m.hp} · 공격력 ${m.attack} · 속도 ${m.speed}m/s · 공격 거리 ${m.range}m\n\n| 아이템 | 확률 | 수량 |\n|---|---|---|\n`;
  for(const [id,p,min,max]of m.drops)md+=`| ${ITEMS[id].name} | ${Math.round(p*100)}% | ${min===max?min:`${min}–${max}`} |\n`;
  md+='\n';
}
md+='## 제작식\n\n| 분야 | 결과 | 수량 | 재료 | 효과 / 능력치 |\n|---|---|---|---|---|\n';
for(const r of RECIPES){const it=ITEMS[r.result];md+=`| ${{smith:'대장',cooking:'요리',alchemy:'연금술'}[r.category]} | ${it.name} | ${r.count||1} | ${Object.entries(r.needs).map(([id,n])=>`${ITEMS[id].name} ×${n}`).join(', ')} | ${it.description|| (it.type==='weapon'?`공격력 +${it.attack}, ${CLASSES[it.classId].name}, Lv.${it.level}`:`방어력 +${it.defense}, 체력 +${it.hp}, Lv.${it.level}`)} |\n`;}
md+='\n## 채집과 상자\n\n채집물은 2–3개(균등 확률), 경험치 8을 지급하고 90초 뒤 재생합니다. 야생초/버섯/목재는 숲, 철광석은 고원, 서리꽃은 설산, 수정은 호수·고지대·황무지에서 얻습니다.\n\n상자 등급 t(1–5)의 확정 보상: 회복약 t개, 마나약 t개, 철광석 t+1개, 수정 t개, 골드 35t, 경험치 35t. 등급 3 이상은 고대 파편 t−2개, 4 이상은 별의 결정 1개 추가. 상자는 저장 슬롯당 한 번 개봉합니다.\n';
fs.writeFileSync(new URL('../docs/CONTENT_REFERENCE.md',import.meta.url),md);
console.log('Generated docs/CONTENT_REFERENCE.md');
