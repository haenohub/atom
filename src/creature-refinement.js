import * as THREE from 'three';
import { surfaceMaterial } from './surfaces.js';
import { attach as add,taperedCurve } from './modeling.js';
const templates=new Map();
function panel(kind){
 if(templates.has(kind))return templates.get(kind);
 const fur=kind==='fur',outline=fur?[[-.45,0],[-.6,.25],[-.3,.7],[0,1.4],[.3,.7],[.6,.25]]:[[-.5,.15],[-.3,.55],[.3,.55],[.5,.15],[.26,-.5],[-.26,-.5]],p=[0,0,.19],uv=[.5,.5],idx=[];
 for(const [x,y]of outline){p.push(x,y,0);uv.push(x+.5,y+.5);}for(let i=0;i<outline.length;i++)idx.push(0,i+1,(i+1)%outline.length+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.userData.detailTemplate=true;templates.set(kind,g);return g;
}
export function anatomicalEye(parent,position,normal,{width=.1,height=.045,color=0xe4be70,slit=false,horizontal=false}={}){
 const root=new THREE.Group();root.name='anatomical-eye';root.position.copy(position);root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.clone().normalize());root.userData.orbitalNormal=normal.toArray();root.userData.feature='inset-orbit';parent.add(root);
 const dark=new THREE.MeshStandardMaterial({color:0x171b1b,roughness:.58}),lid=new THREE.MeshStandardMaterial({color:slit?0x68564d:0x5c5750,roughness:.9}),iris=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.1,roughness:.2});
 const rim=add(root,new THREE.RingGeometry(.73,1,28),lid,[0,0,.005],[width,height,1]);
 add(root,new THREE.SphereGeometry(1,20,12),dark,[0,0,0],[width*.87,height*.83,.022]);
 add(root,new THREE.SphereGeometry(1,18,12),iris,[0,0,.018],[width*.47,height*.73,.014]);
 add(root,new THREE.SphereGeometry(1,12,8),dark,[0,0,.03],[width*(horizontal?.33:slit?.055:.18),height*(horizontal?.12:slit?.65:.4),.006]);
 const pts=[[-width,height*.25,.006],[-width*.4,height*.9,.006],[width*.5,height*.8,.006],[width,height*.1,.003]];
 add(root,taperedCurve(pts,[height*.2,height*.28,height*.12],14,6),lid);return root;
}
export function refineCreature(g,type,def,rig,anchors){
 let before=0;rig.torso.traverse(o=>{if(o.isMesh)before++;});
 const skin=rig.skin.geometry,a=skin.attributes.position,n=skin.attributes.normal,indices=skin.attributes.skinIndex,weights=skin.attributes.skinWeight;
 const bones=rig.skin.skeleton.bones,headId=g.userData.headId;
 if(def.shape==='wolf'||def.shape==='drake'){
  for(const o of [...rig.head.children])if(o.name==='legacy-eye'){rig.head.remove(o);}
  const targetY=def.shape==='drake'?1.64:1.63,targetZ=def.shape==='drake'?-1.75:-1.28;
  for(const side of [-1,1]){
   let best=-1,score=Infinity;for(let i=0;i<a.count;i++){if(a.getX(i)*side<.1)continue;const ids=[indices.getX(i),indices.getY(i),indices.getZ(i),indices.getW(i)],ws=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)];if(ids[ws.indexOf(Math.max(...ws))]!==headId)continue;const d=(a.getY(i)-targetY)**2+(a.getZ(i)-targetZ)**2+Math.abs(a.getX(i)*side-.26)*.02;if(d<score){score=d;best=i;}}
   if(best<0)throw Error('No orbital surface for '+type);
   const normal=new THREE.Vector3(n.getX(best),n.getY(best),n.getZ(best)).normalize();normal.x=side*Math.max(.55,Math.abs(normal.x));normal.y*=.25;normal.normalize();
   const pos=new THREE.Vector3(a.getX(best),a.getY(best),a.getZ(best)).addScaledVector(normal,.004).sub(new THREE.Vector3(...anchors[headId]));
   anatomicalEye(rig.head,pos,normal,{width:def.shape==='drake'?.14:.095,height:def.shape==='drake'?.047:.042,color:type==='frostwolf'?0x9ad9e5:def.shape==='drake'?0xe6aa57:0xb5a569,slit:def.shape==='drake'});
  }
 }
 const fur=['wolf','boar','stag','sphinx'].includes(def.shape),kind=fur?'fur':'scale',mat=surfaceMaterial(fur?'pelt':def.shape==='golem'?'rock':['mantis','arachnid'].includes(def.shape)?'chitin':def.shape==='roc'?'feather':['slime','spirit','ray'].includes(def.shape)?'membrane':'scaleDetail',type==='frostwolf'?0xe0eddf:def.shape==='drake'?0xb0a18a:def.shape==='golem'?0x9eaa9f:fur?0x959988:0x9bc0b0,{roughness:fur?.95:.65,side:THREE.DoubleSide});
 const baseline=before+8,count=baseline+16;let added=0;
 for(let k=0;added<count&&k<count*12;k++){
  const i=(k*1543+37)%a.count,x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(y<.22)continue;
  const ids=[indices.getX(i),indices.getY(i),indices.getZ(i),indices.getW(i)],ws=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)],bone=ids[ws.indexOf(Math.max(...ws))];
  if(bone===headId&&Math.abs(z-(def.shape==='drake'?-1.75:-1.28))<.22&&y>1.4)continue;
  const normal=new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)).normalize(),point=new THREE.Vector3(x,y,z).addScaledVector(normal,.008).sub(new THREE.Vector3(...anchors[bone]));
  const o=add(bones[bone]||rig.torso,panel(kind),mat,point.toArray()),size=(fur?.07:def.shape==='golem'?.15:.095)*(1+(k%5)*.09);o.scale.set(size,fur?size*1.65:size,size*.55);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);o.rotateZ((k%7-.5)*.15);added++;
 }
 if(added<count)throw Error('Insufficient surface detail for '+type);
 let total=0;rig.torso.traverse(o=>{if(o.isMesh)total++;});g.userData.detailCounts={baseline,added,total,ratio:total/baseline};g.userData.designVersion=8;
}
