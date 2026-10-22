import * as THREE from 'three';
const maps=new Map(),tiles={chitin:[0,.5],feather:[.5,.5],scaleDetail:[0,0],astral:[.5,0],skin:[.5,0],hide:[.5,.5],membrane:[0,0],pelt:[0,.5],steel:[0,.5],cloth:[.5,.5],fur:[0,0],meteor:[.5,0],ground:[0,.5],bark:[.5,.5],rock:[0,0],soil:[.5,0],leaves:[0,.5],needles:[.5,.5],grass:[0,0],fern:[.5,0]};
export function surfaceMap(kind){
  if(maps.has(kind))return maps.get(kind);
  const file=['chitin','feather','scaleDetail','astral'].includes(kind)?'forged-surfaces.png':['skin','hide','membrane','pelt'].includes(kind)?'creature-surfaces.png':['ground','bark','rock','soil'].includes(kind)?'world-materials.png':['leaves','needles','grass','fern'].includes(kind)?'foliage-atlas.png':'materials-atlas.png';let ready;const pending=new Promise(resolve=>ready=resolve);const map=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${file}`,ready,undefined,()=>ready(null));map.userData.ready=pending;map.colorSpace=THREE.SRGBColorSpace;map.repeat.set(.5,.5);map.offset.set(...tiles[kind]);map.anisotropy=8;maps.set(kind,map);return map;
}
export function surfaceMaterial(kind,color=0xffffff,extra={}){
  const material=new THREE.MeshStandardMaterial({map:surfaceMap(kind),color,roughness:kind==='steel'?.36:.85,metalness:kind==='steel'?.62:0,envMapIntensity:1.3,...extra});
  if(kind==='steel'||kind==='cloth')material.onBeforeCompile=shader=>{
    const fragment=kind==='steel'?`#include <map_fragment>\ndiffuseColor.rgb*=2.2;`:`
      #ifdef USE_MAP
        vec4 weaveSample=texture2D(map,vMapUv);
        float weave=dot(weaveSample.rgb,vec3(.2126,.7152,.0722));
        float embroidery=smoothstep(.07,.35,weaveSample.r-weaveSample.b);
        diffuseColor.rgb=mix(diffuseColor.rgb*(.45+weave*1.4),vec3(.64,.43,.14),embroidery*.75);
        diffuseColor.a*=weaveSample.a;
      #endif`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',fragment);
  };
  material.customProgramCacheKey=()=>`aetherwild-surface-${kind}`;return material;
}
// Triplanar sampling stays within each atlas cell even on a sculpted limb.
export function sculptMaterial(kind,color=0xffffff,extra={}){
 const material=surfaceMaterial(kind,color,extra),tile=tiles[kind];
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vSculptPosition;varying vec3 vSculptNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSculptPosition=position;vSculptNormal=normal;');
  shader.fragmentShader='varying vec3 vSculptPosition;varying vec3 vSculptNormal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 blend=pow(abs(normalize(vSculptNormal)),vec3(4.));blend/=max(.001,blend.x+blend.y+blend.z);vec2 cell=vec2(${tile[0]+.008},${tile[1]+.008});vec3 q=vSculptPosition*.72;vec3 tex=texture2D(map,abs(fract(q.zy*.5)*2.-1.)*.484+cell).rgb*blend.x+texture2D(map,abs(fract(q.xz*.5)*2.-1.)*.484+cell).rgb*blend.y+texture2D(map,abs(fract(q.xy*.5)*2.-1.)*.484+cell).rgb*blend.z;diffuseColor.rgb*=tex;`);
 };
 material.customProgramCacheKey=()=>`aetherwild-triplanar-${kind}`;return material;
}

export function surfaceTextures(){return [...maps.values()];}
