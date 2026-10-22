import * as THREE from 'three';
import { WORLD_LIMIT } from './world-layout.js';
export const RUN_SPEED=9,FLIGHT_MULTIPLIER=3,FLIGHT_ACCELERATION=9,FLIGHT_BRAKING=13,FLIGHT_MAX_HEIGHT=220;
export function flightBank(yaw,heading){const delta=yaw-heading;return THREE.MathUtils.clamp(Math.atan2(Math.sin(delta),Math.cos(delta))*.2,-.35,.35);}
export function flightInput(keys,yaw){const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),r=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),up=(keys.has('Space')?1:0)-(keys.has('ControlLeft')||keys.has('ControlRight')?1:0),v=new THREE.Vector3(-Math.sin(yaw)*f+Math.cos(yaw)*r,0,-Math.cos(yaw)*f-Math.sin(yaw)*r);if(v.lengthSq()>1)v.normalize();v.y=up*.6;return v.clampLength(0,1);}
export function accelerateFlight(velocity,input,dt,multiplier=1){const max=RUN_SPEED*FLIGHT_MULTIPLIER*multiplier,target=input.clone().multiplyScalar(max),delta=target.sub(velocity),amount=(input.lengthSq()?FLIGHT_ACCELERATION:FLIGHT_BRAKING)*dt;if(delta.length()<=amount)velocity.add(delta);else velocity.addScaledVector(delta.normalize(),amount);velocity.clampLength(0,max);if(velocity.lengthSq()<1e-8)velocity.set(0,0,0);return velocity;}
export function moveFlight(position,velocity,dt,floorAt,colliders=[]){
 const steps=Math.max(1,Math.ceil(velocity.length()*dt/.3)),step=dt/steps;
 for(let i=0;i<steps;i++){
  const next=position.clone().addScaledVector(velocity,step);
  next.x=THREE.MathUtils.clamp(next.x,-WORLD_LIMIT,WORLD_LIMIT);next.z=THREE.MathUtils.clamp(next.z,-WORLD_LIMIT,WORLD_LIMIT);
  const bounds=c=>{const base=c.y??floorAt(c.x,c.z);return {base,top:base+(c.h??Math.max(3,c.r*5))+1.5};};
  if(colliders.some(c=>{if(Math.hypot(next.x-c.x,next.z-c.z)>=c.r+1.1)return false;const {base,top}=bounds(c);return position.y<top&&position.y+2>base;})){next.x=position.x;next.z=position.z;velocity.x=0;velocity.z=0;}
  for(const c of colliders){if(Math.hypot(next.x-c.x,next.z-c.z)>=c.r+1.1)continue;const {base,top}=bounds(c);if(velocity.y>0&&position.y+2<=base&&next.y+2>base){next.y=base-2;velocity.y=0;}else if(velocity.y<0&&position.y>=top&&next.y<top){next.y=top;velocity.y=0;}}
  const ground=floorAt(next.x,next.z);if(next.y<ground+2.3){next.y=ground+2.3;velocity.y=Math.max(0,velocity.y);}if(next.y>FLIGHT_MAX_HEIGHT){next.y=FLIGHT_MAX_HEIGHT;velocity.y=Math.min(0,velocity.y);}
  if(Math.abs(next.x)>=WORLD_LIMIT)velocity.x=0;if(Math.abs(next.z)>=WORLD_LIMIT)velocity.z=0;position.copy(next);
 }
 return position;
}
