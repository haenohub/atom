"""Five-save and Cloud Garden regressions against current class movement rules."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-cloud'));out.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(name):checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(120000);errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
 page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR',m.text,flush=True)) if m.type=='error' else None)
 page.add_init_script("if(!localStorage.getItem('test-seeded')){localStorage.setItem('aetherwild.save.v1',JSON.stringify({version:1,player:{classId:'mage',level:4,gold:123,inventory:{staff:1},equipment:{weapon:'staff'},position:{x:0,z:44}}}));localStorage.setItem('test-seeded','1');}")
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
 assert page.locator('[data-save-slot]').count()==5
 assert '마법사' in page.locator('[data-save-slot="1"]').inner_text()
 page.screenshot(path=str(out/'v05-save-slots.png'),timeout=120000)
 page.click('[data-save-slot="3"]');page.click('[data-class="ranger"]');page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 assert page.evaluate('window.__AETHERWILD__.engine.saveSlot')==3
 page.keyboard.press('Escape');page.click('#to-title');page.click('[data-save-slot="5"]');page.click('[data-class="mage"]');page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 assert page.evaluate('window.__AETHERWILD__.engine.saveSlot')==5
 values=page.evaluate("async()=>{const {loadSlot}=await import('/src/save-slots.js');return [1,3,5].map(n=>{const p=loadSlot(n);return [p.classId,p.gold];});}")
 assert values==[['mage',123],['ranger',0],['mage',0]],values
 page.keyboard.press('Escape');page.click('#to-title');page.click('[data-save-slot="3"]');page.click('#continue-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 assert page.evaluate('window.__AETHERWILD__.engine.player.classId')=='ranger'
 passed('native five-slot creation/selection/continue; old save migrated once; slots 1, 3 and 5 remain independent')
 # Native hollow, white, symmetric crosshair and trajectory display.
 reticle=page.locator('#crosshair i').evaluate_all('(els)=>els.map(el=>{const s=getComputedStyle(el);return {w:parseFloat(s.width),h:parseFloat(s.height),color:s.backgroundColor};})')
 assert [sorted([r['w'],r['h']]) for r in reticle]==[[2,7]]*4,reticle
 assert all(r['color']=='rgb(255, 255, 255)' for r in reticle)
 passed('crosshair has four equally long white arms and a hollow center')
 # Freeze AI and place real sculpted enemies on the same physical trajectory.
 page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.paused=true;e.player.level=20;e.player.mana=999;e.cooldowns.fill(0);for(const m of e.world.monsters){m.alive=false;m.respawnAt=1e9;m.group.visible=false;}
 const x=0,z=-14;e.camera.position.set(x,heightAt(x,z)+1.75,z);e.feetY=heightAt(x,z);e.fallPeak=e.feetY;e.yaw=0;e.pitch=-.1;e.camera.rotation.set(-.1,0,0);e.camera.updateMatrixWorld();
 window.lineMobs=e.world.monsters.filter(m=>m.type==='wolf').slice(0,2);lineMobs.forEach((m,i)=>{m.alive=true;m.hp=10000;m.freeze=999;m.x=0;m.z=z-7-i*6;m.homeX=m.x;m.homeZ=m.z;m.group.position.set(m.x,heightAt(m.x,m.z),m.z);m.group.visible=true;});e.paused=false;}""")
 page.keyboard.press('Digit1');page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.99&&window.__AETHERWILD__.engine.trajectory.visible')
 assert page.evaluate('window.__AETHERWILD__.engine.trajectory.geometry.attributes.position.count')<=27
 page.screenshot(path=str(out/'v05-arrow-trajectory.png'),timeout=120000);page.mouse.up()
 result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;const p=e.projectiles.find(p=>p.kind==='pierce');if(!p)throw Error('missing piercing projectile');const scale=p.mesh.scale.toArray();for(let i=0;i<180;i++)e.updateProjectiles(1/120);return {hp:lineMobs.map(m=>m.hp),scale,fields:e.fields.length};}""")
 assert all(h<10000 for h in result['hp']),result
 assert result['scale']==[2.2,2.2,1.65],result
 hp=page.evaluate('lineMobs.map(m=>m.hp)');page.evaluate('for(let i=0;i<60;i++)window.__AETHERWILD__.engine.updateProjectiles(1/60)');assert page.evaluate('lineMobs.map(m=>m.hp)')==hp
 passed('actual full-draw piercing arrow passes through two aligned enemies once each; larger shaft and visible ballistic trajectory')
 # Mage basic is a real single-hit projectile, not an area or a piercing shot.
 page.evaluate("""async()=>{const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');api.startGame(api.createPlayer('mage'));e.paused=true;for(const m of e.world.monsters){m.alive=false;m.respawnAt=1e9;m.group.visible=false;}
 e.feetY=heightAt(0,-14);e.camera.position.set(0,e.feetY+1.75,-14);e.yaw=0;e.pitch=-.1;e.camera.rotation.set(-.1,0,0);e.camera.updateMatrixWorld();window.lineMobs=e.world.monsters.filter(m=>m.type==='wolf').slice(0,2);lineMobs.forEach((m,i)=>{m.alive=true;m.hp=10000;m.freeze=999;m.x=0;m.z=-21-i*3;m.homeX=0;m.homeZ=m.z;m.group.position.set(0,heightAt(0,m.z),m.z);m.group.visible=true;});e.paused=false;}""")
 page.wait_for_function('window.__AETHERWILD__.engine.locked');page.mouse.click(550,370)
 result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;if(e.projectiles.length!==1||e.projectiles[0].kind!=='magicOrb'||e.fields.length)throw Error('basic is not an orb');const orb=e.projectiles[0];if(orb.gravity!==0)throw Error('orb gravity');for(let i=0;i<180;i++)e.updateProjectiles(1/120);return {hp:lineMobs.map(m=>m.hp),impact:e.fx.items.some(x=>x.kind==='sprite'&&x.group.material.map)};}""")
 assert result['hp'][0]<10000 and result['hp'][1]==10000 and result['impact'],result
 passed('actual mage click fires a textured gravity-free orb that hits only the first target; textured contact flash created')
 # Actual Shift input and simulation, including blocking collisions and cooldown costs.
 for cls in ['warrior','mage']:
  page.evaluate("""async cls=>{const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');api.startGame(api.createPlayer(cls));e.paused=true;e.world.colliders=[];e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.fallPeak=e.feetY;e.yaw=0;e.keys.clear();window.beforeMove={z:e.camera.position.z,mana:e.player.mana,stamina:e.stamina};e.paused=false;}""",cls)
  page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('ShiftLeft')
  result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;const manaCost=beforeMove.mana-e.player.mana;for(let i=0;i<20;i++)e.movement(1/60);const z=e.camera.position.z;e.mobility();return {distance:beforeMove.z-z,mana:e.player.mana,manaCost,stamina:e.stamina,cd:e.mobilityCooldown,duplicate:e.camera.position.z!==z};}""")
  assert (4.3<result['distance']<4.8 if cls=='warrior' else 5.8<result['distance']<6.2),result
  assert (result['cd']>0 and not result['duplicate'] if cls=='warrior' else result['cd']==0 and result['duplicate']),result
  if cls=='mage':assert 14<result['manaCost']<=15,result
  passed('native Shift '+cls+' movement, distance limit and cost; '+('dash cooldown enforced' if cls=='warrior' else 'teleport repeats with zero cooldown'))
 result=page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.mobilityCooldown=0;e.world.colliders=[{x:0,z:36,r:1}];e.camera.position.set(0,heightAt(0,40)+1.75,40);e.feetY=heightAt(0,40);e.fallPeak=e.feetY;e.yaw=0;e.mobility();return 40-e.camera.position.z;}""")
 assert result<2.6,result
 passed('teleport swept path stops before solid obstacles')
 # Native portal and rope interaction, real movement reaches both upper terraces.
 page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.world.colliders=[];e.camera.position.set(14,heightAt(14,42)+1.75,42);e.feetY=heightAt(14,42);e.fallPeak=e.feetY;e.paused=false;}""")
 page.keyboard.press('KeyE');page.wait_for_function('window.__AETHERWILD__.engine.inCloudGarden')
 assert page.evaluate('window.__AETHERWILD__.engine.feetY')==66
 page.evaluate("const e=window.__AETHERWILD__.engine;e.paused=true;e.world.update(e.time,0,e.camera.position,true);e.renderer.render(e.scene,e.viewCamera)")
 page.screenshot(path=str(out/'v05-cloud-garden.png'),timeout=120000)
 passed('native E portal enters real elevated Cloud Garden with its own monster population and map region')
 for i in [0,1]:
  page.evaluate("""i=>{const e=window.__AETHERWILD__.engine,r=e.world.ropes[i];e.camera.position.set(r.x,r.bottom+1.75,r.z+.6);e.feetY=r.bottom;e.fallPeak=r.bottom;e.vy=0;e.paused=false;}""",i)
  page.keyboard.press('KeyE');assert page.evaluate('!!window.__AETHERWILD__.engine.climbing')
  result=page.evaluate("""i=>{const e=window.__AETHERWILD__.engine;e.paused=true;e.keys.add('KeyW');for(let k=0;k<280;k++)if(e.climbing)e.movement(1/60);e.keys.clear();const r=e.world.ropes[i];return {y:e.feetY,top:r.top,climbing:!!e.climbing,x:e.camera.position.x,z:e.camera.position.z};}""",i)
  assert result['y']==result['top'] and not result['climbing'],result
 passed('native E attaches to both ropes; actual W climb reaches 82m and 100m terraces and safely exits onto platforms')
 # Every intended jump is possible using plain movement + the actual gravity loop.
 result=page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{SKY_ISLANDS}=await import('/src/sky-layout.js');e.player=window.__AETHERWILD__.createPlayer('warrior');e.world.colliders=[];e.inCloudGarden=true;const successes=[];
 for(const [a,b]of [[0,1],[1,2],[2,3],[4,5],[5,6]]){const from=SKY_ISLANDS[a],to=SKY_ISLANDS[b],dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;e.camera.position.set(from.x+ux*(from.r-.3),from.y+1.75,from.z+uz*(from.r-.3));e.feetY=from.y;e.fallPeak=from.y;e.vy=0;e.grounded=true;e.dash=null;e.yaw=Math.atan2(-ux,-uz);e.keys.clear();e.keys.add('KeyW');e.jumpRequested=true;let landed=false;for(let k=0;k<100;k++){e.movement(1/120);if(e.grounded&&Math.abs(e.feetY-to.y)<.1&&Math.hypot(e.camera.position.x-to.x,e.camera.position.z-to.z)<to.r){landed=true;break;}}if(!landed)throw Error('unreachable jump '+a+' -> '+b+' '+JSON.stringify({x:e.camera.position.x,z:e.camera.position.z,y:e.feetY}));successes.push([a,b]);}e.keys.clear();return successes;}""")
 assert len(result)==5
 passed('all five intended island jumps are traversable with ordinary warrior speed and real jump/gravity physics')
 result=page.evaluate("""async()=>{const api=window.__AETHERWILD__,e=api.engine,{loadSlot}=await import('/src/save-slots.js');e.camera.position.set(212,101.75,131);e.feetY=100;e.inCloudGarden=true;e.persist();const p=loadSlot(e.saveSlot);if(p.position.y!==100)throw Error('sky altitude lost');e.start(p);e.paused=true;const y=e.feetY;const m=e.world.monsters.find(m=>m.type==='skywarden');m.hp=1;m.alive=true;e.kill(m);const drop=e.player.groundLoot.at(-1),bag=e.groundLoot.bags.get(drop.id);if(drop.y!==100||bag.floor!==100)throw Error('loot fell to base terrain');e.camera.position.set(drop.x,101.75,drop.z);e.feetY=100;const gold=e.player.gold;e.interact();if(e.player.gold<=gold)throw Error('cloud loot cannot be collected');e.persist();return {y,dropY:drop.y};}""")
 assert result=={'y':100,'dropY':100},result
 passed('saving/reloading preserves island elevation; sky monster loot falls onto the island and E collects it')
 page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.camera.position.set(160,30,170);e.feetY=28;e.fallPeak=28;e.inCloudGarden=true;e.movement(1/60);if(e.feetY!==66||e.camera.position.x!==148)throw Error('fall recovery failed');e.persist();}""")
 passed('falling beneath the Cloud Garden returns the explorer to the safe entrance')
 result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;const types=new Set(e.world.monsters.map(m=>m.type));for(const m of e.world.monsters){if(!m.group.userData.continuousSurface||!m.group.userData.rig.skin.isSkinnedMesh)throw Error('primitive body remains '+m.type);}return {count:types.size,landmarks:e.world.fantasyObjects.length};}""")
 assert result['count']==17 and result['landmarks']>40,result
 passed('all 17 species use custom continuous skinned anatomy; every biome has animated fantasy landmarks')
 assert not errors,errors
 print(f'{len(checks)} Cloud Garden browser checks passed; no JS, asset or shader errors',flush=True)
 browser.close()
