"""Deterministic live-controller combat timing and high-quality visual captures."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-motions'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(60000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
    page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    results=page.evaluate("""async()=>{
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js'),{attributes}=await import('/src/state.js');e.paused=true;const out=[];
      e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=0;
      const m=e.world.monsters.find(m=>m.type==='wolf');m.x=0;m.z=-16;m.homeX=0;m.homeZ=-16;m.group.position.set(0,heightAt(0,-16),-16);m.freeze=0;m.slow=0;m.hit=0;m.attackAge=null;m.attackTimer=0;m.hp=1000;
      const hp=e.player.hp;e.updateMonsters(0);if(m.attackAge!==0||e.player.hp!==hp)throw Error('attack skipped windup');
      e.updateMonsters(.3);if(e.player.hp!==hp)throw Error('attack damaged early');e.camera.position.z=-8;e.updateMonsters(.2);if(e.player.hp!==hp)throw Error('attack cannot be dodged');
      m.x=0;m.z=-16;m.attackAge=null;m.attackTimer=0;e.camera.position.z=-14;e.updateMonsters(0);e.updateMonsters(.47);if(e.player.hp>=hp)throw Error('attack failed to impact');const after=e.player.hp;e.updateMonsters(.1);if(e.player.hp!==after)throw Error('attack hit twice');out.push('monster telegraph delays damage, permits retreat, hits once at impact');
      e.player.level=20;e.player.branch='knight';e.player.mana=999;e.warriorAction=null;e.cooldowns.fill(0);m.freeze=100;m.hp=1000;
      e.skill(4);if(!e.warriorAction||m.hp!==1000)throw Error('heavy skill missing windup');e.updateCombat(.41);if(m.hp!==1000)throw Error('heavy hit early');e.movement(0);if(e.weapon.position.y<=e.weapon.userData.base.y)throw Error('heavy weapon not raised');
      e.updateCombat(.02);if(m.hp>=1000)throw Error('heavy impact missing');const impacted=m.hp;e.updateCombat(.6);if(m.hp!==impacted)throw Error('heavy impact duplicated');out.push('judgment raises sword, delays impact and applies damage once');
      e.skill(2);if(e.player.buffs.guard>0)throw Error('guard skipped raising motion');e.updateCombat(.23);if(e.player.buffs.guard<=0)throw Error('guard motion failed');e.updateCombat(.6);out.push('guard raises weapon and activates damage reduction at motion impact');
      m.hp=1;e.hit(m,999);const id=e.player.groundLoot.at(-1).id;e.respawn();if(!e.player.groundLoot.some(d=>d.id===id)||!e.groundLoot.bags.has(id))throw Error('respawn lost dropped bag');
      e.paused=true;const corpse=e.world.monsters.find(m=>m.type==='golem');e.kill(corpse);e.updateMonsters(5.1);e.world.update(e.time,0,e.camera.position,true);if(corpse.group.visible)throw Error('corpse did not clear');
      e.time=corpse.respawnAt+.01;e.updateMonsters(0);e.updateMonsters(.016);if(!corpse.alive||corpse.hp!==corpse.def.hp||corpse.group.rotation.z!==0||corpse.group.scale.x!==corpse.def.scale)throw Error('respawn pose not reset');out.push('bags survive player respawn; corpses clear and monsters regenerate in a living pose');
      e.player.hp=attributes(e.player).maxHp;e.player.position={x:0,z:44};return out;
    }""")
    for result in results:print('PASS '+result,flush=True)
    page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.setQuality('high');e.camera.position.set(-4,heightAt(-4,39)+1.75,39);e.feetY=heightAt(-4,39);e.yaw=0;e.pitch=-.06;e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();e.paused=false;for(let i=0;i<30;i++)e.world.update(e.time,.03,e.camera.position,false);const n=e.world.npcs.find(n=>n.id==='rhea');if(Math.abs(Math.sin(n.group.rotation.y))>.15)throw Error('NPC did not face player');}""")
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.screenshot(path=str(out/'camp.png'),timeout=120000)
    page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.paused=true;e.camera.position.set(-80,heightAt(-80,5)+6,5);e.camera.lookAt(-130,-1,-32);e.camera.updateMatrixWorld();} """)
    page.screenshot(path=str(out/'lake.png'),timeout=120000)
    assert errors==[],errors
    print('4 combat timing checks passed; high-quality camp/lake rendered; no JS/shader errors',flush=True)
    browser.close()
