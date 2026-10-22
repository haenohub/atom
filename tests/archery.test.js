import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameEngine } from '../src/engine.js';
import { nextChainTarget,TELEPORT_COOLDOWN,BOW_CAST_RELEASE } from '../src/combat.js';
import { archeryAction,archeryPose,castAction,castingPose } from '../src/motion.js';
import { SKILLS,BRANCH_SKILLS } from '../src/data.js';
import { createPlayer } from '../src/state.js';
import { heightAt } from '../src/terrain.js';
function engine(cls='ranger'){
 const e=Object.create(GameEngine.prototype);e.player=createPlayer(cls);e.player.level=20;e.player.mana=999;e.world={monsters:[],colliders:[]};e.scene=new THREE.Scene();e.camera=new THREE.PerspectiveCamera();e.camera.rotation.order='YXZ';e.camera.position.set(0,101.75,-14);e.feetY=100;e.yaw=0;e.fields=[];e.projectiles=[];e.cooldowns=[0,0,0,0,0];e.activeSpellIndex=null;e.loadedArrowIndex=null;e.drawStartedAt=null;e.castAction=null;e.attackCooldown=0;e.warriorAction=null;e.events={};e.hits=[];e.visuals=[];e.fx={hidePreview(){},setPreview(){},frostBurst(contact,radius){e.visuals.push([contact,radius,'frostBurst']);},spell(...args){e.visuals.push(args);},bowShot(...args){e.launch=args;},trail(){},sigil(){}};e.hit=(m,p)=>{if(!m.alive)return;m.hp-=p;e.hits.push(m.id);if(m.hp<=0)m.alive=false;};e.notify=e.sound=()=>{};e.removeObject=o=>e.scene.remove(o);return e;
}
function mob(e,id,x,z,y=100){const group=new THREE.Group();group.position.set(x,y,z);group.userData.hitRadius=.25;group.userData.hitHeight=1.1;const m={id,x,z,group,alive:true,hp:10000,def:{scale:1}};e.world.monsters.push(m);return m;}
function arrow(e,kind,skill,point=new THREE.Vector3(0,101.1,-18),velocity=new THREE.Vector3(0,0,-40)){
 const mesh=new THREE.Group();mesh.position.copy(point);if(kind==='stormArrow')mesh.userData.wind=new THREE.Group();e.scene.add(mesh);const p={mesh,velocity,power:100,color:0xffffff,kind,skill,gravity:0,range:60,travel:0,life:5,speed:40,hitIds:new Set(),bouncesLeft:skill?.bounces??0,piercing:kind==='pierce'};e.projectiles.push(p);return p;
}
test('frost contact explodes once on all enemies within five metres, including the boundary',()=>{
 const e=engine(),target=mob(e,'hit',0,-20),inside=mob(e,'in',3,-20),edge=mob(e,'edge',5,-20),outside=mob(e,'out',5.01,-20),upper=mob(e,'upper',1,-20,108);arrow(e,'frost',SKILLS.ranger[1]);e.updateProjectiles(.1);
 assert.deepEqual(e.hits,['hit','in','edge']);for(const m of [target,inside,edge]){assert.equal(m.hp,9900);assert.equal(m.slow,6);}assert.equal(outside.hp,10000);assert.equal(upper.hp,10000);assert.equal(e.projectiles.length,0);assert.equal(e.visuals[0][1],5);assert.equal(e.visuals[0][2],'frostBurst');
});
test('frost hitting empty ground creates no explosion damage',()=>{const e=engine();mob(e,'near',3,-20,0);arrow(e,'frost',SKILLS.ranger[1],new THREE.Vector3(0,heightAt(0,-20)-.1,-20));e.updateProjectiles(.01);assert.deepEqual(e.hits,[]);assert.equal(e.visuals.length,0);});
test('piercing arrow still crosses multiple targets exactly once',()=>{const e=engine();mob(e,'a',0,-20);mob(e,'b',0,-22);arrow(e,'pierce',SKILLS.ranger[0]);for(let i=0;i<50;i++)e.updateProjectiles(.01);assert.deepEqual(e.hits,['a','b']);});
test('chain selects a living unhit target within twenty 3D metres with deterministic ties',()=>{
 const center={x:0,y:0,z:0},targets=[{id:'far',alive:true,x:20.01,y:0,z:0},{id:'dead',alive:false,x:1,y:0,z:0},{id:'used',alive:true,x:2,y:0,z:0},{id:'b',alive:true,x:20,y:0,z:0},{id:'a',alive:true,x:-20,y:0,z:0}];assert.equal(nextChainTarget(targets,center,new Set(['used'])).id,'a');assert.equal(nextChainTarget(targets,center,new Set(['used','a','b'])),null);
});
test('assassin arrow makes five bounces after its initial hit and never hits a target twice',()=>{
 const e=engine();for(let i=0;i<8;i++)mob(e,'m'+i,0,-20-i*3);arrow(e,'chainArrow',BRANCH_SKILLS.shadow[1]);for(let i=0;i<400;i++)e.updateProjectiles(.005);assert.deepEqual(e.hits,['m0','m1','m2','m3','m4','m5']);assert.equal(e.projectiles.length,0);
});
test('chain range is measured from each last target and stops if the next is too far',()=>{
 const e=engine();mob(e,'first',0,-20);mob(e,'second',0,-39.9);mob(e,'beyond',0,-60.01);arrow(e,'chainArrow',BRANCH_SKILLS.shadow[1]);for(let i=0;i<300;i++)e.updateProjectiles(.005);assert.deepEqual(e.hits,['first','second']);
});
test('a lethal first hit can still redirect the arrow, and dead destinations are skipped',()=>{
 const e=engine(),first=mob(e,'first',0,-20),second=mob(e,'second',0,-24);mob(e,'third',3,-25);first.hp=1;arrow(e,'chainArrow',BRANCH_SKILLS.shadow[1]);e.updateProjectiles(.06);second.alive=false;for(let i=0;i<150;i++)e.updateProjectiles(.005);assert.deepEqual(e.hits,['first','third']);
});
for(const branch of ['shadow','warden'])test(branch+' area selection is free; release precedes damage by 0.3s',()=>{
 const e=engine();e.player.branch=branch;const target=mob(e,'inside',0,-24);mob(e,'outside',9,-24);e.groundTarget=()=>({point:new THREE.Vector3(0,100,-24),valid:true});const mana=e.player.mana;e.skill(3);assert.equal(e.activeSpellIndex,3);assert.equal(e.player.mana,mana);assert.equal(e.cooldowns[3],0);e.attack();assert.equal(e.activeSpellIndex,null);assert.ok(e.cooldowns[3]>0);assert.equal(e.fields.length,1);assert.equal(e.visuals[0][4],BOW_CAST_RELEASE+.3);e.updateCombat(.449);assert.equal(e.launch,undefined);assert.equal(target.hp,10000);e.updateCombat(.002);assert.ok(e.launch);assert.equal(Math.sign(e.launch[1].y),branch==='shadow'?-1:1);e.updateCombat(.298);assert.equal(target.hp,10000);e.updateCombat(.002);assert.ok(target.hp<10000);assert.deepEqual(e.hits,['inside']);assert.equal(e.fields.length,0);
});
test('invalid area confirmation keeps selection and consumes no resources',()=>{const e=engine();e.player.branch='shadow';e.groundTarget=()=>({valid:false});e.skill(3);const mana=e.player.mana;e.attack();assert.equal(e.player.mana,mana);assert.equal(e.cooldowns[3],0);assert.equal(e.activeSpellIndex,3);});
test('switching arrow/ground modes clears the previous selection and drawing safely',()=>{const e=engine();e.player.branch='shadow';e.skill(4);assert.equal(e.loadedArrowIndex,4);assert.equal(e.arrowSkill.kind,'chainArrow');e.drawStartedAt=1;e.skill(3);assert.equal(e.loadedArrowIndex,null);assert.equal(e.drawStartedAt,null);e.skill(1);assert.equal(e.activeSpellIndex,null);assert.equal(e.loadedArrowIndex,1);});
test('storm is straight and hits every enemy in its swept volume only once while pulling repeatedly',()=>{
 const e=engine(),y=heightAt(0,-20),a=mob(e,'a',4,-20,heightAt(4,-20)),b=mob(e,'b',-3,-20,heightAt(-3,-20)),outside=mob(e,'outside',7,-20,heightAt(7,-20));const p=arrow(e,'stormArrow',BRANCH_SKILLS.warden[1],new THREE.Vector3(0,y+1.1,-18));p.gravity=BRANCH_SKILLS.warden[1].gravity;e.updateProjectiles(.04);assert.deepEqual(e.hits,['a','b']);assert.ok(a.x<4&&b.x>-3);const x=a.x;e.updateProjectiles(.04);assert.deepEqual(e.hits,['a','b']);assert.ok(a.x<x);assert.equal(outside.hp,10000);assert.equal(p.mesh.position.y,y+1.1);assert.ok(p.mesh.userData.wind.rotation.z>0);
});
test('storm pull respects solid obstacles and the boundary of elevated islands',()=>{const e=engine(),m=mob(e,'a',4,-20,heightAt(4,-20));e.world.colliders=[{x:3,z:-20,r:1}];e.pullMonster(m,new THREE.Vector3(0,m.group.position.y,-20),1);assert.equal(m.x,4);e.world.colliders=[];m.island={x:4,z:-20,r:.7};e.pullMonster(m,new THREE.Vector3(0,100,-20),1);assert.equal(m.x,4);});
test('sky and ground shots have opposite pitches, one release time, and recover fully',()=>{for(const [kind,sign]of [['bowSky',1],['bowGround',-1]]){const a=archeryAction(kind);a.age=.35;assert.equal(Math.sign(archeryPose(a).pitch),sign);assert.ok(archeryPose(a).draw>.9);assert.equal(a.release,.45);a.age=a.duration;assert.ok(Object.values(archeryPose(a)).every(v=>Math.abs(v)<1e-9));}});
test('mage sweeps from the outside to the inside and resets fully',()=>{const a=castAction('orb');a.age=.18;assert.ok(castingPose(a).sweep>0);a.age=.39;assert.ok(castingPose(a).sweep<0);a.age=a.duration;assert.ok(Math.abs(castingPose(a).sweep)<1e-9);assert.equal(TELEPORT_COOLDOWN,.5);});
