import * as THREE from 'three';
import { attach as add,plate,taperedCurve,loft } from './modeling.js';
import { surfaceMaterial } from './surfaces.js';
const points=p=>p.map(v=>new THREE.Vector3(...v));
function path(parent,pts,mat,r=.025){return add(parent,taperedCurve(pts,[r,r*.85,.002],22,8),mat);}
export function feather(parent,base,tip,width,mat){const d=new THREE.Vector3(...tip).sub(new THREE.Vector3(...base)),len=d.length(),g=plate([[-width*.25,0],[-width*.55,len*.4],[-width*.22,len*.8],[0,len],[width*.27,len*.78],[width*.5,len*.35],[width*.2,0]],.012),o=add(parent,g,mat,base);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
export function wingMembrane(parent,side,mat){
 const origin=new THREE.Vector3(),tips=[[side*2.9,.8,.1],[side*2.65,.2,1.15],[side*1.95,-.05,1.9],[side*.8,-.25,1.6]],pos=[],uv=[],idx=[];
 for(let k=0;k<tips.length-1;k++)for(let j=0;j<=16;j++)for(let i=0;i<=12;i++){const u=i/12,t=j/16,edge=new THREE.Vector3(...tips[k]).lerp(new THREE.Vector3(...tips[k+1]),u);edge.multiplyScalar(.78+.22*Math.abs(u-.5)*2);const v=origin.clone().lerp(edge,t);v.y-=Math.sin(u*Math.PI)*Math.sin(t*Math.PI)*.18;pos.push(...v.toArray());uv.push((k+u)/3,t);if(j<16&&i<12){const a=k*17*13+j*13+i;idx.push(a,a+13,a+1,a+1,a+13,a+14);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(parent,g,mat);for(const tip of tips)path(parent,[[0,0,0],[tip[0]*.55,tip[1]*.7,tip[2]*.4],tip],surfaceMaterial('scaleDetail',0xb9a59c),.045);
}
export function detailCreature(g,type,def,rig,anchors){
 const dark=new THREE.MeshStandardMaterial({color:0x1b1e1b,roughness:.45}),ivory=surfaceMaterial('steel',0xd9cdb1,{metalness:.1,roughness:.6}),hide=surfaceMaterial('scaleDetail',0xdcc9bb),fur=surfaceMaterial('pelt',type==='frostwolf'?0xe5f6ff:0x9e9b8d),gold=surfaceMaterial('steel',0xd1b675),t=rig.torso;
 const local=(bone,p)=>new THREE.Vector3(...p).sub(new THREE.Vector3(...anchors[bone]));
 const quad=['wolf','boar','stag','sphinx','drake'].includes(def.shape),stone=def.shape==='golem';
 // An almond eye is inset in a slanted orbital plate, with an actual slit pupil.
 const eye=(parent,p,side,size=.1,color=0xffc36a)=>{const rim=add(parent,plate([[-size,0],[-size*.5,size*.5],[size*.7,size*.25],[size,0],[size*.4,-size*.3],[-size*.5,-size*.2]],.012),dark,p);rim.rotation.z=-side*.2;const iris=add(rim,new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:stone?.8:.22,roughness:.16}),[0,0,-.008],[size*.45,size*.29,.018]);add(rim,new THREE.SphereGeometry(1,12,8),dark,[0,0,-.027],[size*.065,size*.25,.008]);path(parent,[[p[0]-size,p[1]+size*.3,p[2]-.018],[p[0],p[1]+size*.65,p[2]-.025],[p[0]+size,p[1]+size*.25,p[2]-.018]],stone?gold:hide,size*.12);};
 if(quad){
  const headY=def.shape==='stag'?2.38:def.shape==='boar'?1.15:def.shape==='sphinx'?1.68:1.57,headZ=def.shape==='drake'?-1.58:-1.15;
  // Remove the old spherical eye overlays; keep the sculpted skull underneath.
  for(const o of [...rig.head.children])if(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.position.y>-.1&&o.scale.y<.1)rig.head.remove(o);
  for(const side of [-1,1]){
   const p=local(g.userData.headId,[side*(def.shape==='drake'?.29:.265),headY+.07,headZ-.32]);eye(rig.head,p.toArray(),side,def.shape==='drake'?.12:.075,type==='frostwolf'?0x8adfff:0xe8b761);
   // Mouth line and paired individual teeth separate muzzle from jaw.
   const mouth=local(g.userData.headId,[0,headY-.22,headZ-.33]);path(rig.head,[[side*.09,mouth.y,mouth.z-.37],[side*.22,mouth.y-.015,mouth.z-.17],[side*.29,mouth.y+.015,mouth.z+.12]],dark,.012);
   if(def.shape!=='stag')for(let i=0;i<(def.shape==='drake'?9:5);i++){const tooth=add(rig.jaw||rig.head,new THREE.ConeGeometry(i===1?.025:.014,i===1?.14:.075,7),ivory,[side*.18,-.025,-.28+i*.065]);tooth.rotation.x=Math.PI;}
   if(def.shape==='wolf'||def.shape==='sphinx')for(let row=0;row<3;row++)for(let i=0;i<5;i++){const f=feather(t,[side*(.3+row*.055),1.4-row*.14,-.6+i*.11],[side*(.57+row*.03),1.25-row*.17,-.42+i*.11],.1,fur);f.rotation.z=side*.12;}
  }
 }
 if(def.shape==='drake'){
  rig.wings.forEach((wing,i)=>{for(const child of [...wing.children])if(child.isMesh)wing.remove(child);wingMembrane(wing,i?1:-1,surfaceMaterial('scaleDetail',0xbda69b,{side:THREE.DoubleSide,roughness:.7}));});
  for(let i=0;i<11;i++){const spike=add(t,plate([[-.1,0],[0,.24+(i%3)*.08],[.11,0]],.04),hide,[0,1.69-i*.012,-.6+i*.22]);spike.rotation.y=Math.PI/2;}
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<7;i++){const s=add(t,plate([[-.09,0],[0,.065],[.09,0],[0,-.13]],.013),hide,[side*(.38+row*.09),1.45-row*.16,-.55+i*.25]);s.rotation.y=side*Math.PI*.38;s.rotation.z=side*.3;}
  for(const side of [-1,1])path(rig.head,[[side*.25,.34,.1],[side*.48,.55,.34],[side*.58,.65,.65]],ivory,.09);
 }
 if(stone){
  const rock=surfaceMaterial('rock',type==='guardian'?0xadd4e5:type==='ancient'?0x8e8070:0x9eada5,{roughness:.96});
  for(const side of [-1,1]){
   eye(rig.head,[side*.22,.36,-.445],side,.14,type==='ancient'?0xffc57b:0x92deff);
   for(let row=0;row<3;row++){const slab=add(t,plate([[-.28,.19],[.2,.24],[.35,-.04],[.17,-.26],[-.32,-.17]],.09),rock,[side*(.54+row*.11),2.5-row*.31,-.44]);slab.rotation.y=side*.35;}
   for(const arm of rig.arms.filter((_,i)=>i===(side<0?0:1)))for(let i=0;i<4;i++)add(arm,plate([[-.25,.16],[.22,.19],[.29,-.1],[-.23,-.2]],.09),rock,[side*.13,-.4-i*.27,-.32]);
  }
  for(let i=0;i<4;i++)add(t,plate([[-.43,.14],[.42,.1],[.35,-.14],[-.4,-.18]],.09),rock,[0,2.24-i*.32,-.53]);
  if(type==='guardian')for(let i=0;i<5;i++){const o=add(rig.head,new THREE.OctahedronGeometry(.13),surfaceMaterial('steel',0xbbe6f5),[(i-2)*.18,.8+(2-Math.abs(i-2))*.09,0]);o.scale.y=2.4;}
 }
 if(type==='slime'){
  const core=add(t,new THREE.IcosahedronGeometry(.28,2),new THREE.MeshStandardMaterial({color:0xb1de75,emissive:0x688f46,emissiveIntensity:.6}),[0,.73,0]);
  for(let i=0;i<10;i++){const a=i*2.4;feather(t,[Math.sin(a)*.55,1.16,Math.cos(a)*.5],[Math.sin(a)*.85,1.48+(i%2)*.12,Math.cos(a)*.65],.12,surfaceMaterial('cloth',0x627c45));}
 }
 if(type==='spirit')for(let i=0;i<8;i++){const a=i*.78;path(t,[[Math.sin(a)*.2,2.1,Math.cos(a)*.2],[Math.sin(a)*.4,2.4,Math.cos(a)*.4],[Math.sin(a)*.25,2.65,Math.cos(a)*.25]],surfaceMaterial('membrane',0xb8e3ec),.035);}
 if(type==='boar')for(let i=0;i<12;i++)add(t,plate([[-.035,0],[.015,.34],[.07,.08]],.024),dark,[0,1.61,-.7+i*.14]);
 if(type==='windstag'){for(const leg of rig.legs){add(leg,new THREE.BoxGeometry(.12,.11,.24),dark,[0,-.86,-.07]);path(leg,[[0,-.78,-.2],[0,-.9,-.2]],ivory,.009);}add(rig.head,new THREE.OctahedronGeometry(.08),gold,[0,.29,-.3]);}
 if(type==='cloudray')for(let row=0;row<4;row++)for(const side of [-1,1])add(t,new THREE.SphereGeometry(.055,10,8),gold,[side*(.4+row*.3),1.32-row*.025,-.3+row*.18]);
 if(def.shape==='roc'||def.shape==='sphinx'){
  rig.wings.forEach((wing,i)=>{const side=i?1:-1;for(let row=0;row<3;row++)for(let f=0;f<9;f++){const x=.25+f*.2;feather(wing,[side*x,.04+row*.04,row*.12],[side*(x+.5),.22,1.0+row*.35-f*.035],.15-row*.025,surfaceMaterial('feather',type==='moonsphinx'?0xd5c8e6:0xc3d8eb));}});
  if(def.shape==='roc'){add(rig.head,plate([[-.09,.04],[.03,.13],[.37,.025],[.16,-.17],[.09,-.02],[-.08,-.06]],.11),ivory,[-.05,0,-.27]).rotation.y=Math.PI/2;for(const side of [-1,1])eye(rig.head,[side*.22,.085,-.24],side,.09,0xa9ddf1);for(let i=0;i<6;i++)feather(rig.head,[(i-2.5)*.04,.18,.08],[(i-2.5)*.12,.58,.24],.055,gold);}
 }
 if(type==='moonsphinx'){for(let i=0;i<16;i++){const a=i/16*Math.PI*2;feather(t,[Math.sin(a)*.38,1.55+Math.cos(a)*.32,-.55],[Math.sin(a)*.66,1.35+Math.cos(a)*.56,-.5],.14,gold);}const crown=add(rig.head,new THREE.TorusGeometry(.21,.028,8,32,Math.PI*1.5),gold,[0,.4,0]);crown.rotation.z=-.7;}
 if(def.shape==='mantis'||def.shape==='arachnid'){
  for(let i=0;i<5;i++){const armor=add(t,loft([[0,.04,0,.34+i*.02,.3],[0,-.03,0,.38+i*.02,.31],[0,-.08,0,.3+i*.02,.27]],20),surfaceMaterial('chitin',type==='emberarachnid'?0xa77a62:0xbbc5a0),[0,1.36,-.25+i*.24]);armor.rotation.x=Math.PI/2;}
  if(def.shape==='mantis')add(rig.head,plate([[-.39,.15],[.39,.15],[.19,-.16],[0,-.23],[-.19,-.16]],.06),surfaceMaterial('chitin',0xc1c7a3),[0,0,-.23]);
  const count=def.shape==='arachnid'?6:2;for(let i=0;i<count;i++)eye(rig.head,[(i-(count-1)/2)*(count===2?.46:.11),.04+Math.abs(i-(count-1)/2)*.025,count===2?-.31:-.24],i%2?1:-1,count===2?.115:.07,def.shape==='arachnid'?0xff7549:0xc6dc7e);
 }
 g.userData.designVersion=6;g.userData.designFeatures={orbitalLids:true,layeredSurface:true,anatomy:def.shape};
}
