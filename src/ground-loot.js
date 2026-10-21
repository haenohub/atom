import * as THREE from 'three';
import { materials } from './art.js';
import { heightAt, WATER_LEVEL, isWater } from './terrain.js';
import { ITEMS } from './data.js';
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
    group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    const floor=isWater(drop.x,drop.z)?WATER_LEVEL:heightAt(drop.x,drop.z);group.position.set(drop.x,floor+(falling?1.1:0),drop.z);this.scene.add(group);
    this.bags.set(drop.id,{...drop,group,floor,vy:falling?2.6:0,settled:!falling,bounces:0,mote,glow});
  }
  remove(id){const b=this.bags.get(id);if(!b)return;this.scene.remove(b.group);b.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.bags.delete(id);}
  update(dt,time,viewer){for(const b of this.bags.values()){
    if(!b.settled){b.vy-=18*dt;b.group.position.y+=b.vy*dt;b.group.rotation.z+=dt*2;if(b.group.position.y<=b.floor){b.group.position.y=b.floor;b.vy=-b.vy*.24;if(++b.bounces>=2){b.settled=true;b.group.rotation.z=0;}}}
    b.mote.position.y=.75+Math.sin(time*3)*.07;b.mote.rotation.y=time;b.glow.material.opacity=.4+Math.sin(time*2)*.15;b.group.visible=Math.hypot(b.x-viewer.x,b.z-viewer.z)<65;
  }}
}
