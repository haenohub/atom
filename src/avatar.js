import { sculptGeometry } from './sculpt.js';
import * as THREE from 'three';
import { ITEMS } from './data.js';
import { createWeapon, animateWeapon } from './weapons.js';
import { surfaceMaterial } from './surfaces.js';
import { warriorPose } from './motion.js';
const basic=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function add(parent,geo,mat,xyz,scale=[1,1,1]){const o=new THREE.Mesh(geo,mat);o.position.set(...xyz);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function joint(parent,xyz){const g=new THREE.Group();g.position.set(...xyz);parent.add(g);return g;}
const ball=(g,m,p,s)=>add(g,new THREE.SphereGeometry(1,20,14),m,p,s);
function tube(g,m,points,r=.012){return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,r,6,false),m,[0,0,0]);}
export function createAvatar(p){
  const root=new THREE.Group(),hips=joint(root,[0,.93,0]),torso=joint(hips,[0,.24,0]),head=joint(torso,[0,.55,0]),epic=ITEMS[p.equipment.armor]?.rarity==='epic',warrior=p.classId==='warrior',ranger=p.classId==='ranger';
  const cloth=surfaceMaterial('cloth',p.appearance?.cloth??(warrior?0x706665:ranger?(epic?0xb3d6aa:0xa2b69b):(epic?0x8271a7:0x7892ab))),steel=surfaceMaterial('steel',epic?0xd9c69a:0xc0cdd1),trim=surfaceMaterial('steel',epic?0xd3b566:0x9f8b61,{metalness:.65,roughness:.36}),leather=basic(0x392f26),skin=surfaceMaterial('skin',p.appearance?.skin??0xf8e3d2,{roughness:.8}),hair=surfaceMaterial('pelt',p.appearance?.hair??(ranger?0x6c563f:0x393a35),{roughness:.92});
  add(torso,sculptGeometry('human-tailored-torso',[[0,.02,0,.24,.32,.145],[0,.2,0,.27,.15,.15],[0,-.23,0,.19,.18,.14]],.028,.07),cloth,[0,0,0]);ball(hips,leather,[0,-.02,0],[.24,.16,.15]);
  head.scale.setScalar(.82);const headMesh=add(head,sculptGeometry('human-anatomical-face',[[0,.075,.01,.124,.14,.12],[0,-.022,-.016,.094,.098,.1],[0,-.075,-.018,.065,.047,.07],[-.064,.018,-.062,.06,.065,.063],[.064,.018,-.062,.06,.065,.063],[0,.013,-.121,.022,.05,.038],[0,-.012,-.137,.032,.019,.027]],.009,.016),skin,[0,0,0]);ball(head,hair,[0,.12,.032],[.132,.115,.116]);
  add(head,new THREE.CylinderGeometry(.064,.075,.13,12),skin,[0,-.14,0]);ball(head,skin,[0,.015,-.124],[.022,.031,.035]);
  for(const side of [-1,1]){ball(head,skin,[side*.124,.02,0],[.022,.043,.022]);ball(head,basic(0xe0d9c8),[side*.045,.05,-.113],[.026,.011,.011]);ball(head,basic(0x293e3b),[side*.045,.05,-.123],[.009,.01,.004]);tube(head,hair,[[side*.025,.075,-.12],[side*.05,.082,-.122],[side*.07,.075,-.112]],.006);}
  add(head,new THREE.BoxGeometry(.044,.009,.008),basic(0x765648),[0,-.046,-.122]);
  const rig={hips,torso,head,arms:[],legs:[],knees:[],hands:[],headMesh};
  for(const side of [-1,1]){
    const shoulder=joint(torso,[side*.27,.18,0]),elbow=joint(shoulder,[0,-.27,0]),wrist=joint(elbow,[0,-.26,0]);
    add(shoulder,new THREE.CapsuleGeometry(.072,.16,6,10),cloth,[0,-.12,0]);add(elbow,new THREE.CapsuleGeometry(.058,.16,6,10),p.equipment.gloves?(warrior?steel:cloth):leather,[0,-.12,0]);ball(wrist,p.equipment.gloves?leather:skin,[0,-.025,0],[.052,.073,.044]);
    for(let finger=0;finger<4;finger++)add(wrist,new THREE.CapsuleGeometry(.009,.036,3,6),p.equipment.gloves?leather:skin,[-.029+finger*.019,-.075,-.025]).rotation.x=.5;
    rig.arms.push(shoulder);rig.hands.push(wrist);
    const thigh=joint(hips,[side*.115,-.1,0]),knee=joint(thigh,[0,-.38,0]);add(thigh,new THREE.CapsuleGeometry(.089,.22,6,12),cloth,[0,-.18,0]);add(knee,new THREE.CapsuleGeometry(.071,.25,6,10),leather,[0,-.18,0]);ball(knee,leather,[0,-.37,-.055],[.084,.075,.17]);rig.legs.push(thigh);rig.knees.push(knee);
    if(p.equipment.boots){add(knee,new THREE.CylinderGeometry(.084,.073,.28,12),warrior?steel:cloth,[0,-.2,-.025]);tube(knee,trim,[[-.06,-.3,-.07],[0,-.36,-.12],[.06,-.3,-.07]],.01);}
    if(p.equipment.gloves)for(let i=0;i<3;i++)add(elbow,new THREE.TorusGeometry(.062,.009,5,16),trim,[0,-.055-i*.065,0]).rotation.x=Math.PI/2;
    if(p.equipment.armor&&warrior){ball(torso,steel,[side*.27,.2,0],[.18,.1,.19]);for(let i=0;i<3;i++){const plate=ball(torso,steel,[side*(.29+i*.012),.17-i*.055,.005],[.17,.055,.185]);plate.rotation.z=-side*.15;}tube(torso,trim,[[side*.19,.16,-.12],[side*.15,.02,-.18],[side*.19,-.16,-.12]],.008);}
  }
  if(p.equipment.armor&&warrior){ball(torso,steel,[0,.005,-.025],[.255,.29,.16]);tube(torso,trim,[[-.21,.23,-.1],[0,.15,-.178],[.21,.23,-.1]],.018);for(let i=0;i<7;i++){const a=(i/6-.5)*2.6;const plate=add(hips,new THREE.BoxGeometry(.11,.22,.035),steel,[Math.sin(a)*.26,-.12,-Math.cos(a)*.16]);plate.rotation.set(.12,a,0);}}
  else if(!ranger){add(hips,new THREE.CylinderGeometry(.23,.33,.8,24,3,true),cloth,[0,-.4,0]);for(const y of [-.72,-.68])add(hips,new THREE.TorusGeometry(.32,.012,6,36),trim,[0,y,0]).rotation.x=Math.PI/2;for(const side of [-1,1])tube(torso,trim,[[side*.2,.23,-.1],[side*.12,0,-.165],[side*.16,-.27,-.14]],.012);}
  else{for(const side of [-1,1])tube(torso,trim,[[side*.18,.26,-.12],[side*.2,-.2,-.14],[side*.13,-.28,-.1]],.012);add(torso,new THREE.CylinderGeometry(.075,.085,.48,12),leather,[.15,.06,.2]).rotation.z=-.15;for(let i=0;i<6;i++){add(torso,new THREE.CylinderGeometry(.005,.005,.55,5),trim,[.12+i*.012,.3,.21]);const f=add(torso,new THREE.PlaneGeometry(.035,.1),cloth,[.12+i*.012,.53,.21]);f.rotation.y=i;}}
  add(hips,new THREE.CylinderGeometry(.255,.25,.065,24),leather,[0,.03,0]);add(hips,new THREE.BoxGeometry(.055,.06,.025),trim,[0,.03,-.172]);for(const side of [-1,1])ball(hips,leather,[side*.26,0,.025],[.065,.09,.055]);
  if(p.equipment.helmet){
    if(warrior){ball(head,steel,[0,.07,.015],[.145,.183,.14]);const face=add(head,new THREE.BoxGeometry(.22,.18,.035),steel,[0,.015,-.125]);face.rotation.x=-.08;add(head,new THREE.BoxGeometry(.16,.016,.008),leather,[0,.062,-.147]);add(head,new THREE.BoxGeometry(.012,.095,.009),leather,[0,.009,-.147]);for(const side of [-1,1])for(let i=0;i<3;i++)add(head,new THREE.BoxGeometry(.024,.006,.007),leather,[side*.065,-.015-i*.02,-.147]);if(epic)tube(head,trim,[[0,.1,-.13],[0,.3,0],[0,.16,.14]],.045);}
    else if(ranger){const hood=add(head,new THREE.SphereGeometry(.158,24,18,0,Math.PI*2,0,Math.PI*.72),cloth,[0,.045,.045]);hood.scale.set(1,1.4,1);tube(head,trim,[[-.125,-.07,-.035],[-.13,.12,-.06],[0,.23,-.06],[.13,.12,-.06],[.125,-.07,-.035]],.012);if(epic)for(const side of [-1,1])tube(head,trim,[[side*.12,.14,.02],[side*.23,.3,.03],[side*.27,.45,.03]],.015);}
    else{add(head,new THREE.CylinderGeometry(.25,.26,.035,32),cloth,[0,.19,0]);const hat=add(head,new THREE.ConeGeometry(.15,.45,24),cloth,[.025,.42,.01]);hat.rotation.z=-.18;add(head,new THREE.TorusGeometry(.15,.014,6,32),trim,[0,.21,0]).rotation.x=Math.PI/2;ball(head,trim,[0,.22,-.15],[.025,.035,.015]);}
  }
  const capeGeo=new THREE.PlaneGeometry(ranger?.53:.47,ranger?.64:.91,12,16);capeGeo.translate(0,-(ranger?.32:.455),0);const cape=add(torso,capeGeo,surfaceMaterial('cloth',cloth.color,{roughness:.95,side:THREE.DoubleSide}),[0,.18,.17]);rig.cape=cape;rig.capeBase=Float32Array.from(capeGeo.attributes.position.array);
  const held=createWeapon(p);held.traverse(o=>{if(o.userData.firstPersonHand)o.visible=false;});held.position.set(0,-.03,-.015);held.rotation.set(0,0,0);held.scale.setScalar(ranger?.9:1.05);held.userData.base=held.position.clone();held.userData.baseRotation=held.rotation.clone();rig.hands[ranger?0:1].add(held);rig.weapon=held;
  root.userData.rig=rig;root.userData.classId=p.classId;root.userData.equipment={...p.equipment};root.visible=false;return root;
}
export function animateAvatar(root,{time,moving,sprinting,jumping,climbing,action,charge,drawing,arrowSkill,swing,blocking}){
  const r=root.userData.rig,phase=time*(sprinting?12:8),walk=moving?1:0,p=warriorPose(action,blocking);r.hips.position.y=.93+(moving?Math.abs(Math.sin(phase))*.025:Math.sin(time*1.8)*.009);r.torso.rotation.set(0,p.ry*.35,0);
  r.legs.forEach((leg,i)=>{leg.rotation.x=jumping?-.3:Math.sin(phase+i*Math.PI)*.6*walk;r.knees[i].rotation.x=jumping?.65:Math.max(0,-Math.sin(phase+i*Math.PI))*.65*walk;});
  r.arms.forEach((arm,i)=>{arm.rotation.set(Math.sin(phase+(i?0:Math.PI))*.35*walk-.08,0,(i?1:-1)*.06);});
  if(climbing){r.arms.forEach((arm,i)=>arm.rotation.x=-2.5+Math.sin(phase+i*Math.PI)*.4);r.legs.forEach((leg,i)=>leg.rotation.x=-.4+Math.sin(phase+i*Math.PI)*.35);}
  else if(root.userData.classId==='warrior'){r.arms[1].rotation.x+=p.rx-1.1*Math.abs(p.rz);r.arms[1].rotation.z+=p.rz*.7;r.arms[0].rotation.x-=Math.abs(p.rz)*.3;}
  else if(root.userData.classId==='ranger'&&drawing){r.arms[0].rotation.x=-1.35;r.arms[0].rotation.y=-.15;r.arms[1].rotation.set(-1.25,.6+charge*.6,.35);}
  else if(root.userData.classId==='mage'){r.arms[1].rotation.x-=Math.sin(swing*Math.PI)*1.2;}
  if(root.userData.classId==='ranger')animateWeapon(r.weapon,{classId:'ranger',time,charge,drawing,arrowSkill});
  const pos=r.cape.geometry.attributes.position;for(let i=0;i<pos.count;i++){const y=r.capeBase[i*3+1],t=Math.abs(y);pos.setZ(i,r.capeBase[i*3+2]+Math.sin(time*3+y*6)*t*.06+(moving?.12:0)*t);}pos.needsUpdate=true;r.cape.geometry.computeVertexNormals();
}
export function disposeAvatar(root){const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.removeFromParent();}
