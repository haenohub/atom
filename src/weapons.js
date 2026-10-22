import { gearVisual } from './gear-visuals.js';
import { plate,taperedCurve } from './modeling.js';
import * as THREE from 'three';
import { surfaceMaterial } from './surfaces.js';
import { materials } from './art.js';
import { warriorPose,castingPose,archeryPose } from './motion.js';
import { vfxMap } from './vfx-textures.js';
import { ITEMS } from './data.js';

export function makeArrow(color=0xbcc6b8,enchanted=false){
  const root=new THREE.Group(),m=materials();
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  const shaft=add(new THREE.CylinderGeometry(.008,.009,.82,7),m.bark.clone(),0,0,0);shaft.rotation.x=Math.PI/2;
  const tip=add(new THREE.ConeGeometry(.032,.13,4),new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.25,emissive:enchanted?color:0,emissiveIntensity:enchanted?1.8:0}),0,0,-.47);tip.rotation.x=-Math.PI/2;
  for(let i=0;i<3;i++){const vane=add(new THREE.PlaneGeometry(.065,.15),new THREE.MeshStandardMaterial({color:0xc2b8a0,side:THREE.DoubleSide,roughness:.95}),0,0,.3);vane.rotation.set(Math.PI/2,0,i*Math.PI*2/3);}
  root.userData.tip=tip;return root;
}
export function makeStormArrow(color,radius=6){
  const root=new THREE.Group(),arrow=makeArrow(color,true),wind=new THREE.Group();arrow.scale.set(2.2,2.2,1.65);root.add(arrow,wind);
  for(let i=0;i<4;i++){
    const pts=[];for(let j=0;j<=72;j++){const t=j/72,a=t*Math.PI*5+i*Math.PI/2,r=(.35+Math.sin(t*Math.PI)*.65)*radius*.72;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,(t-.5)*5));}
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),96,.035+i*.006,5,false),new THREE.MeshBasicMaterial({map:vfxMap('slash'),color,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));wind.add(mesh);
  }
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*(.28+i*.2),.025,5,56),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));ring.position.z=(i-1)*1.4;ring.rotation.x=.15*i;wind.add(ring);}
  root.userData.wind=wind;root.userData.radius=radius;return root;
}
export function animateStormArrow(root,dt){root.userData.wind.rotation.z+=dt*9;}
function hand(group,x,y,z,player,side='right'){
  const parent=group;group=new THREE.Group();group.userData.firstPersonHand=true;group.userData.hand=side;group.name=side+'-hand';parent.add(group);group.userData.equipmentId=player.equipment.gloves||null;
  const glove=gearVisual(player.equipment.gloves),leather=glove?surfaceMaterial(player.classId==='warrior'?'steel':player.classId==='mage'?'astral':'cloth',glove.color):materials().leather.clone(),skin=new THREE.MeshStandardMaterial({color:0xb58e72,roughness:.8});
  const forearm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.064,.37,12),leather);forearm.position.set(x,y-.16,z+.08);forearm.rotation.x=.45;group.add(forearm);
  const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),leather);palm.scale.set(.055,.085,.05);palm.position.set(x,y,z);group.add(palm);
  for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.052,3,6),skin);finger.position.set(x-.035+i*.023,y+.016,z-.035);finger.rotation.x=.8;group.add(finger);}
  return palm;
}
export function createWeapon(player){
  const g=new THREE.Group(),m=materials(),visual=gearVisual(player.equipment.weapon),epic=ITEMS[player.equipment.weapon]?.rarity==='epic';
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
  const wood=m.bark.clone(),steel=surfaceMaterial('steel',0xd8dce1),brass=m.brass.clone();steel.color.set(visual.color);brass.color.set(visual.accent);
  if(player.classId==='warrior'){
    const shape=new THREE.Shape();shape.moveTo(-.035,-.06);shape.lineTo(-.033*visual.width,.54*visual.length);shape.lineTo(0,.72*visual.length);shape.lineTo(.033*visual.width,.54*visual.length);shape.lineTo(.035,-.06);shape.closePath();
    add(new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,steps:1}),steel,0,0,0);
    const guard=add(new THREE.TorusGeometry(.125,.016,8,24,Math.PI),brass,0,-.07,0);guard.rotation.z=Math.PI;
    add(new THREE.CylinderGeometry(.025,.03,.21,12),m.leather.clone(),0,-.19,0);
    for(let i=0;i<8;i++)add(new THREE.TorusGeometry(.028,.004,4,12),brass,0,-.1-i*.023,0).rotation.x=Math.PI/2;
    add(new THREE.SphereGeometry(.043,12,8),brass,0,-.32,0);hand(g,0,-.21,.015,player);
    g.position.set(.36,-.39,-.73);g.rotation.set(-.1,0,-.16);
  }else if(player.classId==='ranger'){
    const points=[new THREE.Vector3(0,-.66,.05),new THREE.Vector3(.01,-.51,-.18),new THREE.Vector3(0,-.22,-.14),new THREE.Vector3(0,0,0),new THREE.Vector3(0,.22,-.14),new THREE.Vector3(-.01,.51,-.18),new THREE.Vector3(0,.66,.05)];
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,.023,8,false),bow=add(geo,wood,0,0,0);
    g.userData.bow=bow;g.userData.bowBase=Float32Array.from(geo.attributes.position.array);
    const stringGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.66,.05),new THREE.Vector3(0,0,.05),new THREE.Vector3(0,.66,.05)]);
    const string=new THREE.Line(stringGeo,new THREE.LineBasicMaterial({color:0xd5cbb2}));g.add(string);g.userData.string=string;
    add(new THREE.CylinderGeometry(.031,.031,.19,12),m.leather.clone(),0,0,0);
    for(const y of [-.58,.58])add(new THREE.TorusGeometry(.026,.005,5,12),brass,0,y,-.04).rotation.x=Math.PI/2;
    const arrow=makeArrow();arrow.position.set(0,-.02,-.32);g.add(arrow);g.userData.arrow=arrow;
    hand(g,-.005,-.05,.02,player,'left');const drawHand=new THREE.Group();hand(drawHand,0,-.02,.03,player,'right');g.add(drawHand);g.userData.drawHand=drawHand;g.userData.handedness='right';g.userData.bowHand='left';g.userData.stringHand='right';
    g.position.set(.25,-.32,-.95);g.rotation.set(.03,-.05,.13);
  }else{
    add(new THREE.CylinderGeometry(.022,.036,1.12,12,6),wood,0,-.17,0);
    for(const y of [-.35,.23,.35])add(new THREE.TorusGeometry(.03,.008,6,16),brass,0,y,0).rotation.x=Math.PI/2;
    const crown=add(new THREE.TorusGeometry(.105,.013,8,32),brass,0,.46,0);crown.rotation.y=.2;
    for(let i=0;i<3;i++){const branch=add(new THREE.CylinderGeometry(.009,.016,.2,7),brass,Math.sin(i*2.09)*.067,.39,Math.cos(i*2.09)*.067);branch.rotation.z=Math.sin(i*2.09)*-.35;}
    const gem=add(new THREE.OctahedronGeometry(.079,1),new THREE.MeshPhysicalMaterial({color:0xa6d2d1,emissive:0x699cba,emissiveIntensity:1.1,metalness:.25,roughness:.12,transmission:.15}),0,.47,0);g.userData.gem=gem;
    hand(g,0,-.2,.02,player);g.position.set(.35,-.38,-.76);g.rotation.set(-.07,0,-.13);
  }
  if(player.classId==='warrior'&&visual.style!=='traveler'){
    for(const side of [-1,1]){const guard=add(plate([[0,0],[side*.19,.05],[side*.23,.015],[side*.07,-.035]],.016),brass,0,-.07,0);guard.rotation.z=side*.1;}
    for(let i=0;i<(epic?5:3);i++)add(plate([[-.012,0],[0,.028],[.012,0],[0,-.02]],.003),brass,0,.12+i*.13,.022);
    if(epic){const gem=add(new THREE.OctahedronGeometry(.045),new THREE.MeshStandardMaterial({color:0xffae63,emissive:0xff7430,emissiveIntensity:1.2}),0,-.065,-.005);g.userData.weaponGem=gem;}
  }
  if(player.classId==='ranger'&&visual.style!=='traveler')for(const side of [-1,1]){
    const accent=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,side*.15,-.025),new THREE.Vector3(.025,side*.4,-.18),new THREE.Vector3(0,side*.62,-.01)]),24,epic?.018:.011,8),steel,0,0,0);
    if(epic)add(plate([[0,0],[.06,side*.1],[0,side*.24],[-.045,side*.11]],.01),brass,0,side*.44,-.15);
  }
  if(player.classId==='mage'&&visual.style!=='traveler'){
    g.userData.gem.scale.setScalar(epic?1.8:1.5);g.userData.gem.material.color.setHex(visual.accent);g.userData.gem.material.emissive.setHex(visual.accent);
    for(let i=0;i<(epic?3:2);i++){const orbit=add(new THREE.TorusGeometry(.13+i*.018,.008,7,40),brass,0,.47,0);orbit.rotation.set(i*.9,.4+i,.3);}
    for(const side of [-1,1])add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.03,.25,0],[side*.14,.4,0],[side*.1,.62,0]].map(p=>new THREE.Vector3(...p))),20,.014,7),steel,0,0,0);
  }
  g.userData.equipmentId=player.equipment.weapon;g.userData.visualStyle=visual.style;
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});g.userData.base=g.position.clone();g.userData.baseRotation=g.rotation.clone();return g;
}
export function animateWeapon(g,{classId,time,bob=0,swing=0,charge=0,drawing=false,arrowSkill=null,targeting=false,action=null,cast=null,blocking=false}){
  g.position.copy(g.userData.base);g.position.y+=bob*.4;
  if(classId==='ranger'){
    const pose=archeryPose(cast);if(cast?.archery){charge=pose.draw;drawing=charge>0;}
    g.rotation.copy(g.userData.baseRotation);g.position.x+=charge*.09;g.position.z-=charge*.06;g.rotation.z=.13-charge*.1;
    const mesh=g.userData.bow,p=mesh.geometry.attributes.position,base=g.userData.bowBase;
    for(let i=0;i<p.count;i++){const y=base[i*3+1];p.setXYZ(i,base[i*3],y*(1-charge*.045),base[i*3+2]+charge*.11*Math.pow(Math.abs(y)/.66,1.2));}p.needsUpdate=true;mesh.geometry.computeVertexNormals();
    const nockX=charge*.2,s=g.userData.string.geometry.attributes.position;s.setXYZ(0,0,-.66*(1-charge*.045),.05+charge*.11);s.setXYZ(1,nockX,-.02+charge*.1,.05+charge*.42);s.setXYZ(2,0,.66*(1-charge*.045),.05+charge*.11);s.needsUpdate=true;
    const arrow=g.userData.arrow;arrow.position.z=-.32+charge*.42;arrow.position.x=nockX*.5;arrow.position.y=-.02+charge*.06;arrow.rotation.x=-Math.atan2(charge*.1,.82);arrow.rotation.y=Math.atan2(nockX,.82);arrow.visible=drawing||(!cast?.archery&&!!arrowSkill);
    const mat=arrow.userData.tip.material;mat.color.setHex(arrowSkill?.color??0xbcc6b8);mat.emissive.setHex(arrowSkill?.color??0);mat.emissiveIntensity=arrowSkill?1.6:0;
    g.userData.drawHand.position.set(nockX,charge*.14-.01,.05+charge*.42);g.userData.drawHand.visible=drawing;
    if(cast?.archery){g.rotation.x+=pose.pitch;g.position.y+=pose.pitch*.12;g.position.z+=pose.recoil*.08;}
  }else if(classId==='warrior'){
    const p=warriorPose(action,blocking);g.position.add(new THREE.Vector3(p.x,p.y,p.z));g.rotation.copy(g.userData.baseRotation);g.rotation.x+=p.rx;g.rotation.y+=p.ry;g.rotation.z+=p.rz;
  }else{
    const c=castingPose(cast);g.rotation.copy(g.userData.baseRotation);g.rotation.z+=-c.sweep*.65+c.raise*.12;g.rotation.x+=-c.raise*.5+c.thrust*.9;g.rotation.y+=c.sweep*.85;const tip=g.userData.gem.position,rest=tip.clone().applyEuler(g.userData.baseRotation),turned=tip.clone().applyQuaternion(g.quaternion);g.position.add(rest.sub(turned)).add(new THREE.Vector3(c.sweep*.42,c.raise*.26-c.thrust*.1,c.raise*.06-c.thrust*.45));
    if(g.userData.gem){g.userData.gem.rotation.y=time*.6;g.userData.gem.material.emissiveIntensity=targeting?2.3:1.1;}
  }
}
