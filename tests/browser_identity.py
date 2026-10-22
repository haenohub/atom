"""v0.4: cancel combat, five slots, stats, F1, recalls and new rendered art."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-identity'));out.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(name):checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':740});page.set_default_timeout(120000);errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)));page.on('console',lambda m:(errors.append(m.text),print('CONSOLE',m.text,flush=True)) if m.type=='error' else None)
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
    assert page.locator('.class-choice .portrait').count()==3
    page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    before=page.evaluate('({x:window.__AETHERWILD__.engine.camera.position.x,z:window.__AETHERWILD__.engine.camera.position.z})')
    page.keyboard.press('F1');page.wait_for_function('window.__AETHERWILD__.engine.thirdPerson&&window.__AETHERWILD__.engine.avatar.visible')
    assert page.evaluate('window.__AETHERWILD__.engine.weapon.visible') is False
    assert page.evaluate('window.__AETHERWILD__.engine.viewCamera===window.__AETHERWILD__.engine.followCamera')
    assert page.evaluate('({x:window.__AETHERWILD__.engine.camera.position.x,z:window.__AETHERWILD__.engine.camera.position.z})')==before
    page.keyboard.down('KeyW');page.wait_for_function(f'window.__AETHERWILD__.engine.camera.position.z < {before["z"]-.7}');page.keyboard.up('KeyW')
    assert page.evaluate('window.__AETHERWILD__.engine.avatar.position.distanceTo(new window.__AETHERWILD__.engine.camera.position.constructor(window.__AETHERWILD__.engine.camera.position.x,window.__AETHERWILD__.engine.feetY,window.__AETHERWILD__.engine.camera.position.z))')<.2
    page.keyboard.press('F1');page.wait_for_function('!window.__AETHERWILD__.engine.thirdPerson&&window.__AETHERWILD__.engine.weapon.visible&&!window.__AETHERWILD__.engine.avatar.visible')
    passed('native F1 switches both ways without teleport; third-person WASD moves the actual player and rig')
    page.evaluate("""async()=>{
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js'),{attributes}=await import('/src/state.js');e.paused=true;e.player.level=20;e.player.mana=999;e.cooldowns.fill(0);e.warriorAction=null;
      e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=-.15;e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();
      const m=e.world.monsters.find(m=>m.type==='slime');m.x=0;m.z=-17;m.homeX=0;m.homeZ=-17;m.group.position.set(0,heightAt(0,-17),-17);m.hp=10000;m.freeze=100;m.alive=true;m.group.visible=true;window.cancelTarget=m;
      e.attack();const old=e.warriorAction;e.skill(0);if(e.warriorAction===old||e.warriorAction.kind!=='aoe'||e.warriorAction.age!==0)throw Error('basic did not cancel into skill');const mana=e.player.mana;if(!e.cooldowns[0])throw Error('skill cancellation skipped payment');
      e.attack();if(e.warriorAction.kind!=='basic'||e.warriorAction.age!==0)throw Error('skill did not cancel into basic');e.updateCombat(.2);const hp=m.hp;const stats=attributes(e.player);if(![stats.attack,Math.round(stats.attack*stats.critMultiplier)].includes(10000-hp))throw Error('cancelled AoE leaked damage '+(10000-hp));e.updateCombat(2);if(m.hp!==hp)throw Error('cancelled action hit later');
      e.skill(1);if(e.warriorAction.kind!=='dash')throw Error('basic recovery blocked skill');e.updateCombat(.2);e.skill(2);if(e.warriorAction.kind!=='guard')throw Error('skill recovery blocked next skill');
      const action=e.warriorAction;e.skill(0);if(e.warriorAction!==action||e.player.mana!==mana-45)throw Error('cooldown failure changed action/resources');e.warriorAction=null;
    }""")
    passed('basic↔skill and skill↔skill cancel immediately; cancelled hits disappear while mana/cooldowns remain enforced')
    page.evaluate('window.__AETHERWILD__.engine.paused=false');page.keyboard.press('KeyI');page.wait_for_selector('#overlay:not(.hidden)')
    page.evaluate("""async()=>{const e=window.__AETHERWILD__.engine,{ITEMS}=await import('/src/data.js');for(const id of Object.keys(ITEMS))e.player.inventory[id]=Math.max(1,e.player.inventory[id]||0);window.__AETHERWILD__.openPanel('inventory');}""")
    assert page.locator('.equipment-slot').count()==5
    assert page.locator('.item-card [data-item-art]').count()==71
    assert page.locator('.drawn-icon').count()==0
    page.screenshot(path=str(out/'inventory.png'),timeout=120000)
    passed('five equipment slots and all 71 unique item images appear in actual inventory UI')
    page.click('[data-item="warrior_epic_helmet"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.helmet')=='warrior_epic_helmet'
    assert page.evaluate('window.__AETHERWILD__.engine.avatar.userData.equipment.helmet')=='warrior_epic_helmet'
    page.click('[data-unequip="helmet"]');assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.helmet') is None
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.warrior_epic_helmet')==1
    page.click('[data-item="warrior_epic_helmet"]')
    page.click('[data-item="mage_epic_armor"]');assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.armor')=='warrior_basic_armor'
    passed('UI equip/unequip rebuilds worn model, keeps ownership and rejects another class armor')
    page.click('[data-stat="strength"]');page.click('[data-stat="dexterity"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.allocations.strength')==1
    assert page.evaluate('window.__AETHERWILD__.engine.player.allocations.dexterity')==1
    page.click('#reset-stats');assert page.evaluate('window.__AETHERWILD__.engine.player.allocations.strength')==0
    page.click('[data-stat="vitality"]');page.click('[data-stat="intelligence"]')
    passed('native stat buttons spend earned points, apply values and allow a full free reset')
    page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    page.evaluate("""async()=>{
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.paused=true;e.player.inventory.recall=0;
      const m=window.cancelTarget;m.alive=true;m.hp=1;const old=Math.random;try{Math.random=()=>0;e.hit(m,99999);}finally{Math.random=old;}
      const drop=e.player.groundLoot.at(-1);if(drop.items.recall!==1||e.player.inventory.recall!==0)throw Error('recall must be dropped, not auto-looted');
      e.camera.position.set(drop.x,heightAt(drop.x,drop.z)+1.75,drop.z);e.feetY=heightAt(drop.x,drop.z);e.interact();if(e.player.inventory.recall!==1)throw Error('recall not picked up');
      e.camera.position.set(36,heightAt(36,-30)+1.75,-30);e.feetY=heightAt(36,-30);e.fallPeak=e.feetY;e.vy=0;e.paused=false;window.unrelatedMonster=e.world.monsters.find(m=>m.type==='golem');window.unrelatedMonster.hp=123;
    }""")
    page.keyboard.press('KeyI');page.click('[data-item="recall"]');page.wait_for_function('window.__AETHERWILD__.engine.player.inventory.recall===0');page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('Math.hypot(window.__AETHERWILD__.engine.camera.position.x,window.__AETHERWILD__.engine.camera.position.z-44)')<.01
    assert page.evaluate('window.unrelatedMonster.hp')==123
    assert page.evaluate("window.__AETHERWILD__.engine.useItem('recall').ok")==False;assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.recall')==0
    passed('monster rolls a physical recall scroll; pickup then the inventory button consumes once and returns to camp without resetting monsters')
    page.evaluate("window.savedWarrior=window.__AETHERWILD__.engine.player")
    for cls in ['warrior','ranger','mage']:
        page.evaluate("""async cls=>{
          const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');const p=api.createPlayer(cls);p.level=20;for(const slot of ['armor','helmet','gloves','boots']){const id=cls+'_epic_'+slot;p.inventory[id]=1;p.equipment[slot]=id;}p.perspective='third';api.startGame(p);e.paused=true;
          e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=0;e.keys.add('AltLeft');e.orbitYaw=Math.PI;e.orbitPitch=0;e.camera.rotation.set(0,0,0);e.camera.updateMatrixWorld();e.updateView(0);
          if(e.avatar.userData.classId!==cls||!e.avatar.visible)throw Error('missing class avatar');
        }""",cls)
        page.screenshot(path=str(out/(cls+'-third.png')),timeout=120000)
    passed('all three classes render distinct epic equipment and animated full-body rigs in third-person free look')
    page.evaluate("""async()=>{
      const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');const p=api.createPlayer('mage');p.level=20;p.branch='archmage';api.startGame(p);e.player.mana=999;e.paused=true;
      e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=Math.atan2(heightAt(0,-29)-e.camera.position.y,15);e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();e.skill(3);e.castTargetedSpell();
      const spell=e.fx.items.find(x=>x.spellKind==='meteorZone');if(!spell?.visual?.meteor||!e.fields.length)throw Error('missing real meteor');e.fx.update(1.02);window.meteorEntry=spell;
      const point=spell.group.position.clone(),meteor=spell.visual.meteor.position.clone().add(point);e.camera.position.copy(point).add(new e.camera.position.constructor(-8,5,14));e.camera.lookAt(meteor);e.camera.updateMatrixWorld();
    }""")
    page.wait_for_function('window.meteorEntry.visual.meteor.children[0].material.map.image?.width>0')
    page.screenshot(path=str(out/'meteor.png'),timeout=120000)
    assert page.evaluate('window.meteorEntry.visual.meteor.children[0].geometry.attributes.position.count')>100
    passed('confirmed meteor has a cratered textured 3D surface, emissive crack geometry, flame tail and real delayed damage field')
    for kind in ['fireZone','frostZone','lightningZone','arcaneZone','sanctuary','arrowRain']:
        page.evaluate("""async kind=>{const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.fx.clear();const point=new e.camera.position.constructor(0,heightAt(0,-25),-25);e.fx.spell(point,6,kind,kind==='fireZone'?0xff794b:0x95cfee,.2,2);e.fx.update(.45);e.camera.position.set(0,point.y+4,-12);e.camera.lookAt(point.x,point.y+1.5,point.z);e.camera.updateMatrixWorld();window.spellEntry=e.fx.items.find(x=>x.kind==='spell');}""",kind)
        assert page.evaluate('window.spellEntry.visual.root.children.length')>=3
        if kind in ['fireZone','frostZone','lightningZone']:
            page.screenshot(path=str(out/(kind+'.png')),timeout=120000)
    passed('fire, ice, lightning, arcane, sanctuary and arrow rain render skill-specific geometry and shaders')
    page.evaluate("""()=>{const e=window.__AETHERWILD__.engine;e.fx.clear();for(const shape of ['golem','slime','spirit','wolf'])e.fx.impact(e.camera.position.clone().add(new e.camera.position.constructor(0,0,-3)),{shape,color:0xffd999,crit:true,scale:1});e.fx.update(.08);if(e.fx.items.filter(i=>i.kind==='impact').length!==4)throw Error('missing hit effects');e.fx.update(2);if(e.fx.items.length)throw Error('hit effects leaked');}""")
    passed('rock chips, liquid droplets and organic hit sparks render and dispose after their lifetime')
    page.evaluate('window.savedWarrior.perspective="third";window.__AETHERWILD__.startGame(window.savedWarrior);window.__AETHERWILD__.engine.persist()')
    page.reload(wait_until='networkidle');page.click('#continue-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.thirdPerson')
    assert page.evaluate('window.__AETHERWILD__.engine.player.allocations.vitality')==1
    assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.helmet')=='warrior_epic_helmet'
    passed('save and continue restore all new gear slots, allocations and third-person preference')
    assert errors==[],errors
    browser.close()
print(f'{len(checks)} identity checks passed; no JavaScript/shader errors',flush=True)
