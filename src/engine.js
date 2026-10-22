import { magicOrb,vfxSprite } from './vfx-textures.js';
import { saveSlot,activeSlot } from './save-slots.js';
import { CLOUD_START,validSkyPosition,platformFloor,islandAt } from './sky-layout.js';
import * as THREE from 'three';
import { bowShot, skillAvailability, isArrowSkill, inSpellArea, TELEPORT_COOLDOWN, nextChainTarget } from './combat.js';
import { createWeapon, animateWeapon, makeArrow, makeStormArrow, animateStormArrow } from './weapons.js';
import { Effects } from './effects.js';
import { warriorAction,castAction,archeryAction } from './motion.js';
import { animateMonster } from './actors.js';
import { GroundLoot } from './ground-loot.js';
import { collectDrop } from './loot.js';
import { createAvatar, animateAvatar, disposeAvatar } from './avatar.js';
import { followCamera } from './camera.js';
import { World } from './world.js';
import { heightAt, surfaceAt, biomeAt, isWater, slopeAt, WATER_LEVEL } from './terrain.js';
import { CAMP, CLASSES, MONSTERS, ITEMS, BIOMES, skillsFor } from './data.js';
import { attributes, awardXp, TEST_XP_MULTIPLIER, rollLoot, addItems, damagePlayer, claimQuests, consume } from './state.js';
const UP=new THREE.Vector3(0,1,0), clamp=THREE.MathUtils.clamp;
export class GameEngine {
  constructor(canvas, events={}) {
    this.events=events;this.canvas=canvas;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xb8cbd5);this.scene.fog=new THREE.FogExp2(0xb8cbd5,.0026);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.98;
    this.camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,1100);this.camera.rotation.order='YXZ';this.scene.add(this.camera);this.followCamera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,1100);this.thirdPerson=false;this.orbitYaw=0;this.orbitPitch=0;
    this.scene.add(new THREE.HemisphereLight(0xc9e0ef,0x4b5039,1.05));
    this.sun=new THREE.DirectionalLight(0xffe4b8,3.4);this.sun.position.set(-65,100,-55);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-75;this.sun.shadow.camera.right=75;this.sun.shadow.camera.top=75;this.sun.shadow.camera.bottom=-75;this.sun.shadow.camera.far=270;this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00008;this.sun.shadow.radius=3;this.scene.add(this.sun,this.sun.target);
    const gl=this.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const software=debug&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    this.quality=new URLSearchParams(location.search).get('quality')||(software?'low':'high');
    if(this.quality==='low'){this.renderer.shadowMap.enabled=false;this.renderer.setPixelRatio(.8);}
    this.world=new World(this.scene,this.renderer);this.fx=new Effects(this.scene);this.fields=[];this.loadedArrowIndex=null;this.activeSpellIndex=null;this.drawStartedAt=null;this.bowCharge=0;this.clock=new THREE.Clock();this.time=0;this.lastSave=0;this.active=false;this.player=null;this.locked=false;this.paused=true;this.keys=new Set();this.projectiles=[];this.effects=[];this.damageTexts=[];this.cooldowns=[0,0,0,0,0];this.attackCooldown=0;this.stamina=100;this.swing=0;this.shake=0;this.yaw=0;this.pitch=0;this.vy=0;this.grounded=true;this.fallPeak=0;this.combatUntil=0;this.lastBiome='forest';this.soundOn=false;this.audio=null;this.stepTimer=0;this.frameCount=0;this.frameTime=0;this.fps=0;
    this.camera.position.set(24,heightAt(24,72)+8,72);this.camera.lookAt(-5,heightAt(0,20)+4,-20);
    this.saveSlot=activeSlot();this.mobilityCooldown=0;this.dash=null;this.climbing=null;this.trajectory=null;this.groundLoot=new GroundLoot(this.scene);this.warriorAction=null;this.castAction=null;this.combo=0;this.bind();this.animate();
  }
  bind() {
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.followCamera.aspect=innerWidth/innerHeight;this.followCamera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===this.canvas;this.keys.clear();if(this.active&&!this.locked){this.cancelActions();this.persist();this.events.unlock?.();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active){this.persist();this.pause();this.events.unlock?.();}});
    document.addEventListener('mousemove',e=>{if(this.locked&&!this.paused){if(this.thirdPerson&&this.keys.has('AltLeft')){this.orbitYaw-=e.movementX*.004;this.orbitPitch=clamp(this.orbitPitch-e.movementY*.003,-.6,.6);return;}this.yaw-=e.movementX*.002;this.pitch=clamp(this.pitch-e.movementY*.002,-1.48,1.48);}});
    window.addEventListener('keydown',e=>{
      if(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)return;
      if(['F1','AltLeft','Space','Tab','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
      if(e.repeat)return;this.keys.add(e.code);
      if(!this.active)return;
      if(['KeyI','KeyC','KeyM','KeyJ','KeyK','Escape','Tab'].includes(e.code)){this.events.key?.(e.code);return;}
      if(this.paused||!this.locked||this.player.hp<=0)return;
      if(e.code==='F1'){this.togglePerspective();return;}if(e.code==='ShiftLeft'){this.mobility();return;}if(e.code==='Space'){if(this.climbing)this.detachRope(true);else this.jumpRequested=true;}
      if(e.code==='KeyE')this.interact();if(e.code==='KeyQ')this.useItem('health');if(e.code==='KeyR')this.useItem('recall');
      if(/^Digit[1-5]$/.test(e.code))this.skill(Number(e.code.slice(-1))-1);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    this.canvas.addEventListener('mousedown',e=>{if(this.active&&!this.paused&&this.locked){if(e.button===0)this.attack();if(e.button===2){if(this.activeSpellIndex!==null){this.activeSpellIndex=null;this.fx.hidePreview();this.notify('시전 취소');}else this.blocking=true;}}});
    window.addEventListener('mouseup',e=>{if(e.button===2)this.blocking=false;if(e.button===0&&this.active&&!this.paused&&this.locked&&this.player.classId==='ranger')this.releaseBow();});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',()=>{this.keys.clear();this.cancelActions();});
    window.addEventListener('beforeunload',()=>this.persist());
  }
  start(player) {
    this.player=player;this.active=true;this.paused=false;this.stamina=100;this.attackCooldown=0;this.cooldowns.fill(0);this.keys.clear();this.jumpRequested=false;this.combatUntil=0;this.vy=0;this.grounded=true;this.mobilityCooldown=0;this.dash=null;this.climbing=null;this.inCloudGarden=validSkyPosition(player.position);
    this.cancelActions(true);this.fields=[];this.projectiles.forEach(p=>this.removeObject(p.mesh));this.projectiles=[];this.fx.clear();this.yaw=.08;this.pitch=-.1;const {x,z}=player.position;this.feetY=Math.max(validSkyPosition(player.position)?surfaceAt(x,z,player.position.y+.2):heightAt(x,z),isWater(x,z)?WATER_LEVEL-.8:-Infinity);this.fallPeak=this.feetY;this.camera.position.set(x,this.feetY+1.75,z);
    for(const c of this.world.chests){c.opened=player.opened.includes(c.id);c.beam.visible=!c.opened;c.lid.rotation.x=c.opened?-.8:0;}
    this.warriorAction=null;this.castAction=null;this.combo=0;this.groundLoot.clear();for(const drop of player.groundLoot)this.groundLoot.add(drop);
    for(const m of this.world.monsters){m.hp=m.def.hp;m.alive=true;m.group.visible=true;m.x=m.homeX;m.z=m.homeZ;m.group.position.set(m.x,m.island?.y??heightAt(m.x,m.z),m.z);m.aggro=false;m.slow=0;m.freeze=0;m.poison=0;m.poisonTick=0;m.hit=0;m.attackTimer=0;m.attackAge=null;m.returning=false;m.moveSpeed=0;m.deathAge=0;animateMonster(m,0,this.time);}
    this.thirdPerson=player.perspective==='third';this.orbitYaw=0;this.orbitPitch=0;this.buildWeapon();this.lastBiome=biomeAt(x,z);this.events.biome?.(BIOMES.find(b=>b.id===this.lastBiome));this.initAudio();this.requestLock();
  }
  requestLock() {try { const result=this.canvas.requestPointerLock();result?.catch(()=>this.events.unlock?.());}catch{this.events.unlock?.();}}
  resume(){if(!this.player||this.player.hp<=0)return;this.paused=false;this.keys.clear();this.requestLock();}
  pause(){this.paused=true;this.keys.clear();this.jumpRequested=false;this.cancelActions();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.persist();}
  persist(){if(this.player){const x=this.camera.position.x,z=this.camera.position.z,skyFloor=platformFloor(x,z,this.feetY+.5);this.player.position=this.inCloudGarden?(Number.isFinite(skyFloor)?{x,z,y:skyFloor}:{...CLOUD_START}):{x,z};const ok=saveSlot(this.player,this.saveSlot);if(!ok&&!this.saveWarned){this.saveWarned=true;this.notify('브라우저 저장 공간을 사용할 수 없습니다. 현재 플레이만 유지됩니다.');}return ok;}return false;}
  notify(message){this.events.toast?.(message);}
  initAudio(){if(!this.audio)try{this.audio=new (window.AudioContext||window.webkitAudioContext)();}catch{} if(this.audio?.state==='suspended')this.audio.resume().catch(()=>{});}
  sound(freq=250,duration=.1,type='sine',gain=.035){if(!this.soundOn||!this.audio)return;const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.5),this.audio.currentTime+duration);g.gain.setValueAtTime(gain,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}
  buildWeapon(){
    if(this.weapon){this.camera.remove(this.weapon);this.weapon.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
    this.weapon=createWeapon(this.player);this.weaponBase=this.weapon.position.clone();this.camera.add(this.weapon);this.buildAvatar();
  }
  buildAvatar(){if(this.avatar)disposeAvatar(this.avatar);this.avatar=createAvatar(this.player);this.scene.add(this.avatar);}
  get viewCamera(){return this.active&&this.thirdPerson?this.followCamera:this.camera;}
  togglePerspective(){this.orbitYaw=0;this.orbitPitch=0;this.thirdPerson=!this.thirdPerson;this.player.perspective=this.thirdPerson?'third':'first';this.updateView(0);this.notify(`F1 · ${this.thirdPerson?'3인칭':'1인칭'} 시점`);this.persist();}
  updateView(dt){
    if(!this.avatar)return;if(!this.active){this.avatar.visible=false;this.weapon.visible=false;return;}
    this.weapon.visible=!this.thirdPerson;this.avatar.position.set(this.camera.position.x,this.feetY,this.camera.position.z);this.avatar.rotation.y=this.yaw;
    animateAvatar(this.avatar,{time:this.player.playtime,moving:this.isMoving,sprinting:this.isSprinting,jumping:!this.grounded,climbing:!!this.climbing,action:this.warriorAction,cast:this.castAction,charge:this.bowCharge,drawing:this.drawStartedAt!==null,arrowSkill:this.arrowSkill,swing:this.swing,blocking:this.blocking});
    if(this.thirdPerson){
      const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);const target=this.groundTarget(this.targetedSkill?.range||35),monster=this.aimTarget(60,.98);
      const aim=target.valid?target.point:monster?monster.group.position.clone().add(new THREE.Vector3(0,monster.def.scale,0)):this.camera.position.clone().addScaledVector(dir,35);
      if(!this.keys.has('AltLeft')){this.orbitYaw*=Math.exp(-dt*8);this.orbitPitch*=Math.exp(-dt*8);}
      const lookingAround=Math.abs(this.orbitYaw)>.05||Math.abs(this.orbitPitch)>.05;const distance=followCamera(this.followCamera,this.camera.position,this.yaw+this.orbitYaw,this.pitch+this.orbitPitch,this.world.colliders,lookingAround?this.camera.position.clone().add(new THREE.Vector3(0,-.35,0)):aim);this.avatar.visible=distance>1.05;
    }else this.avatar.visible=false;
  }
  travelDirection(){
    const forward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),right=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),f=forward||(!right?1:0),d=new THREE.Vector3(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*right,0,-Math.cos(this.yaw)*f-Math.sin(this.yaw)*right);return d.normalize();
  }
  mobility(){
    const p=this.player;if(p.classId==='ranger'||this.climbing||this.mobilityCooldown>0)return;
    if(p.classId==='warrior'){
      if(this.stamina<24){this.notify('대쉬에 기력 24가 필요합니다.');return;}
      this.stamina-=24;this.mobilityCooldown=1.2;this.dash={direction:this.travelDirection(),remaining:.18};this.sound(170,.12,'triangle');
    }else{
      if(p.mana<15){this.notify('텔레포트에 MP 15가 필요합니다.');return;}
      const old=new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),d=this.travelDirection();let last=old.clone();
      for(let i=1;i<=30;i++){const q=old.clone().addScaledVector(d,i*.2);if(Math.abs(q.x)>310||Math.abs(q.z)>310||heightAt(q.x,q.z)>this.feetY+.6||this.world.colliders.some(c=>Math.hypot(q.x-c.x,q.z-c.z)<c.r+.45&&this.feetY<heightAt(c.x,c.z)+Math.max(3,c.r*5)))break;last=q;}
      if(last.distanceTo(old)<.4){this.notify('앞이 막혀 있습니다.');return;}
      p.mana-=15;this.mobilityCooldown=TELEPORT_COOLDOWN;this.camera.position.x=last.x;this.camera.position.z=last.z;this.grounded=false;
      this.fx.sigil(old.clone().add(new THREE.Vector3(0,1,0)),'teleport',2.5,.55);this.fx.sigil(last.clone().add(new THREE.Vector3(0,1,0)),'teleport',2.5,.55);this.fx.trail(old.clone().add(new THREE.Vector3(0,1,0)),last.clone().add(new THREE.Vector3(0,1,0)),0x9dceff);
    }
  }
  detachRope(jump=false){if(!this.climbing)return;this.climbing=null;this.vy=jump?7.2:0;this.grounded=false;if(jump){this.camera.position.x-=Math.sin(this.yaw)*.75;this.camera.position.z-=Math.cos(this.yaw)*.75;}this.fallPeak=this.feetY;}
  movement(dt){
    const p=this.player,keys=this.keys,x=this.camera.position.x,z=this.camera.position.z,inWater=this.feetY<0&&isWater(x,z);
    this.mobilityCooldown=Math.max(0,this.mobilityCooldown-dt);
    if(this.climbing){const r=this.climbing,direction=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);this.feetY=clamp(this.feetY+direction*4*dt,r.bottom,r.top);this.camera.position.set(r.x,this.feetY+1.75,r.z+.55);this.camera.rotation.set(this.pitch,this.yaw,0);this.vy=0;this.grounded=false;this.isMoving=!!direction;this.isSprinting=false;this.jumpRequested=false;
      if(direction>0&&this.feetY>=r.top){this.camera.position.set(r.exitX,r.top+1.75,r.exitZ);this.feetY=r.top;this.fallPeak=r.top;this.climbing=null;this.grounded=true;this.notify('등반 완료 · 다음 섬으로 점프하세요.');}
      return;
    }
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    let right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    const moving=!!(forward||right),sprint=p.classId==='ranger'&&moving&&keys.has('ShiftLeft')&&this.stamina>5&&!this.blocking;
    this.isMoving=moving;this.isSprinting=sprint;
    const speed=(inWater?3.8:sprint?9:5.2)*attributes(p).speedMultiplier*(this.blocking?.55:1),length=Math.hypot(forward,right)||1;forward/=length;right/=length;
    let dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right)*speed*dt,dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right)*speed*dt;
    const rush=this.dash?.skill?this.dash:null,wasDashing=!!this.dash;if(this.dash){const slice=Math.min(dt,this.dash.remaining);dx=this.dash.direction.x*25*slice;dz=this.dash.direction.z*25*slice;this.dash.remaining-=dt;if(this.dash.remaining<=0)this.dash=null;}
    let nx=clamp(x+dx,-310,310),nz=clamp(z+dz,-310,310);
    if(wasDashing){const length=Math.hypot(nx-x,nz-z),steps=Math.ceil(length/.15);let safeX=x,safeZ=z;
      for(let i=1;i<=steps;i++){const sx=x+(nx-x)*i/steps,sz=z+(nz-z)*i/steps;if(heightAt(sx,sz)>this.feetY+.65||this.world.colliders.some(c=>Math.hypot(sx-c.x,sz-c.z)<c.r+.42&&this.feetY<heightAt(c.x,c.z)+Math.max(3,c.r*5))){this.dash=null;break;}safeX=sx;safeZ=sz;}nx=safeX;nz=safeZ;
    }
    const ground=surfaceAt(nx,nz,this.feetY+.65);
    if(this.grounded&&ground-this.feetY>.65&&slopeAt(nx,nz)>1.15){nx=x;nz=z;}
    for(const c of this.world.colliders){const d=Math.hypot(nx-c.x,nz-c.z),r=c.r+.42;if(d<r&&this.feetY<heightAt(c.x,c.z)+Math.max(3,c.r*5)){const angle=d>.001?Math.atan2(nz-c.z,nx-c.x):0;nx=c.x+Math.cos(angle)*r;nz=c.z+Math.sin(angle)*r;}}
    this.camera.position.x=nx;this.camera.position.z=nz;
    if(rush)for(const m of this.world.monsters)if(m.alive&&!rush.hitIds.has(m.id)&&this.distanceTo(m)<3.1){rush.hitIds.add(m.id);this.hit(m,attributes(p).attack*rush.skill.power,rush.skill.color);}
    const floor=Math.max(surfaceAt(nx,nz,this.feetY+.15),isWater(nx,nz)?WATER_LEVEL-.7:-Infinity);
    if(this.jumpRequested&&this.grounded){this.vy=inWater?4.7:7.2;this.grounded=false;this.sound(170,.1);}
    this.jumpRequested=false;
    this.vy-=18*dt;this.feetY+=this.vy*dt;this.fallPeak=Math.max(this.fallPeak,this.feetY);
    if(this.feetY<=floor){
      if(!this.grounded&&this.fallPeak-floor>7&&!inWater)this.hurt((this.fallPeak-floor-6)*5,'낙하');
      this.feetY=floor;this.vy=0;this.grounded=true;this.fallPeak=floor;
    }else this.grounded=false;
    if(this.inCloudGarden&&this.feetY<48){this.cancelActions();this.dash=null;nx=CLOUD_START.x;nz=CLOUD_START.z;this.feetY=CLOUD_START.y;this.fallPeak=this.feetY;this.vy=0;this.grounded=true;this.camera.position.set(CLOUD_START.x,this.feetY+1.75,CLOUD_START.z);this.hurt(attributes(p).maxHp*.08,'구름 정원의 안전 결계');this.notify('바람의 결계가 입구 섬으로 돌려보냈습니다.');}
    this.stamina=clamp(this.stamina+(sprint?-17:23)*dt,0,100);
    const bob=moving&&this.grounded?Math.sin(this.time*(sprint?14:10))*.045:Math.sin(this.time*1.5)*.008;
    this.camera.position.y=this.feetY+1.75+bob;
    this.camera.rotation.set(this.pitch+(this.shake>0?(Math.random()-.5)*this.shake*.035:0),this.yaw,0);
    this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,this.blocking&&p.classId==='ranger'?55:sprint?78:72,dt*7);this.camera.updateProjectionMatrix();
    if(this.weapon)animateWeapon(this.weapon,{classId:p.classId,time:this.time,bob,swing:this.swing,charge:this.bowCharge,drawing:this.drawStartedAt!==null,arrowSkill:this.arrowSkill,targeting:this.activeSpellIndex!==null,action:this.warriorAction,cast:this.castAction,blocking:this.blocking});
    this.swing=Math.max(0,this.swing-dt*3.5);this.shake=Math.max(0,this.shake-dt*3);
    if(moving&&this.grounded){this.stepTimer-=dt;if(this.stepTimer<=0){this.sound(inWater?380:90,.06,'triangle',.012);this.stepTimer=sprint?.3:.48;}}
    const b=biomeAt(nx,nz);if(b!==this.lastBiome){this.lastBiome=b;this.events.biome?.(BIOMES.find(v=>v.id===b));}
    // Keep a stable, bounded shadow frustum around the explorer.
    this.sun.position.set(nx-65,100+this.feetY,nz-55);this.sun.target.position.set(nx,this.feetY,nz);
    const inCamp=Math.hypot(nx-CAMP.x,nz-CAMP.z)<13;
    if(inCamp&&this.time>this.combatUntil){const a=attributes(p);p.hp=Math.min(a.maxHp,p.hp+dt*a.maxHp*.06);p.mana=Math.min(a.maxMana,p.mana+dt*14);}
    this.inCamp=inCamp;this.swimming=inWater;
  }
  get arrowSkill(){return this.player&&this.loadedArrowIndex!==null?skillsFor(this.player)[this.loadedArrowIndex]:null;}
  get targetedSkill(){return this.player&&this.activeSpellIndex!==null?skillsFor(this.player)[this.activeSpellIndex]:null;}
  cancelActions(clearSelection=false){this.drawStartedAt=null;this.bowCharge=0;if(this.trajectory)this.trajectory.visible=false;this.blocking=false;this.activeSpellIndex=null;this.fx?.hidePreview();if(clearSelection)this.loadedArrowIndex=null;}
  beginBow(){if(this.attackCooldown>0||this.drawStartedAt!==null||this.player.hp<=0)return;this.drawStartedAt=performance.now();this.bowCharge=0;this.sound(130,.12,'triangle',.012);}
  releaseBow(){
    if(this.drawStartedAt===null)return;
    const shot=bowShot((performance.now()-this.drawStartedAt)/1000);this.drawStartedAt=null;this.bowCharge=0;
    const skill=this.arrowSkill;let kind='basic',color=0xc7b890,power=attributes(this.player).attack;
    if(skill){const error=skillAvailability(this.player,skill,this.cooldowns[this.loadedArrowIndex]);if(error){this.notify(error);return;}this.commitSkill(this.loadedArrowIndex);kind=skill.kind;color=skill.color;power*=skill.power;}
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);
    dir.x+=(Math.random()-.5)*shot.spread;dir.y+=(Math.random()-.5)*shot.spread;dir.normalize();
    this.shoot({power:power*shot.multiplier,color,kind,speed:shot.speed,range:skill?.range||75,gravity:skill?.gravity??shot.gravity,direction:dir,charge:shot.charge,skill});
    this.loadedArrowIndex=null;this.attackCooldown=.36;this.swing=.35;this.sound(220+shot.charge*220,.13,'triangle');
  }
  attack(){
    if((this.player.classId!=='warrior'&&this.attackCooldown>0)||this.player.hp<=0)return;
    if(this.player.classId==='ranger'){if(this.activeSpellIndex!==null)this.castTargetedSpell();else this.beginBow();return;}
    if(this.player.classId==='mage'){
      if(this.activeSpellIndex!==null){this.castTargetedSpell();return;}
      this.attackCooldown=.6;this.swing=1;this.castAction=castAction('orb');this.shoot({power:attributes(this.player).attack,color:0x9cdcff,kind:'magicOrb',speed:29,range:48,gravity:0});this.sound(280,.16);return;
    }
    if(this.dash?.skill)this.dash=null;this.warriorAction=warriorAction('basic',this.combo++);this.attackCooldown=this.warriorAction.duration;this.sound(180,.1,'triangle');
  }
  aimTarget(range=55,dot=.97){
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);let best=null,score=Infinity;
    for(const m of this.world.monsters){if(!m.alive)continue;const center=m.group.position.clone().add(new THREE.Vector3(0,(m.group.userData.hitHeight||1.1)*m.def.scale,0));const v=center.sub(this.camera.position),d=v.length();if(d<range&&v.normalize().dot(dir)>dot&&d<score){best=m;score=d;}}
    return best;
  }
  groundTarget(range){
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);
    for(let d=.5;d<=range;d+=.5){const point=this.camera.position.clone().addScaledVector(dir,d);if(point.y<=surfaceAt(point.x,point.z,this.camera.position.y)+.08){point.y=surfaceAt(point.x,point.z,this.camera.position.y);return {point,valid:Math.abs(point.x)<=310&&Math.abs(point.z)<=310&&!isWater(point.x,point.z)};}}
    const point=this.camera.position.clone().addScaledVector(dir,range);point.y=surfaceAt(point.x,point.z,this.camera.position.y);return {point,valid:false};
  }
  commitSkill(index){
    const s=skillsFor(this.player)[index];this.player.mana-=s.cost;this.cooldowns[index]=s.cooldown;this.swing=1;this.events.skill?.(index);this.sound(480+index*80,.2,'sine',.035);return s;
  }
  skill(index){
    const p=this.player,s=skillsFor(p)[index],error=skillAvailability(p,s,this.cooldowns[index]);if(error){this.notify(error);return;}
    if(this.castAction?.archery&&this.castAction.age<this.castAction.release){this.notify('활 사격 동작 중입니다.');return;}
    if(isArrowSkill(p,s)){this.activeSpellIndex=null;this.fx.hidePreview();this.loadedArrowIndex=this.loadedArrowIndex===index?null:index;this.notify(this.loadedArrowIndex===null?'일반 화살 장전':`${s.name} 장전 · 좌클릭을 누르고 당긴 뒤 놓아 발사`);return;}
    if(s.targeted){this.drawStartedAt=null;this.bowCharge=0;this.loadedArrowIndex=null;this.activeSpellIndex=this.activeSpellIndex===index?null:index;this.notify(this.activeSpellIndex===null?'시전 취소':`${s.name} · 지면을 겨눈 뒤 좌클릭 · 우클릭 취소`);if(this.activeSpellIndex===null)this.fx.hidePreview();return;}
    this.commitSkill(index);const a=attributes(p);this.notify(s.name);
    if(p.classId!=='warrior')this.castAction=castAction(s.kind);
    if(p.classId==='warrior'){if(this.dash?.skill)this.dash=null;this.warriorAction={...warriorAction(s.motion||s.kind,this.combo++),skill:s};this.attackCooldown=0;return;}
    if(s.kind==='guard'||s.kind==='sanctuary'){p.buffs.guard=12;if(s.kind==='sanctuary')p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.5);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),4,'sanctuary',s.color,0,1.5);}
    else if(s.kind==='heal'){p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.4);this.burst(this.camera.position,s.color,24);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),3,s.kind,s.color,0,1.2);}
    else if(s.kind==='restore'){p.mana=Math.min(a.maxMana,p.mana+a.maxMana*.45);p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.2);this.burst(this.camera.position,s.color,24);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),3,s.kind,s.color,0,1.2);}
    else if(s.kind==='rage'||s.kind==='blessing'){p.buffs.rage=15;p.hp=Math.min(a.maxHp,p.hp+a.maxHp*(s.kind==='blessing'?1:.15));this.burst(this.camera.position,s.color,24);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),3,s.kind,s.color,0,1.2);}
    else{

      for(const m of this.world.monsters)if(m.alive&&this.distanceTo(m)<s.range){this.hit(m,a.attack*s.power,s.color);if(s.kind==='freeze')m.freeze=4;}
      this.slash(s.color,s.range);
    }
  }
  castTargetedSpell(){
    const index=this.activeSpellIndex,s=this.targetedSkill;if(!s)return;
    const error=skillAvailability(this.player,s,this.cooldowns[index]);if(error){this.notify(error);return;}
    const target=this.groundTarget(s.range);if(!target.valid){this.notify('시전 범위 안의 마른 지면을 겨누세요.');return;}
    this.commitSkill(index);
    if(this.player.classId==='ranger'){
      this.castAction={...archeryAction(s.motion),color:s.color,yaw:this.yaw};this.attackCooldown=this.castAction.release;
      this.createField(target.point,{...s,delay:this.castAction.release+s.delay});this.drawStartedAt=null;this.bowCharge=0;this.loadedArrowIndex=null;
    }else{this.castAction=castAction(s.kind);this.createField(target.point,s);}
    this.notify(s.name);this.activeSpellIndex=null;this.fx.hidePreview();
  }
  createField(point,skill){
    const ticks=skill.duration>0?Math.max(1,Math.round(skill.duration/.5)):1;
    this.fields.push({point:point.clone(),skill,power:attributes(this.player).attack*skill.power/ticks,ticks,timer:skill.delay||0});
    this.fx.spell(point,skill.radius,skill.kind,skill.color,skill.delay||0,skill.duration||0);
  }
  updateTrajectory(){
    const show=this.player.classId==='ranger'&&this.drawStartedAt!==null;
    if(!this.trajectory){this.trajectory=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xfff4cb,dashSize:.24,gapSize:.17,transparent:true,opacity:.7,depthWrite:false,toneMapped:false}));this.scene.add(this.trajectory);}
    this.trajectory.visible=show;if(!show)return;
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);const shot=bowShot((performance.now()-this.drawStartedAt)/1000),start=this.camera.position.clone().addScaledVector(dir,.8),pts=[],range=this.arrowSkill?.range||75;let distance=0;
    for(let i=0;i<=56;i++){const t=i*.025,q=start.clone().addScaledVector(dir,shot.speed*t);q.y-=.5*(this.arrowSkill?.gravity??shot.gravity)*t*t;if(i)distance+=q.distanceTo(pts.at(-1));if(distance>range)break;pts.push(q);if(i&&q.y<=surfaceAt(q.x,q.z,start.y+.1))break;}
    this.trajectory.geometry.dispose();this.trajectory.geometry=new THREE.BufferGeometry().setFromPoints(pts);this.trajectory.computeLineDistances();
  }
  updateCombat(dt){
    this.updateTrajectory();
    if(this.castAction){const cast=this.castAction;cast.age+=dt;
      if(cast.archery&&!cast.released&&cast.age>=cast.release){cast.released=true;const direction=new THREE.Vector3(0,cast.kind==='bowSky'?.96:-.95,-.3).normalize().applyAxisAngle(UP,cast.yaw);this.fx.bowShot(this.camera.position.clone().add(new THREE.Vector3(-Math.cos(cast.yaw)*.3,-.2,Math.sin(cast.yaw)*.3)),direction,cast.color);}
      if(cast.age>=cast.duration)this.castAction=null;
    }
    const action=this.warriorAction;
    if(action){action.age+=dt;if(!action.hit&&action.age>=action.impact){action.hit=true;this.resolveWarrior(action);}if(action.age>=action.duration)this.warriorAction=null;}
    if(this.drawStartedAt!==null)this.bowCharge=bowShot((performance.now()-this.drawStartedAt)/1000).charge;
    const s=this.targetedSkill;if(s){const target=this.groundTarget(s.range);this.spellTarget=target;this.fx.setPreview(target.point,s.radius,s.color,target.valid&&!skillAvailability(this.player,s,this.cooldowns[this.activeSpellIndex]));}else{this.spellTarget=null;this.fx.hidePreview();}
    for(let i=this.fields.length-1;i>=0;i--){const f=this.fields[i];f.timer-=dt;if(f.timer<=0){
      for(const m of this.world.monsters)if(m.alive&&inSpellArea({x:m.x,z:m.z,y:m.group.position.y},f.point,f.skill.radius,7*m.def.scale)){this.hit(m,f.power,f.skill.color);if(f.skill.kind==='frostZone')m.freeze=4;}
      f.ticks--;f.timer+=.5;if(f.ticks<=0)this.fields.splice(i,1);
    }}
  }
  resolveWarrior(action){
    const p=this.player,s=action.skill,a=attributes(p),color=s?.color||0xf2d9a2;
    if(!s){const m=this.aimTarget(4.8,.6);if(m)this.hit(m,a.attack);this.bladeArc(color,action.combo);return;}
    if(s.kind==='guard'||s.kind==='sanctuary'){p.buffs.guard=12;if(s.kind==='sanctuary')p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.5);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),4,'sanctuary',color,0,1.5);}
    else if(s.kind==='rage'){p.buffs.rage=15;p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.15);this.burst(this.camera.position,color,24);this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),3,'rage',color,0,1.2);}
    else{
      if(s.kind==='dash'){this.dash={direction:new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),remaining:.22,skill:s,hitIds:new Set()};this.fx.ring(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),color,2,.3);}
      for(const m of this.world.monsters)if(s.kind!=='dash'&&m.alive&&this.distanceTo(m)<s.range){this.hit(m,a.attack*s.power,color);if(s.kind==='freeze')m.freeze=4;}
      this.fx.spell(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),s.range,action.kind==='freeze'?'shatter':action.kind,color,0,.5);this.bladeArc(color,action.combo);this.shake=['freeze','judgment'].includes(action.kind)?.35:.12;
    }
    this.events.change?.();
  }
  bladeArc(color,combo){
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);const right=new THREE.Vector3().crossVectors(dir,UP).normalize(),center=this.camera.position.clone().addScaledVector(dir,1.9).add(new THREE.Vector3(0,-.2,0));let last=null;this.fx.sweep(center,this.yaw,this.pitch,color,combo%2?1:-1);
    for(let i=0;i<=12;i++){const t=i/12,point=center.clone().addScaledVector(right,(t-.5)*2.6).addScaledVector(UP,(combo%2?1:-1)*(t-.5)*.65).addScaledVector(dir,Math.sin(t*Math.PI)*.45);if(last)this.fx.trail(last,point,color);last=point;}
  }
  distanceTo(m){return Math.hypot(m.x-this.camera.position.x,m.z-this.camera.position.z,m.group.position.y-this.feetY);}
  shoot({power,color,kind,speed,range,gravity=9.81,direction=null,charge=0,skill=null}){
    const dir=direction||new THREE.Vector3();if(!direction)this.camera.getWorldDirection(dir);
    const mesh=kind==='magicOrb'?magicOrb():kind==='stormArrow'?makeStormArrow(color,skill?.radius??6):makeArrow(color,kind!=='basic');if(kind!=='magicOrb'&&kind!=='stormArrow')mesh.scale.set(2.2,2.2,1.65);mesh.position.copy(this.camera.position).addScaledVector(dir,.8);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir.clone().normalize());this.scene.add(mesh);
    this.projectiles.push({mesh,velocity:dir.clone().multiplyScalar(speed),power,color,kind,gravity,range,charge,speed,travel:0,life:range/Math.max(1,speed)+5,hitIds:new Set(),skill,bouncesLeft:skill?.bounces??0,piercing:kind==='pierce'});
  }
  monsterCenter(m){return m.group.position.clone().add(new THREE.Vector3(0,(m.group.userData.hitHeight||1.1)*m.def.scale,0));}
  chainTarget(p,origin){
    const candidates=this.world.monsters.map(m=>{const c=this.monsterCenter(m);return {id:m.id,alive:m.alive,x:c.x,y:c.y,z:c.z,monster:m};});
    return nextChainTarget(candidates,origin,p.hitIds,p.skill?.bounceRange??10)?.monster||null;
  }
  redirectChain(p,m,contact){
    if(p.bouncesLeft<=0)return false;
    const origin=this.monsterCenter(m),next=this.chainTarget(p,origin);if(!next)return false;
    p.bouncesLeft--;p.chainOrigin=origin;p.chainTarget=next;p.gravity=0;p.travel=0;p.range=p.skill.bounceRange;p.life=3;
    p.mesh.position.copy(contact);p.velocity.copy(this.monsterCenter(next).sub(contact).normalize().multiplyScalar(p.speed));return true;
  }
  pullMonster(m,point,step){
    const dx=point.x-m.x,dz=point.z-m.z,d=Math.hypot(dx,dz);if(d<.05)return;
    const move=Math.min(step,d),nx=m.x+dx/d*move,nz=m.z+dz/d*move;
    if(m.island&&Math.hypot(nx-m.island.x,nz-m.island.z)>m.island.r-.5)return;
    const floor=surfaceAt(nx,nz,m.group.position.y+.65);
    if(Math.abs(floor-m.group.position.y)>.65||isWater(nx,nz)||this.world.colliders.some(c=>Math.hypot(nx-c.x,nz-c.z)<c.r+.45))return;
    m.x=nx;m.z=nz;m.group.position.set(nx,floor,nz);
  }
  updateProjectiles(dt){
    const line=new THREE.Line3(),near=new THREE.Vector3();
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],old=p.mesh.position.clone();p.life-=dt;
      if(p.chainTarget){
        if(!p.chainTarget.alive)p.chainTarget=this.chainTarget(p,p.chainOrigin);
        if(p.chainTarget)p.velocity.copy(this.monsterCenter(p.chainTarget).sub(old).normalize().multiplyScalar(p.speed));else{this.removeObject(p.mesh);this.projectiles.splice(i,1);continue;}
      }
      p.velocity.y-=p.gravity*dt;p.mesh.position.addScaledVector(p.velocity,dt);
      const remaining=Math.max(0,p.range-p.travel),step=old.distanceTo(p.mesh.position);if(step>remaining)p.mesh.position.copy(old).lerp(p.mesh.position,remaining/step);
      p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),p.velocity.clone().normalize());p.travel+=old.distanceTo(p.mesh.position);line.set(old,p.mesh.position);
      let groundT=Infinity;for(let j=1;j<=8;j++){const q=line.at(j/8,new THREE.Vector3());if(q.y<=surfaceAt(q.x,q.z,old.y+.1)+.025){groundT=j/8;break;}}
      if(groundT!==Infinity){p.mesh.position.copy(line.at(groundT,new THREE.Vector3()));line.end.copy(p.mesh.position);}
      let stopped=false,bounced=false;
      if(p.kind==='stormArrow'){
        for(const m of this.world.monsters){if(!m.alive)continue;line.closestPointToPoint(this.monsterCenter(m),true,near);
          if(near.distanceTo(this.monsterCenter(m))>(p.skill?.radius??6))continue;
          if(!p.hitIds.has(m.id)){p.hitIds.add(m.id);this.hit(m,p.power,p.color);}
          if(m.alive)this.pullMonster(m,near,(p.skill?.pullSpeed??8)*dt);
        }
        animateStormArrow(p.mesh,dt);
      }else{
        const hits=[];for(const m of this.world.monsters){if(!m.alive||p.hitIds.has(m.id))continue;const c=this.monsterCenter(m);if(p.chainOrigin&&c.distanceTo(p.chainOrigin)>p.skill.bounceRange)continue;line.closestPointToPoint(c,true,near);const t=line.closestPointToPointParameter(c,true);if(near.distanceTo(c)<(m.group.userData.hitRadius||.8)*m.def.scale+(p.kind==='magicOrb'?.14:.1))hits.push({m,t});}
        hits.sort((a,b)=>a.t-b.t);
        for(const {m,t}of hits){if(!m.alive)continue;const contact=line.at(t,new THREE.Vector3());p.hitIds.add(m.id);
          if(p.kind==='frost'){
            const point=m.group.position.clone();for(const other of this.world.monsters)if(other.alive&&inSpellArea({x:other.x,y:other.group.position.y,z:other.z},point,p.skill?.radius??5,7)){this.hit(other,p.power,p.color,other===m?contact:null);other.slow=6;}
            this.fx.spell(point,p.skill?.radius??5,'frostBurst',p.color,0,0);
          }else this.hit(m,p.power,p.color,contact);
          if(p.kind==='chainArrow')bounced=this.redirectChain(p,m,contact);
          if(!p.piercing){stopped=!bounced;break;}
        }
      }
      this.fx.trail(old,p.mesh.position,p.kind==='basic'?0xfff5cc:p.color);if(p.kind==='magicOrb')p.mesh.children[0].rotation.y+=dt*7;
      if(bounced)continue;
      if(stopped||groundT!==Infinity||p.life<=0||p.travel>=p.range){this.removeObject(p.mesh);this.projectiles.splice(i,1);}
    }
  }
  hit(m,raw,color=0xf5e8c5,contact=null){
    if(!m.alive)return;const stats=attributes(this.player),crit=Math.random()<stats.critChance,amount=Math.round(raw*(crit?stats.critMultiplier:1));m.hp=Math.max(0,m.hp-amount);m.hit=.32;m.aggro=true;this.combatUntil=this.time+8;
    const center=m.group.position.clone().add(new THREE.Vector3(0,(m.group.userData.hitHeight||1)*m.def.scale,0)),toward=this.camera.position.clone().sub(center).normalize();const impact=(contact||center).clone().addScaledVector(toward,(m.group.userData.hitRadius||.7)*m.def.scale+.12);this.fx.impact(impact,{shape:m.def.shape,color,crit,scale:Math.min(1.8,m.def.scale)});this.events.hit?.(crit);
    this.events.damage?.({position:m.group.position.clone().add(new THREE.Vector3(0,2.4*m.def.scale,0)),amount,crit,color});this.burst(m.group.position.clone().add(new THREE.Vector3(0,m.def.scale,0)),color,5);this.sound(crit?420:230,.08,'triangle');
    if(m.hp<=0)this.kill(m);
  }
  kill(m){
    if(!m.alive)return;
    m.alive=false;m.deathAge=0;m.deathSide=Math.random()<.5?-1:1;m.deathY=m.group.position.y;m.attackAge=null;m.respawnAt=this.time+40;m.aggro=false;const p=this.player;p.stats.kills++;p.killsByType[m.type]=(p.killsByType[m.type]||0)+1;if(m.def.boss)p.stats.boss++;
    const xp=26+m.def.level*17,gold=3+m.def.level*2,levels=awardXp(p,xp),items=rollLoot(m.type);
    const drop={id:globalThis.crypto?.randomUUID?.()||`loot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,type:m.type,x:clamp(m.x,-310,310),z:clamp(m.z,-310,310),...(m.island?{y:m.island.y}:{}),items,gold};p.groundLoot.push(drop);this.groundLoot.add(drop,true);
    this.notify(`${m.def.name} · +${xp*TEST_XP_MULTIPLIER} EXP · 전리품은 바닥에서 E로 획득`);if(levels)this.levelUp(levels);this.checkQuests();this.events.change?.();
  }
  levelUp(){this.notify(`LEVEL UP · Lv.${this.player.level}${[4,7,10,15].includes(this.player.level)?' · 새로운 성장의 길이 열렸습니다':''}`);this.burst(this.camera.position.clone().add(new THREE.Vector3(0,-.4,0)),0xffe1a1,30);this.sound(740,.5,'sine');this.events.level?.();}
  checkQuests(){for(const q of claimQuests(this.player)){this.notify(`탐험 달성 · ${q.name} · +${q.xp} EXP / ${q.gold} G`);if(q.levels)this.levelUp();}this.persist();}
  hurt(raw,source){
    if(this.player.hp<=0)return;const blocked=this.blocking&&this.stamina>8;const amount=damagePlayer(this.player,raw*(blocked?.4:1));if(blocked)this.stamina=Math.max(0,this.stamina-8);
    this.shake=.5;this.events.hurt?.(amount,source);this.combatUntil=this.time+8;this.sound(65,.18,'sawtooth',.022);
    if(this.player.hp<=0){this.pause();this.events.dead?.();}
  }
  useItem(id){
    const r=consume(this.player,id);if(r.ok&&r.recall){
      const old=new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z);this.cancelActions();this.warriorAction=null;this.climbing=null;this.dash=null;this.keys.clear();this.jumpRequested=false;this.vy=0;this.grounded=true;this.feetY=heightAt(CAMP.x,CAMP.z);this.fallPeak=this.feetY;this.camera.position.set(CAMP.x,this.feetY+1.75,CAMP.z);this.player.position={...CAMP};this.inCloudGarden=false;this.combatUntil=0;
      this.fx.spell(old,2,'recall',0x86e8ce,0,.8);this.fx.spell(new THREE.Vector3(CAMP.x,this.feetY,CAMP.z),2,'recall',0x86e8ce,0,1.5);
    }
    this.notify(r.message);if(r.ok)this.persist();this.events.change?.();return r;
  }
  respawn(){const p=this.player;p.xp=Math.max(0,Math.floor(p.xp*.85));p.position={...CAMP};const a=attributes(p);p.hp=a.maxHp;p.mana=a.maxMana;this.start(p);this.notify('야영지에서 다시 깨어났습니다. 현재 경험치의 15%를 잃었습니다.');}
  updateMonsters(dt){
    const px=this.camera.position.x,pz=this.camera.position.z;
    for(const m of this.world.monsters){
      if(!m.alive){animateMonster(m,dt,this.time);if(this.time>=m.respawnAt){m.alive=true;m.deathAge=0;m.attackAge=null;m.hit=0;m.group.rotation.x=0;m.group.rotation.z=0;m.group.visible=true;m.hp=m.def.hp;m.x=m.homeX;m.z=m.homeZ;m.slow=0;m.freeze=0;m.poison=0;m.poisonTick=0;m.aggro=false;m.group.position.set(m.x,m.island?.y??heightAt(m.x,m.z),m.z);}continue;}
      m.attackTimer=Math.max(0,m.attackTimer-dt);m.hit=Math.max(0,m.hit-dt);m.freeze=Math.max(0,m.freeze-dt);m.slow=Math.max(0,m.slow-dt);
      if(m.poison>0){m.poison-=dt;m.poisonTick-=dt;if(m.poisonTick<=0){m.poisonTick=1;this.hit(m,m.poisonPower,0xc0f386);if(!m.alive)continue;}}
      const d=Math.hypot(px-m.x,pz-m.z),fromHome=Math.hypot(m.x-m.homeX,m.z-m.homeZ),camp=Math.hypot(px-CAMP.x,pz-CAMP.z)<13;
      if(d<17&&!camp&&Math.abs(this.feetY-m.group.position.y)<8)m.aggro=true;if(d>48||fromHome>36||camp){if(m.aggro&&fromHome>5)m.returning=true;m.aggro=false;}
      let tx=m.homeX+Math.sin(this.time*.15+m.homeZ)*4,tz=m.homeZ+Math.cos(this.time*.12+m.homeX)*4,speed=m.def.speed*.25;
      if(m.aggro){tx=px;tz=pz;speed=m.def.speed;}else if(m.returning){tx=m.homeX;tz=m.homeZ;speed=m.def.speed;if(fromHome<2){m.returning=false;m.hp=m.def.hp;}}
      if(m.slow>0)speed*=.35;if(m.freeze>0)speed=0;
      if(m.attackAge!==null&&m.attackAge!==undefined){
        if(m.freeze<=0)m.attackAge+=dt;
        if(!m.attackDealt&&m.attackAge>=.46){m.attackDealt=true;if(d<m.def.range+1&&Math.abs(this.feetY-m.group.position.y)<4*m.def.scale){this.hurt(m.def.attack,m.def.name);this.burst(this.camera.position.clone().add(new THREE.Vector3(0,-.5,-.3)),0xe99b7c,4);}}
        if(m.attackAge>=.85)m.attackAge=null;else speed=0;
      }
      const dist=Math.hypot(tx-m.x,tz-m.z);m.moveSpeed=0;
      if(dist>.5&&(!m.aggro||d>m.def.range*.85)){
        const nx=m.x+(tx-m.x)/dist*speed*dt,nz=m.z+(tz-m.z)/dist*speed*dt;
        if((!isWater(nx,nz)||m.type==='spirit')&&(!m.island||Math.hypot(nx-m.island.x,nz-m.island.z)<m.island.r-1)){m.x=nx;m.z=nz;m.moveSpeed=speed;}else{m.x+=(m.homeX-m.x)*dt;m.z+=(m.homeZ-m.z)*dt;}
        m.group.rotation.y=Math.atan2(-(tx-m.x),-(tz-m.z));
      }
      m.group.position.set(m.x,m.island?.y??heightAt(m.x,m.z),m.z);
      if(m.aggro&&d<m.def.range&&Math.abs(this.feetY-m.group.position.y)<4*m.def.scale&&m.attackTimer<=0&&m.freeze<=0){
        m.attackTimer=m.def.boss?2.1:1.6;m.attackAge=0;m.attackDealt=false;
      }
      animateMonster(m,dt,this.time);
    }
  }
  nearestInteractable(){
    let target=null,dist=4.8;const x=this.camera.position.x,z=this.camera.position.z;
    const all=[...(this.world.portals||[]),...(this.world.ropes||[]).map(r=>({...r,group:{position:{y:clamp(this.feetY,r.bottom,r.top)}}})),...this.world.npcs.map(n=>({...n,source:n,type:'npc',description:n.role+' · 대화 / 의뢰'})),...Array.from(this.groundLoot.bags.values()).map(n=>({...n,source:n,type:'loot',name:MONSTERS[n.type].name+'의 전리품',description:[...Object.entries(n.items).map(([id,count])=>ITEMS[id].name+' ×'+count),n.gold+' G'].join(' · ')})),...this.world.nodes.filter(n=>n.group.visible).map(n=>({...n,source:n,type:'node'})),...this.world.chests.filter(c=>!c.opened).map(c=>({...c,source:c,type:'chest'}))];
    for(const item of all){const d=Math.hypot(x-item.x,z-item.z,this.feetY-item.group.position.y);if(d<dist){dist=d;target=item;}}
    if(!target&&Math.hypot(x-CAMP.x,z-CAMP.z)<9)target={type:'camp',name:'새벽 야영지',description:'휴식 · 전직 · 저장'};
    return target;
  }
  interact(){
    if(this.climbing){this.detachRope();return;}
    const target=this.nearestInteractable();if(!target)return;const p=this.player;
    if(target.type==='portal'){
      this.inCloudGarden=target.id==='cloud-gate';const to=target.id==='cloud-gate'?CLOUD_START:{...CAMP,y:heightAt(CAMP.x,CAMP.z)};this.cancelActions();this.climbing=null;this.dash=null;this.feetY=to.y;this.fallPeak=to.y;this.vy=0;this.grounded=true;this.camera.position.set(to.x,to.y+1.75,to.z);this.yaw=0;this.pitch=-.08;this.camera.rotation.set(this.pitch,this.yaw,0);this.lastBiome=biomeAt(to.x,to.z);this.events.biome?.(BIOMES.find(b=>b.id===this.lastBiome));this.notify(target.id==='cloud-gate'?'구름 정원 · Space 점프 · 줄 근처에서 E → W/S 등반':'새벽 야영지로 돌아왔습니다.');this.persist();return;
    }
    if(target.type==='rope'){this.cancelActions();this.climbing=this.world.ropes.find(r=>r.id===target.id);this.feetY=clamp(this.feetY,target.bottom,target.top);this.fallPeak=this.feetY;this.notify('W/S 오르내리기 · Space 뛰어내리기 · E 놓기');return;}
    if(target.type==='camp'){this.events.camp?.();return;}
    const obj=target.source;
    if(target.type==='npc'){this.events.npc?.(obj);return;}
    if(target.type==='loot'){
      const drop=collectDrop(p,obj.id);if(!drop)return;this.groundLoot.remove(obj.id);this.events.loot?.(drop.items);this.notify(`전리품 획득 · ${drop.gold} G`);this.sound(640,.12);this.checkQuests();this.events.change?.();return;
    }
    if(target.type==='node'){
      obj.group.visible=false;obj.availableAt=this.time+90;const count=2+Math.floor(Math.random()*2);addItems(p,{[obj.kind]:count});p.stats.gathers++;const levels=awardXp(p,8);if(levels)this.levelUp();this.events.loot?.({[obj.kind]:count});this.notify(`${obj.name} 채집 · +${8*TEST_XP_MULTIPLIER} EXP`);this.sound(550,.12,'sine');
    }else{
      obj.opened=true;obj.beam.visible=false;obj.lid.rotation.x=-.8;p.opened.push(obj.id);p.stats.chests++;const loot={health:obj.tier,mana:obj.tier,iron:obj.tier+1,crystal:obj.tier};if(obj.tier>=3)loot.relic=obj.tier-2;if(obj.tier>=4)loot.star=1;addItems(p,loot);p.gold+=obj.tier*35;const levels=awardXp(p,obj.tier*35);if(levels)this.levelUp();this.events.loot?.(loot);this.notify(`보물 발견 · +${obj.tier*35} G / ${obj.tier*35*TEST_XP_MULTIPLIER} EXP`);this.sound(880,.4,'sine');this.burst(obj.group.position.clone().add(new THREE.Vector3(0,1,0)),0xffd47f,24);
    }
    this.checkQuests();this.events.change?.();
  }
  burst(pos,color,count=18){this.fx.particles(pos,color,count);}
  slash(color,radius){this.fx.ring(new THREE.Vector3(this.camera.position.x,this.feetY,this.camera.position.z),color,radius);}
  slashAt(pos,color,radius){this.fx.ring(pos,color,radius);}
  trail(start,end,color){this.fx.trail(start,end,color);}
  removeObject(object){this.scene.remove(object);object.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  updateEffects(dt){this.fx.update(dt);}
  setQuality(quality){this.quality=quality;this.renderer.setPixelRatio(quality==='low'?.8:Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=quality!=='low';this.renderer.setSize(innerWidth,innerHeight);}
  animate(){
    requestAnimationFrame(()=>this.animate());const realDelta=this.clock.getDelta(),dt=Math.min(realDelta,.045);this.time+=dt;this.frameCount++;this.frameTime+=realDelta;if(this.frameTime>1){this.fps=Math.round(this.frameCount/this.frameTime);this.frameTime=0;this.frameCount=0;}
    if(this.active&&!this.paused&&this.locked&&this.player.hp>0){
      this.player.playtime+=dt;this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.cooldowns=this.cooldowns.map(v=>Math.max(0,v-dt));
      for(const key of Object.keys(this.player.buffs))this.player.buffs[key]=Math.max(0,this.player.buffs[key]-dt);
      const a=attributes(this.player);this.player.mana=Math.min(a.maxMana,this.player.mana+dt*a.manaRegen);if(this.time>this.combatUntil)this.player.hp=Math.min(a.maxHp,this.player.hp+dt*1.1);
      this.movement(dt);this.updateCombat(dt);if(this.player.hp>0){this.updateMonsters(dt);this.updateProjectiles(dt);}if(this.time-this.lastSave>15){this.persist();this.lastSave=this.time;}
    }
    this.groundLoot.update(this.active&&!this.paused&&this.locked?dt:0,this.time,this.camera.position);
    this.world.update(this.time,dt,this.camera.position,this.quality==='low');this.updateEffects(this.active&&this.paused?0:dt);this.updateView(this.active&&!this.paused&&this.locked?dt:0);this.renderer.render(this.scene,this.viewCamera);this.events.frame?.(realDelta);
  }
}
