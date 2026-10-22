"""Inspect all sculpted species and capture actual game models; no external models."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-creature-art'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(120000);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
 page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 report=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;const checked=new Set(),report=[];
 for(const m of e.world.monsters){const g=m.group.userData.rig.skin.geometry;if(checked.has(g))continue;checked.add(g);const n=g.attributes.position.count,parent=Array.from({length:n},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};for(let i=0;i<g.index.count;i+=3){const a=find(g.index.getX(i)),b=find(g.index.getX(i+1)),c=find(g.index.getX(i+2));parent[b]=a;parent[c]=a;}const components=new Set(parent.map((_,i)=>find(i))).size;if(components!==1)throw Error(m.type+' has '+components+' disconnected body surfaces');report.push({type:m.type,vertices:n,components});}
 document.querySelector('#hud').classList.add('hidden');document.querySelector('#pause').classList.add('hidden');e.active=false;document.exitPointerLock();return report;}""")
 print('PASS connected anatomy: '+str(report),flush=True)
 species_list=os.environ.get('ART_SPECIES','slime,wolf,spirit,boar,golem,frostwolf,guardian,drake,ancient,cloudray,windstag,skywarden,thornmantis,abyssserpent,moonsphinx,emberarachnid,stormroc').split(',')
 for species in species_list:
  # Default captures every species; ART_SPECIES permits focused follow-up checks.
  page.evaluate("""async type=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js'),{animateMonster}=await import('/src/actors.js');e.fx.clear();for(const m of e.world.monsters){m.alive=false;m.deathAge=8;m.group.visible=false;}const m=e.world.monsters.find(m=>m.type===type);m.alive=true;m.x=0;m.z=-20;m.group.position.set(0,heightAt(0,-20),-20);m.group.rotation.set(0,Math.PI-.45,0);m.freeze=0;m.hit=0;m.attackAge=null;m.moveSpeed=0;animateMonster(m,0,.4);const d=m.def.scale;e.camera.position.set(4*d,heightAt(0,-20)+2.1*d,-20+6*d);e.camera.lookAt(0,heightAt(0,-20)+1.2*d,-20);e.camera.updateMatrixWorld();e.world.update(e.time,0,e.camera.position,false);e.renderer.render(e.scene,e.camera);window.artMonster=m;}""",species)
  page.screenshot(path=str(out/f'{os.environ.get("ART_VERSION","v08")}-{species}.png'),timeout=120000)
 print(f'PASS rendered {len(species_list)} redesigned creature anatomy/material views',flush=True)
 page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.camera.position.set(-1,heightAt(-4,35)+1.85,39);e.camera.lookAt(-4,heightAt(-4,35)+1.35,35);e.camera.updateMatrixWorld();e.world.update(e.time,0,e.camera.position,false);e.renderer.render(e.scene,e.camera);}""")
 page.screenshot(path=str(out/(os.environ.get('ART_VERSION','v08')+'-npc-rhea.png')),timeout=120000)
 print('PASS NPC textured face and outfit rendered',flush=True)
 assert not errors,errors;b.close()
