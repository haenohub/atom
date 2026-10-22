import { refineCreature } from './creature-refinement.js';
import { detailCreature } from './creature-detail.js';
import { taperedCurve,plate,mergeStaticParts } from './modeling.js';
import * as THREE from 'three';
import { MONSTERS } from './data.js';
import { sculptGeometry,skinnedSurface } from './sculpt.js';
import { surfaceMaterial,sculptMaterial } from './surfaces.js';
const TAU=Math.PI*2;
function accessory(parent,geo,mat,pos){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
function ribbon(parent,points,width,mat){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),positions=[],uv=[],indices=[];for(let i=0;i<=32;i++){const t=i/32,p=curve.getPoint(t),w=width*Math.sin(Math.PI*t)**.6;for(const side of [-1,1]){positions.push(p.x+side*w,p.y,p.z);uv.push(side<0?0:1,t);}if(i<32){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return accessory(parent,g,mat,[0,0,0]);}
export function createSculptMonster(type){
  const d=MONSTERS[type],g=new THREE.Group(),torso=new THREE.Group();g.rotation.order='YXZ';g.add(torso);
  const volumes=[],anchors=[[0,0,0]],limbs=[];const v=(x,y,z,rx,ry,rz,b=0)=>volumes.push([x,y,z,rx,ry,rz,b]);
  const bone=(p)=>{anchors.push(p);return anchors.length-1;};let headId=0,tailId=0,wingIds=[],jawId=0;
  const quad=['wolf','boar','drake','stag','sphinx'].includes(d.shape),stone=d.shape==='golem',slime=d.shape==='slime',ray=d.shape==='ray',stag=d.shape==='stag',drake=d.shape==='drake',boar=d.shape==='boar';
  if(quad){
    v(0,1.08,.2,boar?.72:.54,.58,drake?1.35:.98);v(0,1.17,-.5,boar?.7:.62,boar?.75:.69,.58);v(0,1.03,.8,.44,.49,.49);
    const neckY=stag?1.85:1.42,headY=stag?2.38:boar?1.15:d.shape==='sphinx'?1.68:1.57,headZ=drake?-1.58:-1.15;
    headId=bone([0,neckY,-.7]);v(0,neckY,-.77,stag?.25:.4,stag?.63:.48,.44,headId);v(0,headY,headZ,boar?.41:.32,.35,drake?.52:.38,headId);v(0,headY-.13,headZ-.38,boar?.3:.21,.19,drake?.49:.35,headId);
    jawId=bone([0,headY-.25,headZ-.22]);v(0,headY-.26,headZ-.35,.22,.1,.37,jawId);
    for(const side of [-1,1])for(const z of [-.64,.72]){
      const hip=[side*(boar?.48:.4),1.04,z],id=bone(hip);limbs.push(id);
      v(hip[0],.88,z,.18,.4,.23,id);v(side*.42,.46,z+(z>0?.17:0),.11,.32,.15,id);v(side*.42,.15,z-.1,.15,.15,.26,id);
    }
    tailId=bone([0,1.05,.96]);v(0,1.1,1.33,.19,.2,.65,tailId);v(drake?.13:.1,1.16,drake?2.15:1.95,drake?.12:.1,.12,drake?.65:.34,tailId);
    if(!drake)for(const side of [-1,1])v(side*.24,headY+.37,headZ+.06,.1,stag?.24:.31,.12,headId);
    if(drake)for(const side of [-1,1]){const id=bone([side*.54,1.5,-.13]);wingIds.push(id);v(side*.52,1.46,-.05,.37,.3,.44,id);v(side*.85,1.66,.03,.38,.13,.28,id);}
    if(d.shape==='sphinx')for(const side of [-1,1]){const id=bone([side*.45,1.5,.05]);wingIds.push(id);v(side*.46,1.4,.1,.25,.32,.38,id);}
  }else if(['mantis','arachnid'].includes(d.shape)){
    const spider=d.shape==='arachnid';v(0,spider?1.08:1.1,.35,spider?.7:.33,spider?.5:.3,spider?.87:.72);v(0,spider?1.05:1.52,-.34,spider?.45:.22,spider?.33:.6,.37);headId=bone([0,spider?1.08:2.05,-.6]);v(0,spider?1.08:2.05,-.62,spider?.35:.34,.23,.29,headId);
    for(const side of [-1,1])for(let j=0;j<(spider?4:2);j++){const z=-.48+j*(spider?.38:.75),id=bone([side*.3,1.05,z]);limbs.push(id);}
    if(!spider)for(const side of [-1,1]){const id=bone([side*.22,1.78,-.38]);limbs.push(id);}
  }else if(d.shape==='serpent'){
    for(let i=0;i<22;i++){const t=i/21,z=1.95-t*3.1,x=Math.sin(t*Math.PI*2)*.33,y=.34+t*1.24,r=.08+Math.sin(t*Math.PI*.8)*.28;v(x,y,z,r,r,r*1.7);}
    headId=bone([-.05,1.63,-1.2]);v(-.05,1.63,-1.2,.32,.23,.4,headId);tailId=bone([0,.34,1.6]);
  }else if(d.shape==='roc'){
    v(0,1.15,0,.45,.62,.63);v(0,1.63,-.3,.25,.5,.31);headId=bone([0,2,-.55]);v(0,2,-.55,.3,.26,.32,headId);
    for(const side of [-1,1]){const leg=bone([side*.2,.91,.12]);limbs.push(leg);v(side*.2,.54,.12,.08,.4,.09,leg);const wing=bone([side*.35,1.43,.05]);wingIds.push(wing);v(side*.43,1.4,.05,.25,.27,.4,wing);}
  }else if(stone){
    v(0,1.85,0,type==='skywarden'?.7:1,1.06,.57);v(0,1.05,0,.58,.56,.44);v(0,2.54,0,1,.42,.55);headId=bone([0,2.7,0]);v(0,3.02,-.03,.46,.5,.43,headId);v(0,2.8,-.24,.37,.22,.36,headId);
    for(const side of [-1,1]){
      const arm=bone([side*.96,2.5,0]);limbs.push(arm);v(side*1.15,2.12,0,.36,.57,.4,arm);v(side*1.28,1.46,-.1,.31,.5,.36,arm);v(side*1.3,1.1,-.18,.4,.3,.43,arm);
      const leg=bone([side*.43,1.03,0]);limbs.push(leg);v(side*.43,.63,0,.28,.59,.3,leg);v(side*.43,.16,-.2,.34,.2,.5,leg);
    }
  }else if(slime){
    v(0,.65,0,1.03,.7,.94);for(let i=0;i<7;i++){const a=i/7*TAU;v(Math.sin(a)*.75,.3,Math.cos(a)*.7,.43,.32,.44);}
    v(-.18,1.1,-.1,.62,.4,.63);
  }else if(ray){
    v(0,1.1,0,.6,.25,1.2);v(0,1.15,-.8,.38,.2,.58);tailId=bone([0,1.1,.8]);v(0,1.08,1.48,.14,.11,.92,tailId);v(.07,1.04,2.35,.07,.07,.55,tailId);
    for(const side of [-1,1]){const id=bone([side*.38,1.13,0]);wingIds.push(id);v(side*.9,1.15,0,.82,.12,.82,id);v(side*1.6,1.22,.2,.6,.08,.42,id);v(side*2.03,1.3,.42,.37,.07,.2,id);}
  }else{
    v(0,1.45,0,.43,.8,.35);v(0,2.1,0,.3,.36,.28);v(0,.79,.13,.28,.5,.25);v(.1,.39,.26,.16,.4,.17);headId=bone([0,1.9,0]);
  }
  const kind=['mantis','arachnid'].includes(d.shape)?'chitin':d.shape==='roc'?'feather':d.shape==='serpent'?'scaleDetail':stone?'rock':slime||ray||d.shape==='spirit'?'membrane':drake?'scaleDetail':'pelt';
  const material=sculptMaterial(kind,stone?d.color:drake?0xe4bd9d:slime?0xc8f1a0:ray?0xb0dfe8:type==='frostwolf'?0xe5f5ff:stag?0xafdcd0:boar?0xc4a187:0xdad7cc,{roughness:slime||ray?.28:.83});
  if(slime){material.transparent=true;material.opacity=.94;}
  if(quad){for(const c of volumes){if(c[6]===headId){c[3]*=drake?.85:type==='wolf'||type==='frostwolf'?.88:1;c[4]*=drake?.8:1;}if(c[1]<.9&&c[6]>0){c[3]*=.83;c[5]*=.9;}}}
  const {mesh,bones}=skinnedSurface(torso,sculptGeometry(`creature-v6-${type}`,volumes,quad?.085:slime?.085:ray?.08:.11,stone?.09:quad?.065:.1),material,anchors);
  const rig={torso,head:bones[headId],jaw:jawId?bones[jawId]:null,tail:tailId?bones[tailId]:null,legs:[],arms:[],wings:wingIds.map(i=>bones[i]),skin:mesh};
  limbs.forEach((id,i)=>((stone&&i%2===0)||(d.shape==='mantis'&&i>=4)?rig.arms:rig.legs).push(bones[id]));
  if(['mantis','arachnid','roc'].includes(d.shape)){
    const legMat=surfaceMaterial(d.shape==='roc'?'scaleDetail':'chitin',d.shape==='arachnid'?0xae7359:0xb8c4a1);
    rig.legs.forEach((leg,i)=>{const side=anchors[limbs[i]][0]<0?-1:1,spider=d.shape==='arachnid',end=spider?side*1.55:side*.85;
      accessory(leg,taperedCurve(d.shape==='roc'?[[0,0,0],[side*.035,-.38,.13],[0,-.84,-.05]]:[[0,0,0],[side*.6,.38,0],[end,-.98,(i%2-.5)*.35]],[.09,.07,.015],20,7),legMat,[0,0,0]);
      if(d.shape==='roc')for(let j=0;j<3;j++)accessory(leg,taperedCurve([[0,-.72,0],[(j-1)*.11,-.83,-.17],[(j-1)*.14,-.91,-.28]],[.04,.025,.001],16,7),legMat,[0,0,0]);
    });
    if(d.shape==='mantis')rig.arms.forEach((arm,i)=>{const side=i?1:-1;accessory(arm,taperedCurve([[0,0,0],[side*.38,-.17,-.25],[side*.3,-.38,-.72]],[.075,.06,.03],22,8),legMat,[0,0,0]);const blade=accessory(arm,plate([[0,0],[side*.14,-.12],[side*.2,-.5],[side*.03,-.75],[-side*.04,-.52]],.045),legMat,[side*.3,-.38,-.72]);for(let j=0;j<6;j++)accessory(arm,new THREE.ConeGeometry(.025,.1,5),legMat,[side*.26,-.5-j*.065,-.73]);});
  }
  if(d.shape==='serpent')for(let i=0;i<11;i++){const t=i/10,x=Math.sin(t*Math.PI*2)*.33,y=.34+t*1.24+.25,z=1.95-t*3.1;const fin=accessory(torso,plate([[-.1,0],[0,.38],[.11,.06]],.012),surfaceMaterial('membrane',0x9fdde1,{transparent:true,opacity:.7,side:THREE.DoubleSide}),[x,y,z]);fin.rotation.y=Math.PI/2;}

  const eyeMat=new THREE.MeshStandardMaterial({color:0xe3f9df,emissive:type==='frostwolf'||ray?0x70dfff:0xe6bf75,emissiveIntensity:quad?(type==='frostwolf'||drake?.75:.18):1.8}),ivory=surfaceMaterial('steel',0xe4d7a2,{metalness:.25});
  // Actual eyes sit on the sculpted orbital ridge rather than a spherical head.
  if(quad||stone||slime||ray||d.shape==='spirit')for(const side of [-1,1]){
    const pos=quad?[side*.245,(stag?2.43:boar?1.25:1.65),drake?-1.94:-1.42]:stone?[side*.2,3.1,-.405]:ray?[side*.22,1.27,-1.02]:slime?[side*.33,.97,-.86]:[side*.13,2.12,-.24];
    const local=new THREE.Vector3(...pos).sub(new THREE.Vector3(...anchors[headId]));if(!quad){const eye=accessory(rig.head,new THREE.SphereGeometry(1,10,8),eyeMat,local.toArray());eye.scale.set(stone?.08:.055,stone?.055:.045,.035);if(quad){const pupil=accessory(rig.head,new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:0x181d1a,roughness:.25}),[local.x,local.y,local.z-.032]);pupil.scale.set(drake?.012:.022,.032,.012);}}
    if(quad&&!stag){const nose=accessory(rig.head,new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:0x24272a,roughness:.3}),[0,(boar?1.05:1.47)-anchors[headId][1],(drake?-2.26:-1.81)-anchors[headId][2]]);nose.scale.set(boar?.26:.16,.105,.11);}
    if(stag||boar||drake){const base=stag?[side*.2,2.65,-1.02]:boar?[side*.34,1.03,-1.55]:[side*.25,1.91,-1.35];const pts=[base,[base[0]*1.6,base[1]+.3,base[2]+.05],[base[0]*1.8,base[1]+.65,base[2]+.2]];accessory(torso,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),16,stag?.035:.06,7),ivory,[0,0,0]);if(stag)for(let j=0;j<3;j++){const p=pts[0];accessory(torso,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(p[0]*1.3,p[1]+j*.13,p[2]+.05),new THREE.Vector3(side*(.55+j*.08),p[1]+.36+j*.13,p[2]-.1)]),6,.02,6),ivory,[0,0,0]);}}
  }
  if(drake)rig.wings.forEach((wing,i)=>{const side=i?1:-1;const wingMat=surfaceMaterial('hide',0xc2a17a,{side:THREE.DoubleSide,roughness:.7});ribbon(wing,[[0,0,0],[side*1.1,.5,.1],[side*2.4,.8,.6],[side*1.7,.1,1.45],[side*.3,-.1,1.4]],.55,wingMat);for(const end of [[side*2.4,.8,.6],[side*1.7,.1,1.45]])accessory(wing,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(end[0]*.65,end[1]*.9,end[2]*.4),new THREE.Vector3(...end)]),14,.035,7),material,[0,0,0]);});
  if(stone){const rune=new THREE.MeshStandardMaterial({color:d.color,emissive:type==='ancient'?0xffc882:0x87e7fa,emissiveIntensity:2});for(const side of [-1,1]){accessory(torso,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.75,2.5,-.46],[side*.48,2.1,-.55],[side*.69,1.75,-.5]].map(v=>new THREE.Vector3(...v))),12,.023,6),rune,[0,0,0]);if(type!=='golem')for(let i=0;i<3;i++){const c=accessory(torso,new THREE.OctahedronGeometry(.3),ivory,[side*(.9+i*.15),2.6+i*.1,0]);c.scale.y=2;}}
    const core=accessory(torso,new THREE.OctahedronGeometry(.23,1),rune,[0,1.95,-.57]);core.rotation.z=Math.PI/4;
  }
  if(type==='ancient'){
    const gold=surfaceMaterial('steel',0xd7bc7d),crown=new THREE.CylinderGeometry(.53,.55,.24,64,2,true),p=crown.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)>0){const a=Math.atan2(p.getZ(i),p.getX(i));p.setY(i,.25+Math.pow(Math.max(0,Math.cos(a*8)),4)*.27);}crown.computeVertexNormals();accessory(rig.head,crown,gold,[0,.83,0]);
  }
  if(type==='skywarden')for(const side of [-1,1])for(let i=0;i<3;i++){
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.6,.3,side*(.85+i*.13),1+i*.12);shape.lineTo(side*(.52+i*.1),.92+i*.1);shape.quadraticCurveTo(side*.2,.35,0,0);
    const plate=accessory(torso,new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1}),surfaceMaterial('steel',0xb2d8df),[side*.5,2.05,.48+i*.12]);plate.rotation.x=-.2;
  }
  if(d.shape==='spirit'){const crescent=accessory(torso,new THREE.TorusGeometry(.44,.035,8,40,Math.PI*1.55),ivory,[0,2.3,.04]);crescent.rotation.z=-.55;for(let i=0;i<3;i++)ribbon(torso,[[0,1.5,0],[Math.sin(i*2)*.65,1.05,.3],[Math.sin(i*2)*.6,.4,.5],[0,.1,.7]],.15,material);}
  if(type==='frostwolf')for(let i=0;i<8;i++){const crystal=accessory(torso,new THREE.OctahedronGeometry(.2),ivory,[0,1.68,-.5+i*.22]);crystal.scale.set(.6,2,.8);}
  g.userData.headId=headId;detailCreature(g,type,d,rig,anchors);refineCreature(g,type,d,rig,anchors);mergeStaticParts(torso);
  torso.traverse(o=>{o.userData.restPosition=o.position.clone();o.userData.restRotation=o.rotation.clone();o.userData.restScale=o.scale.clone();});
  g.userData.rig=rig;g.userData.continuousSurface=true;g.userData.hitHeight=stone?1.8:stag||d.shape==='roc'?1.4:1.05;g.userData.hitRadius=stone?.85:ray?1:.7;g.scale.setScalar(d.scale);return g;
}
