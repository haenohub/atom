import * as THREE from 'three';
const maps=new Map();
export function vfxMap(kind){if(maps.has(kind))return maps.get(kind);const t=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/combat-vfx.png`);t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(.49,.49);const xy={orb:[.005,.505],slash:[.505,.505],impact:[.005,.005],teleport:[.505,.005]}[kind];t.offset.set(...xy);maps.set(kind,t);return t;}
export function vfxSprite(kind,color=0xffffff,size=1){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:vfxMap(kind),color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));sprite.scale.set(size,size,1);return sprite;}
export function magicOrb(){const g=new THREE.Group();const core=new THREE.Mesh(new THREE.SphereGeometry(.14,20,16),new THREE.MeshStandardMaterial({map:vfxMap('orb'),color:0xc0eafa,emissive:0x72bbf5,emissiveMap:vfxMap('orb'),emissiveIntensity:1.5,roughness:.15}));g.add(core,vfxSprite('orb',0xb5e8ff,.85));return g;}
