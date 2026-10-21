import { NPCS, NPC_QUESTS } from './quest-data.js';
import { addItems, awardXp, TEST_XP_MULTIPLIER } from './state.js';
export function questProgress(p,q) {
  const entry=p.quests?.[q.id],o=q.objective;
  if(!entry)return 0;
  if(entry.status==='completed')return o.count;
  const value=o.kind==='deliver'?(p.inventory[o.item]||0):o.kind==='kill'?(p.killsByType?.[o.type]||0):p.stats[o.stat]||0;
  return Math.max(0,Math.min(o.count,value-(o.kind==='deliver'?0:entry.baseline)));
}
export function questStatus(p,q) {
  const entry=p.quests?.[q.id];
  if(entry?.status==='completed')return 'completed';
  if(entry)return questProgress(p,q)>=q.objective.count?'ready':'active';
  return p.level<q.level||(q.requires&&p.quests?.[q.requires]?.status!=='completed')?'locked':'available';
}
export function acceptQuest(p,id,npcId) {
  const q=NPC_QUESTS.find(q=>q.id===id&&q.npc===npcId);
  if(!q||questStatus(p,q)!=='available')return {ok:false,message:'지금 수락할 수 없는 의뢰입니다.'};
  const o=q.objective,baseline=o.kind==='kill'?(p.killsByType?.[o.type]||0):o.kind==='stat'?(p.stats[o.stat]||0):0;
  p.quests[q.id]={status:'active',baseline};return {ok:true,message:`의뢰 수락 · ${q.name}`};
}
export function turnInQuest(p,id,npcId) {
  const q=NPC_QUESTS.find(q=>q.id===id&&q.npc===npcId);
  if(!q||questStatus(p,q)!=='ready')return {ok:false,message:'의뢰 목표를 완료한 뒤 의뢰인에게 돌아오세요.'};
  if(q.objective.kind==='deliver')p.inventory[q.objective.item]-=q.objective.count;
  p.quests[q.id].status='completed';p.gold+=q.gold;addItems(p,q.items);const levels=awardXp(p,q.xp);
  return {ok:true,levels,message:`의뢰 완료 · ${q.name} · +${q.xp*TEST_XP_MULTIPLIER} EXP / ${q.gold} G`};
}
export function npcMarker(p,id) {
  const statuses=NPC_QUESTS.filter(q=>q.npc===id).map(q=>questStatus(p,q));
  return statuses.includes('ready')?'?':statuses.includes('available')?'!':statuses.includes('active')?'◇':'·';
}
export function trackedQuest(p) {
  const q=NPC_QUESTS.find(q=>questStatus(p,q)==='ready')||NPC_QUESTS.find(q=>questStatus(p,q)==='active');
  if(q){const npc=NPCS.find(n=>n.id===q.npc);return {name:q.name,description:questStatus(p,q)==='ready'?`${npc.name}에게 돌아가 보상을 받으세요.`:`${q.description} ${questProgress(p,q)} / ${q.objective.count}`,ratio:questProgress(p,q)/q.objective.count};}
  const available=NPC_QUESTS.find(q=>questStatus(p,q)==='available');
  return available?{name:'야영지의 사람들',description:'야영지의 ! 표시 NPC에게 다가가 E로 의뢰를 받아 보세요.',ratio:0}:null;
}
