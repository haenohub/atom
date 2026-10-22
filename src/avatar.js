import * as THREE from 'three';
import { sculptGeometry } from './sculpt.js';
import { loft,plate,taperedCurve,attach as add } from './modeling.js';
import { gearVisual } from './gear-visuals.js';
import { createWeapon,animateWeapon } from './weapons.js';
import { surfaceMaterial } from './surfaces.js';
import { warriorPose,castingPose,archeryPose } from './motion.js';
const basic=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function joint(parent,xyz){const g=new THREE.Group();g.position.set(...xyz);parent.add(g);return g;}
function tube(parent,mat,pts,r=.01){return add(parent,taperedCurve(pts,[r,r,r*.5],20,7),mat);}
function ball(parent,mat,xyz,scale){return add(parent,new THREE.SphereGeometry(1,20,14),mat,xyz,scale);}
function foldedRobe(top,bottom,length,pleats=14){const g=loft(Array.from({length:12},(_,i)=>[0,-i/11*length,0,THREE.MathUtils.lerp(top,bottom,i/11),THREE.MathUtils.lerp(top*.7,bottom*.75,i/11)]),56),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),fold=Math.cos(a*pleats)*.009*(.3+Math.abs(y)/length);p.setXYZ(i,x+Math.sin(a)*fold,y,z+Math.cos(a)*fold);}g.computeVertexNormals();return g;}
export function createAvatar(p){
 const root=new THREE.Group(),warrior=p.classId==='warrior',ranger=p.classId==='ranger',role=p.appearance?.role,female=!warrior&&!ranger||role==='rhea'||role==='elia',broad=role==='toren'?1.14:warrior?1.08:female?.9:1,hips=joint(root,[0,.96,0]),torso=joint(hips,[0,.23,0]),head=joint(torso,[0,.5,0]);
 const palette={cloth:warrior?0x553b38:ranger?0x506346:0x303d64,hair:warrior?0x392d27:ranger?0x654b36:0x352a27,...p.appearance},skin=surfaceMaterial('skin',palette.skin??0xffe7d4,{roughness:.83}),hair=surfaceMaterial('pelt',palette.hair,{roughness:.94}),cloth=surfaceMaterial('cloth',palette.cloth),leather=surfaceMaterial('cloth',0x5b4434),gold=surfaceMaterial('steel',0xc9aa70);
 const rig={hips,torso,head,arms:[],elbows:[],legs:[],knees:[],hands:[],visuals:{}};
 const tag=(parent,id,slot)=>{const g=joint(parent,[0,0,0]);g.name=`equipped:${id}`;g.userData.equipmentId=id;g.userData.slot=slot;(rig.visuals[slot]??=[]).push(g);return g;};
 const matFor=(id)=>{const v=gearVisual(id);return surfaceMaterial(v?.classId==='mage'?'astral':v?.style==='dragon'?'scaleDetail':v?.classId==='warrior'||['brigandine'].includes(v?.style)?'steel':'cloth',v?.classId==='mage'?(v.epic?0xf1dcff:0xdce8ff):(v?.color??0x90897b),{roughness:v?.classId==='warrior'?.4:.8});};
 add(torso,loft([[0,-.28,0,.17*broad,.115],[0,-.13,0,.16*broad,.12],[0,.03,0,.215*broad,female?.145:.14],[0,.17,0,.235*broad,.145],[0,.25,0,.2*broad,.11],[0,.31,0,.075,.07]]),cloth);
 add(hips,loft([[0,-.17,0,(female?.22:.205)*broad,.13],[0,-.06,0,.21*broad,.135],[0,.06,0,.17*broad,.12]]),leather);
 head.scale.setScalar(female?.81:.85);
 const face=add(head,sculptGeometry(`profile-face-${female?'f':'m'}`,[[0,.065,.004,.116,.137,.106],[0,-.031,-.019,female?.078:.093,.087,.086],[0,-.077,-.023,female?.058:.072,.035,.063],[-.064,.012,-.055,.052,.049,.053],[.064,.012,-.055,.052,.049,.053],[0,.016,-.106,.017,.043,.031],[0,-.008,-.125,.025,.016,.025]],.008,.012),skin);rig.headMesh=face;
 add(head,loft([[0,-.19,0,.06,.057],[0,-.1,0,.063,.059]]),skin);
 ball(head,hair,[0,.116,.024],[.121,.09,.107]);
 for(const side of [-1,1]){ball(head,skin,[side*.117,.015,0],[.018,.036,.02]);ball(head,basic(0xf1e8d5),[side*.043,.045,-.101],[.022,.008,.008]);ball(head,basic(female?0x507075:0x4d543d),[side*.043,.045,-.109],[.008,.008,.004]);tube(head,hair,[[side*.023,.07,-.108],[side*.047,.076,-.107],[side*.066,.067,-.096]],.006);}
 tube(head,basic(0x996451),[[-.03,-.044,-.103],[0,-.048,-.112],[.03,-.044,-.103]],.0035);
 for(let i=0;i<7;i++)tube(head,hair,[[-.1+i*.033,.16,.04],[-.1+i*.031,.185,-.015],[-.1+i*.031,.12,-.072]],.014);
 if(female&&!role)for(const side of [-1,1])for(let i=0;i<4;i++)tube(head,hair,[[side*.1,.12,.04],[side*(.13+i*.009),-.04,.05],[side*.16,-.22,.035],[side*(.13+i*.012),-.38,.05]],.022);
 if(warrior&&!role)add(head,sculptGeometry('hero-stubble',[[0,-.067,-.07,.087,.047,.06],[0,-.096,-.038,.062,.032,.05]],.01,.01),surfaceMaterial('pelt',0x55413a));
 for(const side of [-1,1]){
  const shoulder=joint(torso,[side*.24*broad,.18,0]),elbow=joint(shoulder,[0,-.28,0]),wrist=joint(elbow,[0,-.255,0]);
  add(shoulder,loft([[0,.025,0,.072,.07],[side*.012,-.07,0,.073,.069],[0,-.19,0,.052,.055],[0,-.285,0,.047,.046]]),cloth);
  add(elbow,loft([[0,.015,0,.05,.047],[0,-.09,0,.055,.048],[0,-.24,0,.035,.031]]),cloth);
  ball(wrist,skin,[0,-.025,-.004],[.042,.062,.026]);for(let f=0;f<4;f++)add(wrist,taperedCurve([[-.024+f*.016,-.05,-.008],[-.023+f*.016,-.085,-.026],[-.023+f*.016,-.08,-.045]],[.008,.007,.005],10,6),skin);ball(wrist,skin,[side*.04,-.015,-.025],[.014,.031,.015]);
  const thigh=joint(hips,[side*.108*broad,-.09,0]),knee=joint(thigh,[0,-.38,0]);
  add(thigh,loft([[0,.025,0,.092,.095],[side*.008,-.14,.005,.08,.086],[0,-.37,-.015,.055,.062]]),cloth);
  add(knee,loft([[0,.02,0,.058,.061],[0,-.14,.015,.062,.064],[0,-.38,.006,.038,.042]]),leather);ball(knee,leather,[0,-.42,-.055],[.06,.055,.135]);
  rig.arms.push(shoulder);rig.elbows.push(elbow);rig.hands.push(wrist);rig.legs.push(thigh);rig.knees.push(knee);
  if(p.equipment.gloves){const id=p.equipment.gloves,g=tag(elbow,id,'gloves'),v=gearVisual(id),mat=matFor(id);add(g,loft([[0,-.06,0,.06,.052],[0,-.14,0,.064,.057],[0,-.26,0,.041,.038]]),mat);ball(g,mat,[0,-.29,-.012],[.047,.06,.031]);for(let i=0;i<(v.epic?4:2);i++)tube(g,surfaceMaterial('steel',v.accent),[[-.047,-.1-i*.035,-.04],[0,-.12-i*.035,-.06],[.047,-.1-i*.035,-.04]],.006);if(v.epic)add(g,new THREE.OctahedronGeometry(.022),gold,[0,-.16,-.061]);}
  if(p.equipment.boots){const id=p.equipment.boots,g=tag(knee,id,'boots'),v=gearVisual(id),mat=matFor(id);add(g,loft([[0,-.06,0,.068,.068],[0,-.17,0,.071,.075],[0,-.36,0,.048,.053]]),mat);ball(g,mat,[0,-.42,-.055],[.071,.066,v.epic?.175:.145]);tube(g,surfaceMaterial('steel',v.accent),[[-.057,-.08,-.045],[0,-.06,-.079],[.057,-.08,-.045]],.008);if(v.epic)add(g,plate([[-.035,0],[0,.14],[.035,0],[0,-.08]],.012),gold,[0,-.16,-.078]);}
 }
 if(p.equipment.armor){const id=p.equipment.armor,g=tag(torso,id,'armor'),v=gearVisual(id),mat=matFor(id),metal=warrior||['brigandine','dragon'].includes(v.style),trim=surfaceMaterial('steel',v.accent);
  if(metal){add(g,loft([[0,-.25,-.006,.18*broad,.13],[0,-.08,-.012,.2*broad,.155],[0,.13,-.012,.245*broad,.17],[0,.24,0,.215*broad,.115]]),mat);for(const side of [-1,1]){for(let i=0;i<(v.epic?4:3);i++){const plateMesh=add(g,loft([[0,0,0,.16,.17],[0,-.04,0,.17,.18],[0,-.075,0,.155,.16]],24),mat,[side*(.25+i*.012)*broad,.2-i*.045,0]);plateMesh.rotation.z=-side*.2;}tube(g,trim,[[side*.2,.2,-.1],[side*.12,.09,-.18],[side*.17,-.2,-.14]],.009);}for(let i=0;i<4;i++)add(g,plate([[-.18,0],[.18,0],[.16,-.07],[-.16,-.07]],.012),mat,[0,-.13-i*.05,-.14-i*.004]);if(v.epic)add(g,plate([[-.04,0],[0,.11],[.04,0],[0,-.08]],.015),trim,[0,.04,-.19]);}
  else{add(g,loft([[0,-.25,-.004,.183*broad,.13],[0,-.08,-.006,.175*broad,.133],[0,.12,-.005,.23*broad,.155],[0,.25,0,.2*broad,.12]]),mat);for(const side of [-1,1])tube(g,trim,[[side*.18,.24,-.11],[side*.105,.02,-.163],[side*.17,-.25,-.124]],.009);if(!ranger){add(hips,foldedRobe(.21,v.epic?.35:.29,.8),mat,[0,-.08,0]);for(const side of [-1,1])tube(g,trim,[[side*.1,.14,-.15],[side*.13,-.23,-.15],[side*.22,-.87,-.2]],.007);}}
  if(v.style==='dragon')for(let row=0;row<4;row++)for(let col=0;col<6;col++)add(g,plate([[-.035,0],[0,.025],[.035,0],[0,-.055]],.008),trim,[(col-2.5)*.055,.12-row*.075,-.18]);
 }
 if(p.equipment.helmet){const id=p.equipment.helmet,g=tag(head,id,'helmet'),v=gearVisual(id),mat=matFor(id),trim=surfaceMaterial('steel',v.accent);
  if(warrior){const dome=new THREE.SphereGeometry(.137,32,20,0,Math.PI*2,0,Math.PI*.68);add(g,dome,mat,[0,.06,.024]);for(const side of [-1,1])add(g,plate([[0,.12],[side*.085,.1],[side*.075,-.065],[side*.015,-.1]],.012),mat,[side*.04,-.015,-.103]);tube(g,trim,[[-.115,.095,-.05],[0,.12,-.13],[.115,.095,-.05]],.008);if(v.epic){tube(g,trim,[[0,.1,-.1],[0,.31,.005],[0,.12,.13]],.035);for(const side of [-1,1])tube(g,trim,[[side*.1,.12,0],[side*.22,.24,.03],[side*.2,.36,.02]],.018);}}
  else if(ranger){const hood=add(g,new THREE.SphereGeometry(.148,32,22,0,Math.PI*2,0,Math.PI*.7),mat,[0,.04,.035]);hood.scale.y=1.4;tube(g,trim,[[-.115,-.075,-.04],[-.13,.1,-.065],[0,.22,-.06],[.13,.1,-.065],[.115,-.075,-.04]],.009);if(v.epic)for(const side of [-1,1])tube(g,trim,[[side*.1,.15,0],[side*.22,.29,.04],[side*.25,.4,.08]],.016);}
  else{add(g,loft([[0,.16,0,.25,.24],[.01,.185,0,.27,.25],[.02,.2,0,.25,.23]]),mat);add(g,loft([[.015,.19,0,.15,.14],[.025,.33,0,.13,.12],[.045,.48,0,.095,.085],[.11,.59,0,.046,.039],[.18,.57,0,.003,.003]]),mat);tube(g,trim,[[-.14,.21,0],[0,.21,-.144],[.14,.21,0]],.01);if(v.epic){for(let i=0;i<8;i++){const a=i*.8;add(g,new THREE.OctahedronGeometry(.012),trim,[Math.sin(a)*.12,.27+(i%3)*.07,Math.cos(a)*.12]);}}}
 }
 add(hips,loft([[0,.025,0,.22*broad,.143],[0,-.022,0,.22*broad,.143]]),leather);add(hips,plate([[-.027,.028],[.027,.028],[.027,-.028],[-.027,-.028]],.012),gold,[0,0,-.15]);
 const capeGeo=new THREE.PlaneGeometry(warrior?.63:.5,warrior?.97:.83,14,18);capeGeo.translate(0,-(warrior?.485:.415),0);const cape=add(torso,capeGeo,surfaceMaterial('cloth',warrior?0x7b2d2d:ranger?0x435b43:0x35446b,{side:THREE.DoubleSide,roughness:.93}),[0,.24,.16]);rig.cape=cape;rig.capeBase=Float32Array.from(capeGeo.attributes.position.array);
 if(ranger){const q=add(torso,loft([[0,-.25,0,.075,.06],[0,.24,0,.065,.055]]),leather,[.16,.04,.19]);q.rotation.z=-.16;for(let i=0;i<6;i++){tube(torso,gold,[[.13+i*.012,.2,.23],[.13+i*.012,.48,.23]],.004);add(torso,plate([[-.012,0],[0,.09],[.012,0]],.002),cloth,[.13+i*.012,.45,.23]);}}
 const held=createWeapon(p);held.traverse(o=>{if(o.userData.firstPersonHand)o.visible=false;});held.position.set(0,warrior?-.1:-.02,warrior?-.16:-.02);held.rotation.set(warrior?-2.1:0,0,ranger?.08:0);held.scale.setScalar(ranger?.82:1);held.userData.base=held.position.clone();held.userData.baseRotation=held.rotation.clone();rig.hands[ranger?0:1].add(held);rig.weapon=held;
 root.userData={rig,classId:p.classId,equipment:{...p.equipment},profile:{female,broad,height:1.86,headRatio:7.6}};root.visible=false;return root;
}
export function animateAvatar(root,{time,moving,sprinting,jumping,climbing,action,cast,charge=0,drawing,arrowSkill,swing=0,blocking}){
 const r=root.userData.rig,phase=time*(sprinting?12:8),walk=moving?1:0,p=warriorPose(action,blocking),c=castingPose(cast);r.hips.position.y=.96+(moving?Math.abs(Math.sin(phase))*.025:Math.sin(time*1.8)*.009);r.torso.rotation.set(p.lean,p.torso,0);
 r.legs.forEach((leg,i)=>{leg.rotation.x=jumping?-.3:Math.sin(phase+i*Math.PI)*.6*walk;r.knees[i].rotation.x=jumping?.65:Math.max(0,-Math.sin(phase+i*Math.PI))*.65*walk;});
 r.arms.forEach((arm,i)=>{arm.rotation.set(Math.sin(phase+(i?0:Math.PI))*.35*walk-.08,0,(i?1:-1)*.06);r.elbows[i].rotation.set(-.12,0,0);r.hands[i].rotation.set(0,0,0);});
 if(climbing){r.arms.forEach((arm,i)=>arm.rotation.x=2.5+Math.sin(phase+i*Math.PI)*.4);}
 else if(root.userData.classId==='warrior'){
  r.arms[1].rotation.set(.15,0,.04);if(action){const w=Math.min(1,action.age/action.impact),strike=Math.min(1,Math.max(0,(action.age-action.impact)/.12)),fade=1-Math.min(1,Math.max(0,(action.age/action.duration-.65)/.35)),side=action.combo%2?1:-1,heavy=['judgment','freeze'].includes(action.kind)||(action.kind==='basic'&&action.combo%3===2);
   if(heavy){r.arms[1].rotation.set((2.65*w-1.9*strike)*fade,.1,(.15*w-.25*strike)*fade);r.arms[0].rotation.x=(2.35*w-1.65*strike)*fade;r.elbows[1].rotation.x=(-.65*w+.55*strike)*fade;}
   else if(action.kind==='dash'){r.arms[1].rotation.set((.85*w+strike)*fade,-.3*w*fade,.15);r.elbows[1].rotation.x=(-1.4*w+1.25*strike)*fade;}
   else{r.arms[1].rotation.set((1.1*w-.2*strike)*fade,side*(.9*w-1.5*strike)*fade,side*(-.6*w+1.1*strike)*fade);r.elbows[1].rotation.x=(-.6*w+.4*strike)*fade;r.arms[0].rotation.x=.8*w*fade;}
  }if(action?.kind==='aoe')r.torso.rotation.y+=Math.sin(Math.min(1,action.age/action.duration)*Math.PI*2)*1.2;
 }
 else if(root.userData.classId==='ranger'&&(drawing||cast?.archery)){const bow=archeryPose(cast),draw=cast?.archery?bow.draw:charge;r.arms[0].rotation.set(1.48+bow.pitch,-.15,-.12);r.elbows[0].rotation.x=-.08;r.arms[1].rotation.set(1.2+bow.pitch,.65+draw*.5,.4);r.elbows[1].rotation.x=-1.4*draw;r.hands[0].rotation.x=-(r.arms[0].rotation.x+r.elbows[0].rotation.x)+bow.pitch;r.torso.rotation.y=-.13*draw;}
 else if(root.userData.classId==='mage'){r.arms[1].rotation.set(2.6*c.raise-.9*c.thrust,-.15*c.raise-c.sweep*.9,.2*c.raise+c.sweep*.35);r.elbows[1].rotation.x=-.5*c.raise;r.arms[0].rotation.x=1.3*c.spread;r.elbows[0].rotation.x=-.6*c.spread;r.torso.rotation.set(-.09*c.raise+.14*c.thrust,-c.sweep*.25,0);r.hands[1].rotation.x=-(r.arms[1].rotation.x+r.elbows[1].rotation.x)-r.torso.rotation.x;}
 else if(cast){r.arms[0].rotation.x=2.1*c.raise;r.arms[1].rotation.x=1.5*c.raise;r.torso.rotation.y=Math.sin(cast.age*5)*c.spread*.3;}
 if(root.userData.classId==='ranger'){const bow=archeryPose(cast);animateWeapon(r.weapon,{classId:'ranger',time,charge:cast?.archery?bow.draw:charge,drawing:cast?.archery?bow.draw>0:drawing,arrowSkill});}
 const pos=r.cape.geometry.attributes.position;for(let i=0;i<pos.count;i++){const y=r.capeBase[i*3+1];pos.setZ(i,r.capeBase[i*3+2]+Math.sin(time*3+y*6)*Math.abs(y)*.06+(moving?.12:0)*Math.abs(y));}pos.needsUpdate=true;r.cape.geometry.computeVertexNormals();
}
export function disposeAvatar(root){const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.continuousSurface)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.removeFromParent();}
