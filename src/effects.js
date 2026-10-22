import { vfxSprite,vfxMap } from './vfx-textures.js';
import * as THREE from 'three';
import { buildSpellVisual } from './spell-art.js';
import { materials } from './art.js';
import { surfaceAt } from './terrain.js';
import { particleTexture } from './art.js';
import { frostExplosion,impactBloom } from './combat-visuals.js';
import { surfaceTextures } from './surfaces.js';
import { vfxTextures } from './vfx-textures.js';
import { makeArrow } from './weapons.js';
const TAU=Math.PI*2;
const glyphVertex=`varying vec2 vGlyphUv;void main(){vGlyphUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const glyphFragment=`uniform vec3 uColor;uniform float uTime;uniform float uOpacity;uniform float uPreview;varying vec2 vGlyphUv;
void main(){vec2 p=(vGlyphUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float ring=1.-smoothstep(.008,.026,abs(r-.94));float inner=(1.-smoothstep(.006,.02,abs(r-.76)))*.55;float ticks=step(.68,fract(a*9.5493))*smoothstep(.83,.86,r)*(1.-smoothstep(.91,.92,r));float runes=step(.47,fract(a*3.8197+.5))*smoothstep(.78,.8,r)*(1.-smoothstep(.84,.87,r));float wave=pow(max(0.,sin(r*21.-uTime*3.)),14.)*(1.-r)*.3;float fill=(1.-smoothstep(.72,.94,r))*.045;float alpha=(ring+inner+ticks*.6+runes*.7+wave*(1.-uPreview)+fill)*uOpacity;if(r>1.||alpha<.008)discard;gl_FragColor=vec4(uColor*(1.+ring*.8),alpha);}`;
function groundPlane(radius,position){const geo=new THREE.PlaneGeometry(radius*2,radius*2,36,36);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,surfaceAt(position.x+x,position.z+z,position.y+.7)-position.y+.065,z);}geo.computeVertexNormals();return geo;}
function material(color,preview=false){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uTime:{value:0},uOpacity:{value:preview?.65:1},uPreview:{value:preview?1:0}},vertexShader:glyphVertex,fragmentShader:glyphFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});}
export class Effects {
  constructor(scene){this.scene=scene;this.items=[];this.time=0;this.preview=null;this.pool=[];this.prepared=false;this.preparationStats={built:0,reused:0};}
  dispose(group){const pooled=this.pool.find(e=>e.group===group);if(pooled){pooled.inUse=false;this.scene.remove(group);return;}const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.scene.remove(group);}
  setPreview(point,radius,color,valid){
    if(!this.preview||this.preview.userData.radius!==radius){if(this.preview)this.dispose(this.preview);this.preview=new THREE.Mesh(groundPlane(radius,point),material(color,true));this.preview.userData.radius=radius;this.scene.add(this.preview);}
    const mesh=this.preview;mesh.visible=true;mesh.position.copy(point);mesh.material.uniforms.uColor.value.setHex(valid?color:0xe68b72);mesh.material.uniforms.uTime.value=this.time;
    const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,surfaceAt(point.x+x,point.z+z,point.y+.7)-point.y+.075);}p.needsUpdate=true;
  }
  hidePreview(){if(this.preview)this.preview.visible=false;}
  bowShot(position,direction,color){
    const group=makeArrow(color,true);group.scale.set(2.2,2.2,1.65);group.position.copy(position);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);this.scene.add(group);
    this.items.push({group,kind:'bowShot',velocity:direction.clone().multiplyScalar(22),life:.4,max:.4});
  }
  particles(position,color,count=24,options={}){
    const geo=new THREE.BufferGeometry(),positions=new Float32Array(count*3),velocities=new Float32Array(count*3),colors=new Float32Array(count*3),c=new THREE.Color(color);
    for(let i=0;i<count;i++){const a=Math.random()*TAU,r=options.radius?Math.sqrt(Math.random())*options.radius:0;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.random()*.3;positions[i*3+2]=Math.sin(a)*r;
      velocities[i*3]=(Math.random()-.5)*(options.speed||5);velocities[i*3+1]=(options.up??4)*( .3+Math.random());velocities[i*3+2]=(Math.random()-.5)*(options.speed||5);colors[i*3]=c.r;colors[i*3+1]=c.g*(.7+Math.random()*.3);colors[i*3+2]=c.b;}
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({map:particleTexture(),size:options.size||.2,color:0xffffff,vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    const group=new THREE.Points(geo,mat);group.position.copy(position);this.scene.add(group);const life=options.life||.9;this.items.push({group,life,max:life,kind:'particles',velocities,gravity:options.gravity??4});
  }
  ring(position,color,radius=4,life=.6){const group=new THREE.Mesh(groundPlane(radius,position),material(color));group.position.copy(position);this.scene.add(group);this.items.push({group,life,max:life,kind:'glyph'});}
  createSpell(position,radius,kind,color,delay=0,duration=0){
    const g=new THREE.Group(),disk=new THREE.Mesh(groundPlane(radius,position),material(color));g.add(disk);const visual=buildSpellVisual(kind,radius,color,position.clone(),delay,duration);g.add(visual.root);this.preparationStats.built++;
    return {group:g,disk,visual,kind:'spell',spellKind:kind,radius,color,delay,duration};
  }
  async prepare(renderer,world){
    const staging=new THREE.Scene();staging.fog=world.fog?.clone();staging.environment=world.environment;staging.environmentIntensity=world.environmentIntensity;
    for(const child of world.children)if(child.isLight)staging.add(child.clone());
    for(const [kind,radius,color,delay,duration]of [['meteorZone',10,0xff885a,1.1,0],['arcaneZone',13,0xcab1ff,.5,3]])for(let i=0;i<2;i++){
      const e=this.createSpell(new THREE.Vector3(),radius,kind,color,delay,duration);e.pooled=true;e.inUse=false;e.group.position.x=i*2;e.visual.update(delay*.6,0,1,false);this.pool.push(e);staging.add(e.group);
    }
    this.warmObjects=[impactBloom('meteorZone',10),impactBloom('arcaneZone',13),frostExplosion(5)];for(const v of this.warmObjects){v.update(.15,1,3);staging.add(v.root);}
    const owner=this.scene,start=this.items.length;this.scene=staging;for(const shape of ['wolf','golem','slime'])this.impact(new THREE.Vector3(),{shape,color:0xc7a9ff,crit:true});this.scene=owner;for(const e of this.items.splice(start))this.warmObjects.push({root:e.group});
    const textures=[...surfaceTextures(),...vfxTextures()];await Promise.all(textures.map(t=>t.userData.ready));
    for(const t of textures)renderer.initTexture(t);
    const camera=new THREE.PerspectiveCamera(70,1,.1,150);camera.position.set(15,14,30);camera.lookAt(0,8,0);
    const target=new THREE.WebGLRenderTarget(32,32),old=renderer.getRenderTarget();
    try{if(renderer.compileAsync)await renderer.compileAsync(staging,camera);else renderer.compile(staging,camera);renderer.setRenderTarget(target);renderer.render(staging,camera);for(const e of this.pool)e.visual.update(e.delay+.1,0,1,true);renderer.render(staging,camera);}finally{renderer.setRenderTarget(old);target.dispose();for(const v of this.warmObjects)staging.remove(v.root);for(const light of staging.children)if(light.isLight)light.shadow?.map?.dispose();for(const e of this.pool){staging.remove(e.group);e.group.position.set(0,0,0);}}
    this.prepared=true;
  }
  spell(position,radius,kind,color,delay=0,duration=0){
    const pooled=this.pool.find(e=>!e.inUse&&e.spellKind===kind&&e.radius===radius),e=pooled||this.createSpell(position,radius,kind,color,delay,duration);
    if(pooled){this.preparationStats.reused++;e.visual.reset(position);const a=e.disk.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,surfaceAt(position.x+a.getX(i),position.z+a.getZ(i),position.y+.7)-position.y+.065);a.needsUpdate=true;}
    Object.assign(e,{inUse:true,life:delay+Math.max(duration,2),max:delay+Math.max(duration,2),triggered:false,impacted:false});e.group.position.copy(position);e.visual.update(0,0,1,['meteorZone','arcaneZone'].includes(kind)?false:undefined);this.scene.add(e.group);this.items.push(e);return e;
  }
  frostBurst(contact,radius=5){const visual=frostExplosion(radius),group=visual.root;group.position.copy(contact);this.scene.add(group);this.items.push({group,visual,kind:'timedBurst',spellKind:'frostBurst',radius,age:0,visibleFrames:0,fadeAge:0});}
  fieldImpact(entry,position,kind,radius){if(entry){entry.impacted=true;entry.triggered=true;}const visual=impactBloom(kind,radius),group=visual.root;group.position.copy(position).y+=.55;this.scene.add(group);this.items.push({group,visual,kind:'timedBurst',spellKind:'fieldImpact',sourceKind:kind,age:0,visibleFrames:0,fadeAge:0});}
  sigil(position,kind='impact',size=1.8,life=.35){const group=vfxSprite(kind,0xffffff,size);group.position.copy(position);this.scene.add(group);this.items.push({group,kind:'sprite',life,max:life});}
  impact(position,{shape,color,crit=false,scale=1}){
    this.sigil(position,'impact',(crit?2.2:1.55)*scale,.32);const g=new THREE.Group();g.position.copy(position);this.scene.add(g);const pieces=[],stone=shape==='golem',liquid=shape==='slime'||shape==='spirit',count=crit?14:9;
    for(let i=0;i<count;i++){const geo=stone?new THREE.IcosahedronGeometry(.07*scale,0):liquid?new THREE.SphereGeometry(.045*scale,8,6):new THREE.ConeGeometry(.018*scale,.2*scale,4),mat=stone?materials().rock.clone():new THREE.MeshBasicMaterial({color:liquid?(shape==='slime'?0xa4d46c:0x94e9ef):color,transparent:true,depthWrite:false,toneMapped:false});mat.transparent=true;const mesh=new THREE.Mesh(geo,mat);g.add(mesh);const velocity=new THREE.Vector3((Math.random()-.5)*5,1+Math.random()*3,(Math.random()-.5)*5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());pieces.push({mesh,velocity});}
    this.particles(position,crit?0xffe5a8:color,crit?20:8,{size:crit?.3:.15,up:2,speed:3,life:.35});this.items.push({group:g,kind:'impact',pieces,life:.6,max:.6});
  }
  sweep(position,yaw,pitch,color,side=1){const group=new THREE.Mesh(new THREE.PlaneGeometry(3.1,2.3),new THREE.MeshBasicMaterial({map:vfxMap('slash'),color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}));group.position.copy(position);group.rotation.set(pitch,yaw,side*.5);this.scene.add(group);this.items.push({group,kind:'sweep',life:.22,max:.22});}
  trail(start,end,color){const geo=new THREE.BufferGeometry().setFromPoints([start.clone(),end.clone()]),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,toneMapped:false}),group=new THREE.Line(geo,mat);this.scene.add(group);this.items.push({group,life:.25,max:.25,kind:'line'});}
  update(dt){
    this.time+=dt;
    for(let i=this.items.length-1;i>=0;i--){const e=this.items[i];if(e.kind==='timedBurst'){if(dt>0){e.age+=dt;e.visibleFrames++;if(e.visibleFrames>8)e.fadeAge+=dt;}const fade=Math.max(0,1-e.fadeAge/.32);e.visual.update(e.age,fade,Math.max(0,Math.min(7,e.visibleFrames-1)));if(e.visibleFrames>=8&&e.fadeAge>=.32){this.dispose(e.group);this.items.splice(i,1);}continue;}e.life-=dt;const age=e.max-e.life,fade=Math.min(1,e.life/.5);
      if(e.kind==='particles'){
        const p=e.group.geometry.attributes.position;for(let j=0;j<p.count;j++){p.setXYZ(j,p.getX(j)+e.velocities[j*3]*dt,p.getY(j)+e.velocities[j*3+1]*dt,p.getZ(j)+e.velocities[j*3+2]*dt);e.velocities[j*3+1]-=e.gravity*dt;}p.needsUpdate=true;e.group.material.opacity=Math.min(1,e.life/e.max*1.5);
      }else if(e.kind==='glyph'){e.group.material.uniforms.uTime.value=age;e.group.material.uniforms.uOpacity.value=fade;}
      else if(e.kind==='spell'){
        e.disk.material.uniforms.uTime.value=age;e.disk.material.uniforms.uOpacity.value=fade*(age<e.delay?.48:1);
        e.visual?.update(age,dt,fade,['meteorZone','arcaneZone'].includes(e.spellKind)?e.impacted:undefined);
        if(age>=e.delay&&!e.triggered&&!['meteorZone','arcaneZone'].includes(e.spellKind)){e.triggered=true;this.particles(e.group.position,e.color,70,{radius:e.radius*.8,up:e.spellKind==='fireZone'?2.8:5,speed:3,life:1.3,size:.22});}
        if(e.spellKind==='fireZone'||e.spellKind==='arcaneZone')if(e.triggered&&Math.random()<dt*10)this.particles(e.group.position,e.color,7,{radius:e.radius*.8,up:2.6,speed:.7,gravity:-.4,life:1,size:.13});

      }else if(e.kind==='bowShot'){e.group.position.addScaledVector(e.velocity,dt);
      }else if(e.kind==='impact'){
        e.pieces.forEach(({mesh,velocity})=>{mesh.position.addScaledVector(velocity,dt);velocity.y-=8*dt;mesh.rotation.x+=dt*5;mesh.scale.multiplyScalar(Math.max(0,1-dt*1.1));mesh.material.opacity=fade;});
      }else if(e.kind==='sweep'){e.group.material.opacity=fade;e.group.scale.multiplyScalar(1+dt*.7);}
      else if(e.kind==='sprite'){e.group.material.opacity=Math.min(1,e.life/e.max*1.7);e.group.scale.multiplyScalar(1+dt*2);}
      else e.group.material.opacity=fade;
      if(e.life<=0){this.dispose(e.group);this.items.splice(i,1);}
    }
  }
  clear(){this.items.forEach(e=>this.dispose(e.group));this.items=[];this.hidePreview();}
}
