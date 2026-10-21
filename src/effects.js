import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { particleTexture } from './art.js';
const TAU=Math.PI*2;
const glyphVertex=`varying vec2 vGlyphUv;void main(){vGlyphUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const glyphFragment=`uniform vec3 uColor;uniform float uTime;uniform float uOpacity;uniform float uPreview;varying vec2 vGlyphUv;
void main(){vec2 p=(vGlyphUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float ring=1.-smoothstep(.008,.026,abs(r-.94));float inner=(1.-smoothstep(.006,.02,abs(r-.76)))*.55;float ticks=step(.68,fract(a*9.5493))*smoothstep(.83,.86,r)*(1.-smoothstep(.91,.92,r));float runes=step(.47,fract(a*3.8197+.5))*smoothstep(.78,.8,r)*(1.-smoothstep(.84,.87,r));float wave=pow(max(0.,sin(r*21.-uTime*3.)),14.)*(1.-r)*.3;float fill=(1.-smoothstep(.72,.94,r))*.045;float alpha=(ring+inner+ticks*.6+runes*.7+wave*(1.-uPreview)+fill)*uOpacity;if(r>1.||alpha<.008)discard;gl_FragColor=vec4(uColor*(1.+ring*.8),alpha);}`;
function groundPlane(radius,position){const geo=new THREE.PlaneGeometry(radius*2,radius*2,36,36);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,heightAt(position.x+x,position.z+z)-position.y+.065,z);}geo.computeVertexNormals();return geo;}
function material(color,preview=false){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uTime:{value:0},uOpacity:{value:preview?.65:1},uPreview:{value:preview?1:0}},vertexShader:glyphVertex,fragmentShader:glyphFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});}
export class Effects {
  constructor(scene){this.scene=scene;this.items=[];this.time=0;this.preview=null;}
  dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.scene.remove(group);}
  setPreview(point,radius,color,valid){
    if(!this.preview||this.preview.userData.radius!==radius){if(this.preview)this.dispose(this.preview);this.preview=new THREE.Mesh(groundPlane(radius,point),material(color,true));this.preview.userData.radius=radius;this.scene.add(this.preview);}
    const mesh=this.preview;mesh.visible=true;mesh.position.copy(point);mesh.material.uniforms.uColor.value.setHex(valid?color:0xe68b72);mesh.material.uniforms.uTime.value=this.time;
    const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,heightAt(point.x+x,point.z+z)-point.y+.075);}p.needsUpdate=true;
  }
  hidePreview(){if(this.preview)this.preview.visible=false;}
  particles(position,color,count=24,options={}){
    const geo=new THREE.BufferGeometry(),positions=new Float32Array(count*3),velocities=new Float32Array(count*3),colors=new Float32Array(count*3),c=new THREE.Color(color);
    for(let i=0;i<count;i++){const a=Math.random()*TAU,r=options.radius?Math.sqrt(Math.random())*options.radius:0;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.random()*.3;positions[i*3+2]=Math.sin(a)*r;
      velocities[i*3]=(Math.random()-.5)*(options.speed||5);velocities[i*3+1]=(options.up??4)*( .3+Math.random());velocities[i*3+2]=(Math.random()-.5)*(options.speed||5);colors[i*3]=c.r;colors[i*3+1]=c.g*(.7+Math.random()*.3);colors[i*3+2]=c.b;}
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({map:particleTexture(),size:options.size||.2,color:0xffffff,vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    const group=new THREE.Points(geo,mat);group.position.copy(position);this.scene.add(group);const life=options.life||.9;this.items.push({group,life,max:life,kind:'particles',velocities,gravity:options.gravity??4});
  }
  ring(position,color,radius=4,life=.6){const group=new THREE.Mesh(groundPlane(radius,position),material(color));group.position.copy(position);this.scene.add(group);this.items.push({group,life,max:life,kind:'glyph'});}
  spell(position,radius,kind,color,delay=0,duration=0){
    const life=delay+Math.max(duration,1.2),g=new THREE.Group();g.position.copy(position);
    const disk=new THREE.Mesh(groundPlane(radius,position),material(color));g.add(disk);this.scene.add(g);
    const entry={group:g,life,max:life,kind:'spell',spellKind:kind,color,delay,duration,radius,triggered:false,disk};
    if(kind==='meteorZone'){
      const meteor=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3,2),new THREE.MeshStandardMaterial({color:0x3b2118,emissive:0xff6e21,emissiveIntensity:3,roughness:.8}));meteor.position.set(12,30,6);g.add(meteor);entry.meteor=meteor;
    }
    if(kind==='frostZone')for(let i=0;i<18;i++){
      const a=i/18*TAU,r=radius*(.45+Math.random()*.4),shard=new THREE.Mesh(new THREE.ConeGeometry(.18,.9+Math.random()*1.3,5),new THREE.MeshPhysicalMaterial({color:0xabe3ee,metalness:.2,roughness:.15,transparent:true,opacity:.75,emissive:0x4f9dbb,emissiveIntensity:.55}));shard.position.set(Math.cos(a)*r,0,Math.sin(a)*r);shard.rotation.z=(Math.random()-.5)*.6;g.add(shard);
    }
    if(kind==='lightningZone')for(let i=0;i<4;i++){
      const points=[],tx=(Math.random()-.5)*radius,tz=(Math.random()-.5)*radius;for(let j=0;j<9;j++)points.push(new THREE.Vector3(tx+(j===8?0:(Math.random()-.5)*2.5),22-j*2.75,tz+(Math.random()-.5)*1.7));
      const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xc9efff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,toneMapped:false}));g.add(bolt);
    }
    this.items.push(entry);
  }
  trail(start,end,color){const geo=new THREE.BufferGeometry().setFromPoints([start.clone(),end.clone()]),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,toneMapped:false}),group=new THREE.Line(geo,mat);this.scene.add(group);this.items.push({group,life:.25,max:.25,kind:'line'});}
  update(dt){
    this.time+=dt;
    for(let i=this.items.length-1;i>=0;i--){const e=this.items[i];e.life-=dt;const age=e.max-e.life,fade=Math.min(1,e.life/.5);
      if(e.kind==='particles'){
        const p=e.group.geometry.attributes.position;for(let j=0;j<p.count;j++){p.setXYZ(j,p.getX(j)+e.velocities[j*3]*dt,p.getY(j)+e.velocities[j*3+1]*dt,p.getZ(j)+e.velocities[j*3+2]*dt);e.velocities[j*3+1]-=e.gravity*dt;}p.needsUpdate=true;e.group.material.opacity=Math.min(1,e.life/e.max*1.5);
      }else if(e.kind==='glyph'){e.group.material.uniforms.uTime.value=age;e.group.material.uniforms.uOpacity.value=fade;}
      else if(e.kind==='spell'){
        e.disk.material.uniforms.uTime.value=age;e.disk.material.uniforms.uOpacity.value=fade*(age<e.delay?.48:1);
        if(e.meteor){const t=Math.min(1,age/Math.max(.01,e.delay));e.meteor.position.set(12*(1-t),30*(1-t),6*(1-t));e.meteor.rotation.y+=dt*2;e.meteor.visible=age<e.delay;}
        if(age>=e.delay&&!e.triggered){e.triggered=true;this.particles(e.group.position,e.color,70,{radius:e.radius*.8,up:e.spellKind==='fireZone'?2.8:5,speed:3,life:1.3,size:.22});}
        if(e.spellKind==='fireZone'||e.spellKind==='arcaneZone')if(e.triggered&&Math.random()<dt*10)this.particles(e.group.position,e.color,7,{radius:e.radius*.8,up:2.6,speed:.7,gravity:-.4,life:1,size:.13});
        e.group.children.forEach(o=>{if(o.isLine)o.material.opacity=age>e.delay&&age<e.delay+.45?Math.max(.2,Math.sin(age*95)):0;});
      }else e.group.material.opacity=fade;
      if(e.life<=0){this.dispose(e.group);this.items.splice(i,1);}
    }
  }
  clear(){this.items.forEach(e=>this.dispose(e.group));this.items=[];this.hidePreview();}
}
