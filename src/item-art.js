import { ITEMS } from './data.js';
export const LOOT_ART={herb:0,mushroom:1,wood:2,iron:3,slime:4,leather:5,meat:6,fang:7,water:8,crystal:9,frost:10,fire:11,relic:12,scale:13,star:14,heart:15,health:16,mana:17,stew:18,feast:19,elixir:20,recall:21};
const weapons={sword:0,ironSword:1,fireSword:2,bow:3,ironBow:4,fireBow:5,staff:6,crystalStaff:7,fireStaff:8,leatherArmor:9,ironArmor:10,dragonArmor:11};
export function itemArt(id){
  if(Object.hasOwn(LOOT_ART,id))return {sheet:'loot-icons.png',columns:5,index:LOOT_ART[id]};
  const index=ITEMS[id]?.gearArt??weapons[id];
  return index!==undefined?{sheet:'equipment-icons.png',columns:6,index}:{sheet:'loot-icons.png',columns:5,index:22};
}
