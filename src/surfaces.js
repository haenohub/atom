import * as THREE from 'three';
const maps=new Map(),tiles={steel:[0,.5],cloth:[.5,.5],fur:[0,0],meteor:[.5,0],ground:[0,.5],bark:[.5,.5],rock:[0,0],soil:[.5,0],leaves:[0,.5],needles:[.5,.5],grass:[0,0],fern:[.5,0]};
export function surfaceMap(kind){
  if(maps.has(kind))return maps.get(kind);
  const file=['ground','bark','rock','soil'].includes(kind)?'world-materials.png':['leaves','needles','grass','fern'].includes(kind)?'foliage-atlas.png':'materials-atlas.png';const map=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${file}`);map.colorSpace=THREE.SRGBColorSpace;map.repeat.set(.5,.5);map.offset.set(...tiles[kind]);map.anisotropy=8;maps.set(kind,map);return map;
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
