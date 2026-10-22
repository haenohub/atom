const floors=[];
export function resetStructureFloors(){floors.length=0;}
export function registerStructureFloor(floor){floors.push({...floor,cos:Math.cos(floor.angle||0),sin:Math.sin(floor.angle||0)});}
export function structureFloorAt(x,z,ceiling=Infinity){let y=-Infinity;for(const f of floors){if(f.y>ceiling)continue;const dx=x-f.x,dz=z-f.z,lx=f.cos*dx-f.sin*dz,lz=f.sin*dx+f.cos*dz;if(Math.abs(lx)<=f.w&&Math.abs(lz)<=f.d)y=Math.max(y,f.y);}return y;}
export function underRoof(x,z,y,roofs=[]){return roofs.some(r=>{const dx=x-r.x,dz=z-r.z,c=Math.cos(r.angle),s=Math.sin(r.angle);return Math.abs(c*dx-s*dz)<=r.w&&Math.abs(s*dx+c*dz)<=r.d&&y<r.y;});}
