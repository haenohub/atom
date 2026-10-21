"""v0.6: actual equipment rebuilding, casting/rush motions, zero-CD blink and shadow AoE."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-forms'));out.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(msg):checks.append(msg);print('PASS '+msg,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':700});page.set_default_timeout(120000);errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
 page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR',m.text,flush=True)) if m.type=='error' else None)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
 page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 page.evaluate("const e=window.__AETHERWILD__.engine;e.player.level=20;for(const id of ['warrior_epic_helmet','warrior_epic_gloves','fireSword','dragonArmor'])e.player.inventory[id]=1;")
 page.keyboard.press('KeyI');page.wait_for_selector('#overlay:not(.hidden)');page.click('[data-item="warrior_epic_helmet"]')
 assert page.evaluate("window.__AETHERWILD__.engine.avatar.userData.equipment.helmet")=='warrior_epic_helmet'
 assert page.evaluate("window.__AETHERWILD__.engine.avatar.userData.equipment.armor")=='warrior_basic_armor'
 assert page.evaluate("window.__AETHERWILD__.engine.avatar.userData.rig.visuals.helmet[0].userData.equipmentId")=='warrior_epic_helmet'
 page.click('[data-item="warrior_epic_gloves"]')
 assert page.evaluate("window.__AETHERWILD__.engine.weapon.children.some(o=>o.userData.firstPersonHand&&o.userData.equipmentId==='warrior_epic_gloves')")
 page.click('[data-unequip="gloves"]')
 assert page.evaluate("window.__AETHERWILD__.engine.weapon.children.some(o=>o.userData.firstPersonHand&&o.userData.equipmentId===null)")
 page.click('[data-item="fireSword"]');assert page.evaluate('window.__AETHERWILD__.engine.weapon.userData.equipmentId')=='fireSword'
 page.click('[data-item="dragonArmor"]');assert page.evaluate('window.__AETHERWILD__.engine.avatar.userData.rig.visuals.armor[0].userData.equipmentId')=='dragonArmor'
 passed('real inventory clicks independently rebuild equipped helmet/armor, first-person gloves and selected weapon; glove removal updates both views')
 page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('F1');page.wait_for_function('window.__AETHERWILD__.engine.thirdPerson')
 page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.paused=true;for(const m of e.world.monsters){m.alive=false;m.deathAge=9;m.group.visible=false;}e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=0;e.camera.rotation.set(0,0,0);e.orbitYaw=Math.PI;e.keys.add('AltLeft');e.world.update(e.time,0,e.camera.position,true);e.updateView(0);e.renderer.render(e.scene,e.viewCamera);}""")
 page.screenshot(path=str(out/'v06-equipped-warrior.png'),timeout=120000)
 result=page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{createAvatar,disposeAvatar}=await import('/src/avatar.js'),{ITEMS}=await import('/src/data.js');const result={};for(const cls of ['warrior','ranger','mage']){
 const p=window.__AETHERWILD__.createPlayer(cls);p.level=20;for(const [id,it]of Object.entries(ITEMS))if(['armor','weapon'].includes(it.type)&&(!it.classId||it.classId===cls)){p.equipment[it.slot||it.type]=id;const a=createAvatar(p),r=a.userData.rig;let count=0,sum=0;a.traverse(o=>{if(o.geometry){count+=o.geometry.attributes.position.count;sum+=o.geometry.attributes.position.getY(0);}});result[id]=[count,sum];if(it.type==='weapon'&&r.weapon.userData.equipmentId!==id)throw Error('held model wrong '+id);if(it.type==='armor'&&!r.visuals[it.slot||it.type]?.some(o=>o.userData.equipmentId===id))throw Error('missing worn model '+id);disposeAvatar(a);}}
 if(Object.keys(result).length!==36)throw Error('equipment coverage');return result;}""")
 for ids in [['sword','ironSword','fireSword'],['bow','ironBow','fireBow'],['staff','crystalStaff','fireStaff']]:assert len({str(result[x]) for x in ids})==3,(ids,result)
 passed('all 36 equipment IDs produce visible worn/held geometry; every weapon tier has different real mesh geometry')
 result=page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.keys.clear();e.world.colliders=[];e.warriorAction=null;e.dash=null;e.player.mana=999;e.cooldowns.fill(0);e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.fallPeak=e.feetY;e.vy=0;e.yaw=0;e.pitch=-.1;e.camera.rotation.set(-.1,0,0);e.camera.updateMatrixWorld();const poses=[];
 for(let i=0;i<3;i++){e.attack();e.updateCombat(.14);e.movement(0);e.updateView(0);poses.push([...e.weapon.rotation.toArray().slice(0,3),e.avatar.userData.rig.torso.rotation.y]);e.updateCombat(1);}const m=e.world.monsters.find(m=>m.type==='wolf');m.alive=true;m.hp=10000;m.freeze=999;m.x=0;m.z=-20;m.group.position.set(0,heightAt(0,-20),-20);e.skill(1);e.updateCombat(.37);if(e.dash||m.hp!==10000)throw Error('rush skipped charge');e.updateCombat(.02);if(!e.dash)throw Error('rush did not start');const start=e.camera.position.z;for(let i=0;i<30;i++){e.movement(1/120);e.updateCombat(1/120);}if(start-e.camera.position.z<5)throw Error('rush did not travel');if(m.hp===10000)throw Error('rush collision did not hit');const hp=m.hp;for(let i=0;i<40;i++)e.movement(1/120);if(m.hp!==hp)throw Error('rush duplicate hit');return poses;}""")
 assert len({str(v) for v in result})==3,result
 passed('three basic poses differ; charged rush waits 0.38s then physically travels and damages a crossed target once')
 # Mage motion and no-cooldown teleport, using the actual controller.
 page.evaluate("""async()=>{const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');api.startGame(api.createPlayer('mage'));e.paused=true;e.world.colliders=[];e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.fallPeak=e.feetY;e.yaw=0;e.pitch=-.4;e.camera.rotation.set(-.4,0,0);e.camera.updateMatrixWorld();const mana=e.player.mana,z=e.camera.position.z;e.mobility();e.mobility();if(e.mobilityCooldown!==0||Math.abs(e.player.mana-(mana-30))>.001||z-e.camera.position.z<11.9)throw Error('blink still gated');e.mobilityCooldown=0;e.player.mana=0;const stopped=e.camera.position.z;e.mobility();if(e.camera.position.z!==stopped)throw Error('blink free mana');e.player.mana=150;e.skill(0);e.castTargetedSpell();e.updateCombat(.35);e.movement(0);e.updateView(0);if(e.weapon.position.y-e.weapon.userData.base.y<.2||e.avatar.userData.rig.arms[1].rotation.x<1.5)throw Error('staff not raised');e.avatar.updateMatrixWorld(true);const q=e.avatar.userData.rig.weapon.getWorldQuaternion(new e.camera.quaternion.constructor()),axis=new e.camera.position.constructor(0,1,0).applyQuaternion(q);if(axis.y<.85)throw Error('staff wrist points backward');window.castingSnapshot=e.castAction;}""")
 passed('mage can blink twice immediately, spends MP 15 each time, rejects missing mana, and raises staff for ground magic')
 page.screenshot(path=str(out/'v06-mage-casting.png'),timeout=120000)
 page.evaluate("""async()=>{const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');const p=api.createPlayer('ranger');p.level=15;p.branch='shadow';api.startGame(p);e.paused=true;e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.camera.rotation.set(0,0,0);e.camera.updateMatrixWorld();for(const m of e.world.monsters){m.alive=false;m.deathAge=9;m.group.visible=false;}window.shadowTargets=e.world.monsters.filter(m=>m.type==='wolf').slice(0,4);shadowTargets.forEach((m,i)=>{m.alive=true;m.hp=10000;m.freeze=999;m.x=i===2?19:i===1?3:0;m.z=-24;m.group.position.set(m.x,i===3?50:heightAt(m.x,m.z),m.z);});e.player.mana=100;e.paused=false;}""")
 page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('Digit4')
 result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;return {hp:shadowTargets.map(m=>m.hp),cd:e.cooldowns[3],loaded:e.loadedArrowIndex,projectiles:e.projectiles.length,visual:e.fx.items.some(x=>x.spellKind==='shadowVolley'),name:document.querySelectorAll('.skill-slot')[3].innerText};}""")
 assert result['hp'][0]<10000 and result['hp'][1]<10000 and result['hp'][2]==10000 and result['hp'][3]==10000,result
 assert result['cd']>0 and result['loaded'] is None and result['projectiles']==0 and result['visual'],result
 passed('native Digit4 immediately casts shadow level-ten AoE; hits two inside, excludes outside/vertical targets, spends cooldown without loading an arrow')
 result=page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;const types=[...new Set(e.world.monsters.map(m=>m.type))];for(const m of e.world.monsters)if(m.group.userData.designVersion!==6)throw Error('old design '+m.type);return types;}""")
 assert len(result)==17,result
 passed('all 17 species, including five distinct new anatomies, are redesigned and spawned in the playable world')
 assert not errors,errors;b.close();print(f'{len(checks)} forged-forms checks passed; no JS/shader/asset errors',flush=True)
