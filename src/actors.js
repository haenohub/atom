import { sculptGeometry } from './sculpt.js';
import { createAvatar } from './avatar.js';
import { createSculptMonster } from './creatures.js';
import * as THREE from 'three';
import { canvasTexture } from './art.js';
import { surfaceMaterial } from './surfaces.js';
function part(parent,geo,mat,pos,scale=[1,1,1]){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function reset(g){g.traverse(o=>{if(o.userData.restPosition){o.position.copy(o.userData.restPosition);o.rotation.copy(o.userData.restRotation);o.scale.copy(o.userData.restScale);}});}
export function createMonster(type){return createSculptMonster(type);}
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
  if(r.skin){r.skin.material.emissive.setHex(0xffd5a3);r.skin.material.emissiveIntensity=m.hit>0?Math.max(0,(m.hit-.18)/.14)*.65:0;}
  if(m.freeze>0)return;
  const phase=time*(m.aggro?10:5)+(m.homeX||0),walk=Math.min(1,(m.moveSpeed||0)/Math.max(1,m.def.speed)),breath=Math.sin(time*2+m.homeZ);
  r.torso.position.y=breath*.025+Math.abs(Math.sin(phase))*walk*.07;
  r.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(phase+(i===0||i===3?0:Math.PI))*.62*walk;});
  r.arms.forEach((arm,i)=>{arm.rotation.x=-Math.sin(phase+i*Math.PI)*.32*walk;});
  if(r.head){r.head.rotation.x=breath*.035;r.head.rotation.y=Math.sin(time*.7)*.09*(1-walk);}
  if(r.tail){r.tail.rotation.y=Math.sin(time*4)*(.15+walk*.2);r.tail.rotation.x=walk*.13;}
  r.wings.forEach((wing,i)=>{wing.rotation.z=Math.sin(time*3)*.18*(i?1:-1);});
  if(r.core){r.core.rotation.y=time*.6;r.torso.position.y+=Math.sin(time*2+m.homeX)*.25;r.halo.rotation.z=time*.5;r.orbs.forEach((o,i)=>o.position.set(Math.sin(time+i*1.26)*.8,1+Math.sin(time*2+i)*.35,Math.cos(time+i*1.26)*.8));}
  if(m.def.shape==='ray')r.torso.position.y+=Math.sin(time*2+m.homeX)*.18;
  if(m.def.shape==='slime'){const bounce=Math.sin(time*(m.aggro?5:3)+m.homeX);r.torso.scale.set(1-bounce*.09,1+bounce*.14,1-bounce*.09);r.torso.position.y+=Math.max(0,bounce)*.2;}
  if(m.attackAge!==null&&m.attackAge!==undefined){const t=m.attackAge/.85,wind=Math.sin(Math.min(1,t/.55)*Math.PI/2),strike=Math.sin(Math.max(0,Math.min(1,(t-.5)/.5))*Math.PI);
    r.torso.rotation.x=-.16*wind+.48*strike;r.torso.position.z=.18*wind-.55*strike;if(r.head)r.head.rotation.x+=.22*strike;if(r.jaw)r.jaw.rotation.x=wind*.5;
    r.arms.forEach(arm=>arm.rotation.x=-1.4*wind+2.2*strike);r.wings.forEach((wing,i)=>wing.rotation.z+=(i?1:-1)*wind*.55);
  }
  if(m.hit>0){const recoil=Math.sin(m.hit/.32*Math.PI);r.torso.rotation.x-=recoil*.24;r.torso.position.z+=recoil*.22;}
}
export function createNPC(npc){
  const classId=npc.id==='rhea'?'ranger':npc.id==='elia'?'mage':'warrior';
  const appearance=npc.id==='rhea'?{cloth:0x99b69a,hair:0x6d412c,skin:0xf2d7c4}:npc.id==='elia'?{cloth:0x9cbda8,hair:0xd5d4cb,skin:0xf8e1d3}:{cloth:0xab9279,hair:0x4a332c,skin:0xe4bc9f};
  const g=createAvatar({classId,appearance,equipment:{weapon:classId==='warrior'?'sword':classId==='ranger'?'bow':'staff',armor:`${classId}_basic_armor`,helmet:null,gloves:null,boots:`${classId}_basic_boots`}}),r=g.userData.rig,torso=r.torso,head=r.head;
  g.visible=true;r.weapon.visible=false;g.userData.arms=r.arms;
  if(npc.id==='toren'){const apron=part(torso,new THREE.PlaneGeometry(.39,.6,8,12),surfaceMaterial('cloth',0xc89b70,{side:THREE.DoubleSide}),[0,-.13,-.175]);apron.rotation.x=-.08;g.scale.set(1.13,1.03,1.08);}
  if(npc.id==='elia'){for(const side of [-1,1])part(torso,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.18,.2,-.14],[side*.12,-.02,-.18],[side*.2,-.3,-.16]].map(v=>new THREE.Vector3(...v))),16,.018,6),surfaceMaterial('cloth',0xa1c5af),[0,0,0]);}
  const hair=surfaceMaterial('pelt',appearance.hair,{roughness:.95}),ornament=surfaceMaterial('steel',0xd5bb7e);
  const strand=(points,radius)=>part(head,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,radius,8),hair,[0,0,0]);
  if(npc.id==='rhea'){
    strand([[0,.18,.08],[.08,.1,.14],[.14,-.06,.13],[.15,-.24,.07],[.14,-.37,-.04]],.035);
    for(let i=0;i<6;i++)part(head,new THREE.TorusGeometry(.035,.006,5,12),ornament,[.15,-.05-i*.045,.12-i*.025]).rotation.x=Math.PI/2;
    for(const side of [-1,1])part(head,new THREE.TorusGeometry(.024,.006,6,16),ornament,[side*.145,-.015,0]);
  }else if(npc.id==='elia'){
    for(const side of [-1,1])for(let i=0;i<3;i++)strand([[side*.1,.15,.035],[side*.15,.01,.06],[side*(.16+i*.012),-.17,.07],[side*.14,-.36,.045]],.025);
    part(head,new THREE.TorusGeometry(.143,.008,6,32),ornament,[0,.11,0]).rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*.5;part(head,new THREE.OctahedronGeometry(.016),surfaceMaterial('membrane',0xc5e4ad),[Math.sin(a)*.144,.11,-Math.cos(a)*.144]);}
    part(torso,new THREE.BoxGeometry(.1,.14,.07),surfaceMaterial('cloth',0x6f7952),[.24,-.24,-.05]);
  }else{
    part(head,sculptGeometry('toren-beard',[[0,-.07,-.075,.115,.09,.087],[0,-.14,-.055,.082,.085,.065],[-.087,-.005,-.055,.034,.08,.048],[.087,-.005,-.055,.034,.08,.048]],.012,.02),hair,[0,0,0]);
    part(torso,new THREE.BoxGeometry(.07,.3,.055),surfaceMaterial('steel',0xc7c8bd),[-.21,-.15,-.12]).rotation.z=.25;
  }
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
