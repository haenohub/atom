import * as THREE from 'three';
import { sculptGeometry } from './sculpt.js';
import { loft,taperedCurve,plate,attach as add } from './modeling.js';
const bone=(parent,p)=>{const b=new THREE.Bone();b.position.set(...p);b.rotation.order='YXZ';parent.add(b);return b;};
export function humanHand(skin,{left=false,glove=null,grip=.65}={}){
 const root=new THREE.Group(),side=left?-1:1,palm=add(root,loft([[0,.012,0,.026,.021],[side*.004,-.025,-.002,.038,.024],[side*.003,-.066,-.004,.038,.021],[0,-.084,-.005,.029,.018]],16),glove||skin),joints=[];
 for(let digit=0;digit<5;digit++){
  const thumb=digit===4,x=thumb?side*.035:(digit-1.5)*.019,y=thumb?-.035:-.075,length=thumb?.032:[.031,.038,.035,.027][digit],base=bone(root,[x,y,-.002]);base.rotation.z=thumb?-side*.8:0;base.rotation.y=thumb?side*.55:0;
  let parent=base;for(let phalanx=0;phalanx<3;phalanx++){const joint=phalanx?bone(parent,[0,-length*(phalanx===1?1:.76),0]):base;joint.rotation.x=-(thumb?.25:grip)*(phalanx?1.1:.55);const len=length*(phalanx===0?1:phalanx===1?.76:.62),r=(thumb?.011:.0085)*(1-phalanx*.12);
   add(joint,loft([[0,.002,0,r*.9,r*.85],[0,-len*.26,-.001,r,r*.88],[0,-len*.8,-.002,r*.78,r*.73],[0,-len,-.002,r*.48,r*.48]],12),glove||skin);if(phalanx===2&&!glove)add(joint,plate([[-r*.6,0],[r*.6,0],[r*.55,-len*.42],[-r*.45,-len*.47]],.001),new THREE.MeshStandardMaterial({color:0xcba998,roughness:.34}),[0,-len*.28,.006]);
   add(joint,taperedCurve([[-r*.7,-.004,.006],[0,-.006,.008],[r*.7,-.004,.006]],[.0008,.001,.0008],8,4),glove||new THREE.MeshStandardMaterial({color:0x9a7362,roughness:.9}));joints.push(joint);parent=joint;
  }
 }
 root.userData={joints,anatomicalHand:true};return root;
}
export function buildHumanAnatomy(root,r,{female,broad,skin,cloth,leather}){
 r.feet=[];r.fingers=[];for(let i=0;i<2;i++){r.feet.push(bone(r.knees[i],[0,-.38,0]));const hand=humanHand(skin,{left:i===0});r.hands[i].add(hand);r.fingers.push(...hand.userData.joints);}
 const bones=[r.hips,r.torso,r.head,...r.arms,...r.elbows,...r.hands,...r.legs,...r.knees,...r.feet],vol=[],v=(x,y,z,rx,ry,rz,b)=>vol.push([x,y,z,rx,ry,rz,b]);
 // Rib cage, clavicle, deltoids, lumbar taper and pelvis form one continuous surface.
 v(0,1.29,.008,.185*broad,.245,.118,1);v(0,1.10,0,.155*broad,.16,.105,1);v(0,.96,.012,.185*broad,.13,.126,0);
 for(const s of [-1,1]){v(s*.09*broad,1.47,-.018,.125*broad,.095,.119,1);v(s*.075*broad,1.34,-.039,.098,.13,female?.095:.083,1);v(s*.08,.94,.035,.12,.12,.12,0);}
 v(0,1.49,0,.077,.105,.069,1);v(0,1.57,.004,.058,.078,.057,2);
 for(let i=0;i<2;i++){const side=i?1:-1,arm=3+i,elbow=5+i,hand=7+i,thigh=9+i,knee=11+i,foot=13+i,x=side*.24*broad,lx=side*.108*broad;
  v(x,1.48,.002,.074,.088,.076,arm);v(x+side*.01,1.37,0,.068,.112,.064,arm);v(x,1.25,-.004,.047,.07,.048,elbow);v(x,1.17,-.002,.048,.06,.045,elbow);v(x,1.09,.002,.051,.088,.044,elbow);v(x,.97,0,.035,.079,.031,elbow);v(x,.904,0,.027,.035,.024,hand);
  v(lx,.825,.005,.094,.13,.096,thigh);v(lx,.7,0,.083,.14,.087,thigh);v(lx,.566,-.012,.06,.09,.063,thigh);v(lx,.492,-.014,.053,.063,.056,knee);v(lx,.46,-.033,.042,.045,.037,knee);v(lx,.365,.025,.062,.115,.06,knee);v(lx,.22,.014,.04,.105,.038,knee);v(lx,.116,.004,.031,.048,.035,foot);v(lx,.069,-.041,.047,.042,.094,foot);v(lx,.052,-.108,.052,.026,.057,foot);
 }
 const g=sculptGeometry('human-v9-'+(female?'female':'male')+'-'+broad,vol,.025,.047).clone(),old=g.index.array,byMat=[[],[],[]],ids=g.attributes.skinIndex,pos=g.attributes.position;
 for(let t=0;t<old.length;t+=3){const y=(pos.getY(old[t])+pos.getY(old[t+1])+pos.getY(old[t+2]))/3;const x=(pos.getX(old[t])+pos.getX(old[t+1])+pos.getX(old[t+2]))/3;const material=y>1.52&&Math.abs(x)<.10?0:y<1.06&&Math.abs(pos.getX(old[t]))<.21?2:1;byMat[material].push(old[t],old[t+1],old[t+2]);}
 g.clearGroups();let offset=0;const indices=[];byMat.forEach((a,i)=>{g.addGroup(offset,a.length,i);for(const n of a)indices.push(n);offset+=a.length;});g.setIndex(indices);g.userData.continuousSurface=true;g.userData.ownedAnatomy=true;
 const mesh=new THREE.SkinnedMesh(g,[skin,cloth,leather]);root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.name='anatomical-human-body';r.bodyMesh=mesh;r.bodyBones=bones;root.userData.anatomyVersion=9;
 return mesh;
}
export function solveLeg(forward,height,l1=.38,l2=.38){const d=THREE.MathUtils.clamp(Math.hypot(forward,height),.03,l1+l2-.002),bend=Math.PI-Math.acos(THREE.MathUtils.clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1)),hip=Math.atan2(-forward,-height)+Math.acos(THREE.MathUtils.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));return {hip,knee:-bend,ankle:bend-hip};}
export function animateHumanGait(r,{dt,time,moving,sprinting,jumping,climbing,riding=false,forward=1,strafe=0}){
 const blend=1-Math.exp(-Math.max(0,dt)*14),target=moving?1:0;r.moveBlend=dt>0?THREE.MathUtils.lerp(r.moveBlend||0,target,blend):target;const walk=r.moveBlend;r.gaitPhase=(r.gaitPhase||0)+(dt>0?dt*(sprinting?10.5:7.5)*walk:0);const phase=r.gaitPhase||time*7.5;
 r.hips.position.y=.96+Math.sin(phase*2)*.015*walk+Math.sin(time*1.6)*.002;r.hips.rotation.set(0,Math.sin(phase)*.045*walk,Math.sin(phase)*.025*walk);
 for(let i=0;i<2;i++){const p=phase+i*Math.PI,swing=Math.sin(p),lift=Math.pow(Math.max(0,Math.cos(p)),1.5)*(sprinting?.16:.10)*walk,stride=swing*(sprinting?.32:.22)*walk;
  const a=solveLeg(-stride*forward,-.745+lift);r.legs[i].rotation.set(riding?.95:jumping?.4:a.hip,0,riding?(i?.43:-.43):-stride*strafe*.75);r.knees[i].rotation.set(riding?-1.55:jumping?-1:a.knee,0,0);r.feet[i].rotation.set(riding?.4:jumping?.3:a.ankle+Math.max(0,-swing)*.12*walk,0,0);
  r.arms[i].rotation.set(Math.sin(p+Math.PI)*(sprinting?.55:.28)*walk-.03,0,(i?1:-1)*.055);r.elbows[i].rotation.set(-.14-(sprinting?.65:.13)*walk,0,0);r.hands[i].rotation.set(Math.sin(p)*.025*walk,0,0);
 }
 return {phase,walk};
}
// Two-bone arm IK puts the grip and drawing hand at anatomical targets.
export function poseArm(r,index,target,pole){const shoulder=r.arms[index],elbow=r.elbows[index],wrist=r.hands[index],start=shoulder.position,delta=target.clone().sub(start),l1=elbow.position.length(),l2=wrist.position.length(),d=THREE.MathUtils.clamp(delta.length(),.025,l1+l2-.002),axis=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=pole.clone().sub(axis.clone().multiplyScalar(pole.dot(axis))).normalize(),elbowPoint=axis.clone().multiplyScalar(along).addScaledVector(bend,height),down=new THREE.Vector3(0,-1,0);shoulder.quaternion.setFromUnitVectors(down,elbowPoint.clone().normalize());elbow.quaternion.setFromUnitVectors(down,target.clone().sub(start).sub(elbowPoint).applyQuaternion(shoulder.quaternion.clone().invert()).normalize());return shoulder.quaternion.clone().multiply(elbow.quaternion);}
