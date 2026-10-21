import * as THREE from 'three';
import { SKY_ISLANDS,SKY_ROPES,CLOUD_ENTRY } from './sky-layout.js';
import { heightAt } from './terrain.js';
import { materials,weatheredRock,groundMaterial,grassGeometry,leafGeometry } from './art.js';
import { surfaceMaterial } from './surfaces.js';
const vec=p=>new THREE.Vector3(...p);
export function buildFantasyWorld(world){
 const animated=[],portals=[],ropes=[],scene=world.scene,rock=materials().rock,grass=surfaceMaterial('ground',0xc3e1b0),gold=surfaceMaterial('steel',0xd2bd83),glow=c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.3,roughness:.4});
 const add=(parent,geo,mat,pos)=>{const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const path=(parent,points,mat,r)=>add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vec)),32,r,8),mat,[0,0,0]);
 const anchor=(x,z)=>{const g=new THREE.Group();g.position.set(x,heightAt(x,z),z);scene.add(g);return g;};
 const portal=(x,y,z,id,name)=>{const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);const ring=add(g,new THREE.TorusGeometry(1.8,.12,10,64),gold,[0,2,0]),disk=add(g,new THREE.CircleGeometry(1.66,48),new THREE.MeshBasicMaterial({color:0x80d8f3,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}),[0,2,0]);animated.push({o:ring,kind:'portal'});portals.push({id,name,x,z,group:g,type:'portal',description:id==='cloud-gate'?'E · 구름 정원으로 이동 · 점프와 줄타기':'E · 새벽 야영지로 돌아가기'});for(const side of [-1,1])add(g,new THREE.CylinderGeometry(.18,.32,2,10),rock,[side*2,1,0]);};
 portal(CLOUD_ENTRY.x,heightAt(CLOUD_ENTRY.x,CLOUD_ENTRY.z),CLOUD_ENTRY.z,'cloud-gate','구름 정원의 문');
 for(const p of SKY_ISLANDS){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);scene.add(g);
   // A bespoke radial mesh shares the exact flat walkable disk with physics.
   const pos=[0,0,0],uv=[.5,.5],index=[];for(let i=0;i<=72;i++){const a=i/72*Math.PI*2;pos.push(Math.cos(a)*p.r,0,Math.sin(a)*p.r);uv.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);if(i<72)index.push(0,i+2,i+1);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(Array(pos.length).fill(1),3));geo.setIndex(index);geo.computeVertexNormals();add(g,geo,groundMaterial(),[0,0,0]);
   const blades=new THREE.InstancedMesh(grassGeometry(),materials().grass,Math.min(300,Math.floor(p.r*p.r*5))),dummy=new THREE.Object3D();for(let i=0;i<blades.count;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/blades.count)*(p.r-.5);dummy.position.set(Math.sin(a)*r,.03,Math.cos(a)*r);dummy.rotation.y=i*1.73;dummy.scale.set(.35,.25+(i%7)*.025,.35);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);}g.add(blades);
   const shape=new THREE.ConeGeometry(p.r,p.r*1.7,24,6);const a=shape.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);a.setXYZ(i,x*(1+Math.sin(y*2+z)*.055),y,z*(1+Math.cos(y*3+x)*.055));}shape.computeVertexNormals();const base=add(g,shape,rock,[0,-p.r*.85-.06,0]);base.rotation.z=Math.PI;
   for(let i=0;i<12;i++){const a=i*2.4,r=p.r*(.45+(i%4)*.1),stem=path(g,[[Math.sin(a)*r,0,Math.cos(a)*r],[Math.sin(a)*r,.45,Math.cos(a)*r]],surfaceMaterial('cloth',0xa6ba84),.025);const flower=add(g,new THREE.SphereGeometry(.14,12,8),surfaceMaterial('cloth',i%2?0xbacde5:0xe8b6cf,{roughness:.7}),[stem.geometry.attributes.position.getX(0),.47,Math.cos(a)*r]);flower.scale.set(1,.38,1);for(let petal=0;petal<5;petal++){const a=petal/5*Math.PI*2,o=add(flower,new THREE.SphereGeometry(.10,8,6),flower.material,[Math.cos(a)*.13,.01,Math.sin(a)*.13]);o.scale.set(.8,.4,.8);}animated.push({o:flower,kind:'flower'});}
   // Stone rim and bells make the edge legible against the clouds.
   const rim=add(g,new THREE.TorusGeometry(p.r,.1,7,72),gold,[0,-.08,0]);rim.rotation.x=Math.PI/2;
 }
 portal(148,66,181,'camp-gate','새벽 야영지 귀환문');
 for(const def of SKY_ROPES){const g=new THREE.Group();scene.add(g);g.position.set(def.x,def.bottom,def.z);const len=def.top-def.bottom;
   for(const side of [-1,1])path(g,[[side*.28,0,0],[side*.28,len,0]],materials().leather,.035);
   for(let y=.15;y<len;y+=.4)add(g,new THREE.CylinderGeometry(.033,.033,.65,8),materials().bark,[0,y,0]).rotation.z=Math.PI/2;
   add(g,new THREE.TorusGeometry(.45,.055,7,24),gold,[0,len+.3,0]);ropes.push({...def,group:g,type:'rope',name:'바람의 등반줄',description:'E 매달리기 · W/S 오르내리기 · Space 뛰어내리기'});
 }
 // Each original biome has its own deliberately different fantasy landmark.
 let g=anchor(-22,14);for(const side of [-1,1])path(g,[[side*5,0,0],[side*4,3,0],[side*2,5,-1],[0,5.4,-1]],materials().bark,.5);for(let i=0;i<18;i++){const a=i*2.4;const o=add(g,new THREE.IcosahedronGeometry(.07),glow(0x83dfcb),[Math.sin(a)*4,1+(i%5)*.5,Math.cos(a)*3]);animated.push({o,kind:'wisp',y:o.position.y});}
 g=anchor(-95,-28);for(let i=0;i<3;i++){const ring=add(g,new THREE.TorusGeometry(3+i*.5,.09,8,64),glow(0x9ee9ea),[0,4+i*2,0]);ring.rotation.set(Math.PI/2,.3*i,.1*i);animated.push({o:ring,kind:'orbit'});}for(const side of [-1,1]){const o=add(g,new THREE.OctahedronGeometry(1),glow(0x83d0da),[side*5,4,0]);o.scale.set(.6,4,.6);}
 g=anchor(125,-22);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const o=add(g,weatheredRock(1),rock,[Math.sin(a)*7,4+i%3,Math.cos(a)*7]);o.scale.set(1.2,.7,1.2);animated.push({o,kind:'float',y:o.position.y});}const orbit=add(g,new THREE.TorusGeometry(3,.13,8,64),gold,[0,5,0]);orbit.rotation.x=.7;animated.push({o:orbit,kind:'orbit'});
 g=anchor(-110,-210);const arch=path(g,[[-6,0,0],[-5,6,0],[0,10,0],[5,6,0],[6,0,0]],glow(0x95cce2),.45);for(let i=0;i<3;i++){const curtain=add(g,new THREE.PlaneGeometry(22,5,32,8),new THREE.MeshBasicMaterial({color:i%2?0x97e5c6:0x929feb,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}),[0,13+i*2,-2-i]);animated.push({o:curtain,kind:'aurora'});}
 g=anchor(162,-211);for(let i=0;i<6;i++){const a=i*2.4,o=add(g,new THREE.ConeGeometry(1,7+i%3,7),surfaceMaterial('rock',0x4e4546),[Math.sin(a)*8,3,Math.cos(a)*8]);path(g,[[Math.sin(a)*8,0,Math.cos(a)*8],[Math.sin(a)*5,.05,Math.cos(a)*5],[0,.08,0]],glow(0xfaa667),.1);const ember=add(g,new THREE.IcosahedronGeometry(.12),glow(0xffba72),[Math.sin(a)*7,5,Math.cos(a)*7]);animated.push({o:ember,kind:'ember',y:5});}
 const mists=[];
 for(let i=0;i<12;i++){const o=new THREE.Mesh(new THREE.PlaneGeometry(42,24),new THREE.MeshBasicMaterial({map:world.clouds.children[0].material.map,color:0xe2f0f2,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));o.position.set(140+(i%4)*24,57+(i%3)*5,130+Math.floor(i/4)*22);o.rotation.x=-Math.PI/2+.15;o.rotation.z=i*1.7;scene.add(o);mists.push(o);}
 world.cloudMists=mists;world.portals=portals;world.ropes=ropes;world.fantasyObjects=animated;
}
export function updateFantasy(world,time){for(const o of world.cloudMists)o.position.y+=Math.sin(time*.4+o.position.x)*.001;for(const a of world.fantasyObjects){if(a.kind==='portal'||a.kind==='orbit'){a.o.rotation.z=time*.13;if(a.kind==='orbit')a.o.rotation.y=time*.1;}else if(a.kind==='aurora'){const p=a.o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*.25+time*.6)*1.8);p.needsUpdate=true;}else if(a.y!==undefined){a.o.position.y=a.y+Math.sin(time*1.1+a.o.position.x)*.35;if(a.kind==='ember')a.o.position.y=a.y+(time*.8+a.o.position.x)%3;}else a.o.rotation.y=time*.35;}}
