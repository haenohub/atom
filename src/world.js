import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, groundMaterial, leafGeometry, grassGeometry, weatheredRock, updateWind, canvasTexture } from './art.js';
import { heightAt, biomeAt, isWater, seededRandom, WORLD_SIZE, WATER_LEVEL } from './terrain.js';
import { CAMP, MONSTERS } from './data.js';
const color = c => new THREE.Color(c);
const mat = (c, extra={}) => new THREE.MeshStandardMaterial({ color:c, roughness:.9, flatShading:false, ...extra });
const geos = { rock: weatheredRock(2), sphere: new THREE.SphereGeometry(1,14,10), trunk: new THREE.CylinderGeometry(.65,1,1,12), cone: new THREE.ConeGeometry(1,1,16), cube: new THREE.BoxGeometry(1,1,1) };
export class World {
  constructor(scene, renderer) {
    this.scene=scene; this.renderer=renderer; this.rng=seededRandom(); this.colliders=[]; this.nodes=[]; this.chests=[]; this.monsters=[]; this.batches=new Map(); this.fireParticles=[];this.decorationBatches=[];
    this.ground(); this.decorate(); this.camp(); this.ruins(); this.populate(); this.finishBatches(); this.sky();
  }
  instance(key, geo, material, x,y,z,sx,sy,sz, tint, ry=0) {
    if(['tree-skeleton','tree-leaves','pine-leaves'].includes(key))key+=`-${Math.floor(x/64)}-${Math.floor(z/64)}`;
    if (!this.batches.has(key)) this.batches.set(key,{geo,material,items:[]});
    this.batches.get(key).items.push({x,y,z,sx,sy,sz,tint,ry});
  }
  finishBatches() {
    const dummy=new THREE.Object3D();
    for(const [key,{geo,material,items}] of this.batches.entries()) {
      const mesh=new THREE.InstancedMesh(geo,material,items.length);
      items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z); dummy.scale.set(it.sx,it.sy,it.sz); dummy.rotation.set(0,it.ry,0); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); if(it.tint) mesh.setColorAt(i,color(it.tint));});
      mesh.castShadow=true; mesh.receiveShadow=true; mesh.computeBoundingSphere();this.decorationBatches.push({mesh,key,center:mesh.boundingSphere.center.clone(),radius:mesh.boundingSphere.radius}); this.scene.add(mesh);
    }
    this.batches.clear();
  }
  ground() {
    const g=new THREE.PlaneGeometry(WORLD_SIZE,WORLD_SIZE,256,256); g.rotateX(-Math.PI/2);
    const p=g.attributes.position, colors=[];
    const palette={forest:[color('#688858'),color('#a7b97c')],lake:[color('#6e9278'),color('#aac9a3')],highland:[color('#849467'),color('#c4bc8c')],snow:[color('#c6d9d9'),color('#eef0e3')],volcano:[color('#776e60'),color('#b88a6c')]};
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i),h=heightAt(x,z);p.setY(i,h);
      const pair=palette[biomeAt(x,z)],t=.35+this.rng()*.2+Math.sin(x*.11)*Math.cos(z*.09)*.15;
      const c=pair[0].clone().lerp(pair[1],t);
      if(Math.abs(x)<3.5+Math.sin(z*.03)*1.8 && z>-160 && z<65) c.lerp(color('#c7ba94'),.66);
      if(h<WATER_LEVEL+.9) c.lerp(color('#cfcca5'),.65);
      if(h>47 && x<10)c.lerp(color('#f2f3e8'),.8);
      c.lerp(color(0xffffff),.86);colors.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,groundMaterial());mesh.receiveShadow=true;this.scene.add(mesh);
    const waterGeometry=new THREE.CircleGeometry(70,100);waterGeometry.rotateX(-Math.PI/2);
    const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x486c66,metalness:.16,roughness:.16,transparent:true,opacity:.86,clearcoat:1,clearcoatRoughness:.1,normalMap:materials().ground.normalMap.clone(),normalScale:new THREE.Vector2(.35,.35),side:THREE.DoubleSide});
    waterMaterial.normalMap.repeat.set(24,24);
    waterMaterial.onBeforeCompile=shader=>{shader.uniforms.uWaterTime={value:0};waterMaterial.userData.shader=shader;shader.vertexShader='uniform float uWaterTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.y+=sin(position.x*.4+uWaterTime*.8)*.055+cos(position.z*.31+uWaterTime*.5)*.04;`);};
    const lake=new THREE.Mesh(waterGeometry,waterMaterial);lake.position.set(-130,WATER_LEVEL,-32);lake.receiveShadow=true;this.scene.add(lake);this.water=lake;
  }

  decorate() {
    const m=materials(),leaves=leafGeometry(29),pine=leafGeometry(63,true),grass=grassGeometry();
    const trunkParts=[new THREE.CylinderGeometry(.012,.035,1,10,5)];trunkParts[0].translate(0,.5,0);
    for(let j=0;j<5;j++){
      const a=j*2.4,y=.45+j*.09;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,y,0),new THREE.Vector3(Math.sin(a)*.14,y+.06,Math.cos(a)*.14),new THREE.Vector3(Math.sin(a)*.31,y+.14,Math.cos(a)*.31)]);
      trunkParts.push(new THREE.TubeGeometry(curve,7,.006,5,false));
    }
    const skeleton=mergeGeometries(trunkParts);trunkParts.forEach(g=>g.dispose());
    const addTree=(x,z,h,pineTree=false)=>{
      const y=heightAt(x,z),s=.8+this.rng()*.4,b=biomeAt(x,z);
      this.instance('tree-skeleton',skeleton,m.bark,x,y,z,h,h,h,'#c1bbaa',this.rng()*6.28);this.colliders.push({x,z,r:.035*h});
      // Leaf cutouts on branches replace the old opaque polygon balls.
      if(pineTree){this.instance('pine-leaves',pine,m.leaf,x,y+h*.65,z,h*.33,h*.56,h*.33,b==='snow'?'#d4dcce':'#c0cca6');}
      else for(let j=0;j<3;j++){
        const a=j*2.4,offset=j===0?0:h*.15;
        this.instance('tree-leaves',leaves,m.leaf,x+Math.sin(a)*offset,y+h*(.72+j*.065),z+Math.cos(a)*offset,h*.29*s,h*.24,h*.29*s,b==='highland'?'#ddd5ad':j%2?'#d4d9b6':'#bbcba5',a);
      }
    };
    for(let i=0;i<510;i++){
      const x=(this.rng()-.5)*620,z=(this.rng()-.5)*620,b=biomeAt(x,z);
      if(isWater(x,z)||Math.hypot(x-CAMP.x,z-CAMP.z)<14||Math.abs(x)<7||(b==='volcano'&&this.rng()<.85))continue;
      addTree(x,z,7+this.rng()*7,b==='snow'||this.rng()<.25);
    }
    // Denser, naturally sized trees frame the first route and leave a clear path.
    for(const [x,z,h]of [[-12,24,10],[14,15,11],[-19,2,13],[23,28,10],[-28,34,12],[27,-8,14],[-37,-15,12],[41,3,10],[-16,-29,11],[15,-39,12]])addTree(x,z,h,false);
    for(let i=0;i<260;i++){
      const x=(this.rng()-.5)*620,z=(this.rng()-.5)*620,y=heightAt(x,z),b=biomeAt(x,z),r=.45+this.rng()*2.4;
      if(isWater(x,z)||Math.hypot(x,z-44)<12||Math.abs(x)<5)continue;
      this.instance('weathered-rocks',geos.rock,m.rock,x,y+r*.22,z,r,r*.72,r*.86,b==='snow'?'#d1d8d8':b==='volcano'?'#85796b':'#b9bdab',this.rng()*6);
      if(r>1.4)this.colliders.push({x,z,r:r*.78});
    }
    for(let i=0;i<26000;i++){
      // Half the grass is concentrated in the starter valley where detail matters.
      const near=i<13000,x=(this.rng()-.5)*(near?160:580),z=(this.rng()-.5)*(near?160:580)+(near?15:0),b=biomeAt(x,z),y=heightAt(x,z);
      const path=Math.abs(x-Math.sin(z*.026)*1.4)<3.7&&z>-155&&z<65;
      if(isWater(x,z)||b==='volcano'||b==='snow'||path||Math.hypot(x,z-44)<5)continue;
      const size=.3+this.rng()*.48,key=`grass-${Math.floor(x/48)}-${Math.floor(z/48)}`;
      this.instance(key,grass,m.grass,x,y-.04,z,size,size,size,this.rng()<.65?'#d0d4ab':'#e1d5a8',this.rng()*6);
    }
    // Ferns and small flowering undergrowth use the same original alpha art.
    for(let i=0;i<420;i++){
      const x=(this.rng()-.5)*420,z=(this.rng()-.5)*420,b=biomeAt(x,z);if(isWater(x,z)||b==='snow'||b==='volcano'||Math.abs(x)<5)continue;
      const y=heightAt(x,z);this.instance('ferns',leaves,m.leaf,x,y+.28,z,.65,.4,.65,'#9baa7c',this.rng()*6);
    }
  }
  mesh(geo, material, pos, scale, group=this.scene) {const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  camp() {
    const x=CAMP.x,z=CAMP.z,y=heightAt(x,z); this.campGroup=new THREE.Group();this.scene.add(this.campGroup);
    const fireX=-5,fireZ=z-1,fy=heightAt(fireX,fireZ);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;this.mesh(geos.rock,materials().rock,[fireX+Math.cos(a)*1.1,fy+.2,fireZ+Math.sin(a)*1.1],[.4,.3,.4]);}
    for(let i=0;i<3;i++)this.mesh(geos.trunk,materials().bark,[fireX+(i-1)*.35,fy+.3,fireZ],[.3,.6,.3]);
    this.flame=this.mesh(geos.cone,mat(0xffc26a,{emissive:0xff8b27,emissiveIntensity:1.6,transparent:true,opacity:.9}),[fireX,fy+.95,fireZ],[.65,1.6,.65]);
    this.fireLight=new THREE.PointLight(0xffb665,20,20,2);this.fireLight.position.set(fireX,fy+2,fireZ);this.scene.add(this.fireLight);
    // Canvas tent, woven bedroll and wooden supply crates.
    const tent=new THREE.Group();tent.position.set(8,heightAt(8,49),49);tent.rotation.y=-.25;
    const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute([-3,0,3,0,4,3,3,0,3,-3,0,-3,3,0,-3,0,4,-3,-3,0,3,-3,0,-3,0,4,-3,-3,0,3,0,4,-3,0,4,3,3,0,3,0,4,3,0,4,-3,3,0,3,0,4,-3,3,0,-3],3));tg.computeVertexNormals();
    this.mesh(tg,mat(0xc4ac7c,{side:THREE.DoubleSide}),[0,0,0],null,tent);this.scene.add(tent);
    for(const [xx,zz] of [[-9,48],[-10,46]])this.mesh(geos.cube,materials().bark,[xx,heightAt(xx,zz)+.65,zz],[1.4,1.3,1.4]);
    const signY=heightAt(2,34);this.mesh(geos.trunk,materials().bark,[2,signY+1.2,34],[.15,2.4,.15]);
    this.mesh(geos.cube,materials().bark,[2,signY+2.1,34],[2.6,.65,.15]);
  }
  ruins() {
    for(const [cx,cz] of [[36,-64],[130,-63],[-110,-208],[164,-228]]){
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=cx+Math.cos(a)*11,z=cz+Math.sin(a)*11,y=heightAt(x,z),h=3+this.rng()*6;
        this.mesh(new THREE.CylinderGeometry(.85,1.1,h,7),materials().rock,[x,y+h/2,z]);this.colliders.push({x,z,r:1.2});
        this.mesh(geos.cube,materials().rock,[x,y+h,z],[2.8,.55,2]);
      }
    }
  }
  node(kind,x,z,id) {
    const group=new THREE.Group(),y=heightAt(x,z);group.position.set(x,y,z);
    const def={herb:['야생초','#bad68a'],mushroom:['숲 버섯','#d79983'],wood:['목재','#c3a77f'],iron:['철광맥','#c3c7b6'],crystal:['수정맥','#9de5e0'],frost:['서리꽃','#c5e8ff']};
    const [name,c]=def[kind];
    if(kind==='wood') { const m=this.mesh(geos.trunk,mat(c),[0,.5,0],[.7,1,.7],group); m.rotation.z=.95; }
    else if(kind==='mushroom'){
      for(let i=0;i<3;i++){const x=(i-1)*.5;this.mesh(geos.trunk,mat(0xddd4af),[x,.3,0],[.13,.6,.13],group);this.mesh(new THREE.SphereGeometry(.45,24,14,0,Math.PI*2,0,Math.PI/2),mat(c),[x,.6,0],null,group);}
    }else if(kind==='iron'||kind==='crystal'){
      this.mesh(geos.rock,materials().rock,[0,.45,0],[1,.9,.8],group);
      for(let i=0;i<4;i++){const m=this.mesh(new THREE.OctahedronGeometry(1),mat(c,{emissive:c,emissiveIntensity:.15}),[(i%2-.5)*.7,.9+i*.1,(i/2-.7)*.4],[.3,.8,.3],group);m.rotation.z=(i-2)*.2;}
    }else{
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;this.mesh(geos.cone,mat(c),[Math.cos(a)*.3,.55,Math.sin(a)*.3],[.15,.9,.15],group);}
      this.mesh(geos.sphere,mat(c,{emissive:c,emissiveIntensity:.25}),[0,1.05,0],[.24,.2,.24],group);
    }
    this.scene.add(group); this.nodes.push({id,kind,name,x,z,group,availableAt:0});
  }
  chest(x,z,id,tier=1) {
    const group=new THREE.Group(),y=heightAt(x,z);group.position.set(x,y,z);
    this.mesh(geos.cube,materials().bark,[0,.5,0],[1.6,1,1],group);
    const lid=this.mesh(geos.cube,materials().bark,[0,1.08,0],[1.7,.26,1.08],group);
    for(const xx of [-.6,.6])this.mesh(geos.cube,mat(0xd6b36a,{metalness:.6}),[xx,.6,.01],[.12,1.25,1.1],group);
    this.mesh(geos.cube,mat(0xe8cf7d,{emissive:0xd6a53e,emissiveIntensity:.5}),[0,.65,.56],[.25,.35,.1],group);
    const beam=this.mesh(new THREE.CylinderGeometry(.06,.06,4,5),mat(0xf4db8c,{transparent:true,opacity:.4,emissive:0xe8c460,emissiveIntensity:1}),[0,3,0],null,group);
    this.scene.add(group);this.chests.push({id:`chest-${id}`,name:'잊힌 보물상자',x,z,tier,group,lid,beam,opened:false});
  }
  monsterModel(type) {
    const def=MONSTERS[type],g=new THREE.Group(),body=mat(def.color,{map:materials().leather.map,normalMap:materials().leather.normalMap,normalScale:new THREE.Vector2(.35,.35)}),dark=mat(0x242c24),light=mat(0xe9e7c6),eye=mat(def.boss?0xffbd67:0x211d15,{emissive:def.boss?0xff7d35:0x1c2010,emissiveIntensity:def.boss?.65:0});
    if(def.shape==='slime'){
      this.mesh(geos.sphere,new THREE.MeshPhysicalMaterial({color:0x667b46,roughness:.25,transparent:true,opacity:.84,clearcoat:1,metalness:.1,transmission:.12}),[0,.8,0],[1.1,.85,1.1],g);
      for(const x of [-.34,.34])this.mesh(geos.sphere,dark,[x,1,-.86],[.12,.16,.12],g);
      this.mesh(geos.sphere,mat(0xbed18f,{transparent:true,opacity:.5}),[-.25,.62,-.3],[.19,.23,.18],g);
    }else if(def.shape==='wolf'||def.shape==='boar'){
      this.mesh(geos.sphere,body,[0,1.05,0],[.65,.66,1.2],g);
      this.mesh(geos.rock,body,[0,1.5,-.94],[.52,.55,.65],g);
      this.mesh(geos.rock,dark,[0,1.25,-1.47],[.28,.25,.38],g);
      for(const x of [-.4,.4]){
        const ears=this.mesh(geos.cone,body,[x,2,-.95],[.22,.5,.22],g);ears.rotation.z=x;
        this.mesh(geos.sphere,eye,[x*.77,1.65,-1.4],[.07,.07,.07],g);
        for(const z of [-.65,.7]){const leg=this.mesh(new THREE.CapsuleGeometry(.105,.65,5,8),body,[x,.46,z],null,g);(g.userData.legs??=[]).push(leg);this.mesh(geos.sphere,dark,[x,.08,z-.07],[.15,.1,.22],g);}
      }
      const tail=this.mesh(geos.cone,body,[0,1.2,1.4],[.25,1.2,.25],g);tail.rotation.x=.8;
      if(def.shape==='boar')for(const x of [-.32,.32]){const tusk=this.mesh(geos.cone,light,[x,1.15,-1.65],[.12,.65,.12],g);tusk.rotation.x=-.5;}
    }else if(def.shape==='spirit'){
      this.mesh(new THREE.IcosahedronGeometry(.65,2),mat(def.color,{emissive:def.color,emissiveIntensity:.6}),[0,1.6,0],null,g);
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
    const sky=new Sky();sky.scale.setScalar(1400);
    const uniforms=sky.material.uniforms;uniforms.turbidity.value=2.6;uniforms.rayleigh.value=2.2;uniforms.mieCoefficient.value=.004;uniforms.mieDirectionalG.value=.82;
    uniforms.sunPosition.value.set(-.55,.48,-.6).normalize();this.scene.add(sky);this.atmosphere=sky;
    if(this.renderer){const capture=new THREE.Scene();capture.add(sky.clone());const pmrem=new THREE.PMREMGenerator(this.renderer);this.environmentTarget=pmrem.fromScene(capture,.02,.1,2000);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.35;pmrem.dispose();}
    const cloudMap=canvasTexture(256,(ctx)=>{
      for(let i=0;i<55;i++){const x=25+this.rng()*206,y=85+this.rng()*90,r=14+this.rng()*35;const grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'#fffdf9a0');grad.addColorStop(.5,'#eee9e050');grad.addColorStop(1,'#ffffff00');ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);}
    });
    this.clouds=new THREE.Group();const cm=new THREE.MeshBasicMaterial({map:cloudMap,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,fog:false});
    for(let i=0;i<18;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(145,80),cm);mesh.position.set((this.rng()-.5)*1000,135+this.rng()*60,(this.rng()-.5)*1000);mesh.rotation.x=-Math.PI*.38;mesh.rotation.z=this.rng()*6;this.clouds.add(mesh);}this.scene.add(this.clouds);
    const birdsGeo=new THREE.BufferGeometry(),verts=[];
    for(let i=0;i<14;i++){const x=(this.rng()-.5)*100,z=-80-this.rng()*90,y=60+this.rng()*35;verts.push(x-1,y,z,x,y-.3,z,x,y-.3,z,x+1,y,z);}
    birdsGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));this.birds=new THREE.LineSegments(birdsGeo,new THREE.LineBasicMaterial({color:0x46544d}));this.scene.add(this.birds);
  }
  update(time, dt, viewer, low=false) {
    this.clouds.position.x=Math.sin(time*.004)*18;this.birds.position.x=Math.sin(time*.08)*15;
    this.flame.scale.y=1.6+Math.sin(time*12)*.18;this.fireLight.intensity=18+Math.sin(time*9)*3;
    updateWind(time);this.water.material.normalMap.offset.set(time*.007,time*.004);if(this.water.material.userData.shader)this.water.material.userData.shader.uniforms.uWaterTime.value=time;
    for(const c of this.chests)if(!c.opened)c.beam.material.opacity=.28+Math.sin(time*2)*.15;
    for(const n of this.nodes)n.group.visible=time>=n.availableAt&&(!viewer||Math.hypot(n.x-viewer.x,n.z-viewer.z)<(low?50:105));
    if(viewer){
      for(const m of this.monsters)m.group.visible=m.alive&&Math.hypot(m.x-viewer.x,m.z-viewer.z)<(low?65:130);
      for(const c of this.chests)c.group.visible=Math.hypot(c.x-viewer.x,c.z-viewer.z)<120;
      for(const b of this.decorationBatches){const range=b.key.startsWith('grass')?(low?45:75):(low?115:225);b.mesh.visible=Math.hypot(b.center.x-viewer.x,b.center.z-viewer.z)<range+b.radius;}
    }
  }
}
