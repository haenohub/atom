const spriteIndex={slash:0,dash:1,shield:2,sanctuary:3,judgment:4,rage:5,shatter:6,pierce:7,frostArrow:8,heal:9,arrowRain:10,stormArrow:11,poisonArrow:12,shadowArrow:13,fireZone:14,frostZone:15,restore:16,meteor:17,arcaneZone:18,lightning:19,blessing:20,health:21,mana:22,bag:23,compass:24};
const baseIcons={warrior:['slash','dash','shield'],ranger:['pierce','frostArrow','heal'],mage:['fireZone','frostZone','restore']};
const branchIcons={knight:['sanctuary','judgment'],berserker:['rage','shatter'],warden:['arrowRain','stormArrow'],shadow:['poisonArrow','shadowArrow'],archmage:['meteor','arcaneZone'],elementalist:['lightning','blessing']};
export function artIcon(name,className=''){
  const n=spriteIndex[name]??spriteIndex.bag,x=n%5,y=Math.floor(n/5);
  return `<span class="art-icon ${className}" aria-hidden="true" style="--icon-x:${x*25}%;--icon-y:${y*25}%"></span>`;
}
export function classIcon(classId){return artIcon(classId==='warrior'?'slash':classId==='ranger'?'pierce':'restore');}
export function skillIcon(skill,player,index){return artIcon(skill.icon||(index<3?baseIcons[player.classId][index]:branchIcons[player.branch]?.[index-3])||'restore');}
const itemSprites={sword:'slash',ironSword:'slash',fireSword:'judgment',bow:'pierce',ironBow:'pierce',fireBow:'stormArrow',staff:'restore',crystalStaff:'restore',fireStaff:'meteor',leatherArmor:'shield',ironArmor:'shield',dragonArmor:'shield',herb:'heal',frost:'frostZone',fire:'fireZone',star:'arcaneZone',heart:'blessing',health:'health',mana:'mana',elixir:'restore'};
let serial=0;
export function itemIcon(id){
  if(itemSprites[id])return artIcon(itemSprites[id]);
  const shapes={
    mushroom:'<path d="M27 33v15c0 5 10 5 10 0V33"/><path d="M10 30c0-23 44-23 44 0 0 8-44 8-44 0Z" fill="url(#G)"/><path d="m22 25 3-3m14 5 3-2m-7-8 1 2" stroke="#dfcba9"/>',
    wood:'<path d="m13 47 8-31 30 8-8 31Z" fill="url(#G)"/><ellipse cx="20" cy="18" rx="9" ry="7" transform="rotate(15 20 18)"/><path d="m28 26-5 22m14-20-5 23m13-21-5 20"/>',
    iron:'<path d="m8 42 10-22 22-8 17 22-13 19-23 3Z" fill="url(#G)"/><path d="m18 20 10 19 12-27m-12 27 16 14m-16-14L8 42m20-3 29-5"/>',
    crystal:'<path d="m20 46 4-34 12-8 10 19-7 31Z" fill="url(#G)"/><path d="m24 12 9 15 3-23m-3 23 13-4m-13 4 6 27m-6-27-13 19"/><path d="m9 48 2-17 9-4 5 23Z"/>',
    water:'<path d="M32 7C24 23 13 32 13 41a19 19 0 0 0 38 0C51 32 40 23 32 7Z" fill="url(#G)"/><path d="M23 32c-7 8-3 16 3 18" stroke="#e3f3e8"/>',
    slime:'<path d="M10 43c1-16 6-31 22-31s21 15 22 31c2 12-46 12-44 0Z" fill="url(#G)"/><path d="M22 25c-6 5-7 12-6 16" stroke="#d7eac2"/>',
    leather:'<path d="m17 12 12 3 13-5 11 13-5 10 5 17-18 4-15-3-10-15 9-8Z" fill="url(#G)"/><path d="m21 17-7 18 10 13 12 2 12-3-4-15 5-8-9-10-11 5Z" stroke-dasharray="2 3"/>',
    meat:'<path d="M12 23c9-17 39-12 43 4 4 18-13 30-29 25C12 49 5 36 12 23Z" fill="url(#G)"/><ellipse cx="32" cy="30" rx="13" ry="10"/><path d="m22 31 19-5m-13 12 15-7"/>',
    fang:'<path d="M19 9c21 2 27 18 22 32-3 8-11 13-23 17 7-14 12-26 1-49Z" fill="url(#G)"/><path d="M24 15c12 10 15 20 8 32"/>',
    relic:'<path d="m13 12 36 5 5 28-15 10-30-13Z" fill="url(#G)"/><path d="m24 23 15 4-4 15-15-5 4-14Zm7-8-2 7m16 12 9 2M15 30l6 2m7 11-2 8"/>',
    scale:'<path d="M32 9 55 26 45 50 32 58 19 50 9 26Z" fill="url(#G)"/><path d="m12 27 20 12 20-12M32 39v17m-13-6 13-11 13 11m-24-31 11 20 11-20"/>',
    stew:'<path d="M9 30c0 32 46 32 46 0Z" fill="url(#G)"/><ellipse cx="32" cy="30" rx="23" ry="7"/><path d="M20 12c9 7-5 7 2 14m12-17c9 7-6 8 1 16m12-13c7 6-5 8 0 12"/>',
  };
  const color={water:'#6ba5b7',slime:'#84985a',iron:'#8e9694',crystal:'#94d6d7',meat:'#a66959',scale:'#968066'}[id]||'#b79b70';const key='item-gradient-'+serial++;
  const svg=`<svg viewBox="0 0 64 64" class="drawn-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${key}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e1ce9c"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="#3d3930"/></linearGradient></defs><g stroke="#e2ce9f" stroke-width="1.5" stroke-linejoin="round" fill="#35382d">${(shapes[id]||shapes.stew).replaceAll('url(#G)',`url(#${key})`)}</g></svg>`;
  return `<span class="crafted-icon">${svg}</span>`;
}
