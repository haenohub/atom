export const NPCS = [
  { id:'rhea', name:'레아', role:'새벽 순찰대장', x:-4, z:35, color:0x536d61, greeting:'숲길에 다시 발자국이 늘고 있어요. 길을 지켜 줄 사람이 필요합니다. 쓰러뜨린 생물의 전리품은 바닥에서 직접 챙기세요.' },
  { id:'elia', name:'엘리아', role:'숲의 약초사', x:6, z:40, color:0x807452, greeting:'이 숲은 상처를 주기도, 치유하기도 하죠. 약초를 모으고 직접 약을 빚어 볼래요? 납품한 재료는 제가 사용할게요.' },
  { id:'toren', name:'토렌', role:'야영지 대장장이', x:-7, z:47, color:0x745849, greeting:'좋은 장비는 모험가의 손에서 시작되지. 제작 메뉴 C에서 재료를 조합해 봐. 내 의뢰를 마치면 먼 유적으로 가는 길도 준비될 거야.' },
];
export const NPC_QUESTS = [
  { id:'road', npc:'rhea', name:'숲길의 첫 파수꾼', description:'의뢰를 수락한 뒤 이끼 슬라임 3마리를 처치하세요.', level:1, objective:{kind:'kill',type:'slime',count:3}, xp:100,gold:35,items:{health:2} },
  { id:'fangs', npc:'rhea', name:'안개 속의 울음', description:'숲 늑대의 송곳니 3개를 레아에게 전달하세요.', level:3, requires:'road', objective:{kind:'deliver',item:'fang',count:3}, xp:220,gold:90,items:{mana:3} },
  { id:'herbs', npc:'elia', name:'숲이 내어 준 약', description:'약초 4개를 모아 엘리아에게 전달하세요.',level:1,objective:{kind:'deliver',item:'herb',count:4},xp:65,gold:25,items:{health:3} },
  { id:'brewer', npc:'elia', name:'첫 번째 연금술', description:'의뢰 수락 후 연금술로 아이템을 1회 제작하세요. C → 연금술에서 제작할 수 있습니다.',level:1,requires:'herbs',objective:{kind:'stat',stat:'alchemy',count:1},xp:110,gold:45,items:{herb:4,water:2} },
  { id:'workshop', npc:'toren', name:'불씨와 망치', description:'의뢰 수락 후 장비나 요리, 연금술 아이템을 2회 제작하세요.',level:1,objective:{kind:'stat',stat:'crafts',count:2},xp:130,gold:50,items:{iron:4,wood:3} },
  { id:'relics', npc:'toren', name:'돌 속에 남은 기억', description:'유적과 강한 생물에게서 고대 파편 2개를 찾아 토렌에게 전달하세요.',level:7,requires:'workshop',objective:{kind:'deliver',item:'relic',count:2},xp:420,gold:160,items:{crystal:5,elixir:1} },
];
