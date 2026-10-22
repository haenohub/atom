import * as THREE from 'three';
export const ANIMATION_HZ=120;
export const ANIMATION_STEP=1/ANIMATION_HZ;
export class AnimationClock{
 constructor(){this.accumulator=0;this.steps=0;}
 advance(delta,step){this.accumulator+=Math.min(Math.max(0,delta),.05);let elapsed=0;while(this.accumulator+1e-10>=ANIMATION_STEP){step(ANIMATION_STEP);this.accumulator-=ANIMATION_STEP;elapsed+=ANIMATION_STEP;this.steps++;}return {elapsed,alpha:Math.max(0,this.accumulator/ANIMATION_STEP)};}
}
export class PoseInterpolator{
 constructor(objects){this.tracks=[...new Set(objects.filter(Boolean))].map(object=>({object,previous:{p:object.position.clone(),q:object.quaternion.clone(),s:object.scale.clone()},current:{p:object.position.clone(),q:object.quaternion.clone(),s:object.scale.clone()}}));}
 capture(){for(const t of this.tracks){t.previous.p.copy(t.current.p);t.previous.q.copy(t.current.q);t.previous.s.copy(t.current.s);t.current.p.copy(t.object.position);t.current.q.copy(t.object.quaternion);t.current.s.copy(t.object.scale);}}
 render(alpha){for(const {object,previous:a,current:b}of this.tracks){object.position.lerpVectors(a.p,b.p,alpha);object.quaternion.slerpQuaternions(a.q,b.q,alpha);object.scale.lerpVectors(a.s,b.s,alpha);}}
 restore(){for(const {object,current:c}of this.tracks){object.position.copy(c.p);object.quaternion.copy(c.q);object.scale.copy(c.s);}}
}
export function articulatedObjects(root){const list=[root],r=root?.userData.rig;if(!r)return list;for(const key of ['torso','hips','head','jaw','tail','core','halo','weapon'])if(r[key])list.push(r[key]);for(const key of ['arms','elbows','hands','legs','knees','feet','fingers','wings','orbs'])if(r[key])list.push(...r[key]);if(r.weapon?.userData.drawHand)list.push(r.weapon.userData.drawHand);return list;}
export function smoothPhase(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);}
