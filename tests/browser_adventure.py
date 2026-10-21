"""v0.3 actual WebGL, quest dialogue, delayed melee, rigs and physical loot.
Use the Vite dev server. State fixtures avoid hours of levelling or random drops.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-adventure'));out.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(name):checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(60000);errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
    page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.world.npcs.length')==3
    def approach(npc):
        page.evaluate("""async id=>{const e=window.__AETHERWILD__.engine,n=e.world.npcs.find(n=>n.id===id),{heightAt}=await import('/src/terrain.js');e.camera.position.set(n.x,heightAt(n.x,n.z+2)+1.75,n.z+2);e.feetY=heightAt(n.x,n.z+2);e.fallPeak=e.feetY;e.vy=0;e.yaw=0;e.pitch=-.07;}""",npc)
        page.keyboard.press('KeyE');page.wait_for_selector('[data-quest]')
    approach('rhea');assert '레아' in page.locator('#panel-title').inner_text()
    page.click('[data-quest="road"]');assert page.evaluate('window.__AETHERWILD__.engine.player.quests.road.status')=='active'
    assert page.locator('[data-quest="road"]').is_disabled()
    page.screenshot(path=str(out/'npc-dialogue.png'),timeout=120000)
    passed('E opens named NPC dialogue; real accept button creates one active quest')
    page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    result=page.evaluate("""async ()=>{
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.paused=true;
      e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=-.15;e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();
      const m=e.world.monsters.find(m=>m.type==='slime');m.x=0;m.z=-17;m.homeX=0;m.homeZ=-17;m.group.position.set(0,heightAt(0,-17),-17);m.hp=1000;m.alive=true;m.freeze=100;
      e.attackCooldown=0;e.warriorAction=null;e.attack();if(!e.warriorAction||m.hp!==1000)throw Error('melee hit before windup');
      e.updateCombat(.17);if(m.hp!==1000)throw Error('early melee damage');e.movement(0);const windup=e.weapon.rotation.z;
      e.updateCombat(.03);if(m.hp>=1000)throw Error('melee failed at impact');const hp=m.hp;e.updateCombat(.15);e.movement(0);if(m.hp!==hp)throw Error('melee damaged twice');if(Math.abs(e.weapon.rotation.z-windup)<.2)throw Error('weapon did not animate');
      e.updateCombat(.3);e.attackCooldown=0;window.testMonster=m;return true;
    }""")
    assert result;passed('warrior windup delays damage; impact hits once and sword visibly follows through')
    result=page.evaluate("""async ()=>{
      const e=window.__AETHERWILD__.engine,{animateMonster}=await import('/src/actors.js');
      for(const type of ['wolf','boar','golem','drake','spirit','slime']){
        const m=e.world.monsters.find(m=>m.type===type),r=m.group.userData.rig;m.freeze=0;m.moveSpeed=m.def.speed;m.attackAge=null;m.aggro=true;
        animateMonster(m,.016,.12);const first=r.legs[0]?.rotation.x??r.torso.scale.y??r.core.rotation.y;animateMonster(m,.016,.35);const second=r.legs[0]?.rotation.x??r.torso.scale.y??r.core.rotation.y;
        if(type!=='spirit'&&Math.abs(first-second)<.001)throw Error(type+' missing gait');
        if(r.head){m.attackAge=.5;animateMonster(m,.016,.35);if(Math.abs(r.torso.rotation.x)<.05)throw Error(type+' missing attack');}
        m.hit=.16;animateMonster(m,.016,.35);if(Math.abs(r.torso.rotation.x)<.05)throw Error(type+' missing flinch');m.hit=0;m.attackAge=null;
      }return true;
    }""")
    assert result;passed('six monster shapes have independent gait, attack and hit poses on articulated rigs')
    result=page.evaluate("""()=>{
      const e=window.__AETHERWILD__.engine,m=window.testMonster,p=e.player,before=p.inventory.slime||0,gold=p.gold;
      m.hp=1;e.hit(m,100);if(m.alive||!m.group.visible||m.deathAge!==0)throw Error('corpse removed instantly');
      if((p.inventory.slime||0)!==before||p.gold!==gold)throw Error('auto loot');
      const d=p.groundLoot.at(-1),b=e.groundLoot.bags.get(d.id),y=b.group.position.y;e.groundLoot.update(.1,e.time,e.camera.position);e.groundLoot.update(.2,e.time,e.camera.position);
      if(b.group.position.y===y)throw Error('bag did not fall');e.updateMonsters(.7);if(m.group.userData.rig.torso.scale.y>.5)throw Error('slime did not collapse');
      window.testBagId=d.id;window.testItemBefore=before;return true;
    }""")
    assert result;passed('death retains animated corpse; items and gold fall as a physical bag without auto-collection')
    page.evaluate('window.__AETHERWILD__.engine.persist()');page.reload(wait_until='networkidle');page.click('#continue-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.player.groundLoot.length')==1
    assert page.evaluate('window.__AETHERWILD__.engine.player.quests.road.status')=='active'
    assert page.evaluate('window.__AETHERWILD__.engine.player.killsByType.slime')==1
    page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,b=e.player.groundLoot[0],{heightAt}=await import('/src/terrain.js');e.camera.position.set(b.x,heightAt(b.x,b.z)+1.75,b.z+1);e.feetY=heightAt(b.x,b.z+1);e.fallPeak=e.feetY;e.vy=0;}""")
    page.wait_for_function('window.__AETHERWILD__.engine.nearestInteractable()?.type==="loot"')
    page.screenshot(path=str(out/'ground-loot.png'),timeout=120000)
    page.keyboard.press('KeyE');page.wait_for_function('window.__AETHERWILD__.engine.player.groundLoot.length===0')
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.slime')>=1
    count=page.evaluate('window.__AETHERWILD__.engine.player.inventory.slime');page.keyboard.press('KeyE');assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.slime')==count
    passed('uncollected bag and quest progress survive reload; E grants stored contents once')
    page.evaluate('window.__AETHERWILD__.engine.player.killsByType.slime=3')
    approach('rhea');assert page.locator('[data-quest="road"]').inner_text()=='완료 보고 · 보상 받기'
    page.click('[data-quest="road"]');assert page.evaluate('window.__AETHERWILD__.engine.player.quests.road.status')=='completed'
    assert page.locator('[data-quest="road"]').is_disabled();passed('returning to original NPC reports objective and grants one-time rewards')
    page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked');approach('elia');page.click('[data-quest="herbs"]')
    page.evaluate('window.__AETHERWILD__.engine.player.inventory.herb=4')
    page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked');approach('elia');page.click('[data-quest="herbs"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.herb')==0
    assert page.locator('[data-quest="brewer"]').is_enabled()
    page.click('[data-quest="brewer"]');page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    page.keyboard.press('KeyJ');page.wait_for_selector('.npc-quest-grid');assert page.locator('.npc-quest').count()==6
    passed('delivery consumes materials, unlocks next quest and journal shows all six NPC quests')
    page.evaluate('window.__AETHERWILD__.engine.persist()');page.reload(wait_until='networkidle');page.click('#continue-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.player.quests.road.status')=='completed'
    assert page.evaluate('window.__AETHERWILD__.engine.player.quests.brewer.status')=='active'
    assert page.evaluate('window.__AETHERWILD__.engine.player.groundLoot.length')==0
    passed('completed quests, unlocked chain and collected-bag removal remain saved')
    assert errors==[],errors
    browser.close()
print(f'{len(checks)} adventure checks passed; no JS or shader errors',flush=True)
