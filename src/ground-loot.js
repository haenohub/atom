import * as THREE from 'three';
import { itemArt } from './item-art.js';
import { materials } from './art.js';
import { heightAt, WATER_LEVEL, isWater } from './terrain.js';
import { ITEMS } from './data.js';
const imageMaps=new Map();
function itemMap(id){if(imageMaps.has(id))return imageMaps.get(id);const a=itemArt(id),t=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${a.sheet}`);t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(1/a.columns,1/a.columns);t.offset.set((a.index%a.columns)/a.columns,1-(Math.floor(a.index/a.columns)+1)/a.columns);imageMaps.set(id,t);return t;}
export class GroundLoot {
  constructor(scene){this.scene=scene;this.bags=new Map();}
  clear(){for(const id of [...this.bags.keys()])this.remove(id);}
  add(drop,falling=false){
    if(this.bags.has(drop.id))return;
    const group=new THREE.Group(),m=materials();
    const pouch=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),m.leather.clone());pouch.scale.set(.25,.22,.25);pouch.position.y=.22;group.add(pouch);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,6,16),m.brass.clone());tie.rotation.x=Math.PI/2;tie.position.y=.43;group.add(tie);
    const rare=Object.keys(drop.items).some(id=>['rare','epic'].includes(ITEMS[id]?.rarity)),color=rare?0xc0a1ff:0xf0d49a;
    const glow=new THREE.Mesh(new THREE.TorusGeometry(.38,.012,5,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65}));glow.rotation.x=-Math.PI/2;glow.position.y=.025;group.add(glow);
    const mote=new THREE.Mesh(new THREE.OctahedronGeometry(.045),new THREE.MeshBasicMaterial({color}));mote.position.y=.8;group.add(mote);
    const cards=[];Object.keys(drop.items).forEach((id,i,ids)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:itemMap(id),transparent:false}));const angle=i/Math.max(1,ids.length)*Math.PI*2;sprite.position.set(Math.cos(angle)*.4,.7+(i%2)*.18,Math.sin(angle)*.4);sprite.scale.set(.28,.28,1);group.add(sprite);cards.push(sprite);});
    group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    const floor=Number.isFinite(drop.y)?drop.y:isWater(drop.x,drop.z)?WATER_LEVEL:heightAt(drop.x,drop.z);group.position.set(drop.x,floor+(falling?1.1:0),drop.z);this.scene.add(group);
    this.bags.set(drop.id,{...drop,group,floor,vy:falling?2.6:0,settled:!falling,bounces:0,mote,glow,cards});
  }
  remove(id){const b=this.bags.get(id);if(!b)return;this.scene.remove(b.group);b.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.bags.delete(id);}
  update(dt,time,viewer,realm='surface'){for(const b of this.bags.values()){
    if(!b.settled){b.vy-=18*dt;b.group.position.y+=b.vy*dt;b.group.rotation.z+=dt*2;if(b.group.position.y<=b.floor){b.group.position.y=b.floor;b.vy=-b.vy*.24;if(++b.bounces>=2){b.settled=true;b.group.rotation.z=0;}}}
    b.mote.position.y=.75+Math.sin(time*3)*.07;b.mote.rotation.y=time;b.glow.material.opacity=.4+Math.sin(time*2)*.15;b.group.visible=(b.realm||'surface')===realm&&Math.hypot(b.x-viewer.x,b.z-viewer.z)<65;
  }}
}
