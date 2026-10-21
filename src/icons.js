import { itemArt } from './item-art.js';
const spriteIndex={slash:0,dash:1,shield:2,sanctuary:3,judgment:4,rage:5,shatter:6,pierce:7,frostArrow:8,heal:9,arrowRain:10,stormArrow:11,poisonArrow:12,shadowArrow:13,fireZone:14,frostZone:15,restore:16,meteor:17,arcaneZone:18,lightning:19,blessing:20,health:21,mana:22,bag:23,compass:24};
const baseIcons={warrior:['slash','dash','shield'],ranger:['pierce','frostArrow','heal'],mage:['fireZone','frostZone','restore']};
const branchIcons={knight:['sanctuary','judgment'],berserker:['rage','shatter'],warden:['arrowRain','stormArrow'],shadow:['poisonArrow','shadowArrow'],archmage:['meteor','arcaneZone'],elementalist:['lightning','blessing']};
export function artIcon(name,className=''){
  const n=spriteIndex[name]??spriteIndex.bag,x=n%5,y=Math.floor(n/5);
  return `<span class="art-icon ${className}" aria-hidden="true" style="--icon-x:${x*25}%;--icon-y:${y*25}%"></span>`;
}
export function classIcon(classId){return artIcon(classId==='warrior'?'slash':classId==='ranger'?'pierce':'restore');}
export function skillIcon(skill,player,index){return artIcon(skill.icon||(index<3?baseIcons[player.classId][index]:branchIcons[player.branch]?.[index-3])||'restore');}
export function itemIcon(id){
  const {sheet,columns,index}=itemArt(id),x=index%columns,y=Math.floor(index/columns),url=new URL(`${import.meta.env.BASE_URL}assets/${sheet}`,document.baseURI).href;
  return `<span class="art-icon item-art" data-item-art="${id}" aria-hidden="true" style="--item-sheet:url('${url}');--icon-grid:${columns*100}%;--icon-x:${x*100/(columns-1)}%;--icon-y:${y*100/(columns-1)}%"></span>`;
}
