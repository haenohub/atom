import * as THREE from 'three';
import { materials, weatheredRock, canvasTexture } from './art.js';
import { surfaceMaterial, surfaceMap } from './surfaces.js';
import { MONSTERS } from './data.js';
const sphere=new THREE.SphereGeometry(1,16,12),stone=weatheredRock(2),cone=new THREE.ConeGeometry(1,1,12),capsule=new THREE.CapsuleGeometry(.11,.55,4,8);
const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function part(parent,geo,mat,pos,scale=[1,1,1]){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function joint(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function bind(g){g.traverse(o=>{o.userData.restPosition=o.position.clone();o.userData.restRotation=o.rotation.clone();o.userData.restScale=o.scale.clone();});}
function reset(g){g.traverse(o=>{if(o.userData.restPosition){o.position.copy(o.userData.restPosition);o.rotation.copy(o.userData.restRotation);o.scale.copy(o.userData.restScale);}});}
let furMap;
function furTexture(){
  if(!furMap)furMap=canvasTexture(256,ctx=>{ctx.fillStyle='#d6d4ca';ctx.fillRect(0,0,256,256);for(let i=0;i<1800;i++){const x=(i*73.17)%256,y=(i*37.13)%256;ctx.strokeStyle=i%3?'#8a8b7d35':'#fff9df77';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+2,y+5,x+Math.sin(i)*3,y+9+i%7);ctx.stroke();}},true);
  return furMap;
}
export function createMonster(type){
  const def=MONSTERS[type],g=new THREE.Group(),torso=joint(g,0,0,0),rig={torso,legs:[],arms:[],wings:[]},m=materials();g.userData.rig=rig;
  const body=standard(def.color,{map:['wolf','boar'].includes(def.shape)?surfaceMap('fur'):(def.shape==='golem'?m.rock:m.leather).map,normalMap:(def.shape==='golem'?m.rock:m.leather).normalMap,normalScale:new THREE.Vector2(.65,.65)}),dark=standard(0x292a25),ivory=standard(0xd9d0ae),eyes=standard(def.boss?0xffba63:0xc5ad72,{emissive:def.boss?0xff9d32:0xa18d44,emissiveIntensity:.6});
  if(def.shape==='slime'){
    const jelly=new THREE.MeshPhysicalMaterial({color:def.color,roughness:.19,transparent:true,opacity:.84,clearcoat:1,transmission:.08});
    part(torso,sphere,jelly,[0,.78,0],[1.1,.8,1.1]);
    for(const x of [-.34,.34]){part(torso,sphere,dark,[x,1,-.88],[.1,.15,.08]);part(torso,sphere,ivory,[x-.02,1.05,-.94],[.025,.035,.015]);}
    for(let i=0;i<5;i++)part(torso,sphere,standard(0xc2d887,{transparent:true,opacity:.45}),[Math.sin(i*2)*.5,.5+i*.1,Math.cos(i*2)*.5],[.09,.12,.1]);
  }else if(['wolf','boar','drake'].includes(def.shape)){
    const dragon=def.shape==='drake';part(torso,sphere,body,[0,1.08,0],dragon?[.85,.73,1.6]:[.62,.62,1.13]);
    const neck=joint(torso,0,1.4,-.8),head=joint(neck,0,0,0);rig.head=head;
    part(head,sphere,body,[0,.1,-.25],[.46,.48,.65]);part(head,sphere,dark,[0,-.13,-.79],[.28,.21,.38]);
    const jaw=joint(head,0,-.2,-.42);rig.jaw=jaw;part(jaw,sphere,body,[0,-.02,-.25],[.29,.1,.48]);
    for(const x of [-1,1]){
      part(head,cone,body,[x*.32,.6,-.12],[.18,.48,.2]).rotation.z=x*-.25;
      part(head,sphere,eyes,[x*.32,.24,-.66],[.065,.065,.045]);
      for(const z of [-.65,.72]){const leg=joint(torso,x*.42,1.02,z);part(leg,capsule,body,[0,-.4,0]);part(leg,sphere,dark,[0,-.86,-.08],[.15,.11,.23]);rig.legs.push(leg);}
      for(const z of [-.85,-.63])part(jaw,cone,ivory,[x*.2,-.02,z+.42],[.035,.15,.035]);
      if(def.shape==='boar')part(head,cone,ivory,[x*.32,-.14,-.87],[.085,.52,.085]).rotation.x=-.5;
      if(dragon){
        const wing=joint(torso,x*.65,1.5,.1),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,x*2.8,1.25,.15,x*2,.15,1.6,x*2,.15,1.6,0,0,0,x*.8,-.2,1.85],3));geo.computeVertexNormals();
        part(wing,geo,standard(0x80664e,{side:THREE.DoubleSide}),[0,0,0]);
        const bone=part(wing,new THREE.CylinderGeometry(.035,.065,3,6),body,[x*1.3,.6,.1]);bone.rotation.z=-x*1.15;rig.wings.push(wing);
      }
    }
    const tail=joint(torso,0,1.05,1.04);part(tail,cone,body,[0,.03,.6],[.22,1.45,.22]).rotation.x=Math.PI/2;rig.tail=tail;
    if(dragon)for(let i=0;i<6;i++)part(torso,cone,ivory,[0,1.8-i*.025,-.6+i*.37],[.15,.35,.13]);
    else for(let i=0;i<6;i++)part(torso,cone,body,[0,1.65,-.5+i*.22],[.13,.22,.15]).rotation.x=-.4;
  }else if(def.shape==='golem'){
    part(torso,stone,body,[0,1.8,0],[1,1.12,.7]);const head=joint(torso,0,2.85,0);rig.head=head;part(head,stone,body,[0,.23,0],[.58,.55,.53]);
    for(const x of [-1,1]){part(head,sphere,eyes,[x*.24,.3,-.49],[.09,.1,.04]);const arm=joint(torso,x*1.02,2.45,0);part(arm,stone,body,[x*.15,-.7,0],[.43,.95,.46]);part(arm,stone,dark,[x*.2,-1.4,-.1],[.4,.35,.38]);rig.arms.push(arm);
      const leg=joint(torso,x*.5,1,0);part(leg,stone,body,[0,-.48,0],[.37,.56,.38]);part(leg,stone,dark,[0,-.87,-.19],[.4,.2,.55]);rig.legs.push(leg);}
    part(torso,new THREE.OctahedronGeometry(.29),standard(0xbed9ab,{emissive:0xa3db9e,emissiveIntensity:1.2}),[0,1.9,-.73]);
    for(let i=0;i<4;i++)part(torso,cone,body,[(i%2?1:-1)*(1.06+(i>1?.2:0)),2.7,0],[.22,.45,.25]);
    if(def.boss)for(let i=0;i<3;i++)part(head,cone,ivory,[(i-1)*.4,1,0],[.18,.8,.18]);
  }else{
    rig.core=part(torso,new THREE.IcosahedronGeometry(.6,2),standard(def.color,{emissive:def.color,emissiveIntensity:.65,metalness:.4,roughness:.25}),[0,1.6,0]);
    rig.halo=part(torso,new THREE.TorusGeometry(.95,.045,6,32),ivory,[0,1.6,0]);rig.halo.rotation.x=1;
    rig.orbs=[];for(let i=0;i<5;i++)rig.orbs.push(part(torso,sphere,standard(def.color,{emissive:def.color,emissiveIntensity:.6,transparent:true,opacity:.65}),[Math.sin(i*1.26)*.7,.8,Math.cos(i*1.26)*.7],[.13,.18,.13]));
  }
  detailMonster(g,type,rig,body,ivory,eyes);bind(torso);g.scale.setScalar(def.scale);return g;
}
function detailMonster(g,type,r,body,ivory,eyes){
  const addDetail=(...args)=>{const o=part(...args);(g.userData.details??=[]).push(o);return o;};
  const t=r.torso,crystal=new THREE.MeshPhysicalMaterial({color:type==='guardian'?0x8fb8ef:0xa5e3ee,roughness:.12,metalness:.2,transmission:.2,clearcoat:1,emissive:0x588da7,emissiveIntensity:.25});
  const path=(parent,points,material,radius)=>addDetail(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,7,false),material,[0,0,0]);
  if(type==='slime'){
    addDetail(t,new THREE.IcosahedronGeometry(.25,2),standard(0xdae19b,{emissive:0xa5dc6b,emissiveIntensity:.8}),[0,.7,0]);
    for(let i=0;i<8;i++){const a=i*2.4;addDetail(t,cone,standard(0x526c36),[Math.sin(a)*.55,1.43+Math.sin(i)*.04,Math.cos(a)*.45],[.08,.23,.07]).rotation.z=Math.sin(a)*.5;}
    for(const x of [-.33,.22]){addDetail(t,new THREE.CylinderGeometry(.025,.04,.2,6),ivory,[x,1.62,.08]);addDetail(t,new THREE.SphereGeometry(.13,12,7,0,6.283,0,Math.PI/2),standard(0x958164),[x,1.72,.08]);}
  }
  if(['wolf','frostwolf','boar','drake'].includes(type)){
    r.legs.forEach(leg=>{for(const x of [-.08,0,.08])addDetail(leg,cone,ivory,[x,-.85,-.26],[.025,.12,.025]).rotation.x=-1.1;});
    if(r.jaw)for(const side of [-1,1])for(let i=0;i<5;i++)addDetail(r.jaw,cone,ivory,[side*.19,.07,-.12-i*.11],[.025,i===1?.19:.09,.025]).rotation.z=side*.1;
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;addDetail(t,cone,body,[Math.sin(a)*.54,1.22+Math.cos(a)*.48,-.65],[.14,.45,.13]).rotation.x=-.6;}
    if(type==='frostwolf')for(let i=0;i<9;i++){const c=addDetail(t,new THREE.OctahedronGeometry(1),crystal,[(i%2-.5)*.48,1.7,-.6+i*.17],[.12,.35+(i%3)*.12,.1]);c.rotation.z=(i%2-.5)*.8;}
    if(type==='boar'){
      addDetail(r.head,sphere,body,[0,-.03,-.9],[.37,.3,.18]);for(const side of [-1,1]){addDetail(r.head,sphere,standard(0x29251f),[side*.14,-.03,-1.06],[.055,.07,.015]);path(r.head,[[side*.28,-.2,-.7],[side*.48,-.18,-.92],[side*.5,.18,-1.05],[side*.4,.37,-1.0]],ivory,.058);}
      for(let i=0;i<13;i++)addDetail(t,cone,standard(0x40372d),[0,1.7,-.8+i*.13],[.08,.3,.08]).rotation.x=-.25;
    }
    if(type==='drake'){
      for(const side of [-1,1]){path(r.head,[[side*.3,.35,0],[side*.5,.7,.2],[side*.6,.9,.38]],ivory,.07);}
      for(let row=0;row<4;row++)for(let i=0;i<8;i++){const a=(row/3-.5)*2.1;const plate=addDetail(t,new THREE.SphereGeometry(1,8,5),surfaceMaterial('steel',0xc1885c,{metalness:.35,roughness:.55}),[Math.sin(a)*.75,1.25+Math.cos(a)*.65,-.85+i*.28],[.16,.06,.2]);plate.rotation.z=-a;}
      r.wings.forEach((wing,index)=>{const side=index===0?-1:1;for(const end of [[side*2.8,1.25,.15],[side*2,.15,1.6],[side*.8,-.2,1.85]])path(wing,[[0,0,0],[end[0]*.55,end[1]*.9,end[2]*.35],end],body,.035);});
    }
  }
  if(['golem','guardian','ancient'].includes(type)){
    const rune=standard(type==='guardian'?0x9ae5ff:0xd4b785,{emissive:type==='guardian'?0x69cfff:0xc7a674,emissiveIntensity:.85});
    for(const side of [-1,1]){
      addDetail(t,stone,body,[side*.8,2.3,.15],[.55,.48,.65]);
      path(t,[[side*.8,2.4,-.46],[side*.62,2.1,-.65],[side*.82,1.8,-.48]],rune,.025);
      path(r.head,[[side*.45,.45,-.36],[side*.3,.15,-.52],[side*.4,-.1,-.37]],rune,.018);
      if(type==='guardian')for(let i=0;i<4;i++){const c=addDetail(t,new THREE.OctahedronGeometry(1),crystal,[side*(1+i*.12),2.5+i*.03,0],[.15,.4+i*.1,.18]);c.rotation.z=-side*.5;}
      else for(let i=0;i<4;i++)addDetail(t,cone,standard(0x5e7042),[side*(.7+i*.08),2.55,-.12+i*.1],[.07,.19,.07]);
    }
    if(type==='ancient'){
      const gold=surfaceMaterial('steel',0xd4b67d);addDetail(r.head,new THREE.TorusGeometry(.64,.065,8,40),gold,[0,.25,.12]);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;addDetail(r.head,new THREE.OctahedronGeometry(.11),rune,[Math.sin(a)*.84,.25+Math.cos(a)*.84,.12]);}
      for(const y of [1.45,1.85,2.2])path(t,[[-.6,y,-.58],[0,y-.12,-.76],[.6,y,-.58]],gold,.035);
    }
  }
  if(type==='spirit'){
    for(let i=0;i<3;i++){const ribbon=addDetail(t,new THREE.TorusGeometry(.78+i*.1,.028,6,48,Math.PI*1.55),crystal,[0,1.5,0]);ribbon.rotation.set(i*.8,.4+i*.7,i);}
    for(let i=0;i<7;i++)addDetail(t,sphere,crystal,[Math.sin(i*2.4)*.65,.2+i*.15,Math.cos(i*2.4)*.65],[.06,.08,.06]);
  }
}
export function animateMonster(m,dt,time){
  const g=m.group,r=g.userData.rig;if(!r)return;
  reset(r.torso);g.rotation.x=0;g.rotation.z=0;g.scale.setScalar(m.def.scale);
  if(!m.alive){
    m.deathAge=(m.deathAge||0)+dt;const t=Math.min(1,m.deathAge/.85),sink=Math.max(0,m.deathAge-2.5)*.6;
    if(m.def.shape==='slime'){r.torso.scale.set(1+t*.45,1-t*.82,1+t*.45);}
    else if(m.def.shape==='spirit'){r.torso.scale.setScalar(Math.max(.01,1-m.deathAge/2));r.torso.rotation.y=m.deathAge*3;}
    else{g.rotation.z=m.deathSide*t*1.35;r.torso.position.y=-t*.25;for(const leg of r.legs)leg.rotation.x=.7*t;}
    g.position.y=m.deathY-sink;return;
  }
  if(m.freeze>0)return;
  const phase=time*(m.aggro?10:5)+(m.homeX||0),walk=Math.min(1,(m.moveSpeed||0)/Math.max(1,m.def.speed)),breath=Math.sin(time*2+m.homeZ);
  r.torso.position.y=breath*.025+Math.abs(Math.sin(phase))*walk*.07;
  r.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(phase+(i===0||i===3?0:Math.PI))*.62*walk;});
  r.arms.forEach((arm,i)=>{arm.rotation.x=-Math.sin(phase+i*Math.PI)*.32*walk;});
  if(r.head){r.head.rotation.x=breath*.035;r.head.rotation.y=Math.sin(time*.7)*.09*(1-walk);}
  if(r.tail){r.tail.rotation.y=Math.sin(time*4)*(.15+walk*.2);r.tail.rotation.x=walk*.13;}
  r.wings.forEach((wing,i)=>{wing.rotation.z=Math.sin(time*3)*.18*(i?1:-1);});
  if(r.core){r.core.rotation.y=time*.6;r.torso.position.y+=Math.sin(time*2+m.homeX)*.25;r.halo.rotation.z=time*.5;r.orbs.forEach((o,i)=>o.position.set(Math.sin(time+i*1.26)*.8,1+Math.sin(time*2+i)*.35,Math.cos(time+i*1.26)*.8));}
  if(m.def.shape==='slime'){const bounce=Math.sin(time*(m.aggro?5:3)+m.homeX);r.torso.scale.set(1-bounce*.09,1+bounce*.14,1-bounce*.09);r.torso.position.y+=Math.max(0,bounce)*.2;}
  if(m.attackAge!==null&&m.attackAge!==undefined){const t=m.attackAge/.85,wind=Math.sin(Math.min(1,t/.55)*Math.PI/2),strike=Math.sin(Math.max(0,Math.min(1,(t-.5)/.5))*Math.PI);
    r.torso.rotation.x=-.16*wind+.48*strike;r.torso.position.z=.18*wind-.55*strike;if(r.head)r.head.rotation.x+=.22*strike;if(r.jaw)r.jaw.rotation.x=wind*.5;
    r.arms.forEach(arm=>arm.rotation.x=-1.4*wind+2.2*strike);r.wings.forEach((wing,i)=>wing.rotation.z+=(i?1:-1)*wind*.55);
  }
  if(m.hit>0){const recoil=Math.sin(m.hit/.32*Math.PI);r.torso.rotation.x-=recoil*.24;r.torso.position.z+=recoil*.22;}
}
export function createNPC(npc){
  const g=new THREE.Group(),cloth=standard(npc.color,{normalMap:materials().leather.normalMap,normalScale:new THREE.Vector2(.3,.3)}),skin=standard(0xbca084),hair=standard(npc.id==='toren'?0x5c4738:0x574d3e),leather=materials().leather,brass=materials().brass;
  const torso=joint(g,0,1.05,0);part(torso,new THREE.CylinderGeometry(.24,.32,.7,12),cloth,[0,.07,0]);part(torso,new THREE.CylinderGeometry(.325,.325,.085,12),leather,[0,-.16,0]);part(torso,new THREE.BoxGeometry(.09,.085,.03),brass,[0,-.16,-.33]);
  const head=joint(torso,0,.64,0);part(head,sphere,skin,[0,0,0],[.18,.23,.18]);part(head,sphere,hair,[0,.1,.045],[.19,.18,.17]);
  part(head,sphere,skin,[0,-.005,-.18],[.035,.05,.05]);
  part(head,new THREE.BoxGeometry(.065,.012,.012),standard(0x7b5a49),[0,-.11,-.16]);
  for(const x of [-1,1]){part(head,sphere,standard(0x33362c),[x*.067,.035,-.163],[.018,.017,.012]);part(head,sphere,skin,[x*.18,-.01,0],[.035,.065,.035]);
    const arm=joint(torso,x*.29,.28,0);part(arm,new THREE.CapsuleGeometry(.078,.36,4,8),cloth,[x*.035,-.22,0]);part(arm,sphere,skin,[x*.045,-.53,-.015],[.07,.1,.065]);(g.userData.arms??=[]).push(arm);
    part(g,new THREE.CapsuleGeometry(.1,.52,4,8),leather,[x*.13,.49,0]);part(g,sphere,leather,[x*.13,.11,-.065],[.115,.13,.21]);}
  if(npc.id==='toren'){part(torso,new THREE.BoxGeometry(.33,.58,.05),leather,[0,-.02,-.27]);part(head,sphere,hair,[0,-.13,-.07],[.15,.13,.13]);}
  if(npc.id==='elia'){part(torso,new THREE.ConeGeometry(.4,.7,16,1,true),cloth,[0,-.44,0]);part(torso,sphere,leather,[.32,-.16,.03],[.13,.2,.17]);}
  if(npc.id==='rhea'){part(torso,new THREE.SphereGeometry(.19,12,8),materials().metal,[-.27,.3,0],[1,.5,1]);part(torso,new THREE.BoxGeometry(.065,.62,.04),leather,[.23,-.15,.2]).rotation.z=-.18;}
  const labelMap=canvasTexture(512,ctx=>{ctx.fillStyle='#e9ddba';ctx.textAlign='center';ctx.font='bold 35px sans-serif';ctx.fillText(npc.name,256,228);ctx.font='23px sans-serif';ctx.fillStyle='#d5d2be';ctx.fillText(npc.role,256,267);});
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelMap,depthTest:false,transparent:true}));label.position.y=2.38;label.scale.set(2.5,2.5,1);g.add(label);
  const markerMap=canvasTexture(128,ctx=>{ctx.fillStyle='#ffe0a1';ctx.textAlign='center';ctx.font='bold 90px serif';ctx.fillText('!',64,95);});
  const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:markerMap,depthTest:false}));marker.position.y=2.85;marker.scale.set(.5,.5,1);g.add(marker);
  g.userData.torso=torso;g.userData.head=head;g.userData.marker=marker;g.userData.label=label;return g;
}
export function setNPCMarker(npc,value){
  const sprite=npc.group.userData.marker;if(sprite.userData.value===value)return;
  sprite.userData.value=value;const map=sprite.material.map,ctx=map.image.getContext('2d');ctx.clearRect(0,0,128,128);ctx.fillStyle=value==='?'?'#b8e4bf':'#ffe0a1';ctx.textAlign='center';ctx.font='bold 90px serif';ctx.fillText(value,64,95);map.needsUpdate=true;
}
