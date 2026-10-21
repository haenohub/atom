import * as THREE from 'three';
import { World } from './world.js';
import { heightAt, biomeAt, isWater, slopeAt, WATER_LEVEL } from './terrain.js';
import { CAMP, CLASSES, MONSTERS, ITEMS, BIOMES, skillsFor } from './data.js';
import { attributes, gainXp, rollLoot, addItems, damagePlayer, claimQuests, savePlayer, consume } from './state.js';
const UP=new THREE.Vector3(0,1,0), clamp=THREE.MathUtils.clamp;
export class GameEngine {
  constructor(canvas, events={}) {
    this.events=events;this.canvas=canvas;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xb9d1c8);this.scene.fog=new THREE.FogExp2(0xb9d1c8,.0037);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,1100);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight(0xe8f5eb,0x6c7650,2.1));
    this.sun=new THREE.DirectionalLight(0xffe6ba,3.1);this.sun.position.set(-65,100,-55);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-75;this.sun.shadow.camera.right=75;this.sun.shadow.camera.top=75;this.sun.shadow.camera.bottom=-75;this.sun.shadow.camera.far=270;this.sun.shadow.normalBias=.12;this.sun.shadow.bias=-.0002;this.scene.add(this.sun,this.sun.target);
    this.world=new World(this.scene);this.clock=new THREE.Clock();this.time=0;this.lastSave=0;this.active=false;this.player=null;this.locked=false;this.paused=true;this.keys=new Set();this.projectiles=[];this.effects=[];this.damageTexts=[];this.cooldowns=[0,0,0,0,0];this.attackCooldown=0;this.stamina=100;this.swing=0;this.shake=0;this.yaw=0;this.pitch=0;this.vy=0;this.grounded=true;this.fallPeak=0;this.combatUntil=0;this.lastBiome='forest';this.soundOn=false;this.audio=null;this.stepTimer=0;this.frameCount=0;this.frameTime=0;this.fps=0;
    this.camera.position.set(24,heightAt(24,72)+8,72);this.camera.lookAt(-5,heightAt(0,20)+4,-20);
    this.bind();this.animate();
  }
  bind() {
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===this.canvas;this.keys.clear();if(this.active&&!this.locked)this.events.unlock?.();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active){this.persist();this.pause();this.events.unlock?.();}});
    document.addEventListener('mousemove',e=>{if(this.locked&&!this.paused){this.yaw-=e.movementX*.002;this.pitch=clamp(this.pitch-e.movementY*.002,-1.48,1.48);}});
    window.addEventListener('keydown',e=>{
      if(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)return;
      if(['Space','Tab','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
      if(e.repeat)return;this.keys.add(e.code);
      if(!this.active)return;
      if(['KeyI','KeyC','KeyM','KeyJ','KeyK','Escape','Tab'].includes(e.code)){this.events.key?.(e.code);return;}
      if(this.paused||!this.locked||this.player.hp<=0)return;
      if(e.code==='Space')this.jumpRequested=true;
      if(e.code==='KeyE')this.interact();if(e.code==='KeyQ'){const r=consume(this.player,'health');this.notify(r.message);this.events.change?.();}
      if(/^Digit[1-5]$/.test(e.code))this.skill(Number(e.code.slice(-1))-1);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    this.canvas.addEventListener('mousedown',e=>{if(this.active&&!this.paused&&this.locked){if(e.button===0)this.attack();if(e.button===2)this.blocking=true;}});
    window.addEventListener('mouseup',e=>{if(e.button===2)this.blocking=false;});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',()=>{this.keys.clear();this.blocking=false;});
    window.addEventListener('beforeunload',()=>this.persist());
  }
  start(player) {
    this.player=player;this.active=true;this.paused=false;this.stamina=100;this.cooldowns.fill(0);this.keys.clear();this.jumpRequested=false;this.combatUntil=0;this.vy=0;this.grounded=true;
    this.yaw=.08;this.pitch=-.04;const {x,z}=player.position;this.feetY=Math.max(heightAt(x,z),isWater(x,z)?WATER_LEVEL-.8:-Infinity);this.fallPeak=this.feetY;this.camera.position.set(x,this.feetY+1.75,z);
    for(const c of this.world.chests){c.opened=player.opened.includes(c.id);c.beam.visible=!c.opened;c.lid.rotation.x=c.opened?-.8:0;}
    for(const m of this.world.monsters){m.hp=m.def.hp;m.alive=true;m.group.visible=true;m.x=m.homeX;m.z=m.homeZ;m.aggro=false;m.slow=0;m.freeze=0;m.poison=0;m.poisonTick=0;}
    this.buildWeapon();this.lastBiome=biomeAt(x,z);this.events.biome?.(BIOMES.find(b=>b.id===this.lastBiome));this.initAudio();this.requestLock();
  }
  requestLock() {try { const result=this.canvas.requestPointerLock();result?.catch(()=>this.events.unlock?.());}catch{this.events.unlock?.();}}
  resume(){if(!this.player||this.player.hp<=0)return;this.paused=false;this.keys.clear();this.requestLock();}
  pause(){this.paused=true;this.keys.clear();this.jumpRequested=false;this.blocking=false;if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.persist();}
  persist(){if(this.player){this.player.position={x:this.camera.position.x,z:this.camera.position.z};const ok=savePlayer(this.player);if(!ok&&!this.saveWarned){this.saveWarned=true;this.notify('브라우저 저장 공간을 사용할 수 없습니다. 현재 플레이만 유지됩니다.');}return ok;}return false;}
  notify(message){this.events.toast?.(message);}
  initAudio(){if(!this.audio)try{this.audio=new (window.AudioContext||window.webkitAudioContext)();}catch{} if(this.audio?.state==='suspended')this.audio.resume().catch(()=>{});}
  sound(freq=250,duration=.1,type='sine',gain=.035){if(!this.soundOn||!this.audio)return;const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.5),this.audio.currentTime+duration);g.gain.setValueAtTime(gain,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}
  buildWeapon(){
    if(this.weapon){this.camera.remove(this.weapon);this.weapon.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}const g=new THREE.Group();const id=ITEMS[this.player.equipment.weapon],advanced=id?.rarity==='epic';
    const steel=new THREE.MeshStandardMaterial({color:advanced?0xf2c16d:0xcbd7ce,metalness:.7,roughness:.25}),wood=new THREE.MeshStandardMaterial({color:0x71513b,roughness:.9}),gold=new THREE.MeshStandardMaterial({color:0xd4ad65,metalness:.55,roughness:.3});
    const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
    if(this.player.classId==='warrior'){
      add(new THREE.BoxGeometry(.075,.76,.035),steel,0,.3,0);const tip=add(new THREE.ConeGeometry(.052,.17,4),steel,0,.76,0);tip.rotation.y=Math.PI/4;
      add(new THREE.BoxGeometry(.28,.045,.07),gold,0,-.1,0);add(new THREE.CylinderGeometry(.036,.036,.22,7),wood,0,-.23,0);add(new THREE.SphereGeometry(.06,8,6),gold,0,-.37,0);
      g.position.set(.43,-.44,-.62);g.rotation.set(-.26,0,-.15);
    }else if(this.player.classId==='ranger'){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.6,0),new THREE.Vector3(.18,-.3,0),new THREE.Vector3(.24,0,0),new THREE.Vector3(.18,.3,0),new THREE.Vector3(0,.6,0)]);
      add(new THREE.TubeGeometry(curve,20,.032,6,false),wood,0,0,0);
      const line=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.6,0),new THREE.Vector3(0,.6,0)]);g.add(new THREE.Line(line,new THREE.LineBasicMaterial({color:0xe6d4ac})));
      const shaft=add(new THREE.CylinderGeometry(.012,.012,.8,6),wood,0,0,-.23);shaft.rotation.x=Math.PI/2;
      const tip=add(new THREE.ConeGeometry(.035,.12,4),steel,0,0,-.68);tip.rotation.x=-Math.PI/2;
      g.position.set(.4,-.28,-.75);g.rotation.z=-.18;
    }else{
      add(new THREE.CylinderGeometry(.035,.055,1.2,7),wood,0,-.15,0);add(new THREE.TorusGeometry(.13,.02,6,12),gold,0,.5,0);
      add(new THREE.OctahedronGeometry(.12),new THREE.MeshStandardMaterial({color:advanced?0xffc47e:0xa9e2da,emissive:advanced?0xff8f36:0x7abcb6,emissiveIntensity:1}),0,.51,0);
      g.position.set(.42,-.4,-.65);g.rotation.z=-.1;
    }
    // Gloved hand, produced from geometry rather than an imported character asset.
    const glove=add(new THREE.BoxGeometry(.13,.17,.15),new THREE.MeshStandardMaterial({color:0x8b7450}),0,-.23,.015);glove.rotation.z=.12;
    this.weapon=g;this.weaponBase=g.position.clone();this.camera.add(g);
  }
  movement(dt){
    const p=this.player,keys=this.keys,x=this.camera.position.x,z=this.camera.position.z,inWater=isWater(x,z);
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    let right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    const moving=!!(forward||right),sprint=moving&&keys.has('ShiftLeft')&&this.stamina>5&&!this.blocking;
    const speed=(inWater?3.8:sprint?9:5.2)*(this.blocking?.55:1),length=Math.hypot(forward,right)||1;forward/=length;right/=length;
    let dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right)*speed*dt,dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right)*speed*dt;
    let nx=clamp(x+dx,-310,310),nz=clamp(z+dz,-310,310);
    const ground=heightAt(nx,nz);
    if(this.grounded&&ground-this.feetY>.65&&slopeAt(nx,nz)>1.15){nx=x;nz=z;}
    for(const c of this.world.colliders){const d=Math.hypot(nx-c.x,nz-c.z),r=c.r+.42;if(d<r&&Math.abs(heightAt(nx,nz)-heightAt(c.x,c.z))<5){const angle=d>.001?Math.atan2(nz-c.z,nx-c.x):0;nx=c.x+Math.cos(angle)*r;nz=c.z+Math.sin(angle)*r;}}
    this.camera.position.x=nx;this.camera.position.z=nz;
    const floor=Math.max(heightAt(nx,nz),isWater(nx,nz)?WATER_LEVEL-.7:-Infinity);
    if(this.jumpRequested&&this.grounded){this.vy=inWater?4.7:7.2;this.grounded=false;this.sound(170,.1);}
    this.jumpRequested=false;
    this.vy-=18*dt;this.feetY+=this.vy*dt;this.fallPeak=Math.max(this.fallPeak,this.feetY);
    if(this.feetY<=floor){
      if(!this.grounded&&this.fallPeak-floor>7&&!inWater)this.hurt((this.fallPeak-floor-6)*5,'낙하');
      this.feetY=floor;this.vy=0;this.grounded=true;this.fallPeak=floor;
    }else this.grounded=false;
    this.stamina=clamp(this.stamina+(sprint?-17:23)*dt,0,100);
    const bob=moving&&this.grounded?Math.sin(this.time*(sprint?14:10))*.045:Math.sin(this.time*1.5)*.008;
    this.camera.position.y=this.feetY+1.75+bob;
    this.camera.rotation.set(this.pitch+(this.shake>0?(Math.random()-.5)*this.shake*.035:0),this.yaw,0);
    this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,this.blocking&&p.classId==='ranger'?55:sprint?78:72,dt*7);this.camera.updateProjectionMatrix();
    if(this.weapon){this.weapon.position.copy(this.weaponBase);this.weapon.position.y+=bob*.5;this.weapon.rotation.z=(p.classId==='ranger'?-.18:-.12)-Math.sin(this.swing*Math.PI)*.9;this.weapon.position.z-=Math.sin(this.swing*Math.PI)*.18;}
    this.swing=Math.max(0,this.swing-dt*3.5);this.shake=Math.max(0,this.shake-dt*3);
    if(moving&&this.grounded){this.stepTimer-=dt;if(this.stepTimer<=0){this.sound(inWater?380:90,.06,'triangle',.012);this.stepTimer=sprint?.3:.48;}}
    const b=biomeAt(nx,nz);if(b!==this.lastBiome){this.lastBiome=b;this.events.biome?.(BIOMES.find(v=>v.id===b));}
    // Keep a stable, bounded shadow frustum around the explorer.
    this.sun.position.set(nx-65,100+this.feetY,nz-55);this.sun.target.position.set(nx,this.feetY,nz);
    const inCamp=Math.hypot(nx-CAMP.x,nz-CAMP.z)<13;
    if(inCamp&&this.time>this.combatUntil){const a=attributes(p);p.hp=Math.min(a.maxHp,p.hp+dt*a.maxHp*.06);p.mana=Math.min(a.maxMana,p.mana+dt*14);}
    this.inCamp=inCamp;this.swimming=inWater;
  }
  attack(){
    if(this.attackCooldown>0||this.player.hp<=0)return;
    const p=this.player,a=attributes(p);this.attackCooldown=p.classId==='warrior'?.56:p.classId==='ranger'?.65:.72;this.swing=1;this.sound(p.classId==='mage'?440:180,.1,p.classId==='mage'?'sine':'triangle');
    if(p.classId==='warrior'){
      const target=this.aimTarget(4.8,.6);if(target)this.hit(target,a.attack);else this.slash(0xf2d9a2,3.5);
    }else this.shoot({power:a.attack,color:p.classId==='mage'?0xb6e7e4:0xe9d7a0,kind:'basic',speed:p.classId==='ranger'?57:39,range:70});
  }
  aimTarget(range=55,dot=.97){
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);let best=null,score=Infinity;
    for(const m of this.world.monsters){if(!m.alive)continue;const center=m.group.position.clone().add(new THREE.Vector3(0,(m.def.shape==='golem'?1.9:1.1)*m.def.scale,0));const v=center.sub(this.camera.position),d=v.length();if(d<range&&v.normalize().dot(dir)>dot&&d<score){best=m;score=d;}}
    return best;
  }
  skill(index){
    const p=this.player,s=skillsFor(p)[index];if(!s||s.locked||p.level<s.level){this.notify('아직 해금되지 않은 스킬입니다.');return;}
    if(this.cooldowns[index]>0){this.notify('스킬을 준비하고 있습니다.');return;}if(p.mana<s.cost){this.notify('마나가 부족합니다.');return;}
    p.mana-=s.cost;this.cooldowns[index]=s.cooldown;this.swing=1;this.sound(480+index*100,.24,'sine',.045);const a=attributes(p);
    this.notify(s.name);this.events.skill?.(index);
    if(s.kind==='guard'||s.kind==='sanctuary') {p.buffs.guard=12;if(s.kind==='sanctuary')p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.5);this.burst(this.camera.position,s.color,18);}
    else if(s.kind==='heal'){p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.4);this.burst(this.camera.position,s.color,18);}
    else if(s.kind==='restore'){p.mana=Math.min(a.maxMana,p.mana+a.maxMana*.45);p.hp=Math.min(a.maxHp,p.hp+a.maxHp*.2);this.burst(this.camera.position,s.color,18);}
    else if(s.kind==='rage'||s.kind==='blessing'){p.buffs.rage=15;p.hp=Math.min(a.maxHp,p.hp+a.maxHp*(s.kind==='blessing'?1:.15));this.burst(this.camera.position,s.color,20);}
    else if(['fire','frost','poison'].includes(s.kind))this.shoot({power:a.attack*s.power,color:s.color,kind:s.kind,speed:34,range:s.range});
    else if(s.kind==='pierce'){
      const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);
      for(const m of this.world.monsters)if(m.alive){const v=m.group.position.clone().add(new THREE.Vector3(0,1.2*m.def.scale,0)).sub(this.camera.position),t=v.dot(dir);if(t>0&&t<s.range&&v.clone().addScaledVector(dir,-t).length()<2.2*m.def.scale)this.hit(m,a.attack*s.power,s.color);}
      this.trail(this.camera.position,this.camera.position.clone().addScaledVector(dir,s.range),s.color);
    }else{
      if(s.kind==='dash'){
        // Use the same terrain and obstacle constraints as walking during a short dash.
        for(let i=0;i<8;i++){const nx=this.camera.position.x-Math.sin(this.yaw)*.7,nz=this.camera.position.z-Math.cos(this.yaw)*.7;if(Math.abs(nx)>310||Math.abs(nz)>310||heightAt(nx,nz)-this.feetY>.8||this.world.colliders.some(c=>Math.hypot(nx-c.x,nz-c.z)<c.r+.5))break;this.camera.position.x=nx;this.camera.position.z=nz;this.feetY=Math.max(heightAt(nx,nz),isWater(nx,nz)?WATER_LEVEL-.7:-Infinity);this.camera.position.y=this.feetY+1.75;}
      }
      for(const m of this.world.monsters)if(m.alive&&this.distanceTo(m)<s.range){this.hit(m,a.attack*s.power,s.color);if(s.kind==='freeze')m.freeze=4;}
      this.slash(s.color,s.range);this.burst(new THREE.Vector3(this.camera.position.x,this.feetY+.4,this.camera.position.z),s.color,25);
    }
  }
  distanceTo(m){return Math.hypot(m.x-this.camera.position.x,m.z-this.camera.position.z,m.group.position.y-this.feetY);}
  shoot({power,color,kind,speed,range}) {
    const dir=new THREE.Vector3();this.camera.getWorldDirection(dir);const start=this.camera.position.clone().addScaledVector(dir,.8);
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(kind==='fire'?.24:.1,0),new THREE.MeshBasicMaterial({color}));mesh.position.copy(start);this.scene.add(mesh);
    this.projectiles.push({mesh,velocity:dir.multiplyScalar(speed),power,color,kind,life:range/speed,travel:0});
  }
  updateProjectiles(dt){
    const line=new THREE.Line3();const near=new THREE.Vector3();
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],old=p.mesh.position.clone();p.life-=dt;if(p.kind==='basic'&&this.player.classId==='ranger')p.velocity.y-=3*dt;
      p.mesh.position.addScaledVector(p.velocity,dt);line.set(old,p.mesh.position);let hit=null;
      for(const m of this.world.monsters){if(!m.alive)continue;const c=m.group.position.clone().add(new THREE.Vector3(0,(m.def.shape==='golem'?1.8:1.1)*m.def.scale,0));line.closestPointToPoint(c,true,near);if(near.distanceTo(c)<1.05*m.def.scale){hit=m;break;}}
      const pos=p.mesh.position,ground=pos.y<heightAt(pos.x,pos.z);
      if(hit||ground||p.life<=0){
        if(p.kind==='fire'&&(hit||ground)){for(const m of this.world.monsters)if(m.alive&&m.group.position.distanceTo(pos)<7)this.hit(m,p.power,p.color);this.burst(pos,p.color,24);this.slashAt(pos,p.color,7);}
        else if(hit){this.hit(hit,p.power,p.color);if(p.kind==='frost')hit.slow=6;if(p.kind==='poison'){hit.poison=8;hit.poisonPower=attributes(this.player).attack*.45;hit.poisonTick=1;}}
        this.removeObject(p.mesh);this.projectiles.splice(i,1);
      }
    }
  }
  hit(m,raw,color=0xf5e8c5){
    if(!m.alive)return;const crit=Math.random()<.12,amount=Math.round(raw*(crit?1.6:1));m.hp=Math.max(0,m.hp-amount);m.hit=.2;m.aggro=true;this.combatUntil=this.time+8;
    this.events.damage?.({position:m.group.position.clone().add(new THREE.Vector3(0,2.4*m.def.scale,0)),amount,crit,color});this.burst(m.group.position.clone().add(new THREE.Vector3(0,m.def.scale,0)),color,5);this.sound(crit?420:230,.08,'triangle');
    if(m.hp<=0)this.kill(m);
  }
  kill(m){
    m.alive=false;m.group.visible=false;m.respawnAt=this.time+40;m.aggro=false;const p=this.player;p.stats.kills++;if(m.def.boss)p.stats.boss++;
    const xp=26+m.def.level*17,gold=3+m.def.level*2;p.gold+=gold;const levels=gainXp(p,xp),loot=rollLoot(m.type);addItems(p,loot);
    this.notify(`${m.def.name} · +${xp} EXP · ${gold} G`);this.events.loot?.(loot);if(levels)this.levelUp(levels);this.checkQuests();this.events.change?.();
  }
  levelUp(){this.notify(`LEVEL UP · Lv.${this.player.level}${[4,7,10,15].includes(this.player.level)?' · 새로운 성장의 길이 열렸습니다':''}`);this.burst(this.camera.position.clone().add(new THREE.Vector3(0,-.4,0)),0xffe1a1,30);this.sound(740,.5,'sine');this.events.level?.();}
  checkQuests(){for(const q of claimQuests(this.player)){this.notify(`탐험 달성 · ${q.name} · +${q.xp} EXP / ${q.gold} G`);if(q.levels)this.levelUp();}this.persist();}
  hurt(raw,source){
    if(this.player.hp<=0)return;const blocked=this.blocking&&this.stamina>8;const amount=damagePlayer(this.player,raw*(blocked?.4:1));if(blocked)this.stamina=Math.max(0,this.stamina-8);
    this.shake=.5;this.events.hurt?.(amount,source);this.combatUntil=this.time+8;this.sound(65,.18,'sawtooth',.022);
    if(this.player.hp<=0){this.pause();this.events.dead?.();}
  }
  respawn(){const p=this.player;p.xp=Math.max(0,Math.floor(p.xp*.85));p.position={...CAMP};const a=attributes(p);p.hp=a.maxHp;p.mana=a.maxMana;this.start(p);this.notify('야영지에서 다시 깨어났습니다. 현재 경험치의 15%를 잃었습니다.');}
  updateMonsters(dt){
    const px=this.camera.position.x,pz=this.camera.position.z;
    for(const m of this.world.monsters){
      if(!m.alive){if(this.time>=m.respawnAt){m.alive=true;m.group.visible=true;m.hp=m.def.hp;m.x=m.homeX;m.z=m.homeZ;m.slow=0;m.freeze=0;m.poison=0;m.poisonTick=0;m.aggro=false;m.group.position.set(m.x,heightAt(m.x,m.z),m.z);}continue;}
      m.attackTimer=Math.max(0,m.attackTimer-dt);m.hit=Math.max(0,m.hit-dt);m.freeze=Math.max(0,m.freeze-dt);m.slow=Math.max(0,m.slow-dt);
      if(m.poison>0){m.poison-=dt;m.poisonTick-=dt;if(m.poisonTick<=0){m.poisonTick=1;this.hit(m,m.poisonPower,0xc0f386);if(!m.alive)continue;}}
      const d=Math.hypot(px-m.x,pz-m.z),fromHome=Math.hypot(m.x-m.homeX,m.z-m.homeZ),camp=Math.hypot(px-CAMP.x,pz-CAMP.z)<13;
      if(d<17&&!camp)m.aggro=true;if(d>48||fromHome>36||camp){if(m.aggro&&fromHome>5)m.returning=true;m.aggro=false;}
      let tx=m.homeX+Math.sin(this.time*.15+m.homeZ)*4,tz=m.homeZ+Math.cos(this.time*.12+m.homeX)*4,speed=m.def.speed*.25;
      if(m.aggro){tx=px;tz=pz;speed=m.def.speed;}else if(m.returning){tx=m.homeX;tz=m.homeZ;speed=m.def.speed;if(fromHome<2){m.returning=false;m.hp=m.def.hp;}}
      if(m.slow>0)speed*=.35;if(m.freeze>0)speed=0;
      const dist=Math.hypot(tx-m.x,tz-m.z);
      if(dist>.5&&(!m.aggro||d>m.def.range*.85)){
        const nx=m.x+(tx-m.x)/dist*speed*dt,nz=m.z+(tz-m.z)/dist*speed*dt;
        if(!isWater(nx,nz)||m.type==='spirit'){m.x=nx;m.z=nz;}else{m.x+=(m.homeX-m.x)*dt;m.z+=(m.homeZ-m.z)*dt;}
        m.group.rotation.y=Math.atan2(-(tx-m.x),-(tz-m.z));
      }
      const bob=m.def.shape==='slime'?Math.abs(Math.sin(this.time*3+m.homeX))*.25:m.def.shape==='spirit'?Math.sin(this.time*2+m.homeX)*.35:dist>1?Math.abs(Math.sin(this.time*5))* .06:0;
      m.group.position.set(m.x,heightAt(m.x,m.z)+bob,m.z);const scale=m.def.scale*(1+(m.hit>0?Math.sin(m.hit*30)*.035:0));m.group.scale.setScalar(scale);
      if(m.aggro&&d<m.def.range&&Math.abs(this.feetY-m.group.position.y)<4*m.def.scale&&m.attackTimer<=0&&m.freeze<=0){
        m.attackTimer=m.def.boss?2.1:1.6;this.hurt(m.def.attack,m.def.name);this.burst(this.camera.position.clone().add(new THREE.Vector3(0,-.5,-.3)),0xe99b7c,4);
      }
    }
  }
  nearestInteractable(){
    let target=null,dist=4.8;const x=this.camera.position.x,z=this.camera.position.z;
    const all=[...this.world.nodes.filter(n=>n.group.visible).map(n=>({...n,source:n,type:'node'})),...this.world.chests.filter(c=>!c.opened).map(c=>({...c,source:c,type:'chest'}))];
    for(const item of all){const d=Math.hypot(x-item.x,z-item.z,this.feetY-item.group.position.y);if(d<dist){dist=d;target=item;}}
    if(!target&&Math.hypot(x-CAMP.x,z-CAMP.z)<9)target={type:'camp',name:'새벽 야영지',description:'휴식 · 전직 · 저장'};
    return target;
  }
  interact(){
    const target=this.nearestInteractable();if(!target)return;const p=this.player;
    if(target.type==='camp'){this.events.camp?.();return;}
    const obj=target.source;
    if(target.type==='node'){
      obj.group.visible=false;obj.availableAt=this.time+90;const count=2+Math.floor(Math.random()*2);addItems(p,{[obj.kind]:count});p.stats.gathers++;gainXp(p,0);const levels=gainXp(p,8);if(levels)this.levelUp();this.events.loot?.({[obj.kind]:count});this.notify(`${obj.name} 채집 · +8 EXP`);this.sound(550,.12,'sine');
    }else{
      obj.opened=true;obj.beam.visible=false;obj.lid.rotation.x=-.8;p.opened.push(obj.id);p.stats.chests++;const loot={health:obj.tier,mana:obj.tier,iron:obj.tier+1,crystal:obj.tier};if(obj.tier>=3)loot.relic=obj.tier-2;if(obj.tier>=4)loot.star=1;addItems(p,loot);p.gold+=obj.tier*35;const levels=gainXp(p,obj.tier*35);if(levels)this.levelUp();this.events.loot?.(loot);this.notify(`보물 발견 · +${obj.tier*35} G / ${obj.tier*35} EXP`);this.sound(880,.4,'sine');this.burst(obj.group.position.clone().add(new THREE.Vector3(0,1,0)),0xffd47f,24);
    }
    this.checkQuests();this.events.change?.();
  }
  burst(pos,color,count=12){
    const geometry=new THREE.IcosahedronGeometry(.065,0),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1});
    const g=new THREE.Group();g.position.copy(pos);const velocities=[];for(let i=0;i<count;i++){const m=new THREE.Mesh(geometry,material);g.add(m);velocities.push(new THREE.Vector3((Math.random()-.5)*7,Math.random()*5,(Math.random()-.5)*7));}this.scene.add(g);this.effects.push({group:g,velocities,life:.65,max:.65,material,geometry});
  }
  slash(color,radius){this.slashAt(new THREE.Vector3(this.camera.position.x,this.feetY+.3,this.camera.position.z),color,radius);}
  slashAt(pos,color,radius){const geo=new THREE.RingGeometry(radius*.92,radius,48),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide});const group=new THREE.Mesh(geo,material);group.rotation.x=-Math.PI/2;group.position.copy(pos);this.scene.add(group);this.effects.push({group,life:.45,max:.45,material,geometry:geo});}
  trail(start,end,color){const geo=new THREE.BufferGeometry().setFromPoints([start.clone(),end]),material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}),group=new THREE.Line(geo,material);this.scene.add(group);this.effects.push({group,life:.3,max:.3,material,geometry:geo});}
  removeObject(object){this.scene.remove(object);object.geometry?.dispose();object.material?.dispose();}
  updateEffects(dt){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.material.opacity=Math.max(0,e.life/e.max);if(e.velocities)e.group.children.forEach((m,j)=>{m.position.addScaledVector(e.velocities[j],dt);e.velocities[j].y-=8*dt;});else e.group.scale.multiplyScalar(1+dt*.7);if(e.life<=0){this.scene.remove(e.group);e.geometry.dispose();e.material.dispose();this.effects.splice(i,1);}}}
  setQuality(quality){this.renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=quality!=='low';this.renderer.setSize(innerWidth,innerHeight);}
  animate(){
    requestAnimationFrame(()=>this.animate());const realDelta=this.clock.getDelta(),dt=Math.min(realDelta,.045);this.time+=dt;this.frameCount++;this.frameTime+=realDelta;if(this.frameTime>1){this.fps=Math.round(this.frameCount/this.frameTime);this.frameTime=0;this.frameCount=0;}
    if(this.active&&!this.paused&&this.locked&&this.player.hp>0){
      this.player.playtime+=dt;this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.cooldowns=this.cooldowns.map(v=>Math.max(0,v-dt));
      for(const key of Object.keys(this.player.buffs))this.player.buffs[key]=Math.max(0,this.player.buffs[key]-dt);
      const a=attributes(this.player);this.player.mana=Math.min(a.maxMana,this.player.mana+dt*3.5);if(this.time>this.combatUntil)this.player.hp=Math.min(a.maxHp,this.player.hp+dt*1.1);
      this.movement(dt);if(this.player.hp>0){this.updateMonsters(dt);this.updateProjectiles(dt);}if(this.time-this.lastSave>15){this.persist();this.lastSave=this.time;}
    }
    this.world.update(this.time,dt);this.updateEffects(dt);this.renderer.render(this.scene,this.camera);this.events.frame?.(dt);
  }
}
