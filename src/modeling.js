import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
// Explicit anatomical cross sections preserve planes, tendons and tailored seams.
export function loft(rings,segments=24){
 const p=[],uv=[],idx=[];
 rings.forEach((r,j)=>{const [x,y,z,rx,rz]=r;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(x+Math.sin(a)*rx,y,z-Math.cos(a)*rz);uv.push(i/segments,j/(rings.length-1));if(j<rings.length-1&&i<segments){const n=j*(segments+1)+i;idx.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}}});
 if(rings[0][1]>rings.at(-1)[1])for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function taperedCurve(points,radii,segments=24,sides=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false),p=[],uv=[],idx=[];
 for(let j=0;j<=segments;j++){const t=j/segments,center=curve.getPoint(t),ri=t*(radii.length-1),a=Math.floor(ri),r=THREE.MathUtils.lerp(radii[a],radii[Math.min(a+1,radii.length-1)],ri-a);for(let i=0;i<=sides;i++){const angle=i/sides*Math.PI*2,v=center.clone().addScaledVector(frames.normals[j],Math.cos(angle)*r).addScaledVector(frames.binormals[j],Math.sin(angle)*r);p.push(...v.toArray());uv.push(i/sides,t);if(j<segments&&i<sides){const n=j*(sides+1)+i;idx.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}}
 for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function plate(points,depth=.025){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelThickness:depth*.4,bevelSize:depth*.55,bevelSegments:2,curveSegments:12});}
export function attach(parent,geo,mat,xyz=[0,0,0],scale=null){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...xyz);if(scale)mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
// Consolidate rigid ornaments per joint/material; skin and articulated groups stay separate.

export function mergeStaticParts(root){
 const parents=[];root.traverse(o=>parents.push(o));let merged=0;
 for(const parent of parents){const groups=new Map();for(const o of parent.children){if(!o.isMesh||o.isSkinnedMesh||o.children.length||Array.isArray(o.material)||!o.geometry.attributes.uv||!o.geometry.attributes.normal)continue;const m=o.material,key=[m.type,m.map?.uuid,m.color?.getHex(),m.emissive?.getHex(),m.metalness,m.roughness,m.opacity,m.side].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
  for(const parts of groups.values())if(parts.length>2){const geos=parts.map(o=>{o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);g.clearGroups();return g;}),geo=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geo)continue;const mat=parts[0].material;for(const o of parts)parent.remove(o);attach(parent,geo,mat);merged+=parts.length-1;}
 }
 root.userData.mergedParts=merged;return root;
}
