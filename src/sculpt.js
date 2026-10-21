import * as THREE from 'three';
// Smooth implicit volumes are sampled into ONE connected, indexed surface.
// Components describe anatomy, never become separate sphere/capsule meshes.
const cache=new Map();
const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
const distance=(v,c)=> (Math.hypot((v[0]-c[0])/c[3],(v[1]-c[1])/c[4],(v[2]-c[2])/c[5])-1)*Math.min(c[3],c[4],c[5]);
export function sculptGeometry(key,volumes,step=.13,smooth=.14){
  if(cache.has(key))return cache.get(key);
  const lo=[0,1,2].map(a=>Math.min(...volumes.map(v=>v[a]-v[a+3]))-.2),hi=[0,1,2].map(a=>Math.max(...volumes.map(v=>v[a]+v[a+3]))+.2);
  const n=hi.map((v,a)=>Math.ceil((v-lo[a])/step)+1),points=[],values=[],field=v=>volumes.reduce((d,c)=>smoothMin(d,distance(v,c),smooth),999);
  for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++){const p=[lo[0]+x*step,lo[1]+y*step,lo[2]+z*step];points.push(p);values.push(field(p));}
  const positions=[],indices=[],uv=[],skinIndices=[],skinWeights=[],vertices=new Map();
  const vertex=(a,b)=>{const t=values[a]/(values[a]-values[b]),v=points[a].map((p,i)=>p+(points[b][i]-p)*t),id=v.map(x=>x.toFixed(5)).join(',');if(vertices.has(id))return vertices.get(id);
    const index=positions.length/3;vertices.set(id,index);positions.push(...v);uv.push(Math.atan2(v[2],v[0])/(Math.PI*2)+.5,(v[1]-lo[1])/(hi[1]-lo[1]));
    const weights=new Map();for(const c of volumes){const w=Math.exp(-Math.max(-.4,distance(v,c))*22);weights.set(c[6]||0,(weights.get(c[6]||0)||0)+w);}
    const w=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=w.reduce((s,v)=>s+v[1],0);for(let i=0;i<4;i++){skinIndices.push(w[i]?.[0]||0);skinWeights.push(w[i]?w[i][1]/total:0);}return index;
  };
  const triangle=(a,b,c)=>{const p=positions,A=new THREE.Vector3(...p.slice(a*3,a*3+3)),B=new THREE.Vector3(...p.slice(b*3,b*3+3)),C=new THREE.Vector3(...p.slice(c*3,c*3+3)),normal=B.clone().sub(A).cross(C.clone().sub(A)).normalize(),center=A.clone().add(B).add(C).multiplyScalar(1/3),eps=.008;
    if(field(center.clone().addScaledVector(normal,eps).toArray())<field(center.clone().addScaledVector(normal,-eps).toArray()))indices.push(a,c,b);else indices.push(a,b,c);
  };
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],stride=n[0]*n[1];
  for(let z=0;z<n[2]-1;z++)for(let y=0;y<n[1]-1;y++)for(let x=0;x<n[0]-1;x++){
    const a=x+y*n[0]+z*stride,cube=[a,a+1,a+1+n[0],a+n[0],a+stride,a+stride+1,a+stride+1+n[0],a+stride+n[0]];
    if(cube.every(i=>values[i]>0)||cube.every(i=>values[i]<=0))continue;
    for(const tet of tets){const v=tet.map(i=>cube[i]),inside=v.filter(i=>values[i]<=0),outside=v.filter(i=>values[i]>0);if(!inside.length||!outside.length)continue;
      if(inside.length===1||outside.length===1){const single=inside.length===1?inside[0]:outside[0],other=inside.length===1?outside:inside;triangle(...other.map(i=>vertex(single,i)));}
      else{const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[0]),d=vertex(inside[1],outside[1]);triangle(a,b,c);triangle(b,d,c);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();geo.userData.continuousSurface=true;cache.set(key,geo);return geo;
}
export function skinnedSurface(parent,geometry,material,anchors){
  const mesh=new THREE.SkinnedMesh(geometry,material),bones=anchors.map(v=>{const b=new THREE.Bone();b.position.set(...v);return b;});
  mesh.add(bones[0]);for(let i=1;i<bones.length;i++)bones[0].add(bones[i]);parent.add(mesh);mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;return {mesh,bones};
}
