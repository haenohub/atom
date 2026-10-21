import * as THREE from 'three';
import { surfaceMap } from './surfaces.js';

// Original procedural material maps and cutout foliage. No stock asset pack.
const cache = new Map(),sharedWind={value:0};
const hash = (x, y) => { const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); };
const mix=(a,b,t)=>a+(b-a)*t;
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
function fbm(x,y){return noise(x,y)*.55+noise(x*2.1,y*2.1)*.28+noise(x*4.3,y*4.3)*.17;}
export function canvasTexture(size,draw,repeat=false){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function surface(kind){
  if(cache.has(kind))return cache.get(kind);
  const size=256,heights=new Float32Array(size*size);
  const bases={bark:[[42,33,24],[132,112,83]],rock:[[61,66,63],[154,151,134]],soil:[[47,37,25],[135,115,77]],leather:[[34,24,18],[112,78,46]],ground:[[31,43,22],[110,119,68]]};
  const [dark,light]=bases[kind];
  const map=canvasTexture(size,(ctx)=>{const image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const grain=fbm(x*.055,y*.055),fine=hash(x,y);let h=grain;
    if(kind==='bark')h=.35+Math.sin(x*.25+noise(x*.04,y*.018)*11)*.2+grain*.32+fine*.1;
    if(kind==='leather')h=grain*.5+fine*.18+Math.sin(x*1.7)*Math.sin(y*1.7)*.06;
    if(kind==='rock')h=grain*.75+fine*.12+Math.pow(Math.abs(Math.sin(x*.028+y*.017+grain*3)),20)*.13;
    if(kind==='ground')h=grain*.75+fine*.25;
    heights[y*size+x]=h;const i=(y*size+x)*4;for(let k=0;k<3;k++)image.data[i+k]=mix(dark[k],light[k],h);image.data[i+3]=255;
  }ctx.putImageData(image,0,0);},true);
  const normal=canvasTexture(size,ctx=>{const img=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*2.2,dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*2.2;
    const n=new THREE.Vector3(-dx,-dy,1).normalize(),i=(y*size+x)*4;img.data[i]=(n.x*.5+.5)*255;img.data[i+1]=(n.y*.5+.5)*255;img.data[i+2]=(n.z*.5+.5)*255;img.data[i+3]=255;
  }ctx.putImageData(img,0,0);},true);normal.colorSpace=THREE.NoColorSpace;
  cache.set(kind,{map,normal});return {map,normal};
}
function leafSpray(){return canvasTexture(256,(ctx,s)=>{
  ctx.clearRect(0,0,s,s);ctx.strokeStyle='#554d2a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(120,250);ctx.bezierCurveTo(132,170,98,100,136,15);ctx.stroke();
  for(let i=0;i<11;i++){const side=i%2?1:-1,y=30+i*17,x=124+Math.sin(i)*10,tipX=x+side*(44+(i%3)*8),tipY=y-22;
    const gradient=ctx.createLinearGradient(x,y,tipX,tipY);gradient.addColorStop(0,'#263a17');gradient.addColorStop(.5,i%3?'#819345':'#9da65d');gradient.addColorStop(1,'#455c29');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+side*9,y-29,tipX-side*10,tipY-13,tipX,tipY);ctx.bezierCurveTo(tipX+side*1,tipY+17,x+side*13,y+10,x,y);ctx.fill();
    ctx.strokeStyle='#bac47775';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tipX,tipY);ctx.stroke();
  }
});}
function grassMap(){return canvasTexture(128,(ctx,s)=>{for(let i=0;i<9;i++){
  const x=10+i*13,h=54+(i*29)%69,lean=(i%3-1)*19,g=ctx.createLinearGradient(0,128,0,128-h);g.addColorStop(0,'#283419');g.addColorStop(.6,'#6e7f39');g.addColorStop(1,'#a4a55d');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(x-3,128);ctx.quadraticCurveTo(x-8,128-h*.5,x+lean,128-h);ctx.quadraticCurveTo(x+3,128-h*.4,x+4,128);ctx.fill();
}});}
export function particleTexture(kind='glow'){
  const key='particle:'+kind;if(cache.has(key))return cache.get(key);
  const t=canvasTexture(128,(ctx)=>{const g=ctx.createRadialGradient(64,64,0,64,64,62);g.addColorStop(0,'#ffffff');g.addColorStop(.12,'#ffffffdc');g.addColorStop(.4,'#ffffff55');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);});cache.set(key,t);return t;
}
export function materials(){
  if(cache.has('materials'))return cache.get('materials');
  const bark=surface('bark'),rock=surface('rock'),soil=surface('soil'),leather=surface('leather'),ground=surface('ground');
  const make=(texture,extra={})=>new THREE.MeshStandardMaterial({map:texture.map,normalMap:texture.normal,normalScale:new THREE.Vector2(.55,.55),roughness:.94,...extra});
  const leafMap=surfaceMap('leaves');
  const leaf=new THREE.MeshLambertMaterial({map:leafMap,alphaTest:.35,alphaToCoverage:true,side:THREE.DoubleSide,color:0xffffff,emissiveMap:leafMap,emissive:0x8fa76f,emissiveIntensity:.72});
  leaf.onBeforeCompile=shader=>{shader.uniforms.uWind=sharedWind;leaf.userData.shader=shader;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec4 windWorld=instanceMatrix*vec4(position,1.0);
      transformed.x+=sin(uWind*.8+windWorld.x*.11+windWorld.z*.08)*.13*uv.y;
      transformed.z+=cos(uWind*.6+windWorld.z*.12)*.08*uv.y;
    #endif`);};
  const pine=leaf.clone();pine.map=surfaceMap('needles');pine.emissiveMap=pine.map;pine.onBeforeCompile=leaf.onBeforeCompile;
  const grassTexture=surfaceMap('grass');
  const grass=new THREE.MeshLambertMaterial({map:grassTexture,alphaTest:.35,alphaToCoverage:true,side:THREE.DoubleSide,emissiveMap:grassTexture,emissive:0x9ba76c,emissiveIntensity:.65});
  grass.onBeforeCompile=shader=>{shader.uniforms.uWind=sharedWind;grass.userData.shader=shader;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec4 grassWorld=instanceMatrix*vec4(position,1.0);
      transformed.x+=sin(uWind*1.5+grassWorld.x*.4+grassWorld.z*.3)*.12*uv.y*uv.y;
    #endif`);};
  const fern=grass.clone();fern.map=surfaceMap('fern');fern.emissiveMap=fern.map;fern.onBeforeCompile=grass.onBeforeCompile;
  const m={bark:make(bark,{map:surfaceMap('bark')}),rock:make(rock,{map:surfaceMap('rock')}),soil:make(soil,{map:surfaceMap('soil')}),leather:make(leather),ground:make(ground),leaf,pine,grass,fern,metal:new THREE.MeshStandardMaterial({color:0xb6bbb7,metalness:.85,roughness:.26}),brass:new THREE.MeshStandardMaterial({color:0xb79a61,metalness:.72,roughness:.4})};
  cache.set('materials',m);return m;
}
export function groundMaterial(){
  const m=materials().ground.clone();m.vertexColors=true;m.map=surfaceMap('ground');m.normalMap=surface('ground').normal.clone();m.normalMap.repeat.set(80,80);m.normalScale.set(.48,.48);
  m.onBeforeCompile=shader=>{
    shader.uniforms.uRock={value:surfaceMap('rock')};shader.uniforms.uSoil={value:surfaceMap('soil')};
    shader.vertexShader='varying vec3 vTerrainWorld;\nvarying vec3 vTerrainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvTerrainWorld=(modelMatrix*vec4(position,1.0)).xyz;\nvTerrainNormal=normalize(mat3(modelMatrix)*normal);`);
    shader.fragmentShader='varying vec3 vTerrainWorld;\nvarying vec3 vTerrainNormal;\nuniform sampler2D uRock;\nuniform sampler2D uSoil;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 groundUV=vTerrainWorld.xz*.17;
      vec3 grassColor=texture2D(map,fract(groundUV)*.5+vec2(0.,.5)).rgb;
      float terrainPatch=sin(vTerrainWorld.x*.041+sin(vTerrainWorld.z*.067))*sin(vTerrainWorld.z*.053)*.5+.5;
      vec3 secondColor=texture2D(map,fract(vec2(-groundUV.y,groundUV.x)*.73+vec2(.31,.57))*.5+vec2(0.,.5)).rgb;
      grassColor=mix(grassColor,secondColor,terrainPatch*.42);
      grassColor*=mix(vec3(.87,.91,.82),vec3(1.06,1.03,.97),terrainPatch);
      vec3 rockColor=texture2D(uRock,fract(groundUV*.61)*.5).rgb;
      vec3 soilColor=texture2D(uSoil,fract(groundUV*.8)*.5+vec2(.5,0.)).rgb;
      float slope=1.0-abs(vTerrainNormal.y);
      float path=1.0-smoothstep(2.0,4.4,abs(vTerrainWorld.x-sin(vTerrainWorld.z*.026)*1.4));
      path*=smoothstep(-165.0,-145.0,vTerrainWorld.z)*(1.0-smoothstep(57.0,68.0,vTerrainWorld.z));
      vec3 groundColor=mix(grassColor,soilColor,path*.8);
      groundColor=mix(groundColor,rockColor,smoothstep(.08,.36,slope));
      float snow=smoothstep(30.0,52.0,vTerrainWorld.y)*(1.0-smoothstep(-5.0,25.0,vTerrainWorld.x));
      groundColor=mix(groundColor,vec3(.78,.83,.84),snow*(1.0-smoothstep(.24,.65,slope)));
      float ash=smoothstep(95.0,155.0,vTerrainWorld.x)*(1.0-smoothstep(-190.0,-140.0,vTerrainWorld.z));
      groundColor=mix(groundColor,rockColor*vec3(.57,.48,.39),ash);
      diffuseColor.rgb*=groundColor;
    `);
  };return m;
}
export function leafGeometry(seed=1,pine=false){
  const positions=[],uvs=[],normals=[],indices=[];let rand=seed;const rng=()=>{rand=(rand*1664525+1013904223)>>>0;return rand/4294967296;};
  const count=pine?36:56;
  for(let i=0;i<count;i++){
    const a=rng()*Math.PI*2,t=rng(),r=(pine?(1-t)*.95:Math.sqrt(rng()))*.98;
    const center=new THREE.Vector3(Math.cos(a)*r,pine?t*2-1:(rng()-.5)*1.5,Math.sin(a)*r);
    const width=(pine?.32:.42)*( .65+rng()*.65),height=width*1.25;
    const right=new THREE.Vector3(Math.cos(a),.15*(rng()-.5),-Math.sin(a)).multiplyScalar(width),up=new THREE.Vector3(.1*(rng()-.5),height,.1*(rng()-.5));
    const normal=new THREE.Vector3().crossVectors(right,up).normalize();const offset=positions.length/3;
    for(const [x,y,u,v]of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){const p=center.clone().addScaledVector(right,x).addScaledVector(up,y);positions.push(p.x,p.y,p.z);normals.push(normal.x,normal.y,normal.z);uvs.push(u,v);}
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
export function grassGeometry(){
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<3;i++){const a=i*Math.PI/3,c=Math.cos(a)*.52,s=Math.sin(a)*.52,n=positions.length/3;
    positions.push(-c,0,-s,c,0,s,c,1,s,-c,1,-s);uvs.push(0,0,1,0,1,1,0,1);indices.push(n,n+1,n+2,n,n+2,n+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function weatheredRock(detail=2){const g=new THREE.IcosahedronGeometry(1,detail),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=.88+noise(x*3+z,y*3)*.23+noise(x*9,y*8+z)*.07;p.setXYZ(i,x*r,y*r,z*r);}g.computeVertexNormals();return g;}
export function updateWind(time){sharedWind.value=time;}
