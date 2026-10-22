import * as THREE from 'three';
import { vfxMap } from './vfx-textures.js';
const shellVertex=`varying vec3 vLocal;varying vec3 vNormalW;varying vec3 vView;void main(){vLocal=position;vec4 p=modelViewMatrix*vec4(position,1.);vNormalW=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`;
const shellFragment=`uniform float uFade;uniform float uFrame;varying vec3 vLocal;varying vec3 vNormalW;varying vec3 vView;void main(){float edge=pow(1.-abs(dot(normalize(vNormalW),normalize(vView))),2.);float crack=pow(abs(sin(vLocal.x*31.+vLocal.y*23.)*sin(vLocal.z*29.-vLocal.y*17.)),14.);float a=(edge*.65+crack*.65+.025)*uFade;gl_FragColor=vec4(vec3(.43,.8,1.)*(1.+crack),a);}`;
export function frostExplosion(radius){
 const root=new THREE.Group(),shells=[],shards=[];
 for(let i=0;i<2;i++){const mat=new THREE.ShaderMaterial({uniforms:{uFade:{value:1},uFrame:{value:0}},vertexShader:shellVertex,fragmentShader:shellFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});const shell=new THREE.Mesh(new THREE.SphereGeometry(1,32,22),mat);root.add(shell);shells.push(shell);}
 const shardGeo=new THREE.OctahedronGeometry(.09),mat=new THREE.MeshBasicMaterial({color:0x9de5ff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
 for(let i=0;i<40;i++){const y=1-2*(i+.5)/40,r=Math.sqrt(1-y*y),a=i*2.39996,d=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),o=new THREE.Mesh(shardGeo,mat.clone());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);o.scale.y=2.5;root.add(o);shards.push({o,d});}
 return {root,update(age,fade){const grow=1-Math.exp(-age*10);shells.forEach((o,i)=>{o.scale.setScalar(Math.max(.03,radius*grow*(i?.78:1)));o.material.uniforms.uFade.value=fade*(i?.5:1);o.rotation.set(age*.2,-age*.4,age*.1);});shards.forEach(({o,d},i)=>{o.position.copy(d).multiplyScalar(radius*grow*(.45+(i%7)*.07));o.material.opacity=fade*.85;});}};
}
export function impactBloom(kind,radius){
 const root=new THREE.Group(),color=kind==='meteorZone'?0xffc06c:kind==='shatter'?0xe5bd89:0xc7a9ff;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:vfxMap('impact'),color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));root.add(sprite);
 const rings=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(1,.025,6,48),new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));r.rotation.x=i?Math.PI/2:0;r.rotation.y=i===2?.7:0;root.add(r);rings.push(r);}
 return {root,update(age,fade,frame){const size=Math.min(5,radius*.55)*(1+.09*frame);sprite.scale.set(size,size,1);sprite.material.opacity=fade*(.95-frame*.045);rings.forEach((r,i)=>{r.scale.setScalar(.4+frame*.19+i*.13);r.material.opacity=fade*.55;});}};
}
