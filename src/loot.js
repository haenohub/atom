import { ITEMS, MONSTERS } from './data.js';
// Serializable bags survive reloads and death. Collection removes the record first,
// so repeated input can never grant the same rolled contents twice.
export function sanitizeDrop(raw) {
  if(!raw||typeof raw.id!=='string'||raw.id.length>100||!Number.isFinite(raw.x)||!Number.isFinite(raw.z)||Math.abs(raw.x)>310||Math.abs(raw.z)>310)return null;
  const items={};for(const [id,n] of Object.entries(raw.items||{}))if(ITEMS[id]&&Number.isInteger(n)&&n>0)items[id]=Math.min(n,99999);
  const gold=Number.isFinite(raw.gold)?Math.min(1e7,Math.max(0,Math.floor(raw.gold))):0;
  return Object.keys(items).length||gold?{id:raw.id,type:MONSTERS[raw.type]?raw.type:'slime',x:raw.x,z:raw.z,items,gold}:null;
}
export function collectDrop(p,id) {
  const i=p.groundLoot.findIndex(d=>d.id===id);if(i<0)return null;
  const [drop]=p.groundLoot.splice(i,1);
  for(const [item,n]of Object.entries(drop.items))p.inventory[item]=(p.inventory[item]||0)+n;
  p.gold+=drop.gold;return drop;
}
