export const EQUIPMENT_SLOTS={weapon:'무기',armor:'상의',helmet:'투구',gloves:'장갑',boots:'신발'};
export const STAT_NAMES={strength:'힘',dexterity:'민첩',intelligence:'지능',vitality:'체력'};
export const CLASS_STATS={warrior:{strength:12,dexterity:6,intelligence:4,vitality:12},ranger:{strength:7,dexterity:12,intelligence:5,vitality:9},mage:{strength:4,dexterity:6,intelligence:14,vitality:7}};
export const MAIN_STAT={warrior:'strength',ranger:'dexterity',mage:'intelligence'};
export const GEAR_ITEMS={},GEAR_RECIPES=[];
const sets={warrior:{basic:'철엽 수호자',epic:'여명 성기사',main:'strength',atlas:12},ranger:{basic:'숲그늘 추적자',epic:'비취 사슴왕',main:'dexterity',atlas:16},mage:{basic:'밤하늘 학자',epic:'성좌 현자',main:'intelligence',atlas:20}};
for(const [classId,set]of Object.entries(sets))for(const tier of ['basic','epic'])for(const [i,slot]of ['armor','helmet','gloves','boots'].entries()){
  const epic=tier==='epic',id=`${classId}_${tier}_${slot}`,stats={};stats[set.main]=epic?(i===0?6:3):(i===0?2:1);if(slot==='helmet')stats.intelligence=(stats.intelligence||0)+(epic?3:1);if(slot==='boots')stats.dexterity=(stats.dexterity||0)+(epic?3:1);if(slot==='armor')stats.vitality=epic?5:1;
  GEAR_ITEMS[id]={name:`${epic?set.epic:set.basic} ${EQUIPMENT_SLOTS[slot]}`,type:'armor',slot,classId,level:epic?12:1,rarity:epic?'epic':'uncommon',defense:(classId==='warrior'?3:classId==='ranger'?2:1)*(epic?3:1)+(i===0?2:0),hp:i===0?(epic?35:10):0,mana:classId==='mage'?(epic?12:3):0,stats,gearArt:(epic?24+(classId==='warrior'?0:classId==='ranger'?4:8):set.atlas)+i};
  GEAR_RECIPES.push({result:id,category:'smith',needs:epic?{iron:6,crystal:3,star:1,...(classId==='ranger'?{scale:2}:classId==='mage'?{fire:2}:{relic:2})}:{wood:2,leather:2,...(classId==='warrior'?{iron:2}:classId==='mage'?{slime:2}:{herb:2})}});
}
export const starterGear=classId=>Object.fromEntries(['armor','helmet','gloves','boots'].map(slot=>[slot,`${classId}_basic_${slot}`]));
