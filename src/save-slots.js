import { SAVE_KEY } from './data.js';
import { loadPlayer } from './state.js';
export const SLOT_COUNT=5;
const key=n=>`aetherwild.slot.${n}.v1`;
const valid=n=>Number.isInteger(n)&&n>=1&&n<=SLOT_COUNT;
export function activeSlot(storage=globalThis.localStorage){try{const n=Number(storage.getItem('aetherwild.active-slot'));return valid(n)?n:1;}catch{return 1;}}
export function selectSlot(n,storage=globalThis.localStorage){if(!valid(n))return false;try{storage.setItem('aetherwild.active-slot',String(n));return true;}catch{return false;}}
export function migrateSave(storage=globalThis.localStorage){
  try{if(storage.getItem('aetherwild.slots-migrated'))return;
    const old=storage.getItem(SAVE_KEY);if(old&&!storage.getItem(key(1))&&loadPlayer({getItem:()=>old}))storage.setItem(key(1),old);
    storage.setItem('aetherwild.slots-migrated','1');
  }catch{} // Read/write denial must not prevent a new local session.
}
export function loadSlot(n=activeSlot(),storage=globalThis.localStorage){if(!valid(n))return null;migrateSave(storage);try{const raw=storage.getItem(key(n));return raw?loadPlayer({getItem:()=>raw}):null;}catch{return null;}}
export function saveSlot(p,n=activeSlot(),storage=globalThis.localStorage){if(!valid(n))return false;migrateSave(storage);try{storage.setItem(key(n),JSON.stringify({version:1,player:p,savedAt:Date.now()}));return true;}catch{return false;}}
export function listSlots(storage=globalThis.localStorage){return Array.from({length:SLOT_COUNT},(_,i)=>({id:i+1,player:loadSlot(i+1,storage)}));}
