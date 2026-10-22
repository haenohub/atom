import { vfxSprite } from './vfx-textures.js';
import * as THREE from 'three';
import { surfaceMaterial, surfaceMap } from './surfaces.js';
import { materials, weatheredRock } from './art.js';
import { surfaceAt } from './terrain.js';
const TAU=Math.PI*2;
const flameVertex=`uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(uTime*4.+uv.y*5.+uv.x*6.283)*uv.y*uv.y*.28;p.z+=cos(uTime*3.+uv.y*4.)*uv.y*uv.y*.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const flameFragment=`uniform float uTime;uniform vec3 uColor;uniform float uFade;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){vec2 uv=vUv;float n=noise(vec2(uv.x*13.,uv.y*7.-uTime*3.))+noise(vec2(uv.x*27.,uv.y*15.-uTime*5.))*.4;float tongues=1.-smoothstep(.45,.98,uv.y+n*.29);float edge=smoothstep(0.,.12,uv.y);float alpha=tongues*edge*(.25+n*.5)*uFade;vec3 c=mix(uColor*.6,vec3(1.4,.91,.36),pow(1.-uv.y,3.));if(alpha<.025)discard;gl_FragColor=vec4(c,alpha);}`;
function mesh(g,geo,mat,pos=[0,0,0]){const o=new THREE.Mesh(geo,mat);o.position.set(...pos);g.add(o);return o;}
const glow=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
function tube(g,points,color,r=.025,opacity=1){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(16,points.length*4),r,6,false),glow(color,opacity));}
function bolt(g,points,color,r,opacity){const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));return mesh(g,new THREE.TubeGeometry(path,points.length*4,r,5,false),glow(color,opacity));}
export function buildSpellVisual(kind,radius,color,point,delay,duration){
  const root=new THREE.Group(),dynamic=[],rings=[],flames=[],falling=[],spikes=[],bolts=[],shards=[];
  const accent=vfxSprite(['restore','recall','blessing'].includes(kind)?'teleport':kind==='arcaneZone'?'orb':'impact',color,Math.min(radius*.9,4));accent.position.y=.7;root.add(accent);
  const ground=(x,z)=>surfaceAt(point.x+x,point.z+z,point.y+.7)-point.y;
  let meteor=null,meteorTail=null;
  const ring=(r,y=0)=>{const o=mesh(root,new THREE.TorusGeometry(r,.025,6,64),glow(color,.65),[0,y,0]);o.rotation.x=Math.PI/2;rings.push(o);return o;};
  if(kind==='meteorZone'){
    meteor=new THREE.Group();const rock=mesh(meteor,weatheredRock(5),surfaceMaterial('meteor',0xc1b5a8,{normalMap:materials().rock.normalMap,normalScale:new THREE.Vector2(.9,.9),roughness:.9,emissive:0xff4912,emissiveMap:surfaceMap('meteor'),emissiveIntensity:.24}));rock.scale.set(1.65,1.85,1.55);
    for(let i=0;i<9;i++){
      const pts=[];for(let j=0;j<7;j++){const a=j*.27+i*.7;const v=new THREE.Vector3(Math.cos(a)*Math.sin(i+1),Math.sin(a),Math.cos(a)*Math.cos(i+1)).normalize().multiplyScalar(1.66+Math.sin(j*5+i)*.025);v.y*=1.1;pts.push(v);}tube(meteor,pts,0xff5d16,.018,.85);
    }
    const light=new THREE.PointLight(0xff8d3b,8,13,2);meteor.add(light);root.add(meteor);
    meteorTail=mesh(root,new THREE.ConeGeometry(1.7,7,20,8,true),new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(0xff5214)},uFade:{value:.6}},vertexShader:flameVertex,fragmentShader:flameFragment,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    for(let i=0;i<14;i++){const a=i/14*TAU,r=radius*(.18+Math.random()*.65),o=mesh(root,weatheredRock(1),surfaceMaterial('meteor',0xa79b8a),[Math.cos(a)*r,0,Math.sin(a)*r]);o.scale.setScalar(.12+Math.random()*.26);falling.push({o,origin:o.position.clone(),vy:4+Math.random()*5});}
    const crater=mesh(root,new THREE.RingGeometry(radius*.15,radius*.72,64),new THREE.MeshBasicMaterial({color:0x2c251f,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));crater.rotation.x=-Math.PI/2;crater.position.y=.08;dynamic.push(crater);ring(radius*.55,.12);ring(radius*.8,.14);
  }else if(kind==='fireZone'||kind==='rage'){
    for(let i=0;i<8;i++){const a=i/8*TAU,r=radius*(i===0?0:.52),x=Math.cos(a)*r,z=Math.sin(a)*r,mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(kind==='rage'?0xff222f:0xff591c)},uFade:{value:1}},vertexShader:flameVertex,fragmentShader:flameFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});const o=mesh(root,new THREE.CylinderGeometry(.12,.7,2.7,16,8,true),mat,[x,ground(x,z)+1.25,z]);flames.push(o);}
    ring(radius*.7,.1);
  }else if(kind==='frostZone'||kind==='freeze'||kind==='frostBurst'){
    for(let i=0;i<23;i++){const a=i*2.4,r=radius*(.15+Math.sqrt(i/23)*.75),x=Math.cos(a)*r,z=Math.sin(a)*r,h=1+Math.random()*2.2;const o=mesh(root,new THREE.OctahedronGeometry(1,0),new THREE.MeshPhysicalMaterial({color:0x79c8e3,roughness:.07,metalness:0,transmission:.35,thickness:.7,ior:1.31,transparent:true,opacity:.67,clearcoat:1,emissive:0x376c91,emissiveIntensity:.09}),[x,ground(x,z)+h*.35,z]);o.scale.set(.17+Math.random()*.14,h,.18);o.rotation.z=(Math.random()-.5)*.45;spikes.push({o,scale:o.scale.clone(),i});}
    for(let i=0;i<12;i++){const a=i/12*TAU,pts=[];for(let j=0;j<5;j++){const r=j/4*radius*.9,x=Math.cos(a+.1*Math.sin(j))*r,z=Math.sin(a+.1*Math.sin(j))*r;pts.push(new THREE.Vector3(x,ground(x,z)+.09,z));}dynamic.push(tube(root,pts,0xb2eaff,.015,.7));}
  }else if(kind==='lightningZone'){
    for(let i=0;i<4;i++){const x=(Math.random()-.5)*radius,z=(Math.random()-.5)*radius,pts=[];for(let j=0;j<12;j++)pts.push(new THREE.Vector3(x+(j===11?0:(Math.random()-.5)*1.8),22-j*2+ground(x,z),z+(j===11?0:(Math.random()-.5)*1.8)));bolts.push(bolt(root,pts,0x83c9ff,.075,.35),bolt(root,pts,0xd7f4ff,.025,1));for(let k=0;k<3;k++){const start=pts[3+k*2],end=start.clone().add(new THREE.Vector3((Math.random()-.5)*5,-3,(Math.random()-.5)*5));bolts.push(bolt(root,[start,start.clone().lerp(end,.5).add(new THREE.Vector3(.5,0,.5)),end],0xb4ddff,.022,.8));}}
  }else if(kind==='arrowRain'||kind==='shadowVolley'){
    const up=kind==='shadowVolley';
    for(let i=0;i<32;i++){const a=i*2.4,r=Math.sqrt(i/32)*radius*.9,x=Math.cos(a)*r,z=Math.sin(a)*r,shaft=new THREE.MeshStandardMaterial({color:up?0x66507f:0xbac3a3,metalness:.55,roughness:.35,emissive:up?color:0,emissiveIntensity:.45}),o=mesh(root,new THREE.CylinderGeometry(.025,.03,1.65,7),shaft,[x,0,z]);
      mesh(o,new THREE.ConeGeometry(.09,.3,4),glow(color),[0,up?.96:-.96,0]).rotation.x=up?0:Math.PI;
      for(let j=0;j<2;j++){const feather=mesh(o,new THREE.PlaneGeometry(.16,.3),glow(color,.65),[0,up?-.5:.5,0]);feather.rotation.y=j*Math.PI/2;}
      o.userData.direction=up?'up':'down';falling.push({o,origin:new THREE.Vector3(x,ground(x,z),z),vy:up?18:26});
    }
    ring(radius*.9,.12);
  }else if(kind==='sanctuary'||kind==='guard'||kind==='recall'){
    for(let i=0;i<12;i++){const a=i/12*TAU,x=Math.cos(a)*radius*.8,z=Math.sin(a)*radius*.8,o=mesh(root,new THREE.CylinderGeometry(.018,.055,2.8,6),glow(color,.35),[x,ground(x,z)+1.4,z]);dynamic.push(o);const arc=mesh(root,new THREE.TorusGeometry(.32,.018,6,24,Math.PI),glow(color,.7),[x,ground(x,z)+2.8,z]);arc.rotation.y=-a;dynamic.push(arc);}ring(radius*.8,.1);ring(radius*.88,.15);
  }else if(kind==='judgment'||kind==='shatter'||kind==='dash'||kind==='aoe'){
    if(kind==='judgment')for(let i=0;i<8;i++){const a=i/8*TAU,x=Math.cos(a)*radius*.55,z=Math.sin(a)*radius*.55,o=mesh(root,new THREE.CylinderGeometry(.04,.18,9,8),glow(color,.6),[x,ground(x,z)+4.5,z]);dynamic.push(o);}
    for(let i=0;i<16;i++){const a=i/16*TAU,x=Math.cos(a)*radius*.7,z=Math.sin(a)*radius*.7,o=mesh(root,weatheredRock(1),materials().rock.clone(),[x,ground(x,z),z]);o.scale.setScalar(.12+Math.random()*.18);falling.push({o,origin:o.position.clone(),vy:3+Math.random()*3});}ring(radius*.8,.1);
  }else{
    for(let i=0;i<3;i++){const r=ring(radius*(.35+i*.17),.3+i*.45);r.rotation.set(.3+i*.65,i,.4+i);}
    for(let i=0;i<12;i++){const a=i/12*TAU,o=mesh(root,new THREE.OctahedronGeometry(.13),glow(color,.85),[Math.cos(a)*radius*.6,1+Math.sin(i)*.5,Math.sin(a)*radius*.6]);shards.push({o,a});}
  }
  const allMaterials=new Set();root.traverse(o=>{if(o.material&&!o.material.isShaderMaterial)allMaterials.add(o.material);});const opacities=new Map([...allMaterials].map(m=>[m,m.opacity]));
  return {root,meteor,arrows:falling,update(age,dt,fade){
    const active=age>=delay,after=Math.max(0,age-delay);root.visible=active||!!meteor;
    dynamic.forEach(o=>{o.visible=active;});rings.forEach((o,i)=>{o.visible=active;o.scale.setScalar(1+after*(kind==='meteorZone'?1.2:.08));o.rotation.z=age*.2*(i%2?1:-1);});
    if(meteor){const t=Math.min(1,age/Math.max(.01,delay));meteor.visible=!active;meteor.position.set(12*(1-t),2+28*(1-t*t),6*(1-t));meteor.rotation.set(age*1.1,age*.9,age*.3);meteorTail.visible=!active;meteorTail.position.copy(meteor.position).add(new THREE.Vector3(1.2,3.4,.6));meteorTail.rotation.z=-.3;meteorTail.material.uniforms.uTime.value=age;}
    flames.forEach((o,i)=>{o.visible=active;o.scale.y=.8+Math.sin(age*8+i)*.22;o.material.uniforms.uTime.value=age+i;o.material.uniforms.uFade.value=fade;});
    spikes.forEach(({o,scale,i})=>{o.visible=active;o.scale.copy(scale);o.scale.y*=Math.max(0,Math.min(1,after*5-i*.008));});
    bolts.forEach((o,i)=>{o.visible=active&&after<.7;o.material.opacity=(i%2?.9:.4)*(.45+Math.abs(Math.sin(after*50+i))*.55)*fade;});
    falling.forEach(({o,origin,vy},i)=>{o.visible=active;if(kind==='arrowRain'||kind==='shadowVolley'){const t=after-i*.008;o.visible=active&&t>=0&&t<(kind==='shadowVolley'?.7:1.15);o.position.set(origin.x,origin.y+(kind==='shadowVolley'?-1+t*vy:Math.max(.96,15-t*vy)),origin.z);}else{o.position.copy(origin);o.position.y+=Math.max(0,vy*after-5*after*after);o.rotation.set(after*(i%3+1),after,after*.7);}});
    shards.forEach(({o,a},i)=>{o.position.x=Math.cos(a+age*.5)*radius*.6;o.position.z=Math.sin(a+age*.5)*radius*.6;o.position.y=1.2+Math.sin(age*2+i)*.4;o.rotation.y=age;});
    for(const mat of allMaterials){if(!bolts.some(o=>o.material===mat)){mat.transparent=true;mat.opacity=opacities.get(mat)*fade;}}
  }};
}
