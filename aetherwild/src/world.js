import * as THREE from 'three';
import { heightAt, biomeAt, isWater, seededRandom, WORLD_SIZE, WATER_LEVEL } from './terrain.js';
import { CAMP, MONSTERS } from './data.js';
const color = c => new THREE.Color(c);
const mat = (c, extra={}) => new THREE.MeshStandardMaterial({ color:c, roughness:.9, flatShading:true, ...extra });
const geos = { rock: new THREE.DodecahedronGeometry(1,0), sphere: new THREE.IcosahedronGeometry(1,1), trunk: new THREE.CylinderGeometry(.65,1,1,6), cone: new THREE.ConeGeometry(1,1,7), cube: new THREE.BoxGeometry(1,1,1) };
export class World {
  constructor(scene) {
    this.scene=scene; this.rng=seededRandom(); this.colliders=[]; this.nodes=[]; this.chests=[]; this.monsters=[]; this.batches=new Map(); this.fireParticles=[];
    this.ground(); this.decorate(); this.camp(); this.ruins(); this.populate(); this.finishBatches(); this.sky();
  }
  instance(key, geo, material, x,y,z,sx,sy,sz, tint, ry=0) {
    if (!this.batches.has(key)) this.batches.set(key,{geo,material,items:[]});
    this.batches.get(key).items.push({x,y,z,sx,sy,sz,tint,ry});
  }
  finishBatches() {
    const dummy=new THREE.Object3D();
    for(const {geo,material,items} of this.batches.values()) {
      const mesh=new THREE.InstancedMesh(geo,material,items.length);
      items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z); dummy.scale.set(it.sx,it.sy,it.sz); dummy.rotation.set(0,it.ry,0); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); if(it.tint) mesh.setColorAt(i,color(it.tint));});
      mesh.castShadow=true; mesh.receiveShadow=true; mesh.computeBoundingSphere(); this.scene.add(mesh);
    }
    this.batches.clear();
  }
  ground() {
    const g=new THREE.PlaneGeometry(WORLD_SIZE,WORLD_SIZE,220,220); g.rotateX(-Math.PI/2);
    const p=g.attributes.position, colors=[];
    const palette={forest:[color('#688858'),color('#a7b97c')],lake:[color('#6e9278'),color('#aac9a3')],highland:[color('#849467'),color('#c4bc8c')],snow:[color('#c6d9d9'),color('#eef0e3')],volcano:[color('#776e60'),color('#b88a6c')]};
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i),h=heightAt(x,z);p.setY(i,h);
      const pair=palette[biomeAt(x,z)],t=.35+this.rng()*.2+Math.sin(x*.11)*Math.cos(z*.09)*.15;
      const c=pair[0].clone().lerp(pair[1],t);
      if(Math.abs(x)<3.5+Math.sin(z*.03)*1.8 && z>-160 && z<65) c.lerp(color('#c7ba94'),.66);
      if(h<WATER_LEVEL+.9) c.lerp(color('#cfcca5'),.65);
      if(h>47 && x<10)c.lerp(color('#f2f3e8'),.8);
      colors.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.receiveShadow=true;this.scene.add(mesh);
    const lake=new THREE.Mesh(new THREE.CircleGeometry(70,80),new THREE.MeshPhysicalMaterial({color:0x65b5b4,metalness:.18,roughness:.22,transparent:true,opacity:.73,side:THREE.DoubleSide}));
    lake.rotation.x=-Math.PI/2;lake.position.set(-130,WATER_LEVEL,-32);this.scene.add(lake);this.water=lake;
    const shore=new THREE.Mesh(new THREE.RingGeometry(69,70,80),mat(0xbdc5a0));shore.rotation.x=-Math.PI/2;shore.position.copy(lake.position);shore.position.y-=.05;this.scene.add(shore);
  }
  decorate() {
    const wood=mat(0xffffff),leaf=mat(0xffffff),rock=mat(0xffffff),flowers=mat(0xffffff);
    for(let i=0;i<820;i++){
      const x=(this.rng()-.5)*620,z=(this.rng()-.5)*620,b=biomeAt(x,z),y=heightAt(x,z);
      if(isWater(x,z)||Math.hypot(x-CAMP.x,z-CAMP.z)<15||Math.abs(x)<7||b==='volcano'&&this.rng()<.82)continue;
      const s= .7+this.rng()*.9,h=(b==='snow'?8:6)+this.rng()*6;
      this.instance('trunk',geos.trunk,wood,x,y+h/2,z,.7*s,h,.7*s,'#6e6550');
      this.colliders.push({x,z,r:.8*s});
      if(b==='snow'||this.rng()<.24){
        for(let j=0;j<3;j++)this.instance('pine',geos.cone,leaf,x,y+h*.45+j*h*.22,z,(3.6-j*.65)*s,h*.56,(3.6-j*.65)*s,b==='snow'?(j===2?'#dce9dc':'#8ba99c'):'#3d6c56');
      }else{
        this.instance('leaf',geos.sphere,leaf,x,y+h,z,3.7*s,3.8*s,3.7*s,b==='highland'?'#a0ad6a':this.rng()<.5?'#648b59':'#84a66b',this.rng()*6);
        this.instance('leaf',geos.sphere,leaf,x+1.7*s,y+h-.8,z+.7,2.8*s,2.6*s,2.6*s,b==='highland'?'#b7ba77':'#8fab70');
      }
    }
    for(let i=0;i<270;i++){
      const x=(this.rng()-.5)*620,z=(this.rng()-.5)*620,y=heightAt(x,z),b=biomeAt(x,z),s=.7+this.rng()*2.3;
      if(isWater(x,z)||Math.hypot(x,z-44)<12||Math.abs(x)<5)continue;
      this.instance('rock',geos.rock,rock,x,y+s*.35,z,s,s*.9,s*.8,b==='snow'?'#b6c3c2':b==='volcano'?'#615b54':'#9a9f83',this.rng()*6);
      if(s>1.5)this.colliders.push({x,z,r:s*.75});
    }
    for(let i=0;i<4100;i++) {
      const x=(this.rng()-.5)*510,z=(this.rng()-.5)*510+25,b=biomeAt(x,z);
      if(isWater(x,z)||b==='volcano'||b==='snow'||Math.abs(x)<4)continue;
      const y=heightAt(x,z),s=.15+this.rng()*.35;
      this.instance('grass',geos.cone,leaf,x,y+s,z,s,s*2,s,b==='lake'?'#87ae9b':'#83a46b',this.rng()*6);
      if(i%3===0){this.instance('flowers',geos.sphere,flowers,x,y+s*2,z,.16,.13,.16,['#f2dfaa','#e0b0b3','#c4bee6','#eceddb'][i%4]);}
    }
    // A handcrafted opening vista: trees frame the route without obstructing it.
    for(const [x,z,s] of [[-17,17,1.6],[18,6,1.4],[-25,-8,1.7],[28,35,1.5]]){
      const y=heightAt(x,z);this.instance('trunk',geos.trunk,wood,x,y+6*s,z,s,12*s,s,'#71634f');this.colliders.push({x,z,r:s});
      this.instance('leaf',geos.sphere,leaf,x,y+12*s,z,5*s,4.8*s,4.5*s,'#71945e');
      this.instance('leaf',geos.sphere,leaf,x-3*s,y+10*s,z+1,3.5*s,3.4*s,3.5*s,'#92ab70');
    }
  }
  mesh(geo, material, pos, scale, group=this.scene) {const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  camp() {
    const x=CAMP.x,z=CAMP.z,y=heightAt(x,z); this.campGroup=new THREE.Group();this.scene.add(this.campGroup);
    const fireX=-5,fireZ=z-1,fy=heightAt(fireX,fireZ);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;this.mesh(geos.rock,mat(0x9b9b89),[fireX+Math.cos(a)*1.1,fy+.2,fireZ+Math.sin(a)*1.1],[.4,.3,.4]);}
    for(let i=0;i<3;i++)this.mesh(geos.trunk,mat(0x5d4636),[fireX+(i-1)*.35,fy+.3,fireZ],[.3,.6,.3]);
    this.flame=this.mesh(geos.cone,mat(0xffc26a,{emissive:0xff8b27,emissiveIntensity:1.6,transparent:true,opacity:.9}),[fireX,fy+.95,fireZ],[.65,1.6,.65]);
    this.fireLight=new THREE.PointLight(0xffb665,20,20,2);this.fireLight.position.set(fireX,fy+2,fireZ);this.scene.add(this.fireLight);
    // Canvas tent, woven bedroll and wooden supply crates.
    const tent=new THREE.Group();tent.position.set(8,heightAt(8,49),49);tent.rotation.y=-.25;
    const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute([-3,0,3,0,4,3,3,0,3,-3,0,-3,3,0,-3,0,4,-3,-3,0,3,-3,0,-3,0,4,-3,-3,0,3,0,4,-3,0,4,3,3,0,3,0,4,3,0,4,-3,3,0,3,0,4,-3,3,0,-3],3));tg.computeVertexNormals();
    this.mesh(tg,mat(0xc4ac7c,{side:THREE.DoubleSide}),[0,0,0],null,tent);this.scene.add(tent);
    for(const [xx,zz] of [[-9,48],[-10,46]])this.mesh(geos.cube,mat(0x8b7455),[xx,heightAt(xx,zz)+.65,zz],[1.4,1.3,1.4]);
    const signY=heightAt(2,34);this.mesh(geos.trunk,mat(0x796648),[2,signY+1.2,34],[.15,2.4,.15]);
    this.mesh(geos.cube,mat(0xb59d72),[2,signY+2.1,34],[2.6,.65,.15]);
  }
  ruins() {
    for(const [cx,cz] of [[36,-64],[130,-63],[-110,-208],[164,-228]]){
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=cx+Math.cos(a)*11,z=cz+Math.sin(a)*11,y=heightAt(x,z),h=3+this.rng()*6;
        this.mesh(new THREE.CylinderGeometry(.85,1.1,h,7),mat(cz<-145?0xa7a99d:0xa8ac91),[x,y+h/2,z]);this.colliders.push({x,z,r:1.2});
        this.mesh(geos.cube,mat(0xadb49a),[x,y+h,z],[2.8,.55,2]);
      }
    }
  }
  node(kind,x,z,id) {
    const group=new THREE.Group(),y=heightAt(x,z);group.position.set(x,y,z);
    const def={herb:['야생초','#bad68a'],mushroom:['숲 버섯','#d79983'],wood:['목재','#c3a77f'],iron:['철광맥','#c3c7b6'],crystal:['수정맥','#9de5e0'],frost:['서리꽃','#c5e8ff']};
    const [name,c]=def[kind];
    if(kind==='wood') { const m=this.mesh(geos.trunk,mat(c),[0,.5,0],[.7,1,.7],group); m.rotation.z=.95; }
    else if(kind==='mushroom'){
      for(let i=0;i<3;i++){const x=(i-1)*.5;this.mesh(geos.trunk,mat(0xddd4af),[x,.3,0],[.13,.6,.13],group);this.mesh(new THREE.SphereGeometry(.45,8,5,0,Math.PI*2,0,Math.PI/2),mat(c),[x,.6,0],null,group);}
    }else if(kind==='iron'||kind==='crystal'){
      this.mesh(geos.rock,mat(0x858d80),[0,.45,0],[1,.9,.8],group);
      for(let i=0;i<4;i++){const m=this.mesh(new THREE.OctahedronGeometry(1),mat(c,{emissive:c,emissiveIntensity:.15}),[(i%2-.5)*.7,.9+i*.1,(i/2-.7)*.4],[.3,.8,.3],group);m.rotation.z=(i-2)*.2;}
    }else{
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;this.mesh(geos.cone,mat(c),[Math.cos(a)*.3,.55,Math.sin(a)*.3],[.15,.9,.15],group);}
      this.mesh(geos.sphere,mat(c,{emissive:c,emissiveIntensity:.25}),[0,1.05,0],[.24,.2,.24],group);
    }
    this.scene.add(group); this.nodes.push({id,kind,name,x,z,group,availableAt:0});
  }
  chest(x,z,id,tier=1) {
    const group=new THREE.Group(),y=heightAt(x,z);group.position.set(x,y,z);
    this.mesh(geos.cube,mat(0x795a3e),[0,.5,0],[1.6,1,1],group);
    const lid=this.mesh(geos.cube,mat(0x99734e),[0,1.08,0],[1.7,.26,1.08],group);
    for(const xx of [-.6,.6])this.mesh(geos.cube,mat(0xd6b36a,{metalness:.6}),[xx,.6,.01],[.12,1.25,1.1],group);
    this.mesh(geos.cube,mat(0xe8cf7d,{emissive:0xd6a53e,emissiveIntensity:.5}),[0,.65,.56],[.25,.35,.1],group);
    const beam=this.mesh(new THREE.CylinderGeometry(.06,.06,4,5),mat(0xf4db8c,{transparent:true,opacity:.4,emissive:0xe8c460,emissiveIntensity:1}),[0,3,0],null,group);
    this.scene.add(group);this.chests.push({id:`chest-${id}`,name:'잊힌 보물상자',x,z,tier,group,lid,beam,opened:false});
  }
  monsterModel(type) {
    const def=MONSTERS[type],g=new THREE.Group(),body=mat(def.color),dark=mat(0x4b5144),light=mat(0xe9e7c6),eye=mat(def.boss?0xffbd67:0xffe7a2,{emissive:def.boss?0xff7d35:0xffd987,emissiveIntensity:.65});
    if(def.shape==='slime'){
      this.mesh(geos.sphere,mat(def.color,{transparent:true,opacity:.88}),[0,.8,0],[1.1,.85,1.1],g);
      for(const x of [-.34,.34])this.mesh(geos.sphere,dark,[x,1,-.86],[.12,.16,.12],g);
      this.mesh(geos.cone,mat(0xb9d68b),[.1,1.75,0],[.24,.55,.2],g);
    }else if(def.shape==='wolf'||def.shape==='boar'){
      this.mesh(geos.sphere,body,[0,1.05,0],[.65,.66,1.2],g);
      this.mesh(geos.rock,body,[0,1.5,-.94],[.52,.55,.65],g);
      this.mesh(geos.rock,dark,[0,1.25,-1.47],[.28,.25,.38],g);
      for(const x of [-.4,.4]){
        const ears=this.mesh(geos.cone,body,[x,2,-.95],[.22,.5,.22],g);ears.rotation.z=x;
        this.mesh(geos.sphere,eye,[x*.77,1.65,-1.4],[.07,.07,.07],g);
        for(const z of [-.65,.7])this.mesh(geos.cube,body,[x,.47,z],[.22,.95,.26],g);
      }
      const tail=this.mesh(geos.cone,body,[0,1.2,1.4],[.25,1.2,.25],g);tail.rotation.x=.8;
      if(def.shape==='boar')for(const x of [-.32,.32]){const tusk=this.mesh(geos.cone,light,[x,1.15,-1.65],[.12,.65,.12],g);tusk.rotation.x=-.5;}
    }else if(def.shape==='spirit'){
      this.mesh(new THREE.OctahedronGeometry(.65),mat(def.color,{emissive:def.color,emissiveIntensity:.6}),[0,1.6,0],null,g);
      const ring=this.mesh(new THREE.TorusGeometry(1,.07,5,16),light,[0,1.6,0],null,g);ring.rotation.x=1;
      for(let i=0;i<3;i++)this.mesh(geos.sphere,mat(def.color,{transparent:true,opacity:.5}),[Math.sin(i*2)*.7,.5+i*.3,Math.cos(i*2)*.7],[.2,.2,.2],g);
    }else if(def.shape==='golem'){
      this.mesh(geos.rock,body,[0,1.8,0],[1,1.2,.7],g);
      this.mesh(geos.rock,body,[0,3.1,0],[.6,.6,.55],g);
      for(const x of [-.9,.9]){
        this.mesh(geos.rock,body,[x*1.3,1.65,0],[.48,1.05,.5],g);
        this.mesh(geos.rock,dark,[x*.6,.5,0],[.4,.6,.4],g);
        this.mesh(geos.sphere,eye,[x*.28,3.2,-.51],[.1,.12,.08],g);
      }
      this.mesh(new THREE.OctahedronGeometry(.32),mat(def.color===0x99b9de?0xa7f4ff:0xe7d89c,{emissive:0xc9edb0,emissiveIntensity:.7}),[0,1.9,-.7],null,g);
      if(def.boss)for(let i=0;i<3;i++)this.mesh(geos.cone,mat(0xe6c591),[(i-1)*.4,3.8,0],[.18,.9,.18],g);
    }else{
      this.mesh(geos.rock,body,[0,1.3,0],[.9,.8,1.7],g);this.mesh(geos.rock,body,[0,2,-1.3],[.55,.6,.9],g);
      for(const x of [-1,1]){
        const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,x*3,1.5,.5,x*2,0,1.9],3));wingGeo.computeVertexNormals();
        this.mesh(wingGeo,mat(0xb17a56,{side:THREE.DoubleSide}),[x*.6,1.7,0],null,g);
        for(const z of [-.6,.9])this.mesh(geos.cone,dark,[x*.6,.45,z],[.25,.9,.25],g);
        this.mesh(geos.sphere,eye,[x*.3,2.2,-1.98],[.12,.12,.12],g);
      }
      const tail=this.mesh(geos.cone,body,[0,1.3,2.1],[.5,2.4,.5],g);tail.rotation.x=Math.PI/2;
    }
    g.scale.setScalar(def.scale);return g;
  }
  spawn(type,x,z,id) {
    const def=MONSTERS[type],group=this.monsterModel(type);group.position.set(x,heightAt(x,z),z);this.scene.add(group);
    this.monsters.push({id,type,def,group,x,z,homeX:x,homeZ:z,hp:def.hp,alive:true,respawnAt:0,attackTimer:0,hit:0,aggro:false,slow:0,freeze:0,poison:0,poisonPower:0,poisonTick:0});
  }
  populate() {
    let id=0;
    // Deliberate starter resources and creatures make the first minutes understandable.
    for(const [k,x,z] of [['herb',5,31],['mushroom',-7,26],['wood',10,28],['herb',-12,38],['iron',21,18],['mushroom',-18,18]])this.node(k,x,z,`node-${id++}`);
    this.chest(-13,11,0,1);this.chest(42,-62,1,2);this.chest(-144,-16,2,2);this.chest(144,-60,3,3);this.chest(-112,-218,4,4);this.chest(185,-236,5,5);this.chest(-61,106,6,1);this.chest(69,-117,7,3);
    const zones=[['slime',0,10,25,9],['wolf',-30,-48,40,7],['spirit',-137,-30,45,7],['boar',86,-9,30,6],['golem',143,-55,42,6],['frostwolf',-107,-190,48,7],['guardian',-95,-239,35,4],['drake',153,-201,42,6]];
    for(const [type,cx,cz,spread,count] of zones)for(let i=0;i<count;i++){
      const a=this.rng()*Math.PI*2,r=6+this.rng()*spread;let x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      if(isWater(x,z)){x=-75-this.rng()*15;z=-15-this.rng()*50;}
      if(Math.hypot(x,z-44)<18)z-=25;
      this.spawn(type,x,z,`mob-${id++}`);
    }
    this.spawn('ancient',165,-232,`mob-${id++}`);
    for(let i=0;i<175;i++){
      const x=(this.rng()-.5)*550,z=(this.rng()-.5)*550,b=biomeAt(x,z);
      if(isWater(x,z)||Math.hypot(x,z-44)<15)continue;
      const kinds=b==='snow'?['frost','crystal','iron']:b==='volcano'?['crystal','iron']:b==='highland'?['iron','wood','herb']:b==='lake'?['mushroom','crystal','herb']:['herb','mushroom','wood'];
      this.node(kinds[Math.floor(this.rng()*kinds.length)],x,z,`node-${id++}`);
    }
  }
  sky() {
    this.clouds=new THREE.Group();const cloudMat=mat(0xf7f1df,{roughness:1});
    for(let i=0;i<32;i++){
      const x=(this.rng()-.5)*1000,z=(this.rng()-.5)*1000,y=120+this.rng()*60,s=8+this.rng()*13;
      for(let j=0;j<3;j++)this.mesh(geos.sphere,cloudMat,[x+j*s*.9,y+(j%2)*3,z],[s,s*.35,s*.6],this.clouds);
    }this.scene.add(this.clouds);
    const sun=this.mesh(new THREE.SphereGeometry(13,20,12),new THREE.MeshBasicMaterial({color:0xfff0c8}),[-240,185,-310]);sun.castShadow=false;
    const birdsGeo=new THREE.BufferGeometry(),verts=[];
    for(let i=0;i<14;i++){const x=(this.rng()-.5)*100,z=-80-this.rng()*90,y=60+this.rng()*35;verts.push(x-1,y,z,x,y-.3,z,x,y-.3,z,x+1,y,z);}
    birdsGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));this.birds=new THREE.LineSegments(birdsGeo,new THREE.LineBasicMaterial({color:0x6b807b}));this.scene.add(this.birds);
  }
  update(time, dt) {
    this.clouds.position.x=Math.sin(time*.004)*18;this.birds.position.x=Math.sin(time*.08)*15;
    this.flame.scale.y=1.6+Math.sin(time*12)*.18;this.fireLight.intensity=18+Math.sin(time*9)*3;
    this.water.material.opacity=.71+Math.sin(time*.5)*.025;
    for(const c of this.chests)if(!c.opened)c.beam.material.opacity=.28+Math.sin(time*2)*.15;
    for(const n of this.nodes)if(!n.group.visible && time>=n.availableAt)n.group.visible=true;
  }
}
