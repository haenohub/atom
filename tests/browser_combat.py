"""Exercise actual mouse basic attacks for all classes, all advanced skill kinds,
plus deterministic checks of the real movement/physics implementation."""
import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,
        args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1000,'height':700})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173'),wait_until='networkidle')
    page.click('#new-game')
    page.wait_for_function('window.__AETHERWILD__.engine.locked')
    page.evaluate("window.__AETHERWILD__.engine.setQuality('low')")
    for class_id in ['warrior','ranger','mage']:
        page.evaluate("""async classId => {
          const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');
          api.startGame(api.createPlayer(classId));
          const x=0,z=-14;e.camera.position.set(x,heightAt(x,z)+1.75,z);e.feetY=heightAt(x,z);e.fallPeak=e.feetY;e.vy=0;e.yaw=0;
          const m=e.world.monsters.find(m=>m.type==='slime');m.x=x;m.z=z-3;m.homeX=x;m.homeZ=z-3;m.hp=1;m.alive=true;m.group.visible=true;m.group.position.set(x,heightAt(x,z-3),z-3);m.freeze=100;
          e.pitch=Math.atan2(m.group.position.y+1.1-e.camera.position.y,3);e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();e.attackCooldown=0;window.target=m;
        }""", class_id)
        page.wait_for_function('window.__AETHERWILD__.engine.locked')
        page.mouse.down()
        if class_id == 'ranger': page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.95', timeout=15000)
        page.mouse.up()
        page.wait_for_function('!window.target.alive',timeout=30000)
        print(f'PASS {class_id} actual mouse basic attack hits and kills',flush=True)
    result=page.evaluate("""async () => {
      const {createPlayer,attributes,advance}=await import('/src/state.js');
      const {CLASSES}=await import('/src/data.js');
      const {heightAt,WATER_LEVEL}=await import('/src/terrain.js');
      const e=window.__AETHERWILD__.engine;e.paused=true;const results=[];
      for(const classId of Object.keys(CLASSES))for(const branch of CLASSES[classId].branches){
        const p=createPlayer(classId);p.level=20;advance(p,branch,true);e.player=p;e.castAction=null;e.cooldowns.fill(0);
        for(const i of [3,4]){
          p.mana=999;e.cooldowns[i]=0;e.activeSpellIndex=null;e.loadedArrowIndex=null;
          e.camera.position.set(0,heightAt(0,44)+1.75,44);e.feetY=heightAt(0,44);e.camera.rotation.set(-.3,0,0);e.camera.updateMatrixWorld();
          e.warriorAction=null;e.skill(i);
          if(classId==='ranger'&&e.loadedArrowIndex===i){if(e.loadedArrowIndex!==i||p.mana!==999)throw Error('arrow selection spent resources');e.attackCooldown=0;e.beginBow();e.drawStartedAt=performance.now()-1300;e.releaseBow();}
          else if(e.activeSpellIndex!==null){if(p.mana!==999)throw Error('target selection spent resources');e.castTargetedSpell();}
          if(classId==='warrior'||classId==='ranger')for(let frame=0;frame<60;frame++)e.updateCombat(1/60);
          if(!(e.cooldowns[i]>0))throw Error(branch+' did not cast');
        }
        if(!Number.isFinite(p.hp)||!Number.isFinite(p.mana))throw Error(branch+' invalid stats');
        results.push(branch+' advanced skills');
      }
      e.player=createPlayer('warrior');e.keys.clear();e.camera.position.set(0,heightAt(0,44)+1.75,44);e.feetY=heightAt(0,44)+14;e.fallPeak=e.feetY;e.vy=0;e.grounded=false;
      for(let i=0;i<140;i++)e.movement(1/60);
      if(!(e.player.hp<attributes(e.player).maxHp&&e.grounded))throw Error('falling damage failed');results.push('falling damage and floor collision');
      e.feetY=WATER_LEVEL-.7;e.fallPeak=e.feetY;e.camera.position.set(-130,e.feetY+1.75,-32);e.vy=0;
      e.movement(1/60);if(!e.swimming||Math.abs(e.feetY-(WATER_LEVEL-.7))>.1)throw Error('swimming surface failed');results.push('lake swimming surface');
      const x=5,z=44,y=heightAt(x,z);e.camera.position.set(x,y+1.75,z);e.feetY=y;e.fallPeak=y;e.vy=0;e.yaw=0;e.keys.clear();e.keys.add('KeyW');e.world.colliders.push({x,z:z-2,r:1});
      for(let i=0;i<60;i++)e.movement(1/60);e.keys.clear();const dist=Math.hypot(e.camera.position.x-x,e.camera.position.z-(z-2));if(dist<1.4)throw Error('obstacle collision failed');results.push('solid obstacle collision');
      return results;
    }""")
    for name in result:print('PASS '+name,flush=True)
    assert errors==[],errors
    browser.close()
    print(f'{3+len(result)} combat/physics checks passed; no JS errors',flush=True)
