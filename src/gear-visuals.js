import { ITEMS } from './data.js';
// Every equippable item has a stable visual signature. Tier is resolved per slot.
export const GEAR_VISUALS={
 sword:{style:'traveler',color:0xb5bdc2,accent:0x93805c,length:1,width:1},ironSword:{style:'warden',color:0xc8d9df,accent:0xc5a364,length:1.16,width:1.2},fireSword:{style:'dawn',color:0xe0c595,accent:0xffb363,length:1.3,width:1.65},
 bow:{style:'traveler',color:0x776046,accent:0x9b8863,length:1,width:1},ironBow:{style:'wind',color:0x8fbaaa,accent:0xc2d3db,length:1.1,width:1.15},fireBow:{style:'astral',color:0xb3dcb7,accent:0xffd789,length:1.2,width:1.4},
 staff:{style:'traveler',color:0x78604d,accent:0x98b6ac,length:1,width:1},crystalStaff:{style:'dew',color:0xb5d7e2,accent:0x80e5ff,length:1.12,width:1.5},fireStaff:{style:'celestial',color:0x8b86c2,accent:0xe5bf72,length:1.2,width:1.8},
 leatherArmor:{style:'leather',color:0x8e6947,accent:0xb9a386},ironArmor:{style:'brigandine',color:0x9baebb,accent:0xc6b07b},dragonArmor:{style:'dragon',color:0x853d38,accent:0xe2ac63}
};
for(const [id,it]of Object.entries(ITEMS))if(it.slot){const epic=it.rarity==='epic',classId=it.classId;GEAR_VISUALS[id]={style:`${classId}-${epic?'royal':'field'}-${it.slot}`,color:classId==='warrior'?(epic?0xd3c9af:0xb5c5cc):classId==='ranger'?(epic?0x7caa8f:0x708363):(epic?0x675c9e:0x445779),accent:epic?0xe4c477:0xa49468,epic,slot:it.slot,classId};}
export function gearVisual(id){return GEAR_VISUALS[id]||null;}
