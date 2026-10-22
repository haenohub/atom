import * as THREE from 'three';
import { MONSTERS } from './data.js';
import { createSculptMonster } from './creatures.js';
import { createAvatar } from './avatar.js';
import { createDragon } from './dragon-model.js';
import { sculptGeometry,skinnedSurface } from './sculpt.js';
import { surfaceMaterial,sculptMaterial } from './surfaces.js';
import { loft,taperedCurve,plate,mergeStaticParts,attach as add } from './modeling.js';
import { anatomicalEye } from './creature-refinement.js';
function finalize(root,rig,type){const d=MONSTERS[type];root.rotation.order='YXZ';mergeStaticParts(rig.torso);rig.torso.traverse(o=>{o.userData.restPosition=o.position.clone();o.userData.restRotation=o.rotation.clone();o.userData.restScale=o.scale.clone();});root.scale.setScalar(d.scale);Object.assign(root.userData,{rig,hitHeight:type==='ghost'?1.45:type==='basilisk'?1:1.8,hitRadius:type==='basilisk'?.85:.9,designVersion:9,continuousSurface:true,design:type});return root;}
export function createAbyssMonster(type){const d=MONSTERS[type];
 if(type==='firedragon'){const g=createDragon({scale:d.scale});g.userData.design=type;return g;}
 if(type==='blackslime'||type==='darkgolem'){
  const g=createSculptMonster(type),r=g.userData.rig;r.skin.material.color.setHex(d.color);const glow=new THREE.MeshStandardMaterial({color:type==='blackslime'?0xe2ba6b:0xa374f2,emissive:type==='blackslime'?0xbc994b:0x8740cf,emissiveIntensity:1.1,roughness:.45});
  if(type==='blackslime'){r.skin.material.opacity=.85;r.skin.material.transparent=true;r.skin.material.roughness=.12;for(let j=0;j<12;j++){const a=j*2.4;add(r.torso,new THREE.IcosahedronGeometry(.05+(j%3)*.025,1),glow,[Math.sin(a)*.5,.4+(j%5)*.13,Math.cos(a)*.5]);}for(let j=0;j<4;j++)add(r.torso,taperedCurve([[-.3+j*.15,.25,-.3],[-.3+j*.15,.5,-.4],[-.28+j*.15,.6,-.25]],[.025,.018,.008],16,7),surfaceMaterial('steel',0xc0bba6));}
  else{for(const side of [-1,1])for(let j=0;j<5;j++){const p=add(r.torso,plate([[-.17,.05],[.03,.23],[.3,.03],[.21,-.4],[-.12,-.32]],.1),surfaceMaterial('rock',0x403847),[side*(.55+j*.07),2.5-j*.19,-.45]);p.rotation.y=side*.3;}for(let j=0;j<9;j++)add(r.torso,new THREE.TorusGeometry(.13,.025,6,14),surfaceMaterial('steel',0x777382),[.8+j*.05,1.95-j*.11,-.49]).rotation.y=j%2?Math.PI/2:0;add(r.torso,new THREE.OctahedronGeometry(.36,1),glow,[0,1.95,-.65]);}
  return finalize(g,r,type);
 }
 if(type==='shadowguard'){
  const g=createAvatar({classId:'warrior',appearance:{cloth:0x252735,hair:0x16151f,skin:0x777581},equipment:{weapon:'ironSword',armor:'warrior_epic_armor',helmet:'warrior_epic_helmet',gloves:'warrior_basic_gloves',boots:'warrior_basic_boots'}}),r=g.userData.rig;r.wings=[];r.skin=null;r.torso.traverse(o=>{if(o.isMesh&&o.material?.color){o.material.color.multiplyScalar(.5);}});
  const iron=surfaceMaterial('steel',0x333a48),rune=new THREE.MeshStandardMaterial({color:0xff8471,emissive:0xe73431,emissiveIntensity:1.8});add(r.arms[0],plate([[-.24,.25],[0,.36],[.24,.25],[.21,-.28],[0,-.48],[-.21,-.28]],.07),iron,[0,-.34,-.15]);for(const side of [-1,1])add(r.head,plate([[-.025,.008],[.025,.008],[.02,-.008],[-.02,-.008]],.004),rune,[side*.045,.04,-.14]);return finalize(g,r,type);
 }
 if(type==='ghost'){
  const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);const head=new THREE.Bone();head.position.set(0,1.8,0);torso.add(head);const arms=[-1,1].map(side=>{const b=new THREE.Bone();b.position.set(side*.37,1.5,0);torso.add(b);return b;});const cloth=surfaceMaterial('cloth',0x8ba5b5,{transparent:true,opacity:.64,side:THREE.DoubleSide,depthWrite:false}),robe=loft([[0,1.75,0,.28,.22],[0,1.3,0,.4,.25],[0,.65,.04,.38,.24],[0,.1,.06,.55,.37]],48),p=robe.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<.2)p.setY(i,.08+Math.pow(Math.sin(i*1.4),2)*.4);robe.computeVertexNormals();add(torso,robe,cloth);
  const hood=new THREE.SphereGeometry(.35,32,22,.3,Math.PI*1.8,0,Math.PI*.85);add(head,hood,cloth,[0,.16,.05],[1,1.3,1]);add(head,new THREE.CircleGeometry(.25,32),new THREE.MeshBasicMaterial({color:0x101c29,side:THREE.DoubleSide}),[0,.14,-.25]);for(const side of [-1,1])add(head,plate([[-.035,0],[0,.02],[.035,0],[0,-.016]],.004),new THREE.MeshStandardMaterial({color:0xbbeaff,emissive:0x7bc6ee,emissiveIntensity:2}),[side*.1,.18,-.26]);
  for(let i=0;i<2;i++){add(arms[i],loft([[0,.04,0,.105,.1],[0,-.22,0,.13,.13],[0,-.5,0,.18,.16]],20),cloth);for(let j=0;j<4;j++)add(arms[i],taperedCurve([[(j-1.5)*.045,-.48,-.04],[(j-1.5)*.05,-.68,-.09],[(j-1.5)*.04,-.77,-.16]],[.018,.014,.005],18,6),surfaceMaterial('steel',0xbbd8db,{metalness:0}));}
  add(torso,new THREE.OctahedronGeometry(.18,2),new THREE.MeshStandardMaterial({color:0xa2e9ff,emissive:0x5cbbf5,emissiveIntensity:2.5}),[0,1.4,-.2]);return finalize(g,{torso,head,arms,legs:[],wings:[],skin:null},type);
 }
 if(type==='basilisk'){
  const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);const anchors=[[0,0,0],[0,1.05,-1.1],[0,.65,1]],vol=[[0,.75,.1,.58,.42,1.05,0],[0,1.0,-.8,.38,.38,.55,1],[0,1.05,-1.4,.35,.25,.55,1],[0,.92,-1.8,.28,.13,.3,1],[0,.65,1.5,.2,.2,.8,2],[0,.6,2.3,.08,.08,.6,2]];
  for(const side of [-1,1])for(let j=0;j<3;j++){const id=anchors.length,z=-.65+j*.7;anchors.push([side*.43,.65,z]);vol.push([side*.56,.52,z,.24,.2,.23,id],[side*.83,.25,z-.1,.12,.25,.12,id],[side*.9,.09,z-.25,.19,.08,.25,id]);}
  const mat=sculptMaterial('scaleDetail',0x85a27a,{roughness:.6}),{mesh:skin,bones}=skinnedSurface(torso,sculptGeometry('basilisk-v9',vol,.075,.075),mat,anchors),rig={torso,head:bones[1],tail:bones[2],legs:bones.slice(3),arms:[],wings:[],skin};for(const side of [-1,1]){anatomicalEye(rig.head,new THREE.Vector3(side*.32,.07,-.27),new THREE.Vector3(side,.1,-.4).normalize(),{width:.1,height:.032,color:0xe7d47a,slit:true});for(let j=0;j<7;j++)add(rig.head,new THREE.ConeGeometry(.018,.14,7),surfaceMaterial('steel',0xd8d1ab),[side*.23,-.14,-.9+j*.13]);}
  for(let j=0;j<12;j++){const z=-1.0+j*.27;add(torso,plate([[-.05,0],[0,.5-(j/12)*.25],[.08,.03]],.035),surfaceMaterial('chitin',0x58755e),[0,1.14,z]);}for(const leg of rig.legs)for(let j=0;j<3;j++)add(leg,taperedCurve([[(j-1)*.06,-.5,-.17],[(j-1)*.09,-.55,-.32]],[.023,.001],12,6),surfaceMaterial('steel',0xc4c9a3));return finalize(g,rig,type);
 }
 throw Error('Unknown abyss creature '+type);
}
