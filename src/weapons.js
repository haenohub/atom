import * as THREE from 'three';
import { materials } from './art.js';
import { ITEMS } from './data.js';

export function makeArrow(color=0xbcc6b8,enchanted=false){
  const root=new THREE.Group(),m=materials();
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  const shaft=add(new THREE.CylinderGeometry(.008,.009,.82,7),m.bark.clone(),0,0,0);shaft.rotation.x=Math.PI/2;
  const tip=add(new THREE.ConeGeometry(.032,.13,4),new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.25,emissive:enchanted?color:0,emissiveIntensity:enchanted?1.8:0}),0,0,-.47);tip.rotation.x=-Math.PI/2;
  for(let i=0;i<3;i++){const vane=add(new THREE.PlaneGeometry(.065,.15),new THREE.MeshStandardMaterial({color:0xc2b8a0,side:THREE.DoubleSide,roughness:.95}),0,0,.3);vane.rotation.set(Math.PI/2,0,i*Math.PI*2/3);}
  root.userData.tip=tip;return root;
}
function hand(group,x,y,z){
  const leather=materials().leather.clone(),skin=new THREE.MeshStandardMaterial({color:0xb58e72,roughness:.8});
  const forearm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.064,.37,12),leather);forearm.position.set(x,y-.16,z+.08);forearm.rotation.x=.45;group.add(forearm);
  const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),leather);palm.scale.set(.055,.085,.05);palm.position.set(x,y,z);group.add(palm);
  for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.052,3,6),skin);finger.position.set(x-.035+i*.023,y+.016,z-.035);finger.rotation.x=.8;group.add(finger);}
  return palm;
}
export function createWeapon(player){
  const g=new THREE.Group(),m=materials(),epic=ITEMS[player.equipment.weapon]?.rarity==='epic';
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
  const wood=m.bark.clone(),steel=m.metal.clone(),brass=m.brass.clone();if(epic)steel.color.set(0xd8bc86);
  if(player.classId==='warrior'){
    const shape=new THREE.Shape();shape.moveTo(-.035,-.06);shape.lineTo(-.033,.54);shape.lineTo(0,.72);shape.lineTo(.033,.54);shape.lineTo(.035,-.06);shape.closePath();
    add(new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,steps:1}),steel,0,0,0);
    const guard=add(new THREE.TorusGeometry(.125,.016,8,24,Math.PI),brass,0,-.07,0);guard.rotation.z=Math.PI;
    add(new THREE.CylinderGeometry(.025,.03,.21,12),m.leather.clone(),0,-.19,0);
    for(let i=0;i<8;i++)add(new THREE.TorusGeometry(.028,.004,4,12),brass,0,-.1-i*.023,0).rotation.x=Math.PI/2;
    add(new THREE.SphereGeometry(.043,12,8),brass,0,-.32,0);hand(g,0,-.21,.015);
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
    hand(g,-.005,-.05,.02);const drawHand=new THREE.Group();hand(drawHand,0,-.02,.03);g.add(drawHand);g.userData.drawHand=drawHand;
    g.position.set(-.3,-.28,-.72);g.rotation.set(.03,-.05,.13);
  }else{
    add(new THREE.CylinderGeometry(.022,.036,1.12,12,6),wood,0,-.17,0);
    for(const y of [-.35,.23,.35])add(new THREE.TorusGeometry(.03,.008,6,16),brass,0,y,0).rotation.x=Math.PI/2;
    const crown=add(new THREE.TorusGeometry(.105,.013,8,32),brass,0,.46,0);crown.rotation.y=.2;
    for(let i=0;i<3;i++){const branch=add(new THREE.CylinderGeometry(.009,.016,.2,7),brass,Math.sin(i*2.09)*.067,.39,Math.cos(i*2.09)*.067);branch.rotation.z=Math.sin(i*2.09)*-.35;}
    const gem=add(new THREE.OctahedronGeometry(.079,1),new THREE.MeshPhysicalMaterial({color:0xa6d2d1,emissive:0x699cba,emissiveIntensity:1.1,metalness:.25,roughness:.12,transmission:.15}),0,.47,0);g.userData.gem=gem;
    hand(g,0,-.2,.02);g.position.set(.35,-.38,-.76);g.rotation.set(-.07,0,-.13);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});g.userData.base=g.position.clone();return g;
}
export function animateWeapon(g,{classId,time,bob=0,swing=0,charge=0,drawing=false,arrowSkill=null,targeting=false}){
  g.position.copy(g.userData.base);g.position.y+=bob*.4;
  if(classId==='ranger'){
    g.position.x+=charge*.09;g.position.z-=charge*.06;g.rotation.z=.13-charge*.1;
    const mesh=g.userData.bow,p=mesh.geometry.attributes.position,base=g.userData.bowBase;
    for(let i=0;i<p.count;i++){const y=base[i*3+1];p.setXYZ(i,base[i*3],y*(1-charge*.045),base[i*3+2]+charge*.11*Math.pow(Math.abs(y)/.66,1.2));}p.needsUpdate=true;mesh.geometry.computeVertexNormals();
    const s=g.userData.string.geometry.attributes.position;s.setXYZ(0,0,-.66*(1-charge*.045),.05+charge*.11);s.setXYZ(1,0,-.02,.05+charge*.42);s.setXYZ(2,0,.66*(1-charge*.045),.05+charge*.11);s.needsUpdate=true;
    const arrow=g.userData.arrow;arrow.position.z=-.32+charge*.42;arrow.visible=drawing||!!arrowSkill;
    const mat=arrow.userData.tip.material;mat.color.setHex(arrowSkill?.color??0xbcc6b8);mat.emissive.setHex(arrowSkill?.color??0);mat.emissiveIntensity=arrowSkill?1.6:0;
    g.userData.drawHand.position.set(charge*.15,-.04,.05+charge*.42);g.userData.drawHand.visible=drawing;
  }else{
    g.rotation.z=-.13-Math.sin(swing*Math.PI)*.65;g.position.z-=Math.sin(swing*Math.PI)*.13;
    if(g.userData.gem){g.userData.gem.rotation.y=time*.6;g.userData.gem.material.emissiveIntensity=targeting?2.3:1.1;}
  }
}
