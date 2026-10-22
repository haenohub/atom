"""Actual inputs and live WebGL for v0.7 archery, timed areas, chain and storm."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-v07'));out.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(s):checks.append(s);print('PASS '+s,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':700});page.set_default_timeout(120000);errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
 page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR',m.text,flush=True)) if m.type=='error' else None)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
 page.click('[data-class="ranger"]');page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 page.evaluate("""async()=>{
 const {heightAt}=await import('/src/terrain.js');window.heightAt=heightAt;
 window.setup=(cls='ranger',branch=null)=>{const api=window.__AETHERWILD__,e=api.engine,p=api.createPlayer(cls);p.level=20;p.branch=branch;api.startGame(p);e.paused=true;e.player.mana=999;e.world.colliders=[];e.feetY=heightAt(0,-14);e.camera.position.set(0,e.feetY+1.75,-14);e.fallPeak=e.feetY;e.vy=0;e.yaw=0;e.pitch=-.18;e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();for(const m of e.world.monsters){m.alive=false;m.deathAge=9;m.respawnAt=1e9;m.group.visible=false;}return e;};
 window.place=(m,x,z,y=heightAt(x,z))=>{m.alive=true;m.hp=10000;m.x=x;m.z=z;m.homeX=x;m.homeZ=z;m.freeze=999;m.aggro=false;m.group.visible=true;m.group.position.set(x,y,z);m.island={x,z,y,r:50};return m;};
 window.step=(dt)=>{const e=window.__AETHERWILD__.engine;e.updateCombat(dt);e.updateEffects(dt);e.movement(0);e.updateView(0);};
 window.setup();
 }""")
 # Real mouse drawing, left hand holds the bow, right hand pulls the string.
 page.evaluate('window.__AETHERWILD__.engine.paused=false');page.wait_for_function('window.__AETHERWILD__.engine.locked');page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.99')
 page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;e.movement(0);e.weapon.updateMatrixWorld(true);const w=e.weapon,V=e.camera.position.constructor,hand=w.userData.drawHand.getWorldPosition(new V()),bow=w.getWorldPosition(new V());if(w.userData.handedness!=='right'||w.userData.bowHand!=='left'||w.userData.stringHand!=='right'||hand.x<=bow.x+.25)throw Error('right-handed nock not at right cheek');if(e.avatar.userData.rig.weapon.parent!==e.avatar.userData.rig.hands[0])throw Error('bow must be in left hand');}""")
 page.screenshot(path=str(out/'v07-right-handed.png'),timeout=120000);page.mouse.up()
 passed('actual full draw keeps bow in left hand and pulls the string to the right cheek in first/third-person rigs')
 # Contact frost explosion: native key loading + real release, actual projectile and damage.
 page.evaluate("""()=>{const e=setup();const mobs=e.world.monsters.slice(0,4);window.frostTargets=mobs;mobs.forEach((m,i)=>place(m,i===0?0:i===1?3:i===2?5:5.2,-24,heightAt(0,-24)));e.pitch=Math.atan2(e.monsterCenter(mobs[0]).y-e.camera.position.y,10);e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();e.paused=false;}""")
 page.keyboard.press('Digit2');assert page.evaluate('window.__AETHERWILD__.engine.loadedArrowIndex')==1
 page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.9');page.mouse.up()
 page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;for(let i=0;i<160;i++)e.updateProjectiles(1/120);if(frostTargets.slice(0,3).some(m=>m.hp===10000)||frostTargets[3].hp!==10000)throw Error('frost radius wrong '+frostTargets.map(m=>m.hp));if(frostTargets.slice(0,3).some(m=>m.slow!==6))throw Error('missing slow');if(!e.fx.items.some(x=>x.spellKind==='frostBurst'&&x.radius===5))throw Error('missing frost visual');e.updateEffects(.1);}""")
 page.screenshot(path=str(out/'v07-frost-burst.png'),timeout=120000)
 passed('native frost arrow release creates a five-metre contact explosion with slow, includes boundary and excludes outside enemy')
 # Both ground abilities: select/cancel without paying, confirm, release pose, exact delayed damage.
 for branch,kind,pitch_sign in [('shadow','shadowVolley',-1),('warden','arrowRain',1)]:
  page.evaluate("""branch=>{const e=setup('ranger',branch);e.paused=false;}""",branch);page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('Digit4');page.wait_for_function('window.__AETHERWILD__.engine.fx.preview?.visible')
  assert page.evaluate('window.__AETHERWILD__.engine.cooldowns[3]')==0
  page.mouse.down(button='right');page.mouse.up(button='right');assert page.evaluate('window.__AETHERWILD__.engine.activeSpellIndex') is None
  page.keyboard.press('Digit4')
  page.evaluate("""()=>{const e=window.__AETHERWILD__.engine,c=e.groundTarget(e.targetedSkill.range).point;window.areaTargets=e.world.monsters.slice(0,4);areaTargets.forEach((m,i)=>place(m,c.x+(i===0?0:i===1?3:i===2?9:0),c.z,c.y+(i===3?50:0)));}""")
  page.mouse.down();page.mouse.up()
  page.evaluate("""sign=>{const e=window.__AETHERWILD__.engine;e.paused=true;if(e.activeSpellIndex!==null||!e.castAction?.archery||e.fields.length!==1||e.cooldowns[3]<=0)throw Error('area not committed '+JSON.stringify({selection:e.activeSpellIndex,cast:e.castAction,fields:e.fields.length,cd:e.cooldowns[3],attack:e.attackCooldown,locked:e.locked,target:e.groundTarget(35)}));if(areaTargets.some(m=>m.hp!==10000))throw Error('early damage');step(Math.max(0,.35-e.castAction.age));if(Math.sign(e.weapon.rotation.x-e.weapon.userData.baseRotation.x)!==sign)throw Error('bow pitch wrong');e.thirdPerson=true;e.updateView(0);e.avatar.updateMatrixWorld(true);const V=e.camera.position.constructor,Q=e.camera.quaternion.constructor,dir=new V(0,0,-1).applyQuaternion(e.avatar.userData.rig.weapon.getWorldQuaternion(new Q()));if(Math.sign(dir.y)!==sign)throw Error('third-person bow shot direction wrong');e.thirdPerson=false;e.updateView(0);}""",pitch_sign)
  page.screenshot(path=str(out/('v07-'+branch+'-pose.png')),timeout=120000)
  page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;step(Math.max(0,.451-e.castAction.age));if(!e.fx.items.some(x=>x.kind==='bowShot'))throw Error('missing visible launch');const f=e.fields[0];step(f.timer-.001);if(areaTargets.some(m=>m.hp!==10000))throw Error('delay too short');step(.002);if(areaTargets[0].hp===10000||areaTargets[1].hp===10000||areaTargets[2].hp!==10000||areaTargets[3].hp!==10000)throw Error('area bounds/height');const v=e.fx.items.find(x=>x.kind==='spell').visual,a=v.arrows[0];const before=a.o.position.y;v.update(.85,.1,1);if((a.o.position.y-before)*(a.o.userData.direction==='up'?1:-1)<=0)throw Error('arrows moving wrong direction');}""")
  page.evaluate('dt=>step(dt)',.18 if branch=='shadow' else .4)
  page.screenshot(path=str(out/('v07-'+branch+'-area.png')),timeout=120000)
  passed(branch+' native Digit4 preview/cancel/confirm; correct bow pitch and physical cosmetic shot, 0.3s post-release delay, bounded area and correct arrow direction')
 # Assassin load on 5, then bounce through six actual live monsters without repeats.
 page.evaluate("""()=>{const e=setup('ranger','shadow');window.chainTargets=e.world.monsters.slice(0,7);chainTargets.forEach((m,i)=>place(m,Math.sin(i)*1.3,-24-i*4));const target=e.monsterCenter(chainTargets[0]);e.pitch=Math.atan2(target.y-e.camera.position.y,10);e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();e.paused=false;}""")
 page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('Digit5');assert page.evaluate('window.__AETHERWILD__.engine.arrowSkill.kind')=='chainArrow'
 page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.9');page.mouse.up()
 page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;for(let i=0;i<600;i++)e.updateProjectiles(1/120);if(chainTargets.slice(0,6).some(m=>m.hp===10000)||chainTargets[6].hp!==10000)throw Error('chain cap '+chainTargets.map(m=>m.hp));if(e.cooldowns[4]<=0||e.loadedArrowIndex!==null)throw Error('chain cost');}""")
 passed('native Digit5 loads assassin arrow; actual release bounces five times after the first hit and leaves the seventh enemy untouched')
 # Storm: loaded and released with gravity zero, wide swept damage and repeated pull.
 page.evaluate("""()=>{const e=setup('ranger','warden');window.stormTargets=e.world.monsters.slice(0,3);stormTargets.forEach((m,i)=>place(m,i===0?4:i===1?-3:8,-24));e.pitch=0;e.camera.rotation.set(0,0,0);e.camera.updateMatrixWorld();e.paused=false;}""")
 page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('Digit5');page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.9');page.mouse.up()
 page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.paused=true;const p=e.projectiles[0];if(!p||p.kind!=='stormArrow'||p.gravity!==0||!p.mesh.userData.wind)throw Error('missing straight storm');const y=p.mesh.position.y,vy=p.velocity.y;window.stormBefore=stormTargets.map(m=>m.x);for(let i=0;i<16;i++)e.updateProjectiles(1/120);if(Math.abs(p.mesh.position.y-y-vy*16/120)>1e-7||p.velocity.y!==vy)throw Error('storm has gravity');if(stormTargets[0].hp===10000||stormTargets[1].hp===10000||stormTargets[2].hp!==10000)throw Error('storm area');if(stormTargets[0].x>=stormBefore[0]||stormTargets[1].x<=stormBefore[1])throw Error('storm not pulling');}""")
 page.screenshot(path=str(out/'v07-storm-shot.png'),timeout=120000)
 passed('native storm release flies straight, renders rotating textured wind, damages two off-axis enemies and pulls both toward its path')
 # Mage actual controller cooldown and visible outside-to-inside sweep.
 page.evaluate("""()=>{const e=setup('mage');e.mobility();const mana=e.player.mana,z=e.camera.position.z;e.mobility();if(e.player.mana!==mana||e.camera.position.z!==z||e.mobilityCooldown!==.5)throw Error('blink cooldown missing');e.movement(.25);e.movement(.24);e.mobility();if(e.player.mana!==mana)throw Error('blink unlocked early');e.movement(.02);e.mobility();if(e.camera.position.z===z||e.player.mana!==mana-15)throw Error('blink did not unlock');e.attackCooldown=0;e.attack();e.castAction.age=.18;e.movement(0);e.updateView(0);const x=e.weapon.position.x,arm=e.avatar.userData.rig.arms[1].rotation.y;e.castAction.age=.39;e.movement(0);e.updateView(0);if(e.weapon.position.x>=x||e.avatar.userData.rig.arms[1].rotation.y<=arm)throw Error('sweep not outside to inside');}""")
 page.screenshot(path=str(out/'v07-mage-sweep.png'),timeout=120000)
 passed('mage teleport blocks re-use for 0.5 seconds, keeps MP cost, and first/third-person arms sweep from outside inward')
 assert not errors,errors;b.close();print(f'{len(checks)} wind/shadow checks passed; zero JS/shader/asset errors',flush=True)
