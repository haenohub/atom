import * as THREE from 'three';
import { heightAt,surfaceAt } from './terrain.js';
// The gameplay camera remains at the player's eyes; only this separate render
// camera moves, so perspective switches never teleport the player or weapon rays.
export function followCamera(target,eye,yaw,pitch,colliders,aimPoint){
  const wanted=new THREE.Vector3(Math.sin(yaw)*4.8+Math.cos(yaw)*.65,1.05+Math.sin(pitch)*2,Math.cos(yaw)*4.8-Math.sin(yaw)*.65).add(eye);
  let safe=eye.clone();const probe=new THREE.Vector3();
  for(let i=1;i<=32;i++){probe.lerpVectors(eye,wanted,i/32);if(probe.y<surfaceAt(probe.x,probe.z,eye.y+.2)+.3||colliders.some(c=>Math.hypot(probe.x-c.x,probe.z-c.z)<c.r+.25&&probe.y>(c.y??heightAt(c.x,c.z))&&probe.y<(c.y??heightAt(c.x,c.z))+(c.h??Math.max(3,c.r*5))))break;safe.copy(probe);}
  target.position.copy(safe);target.lookAt(aimPoint);target.updateMatrixWorld();return safe.distanceTo(eye);
}
