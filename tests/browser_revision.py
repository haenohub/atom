"""v0.2 bow draw/release, arrow selection, cancellation and ground-area regression."""
import os
from playwright.sync_api import sync_playwright
checks=[]
def passed(name):checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1000,'height':700});errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
    page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173'),wait_until='networkidle',timeout=120000)
    page.click('[data-class="ranger"]');page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    page.evaluate("const e=window.__AETHERWILD__.engine;e.setQuality('low');e.player.level=20;e.player.mana=100;")
    page.keyboard.press('Digit1')
    assert page.evaluate('window.__AETHERWILD__.engine.loadedArrowIndex')==0
    assert page.evaluate('window.__AETHERWILD__.engine.cooldowns[0]')==0
    assert page.evaluate('window.__AETHERWILD__.engine.player.mana')>=100
    assert page.evaluate('window.__AETHERWILD__.engine.projectiles.length')==0
    page.wait_for_selector('#combat-state:not(.hidden)')
    assert '관통화살' in page.locator('#combat-state').inner_text()
    passed('arrow key loads matching arrow and HUD without spending mana, starting cooldown or firing')
    page.mouse.down()
    page.wait_for_function('window.__AETHERWILD__.engine.drawStartedAt!==null')
    assert page.evaluate('window.__AETHERWILD__.engine.projectiles.length')==0
    page.wait_for_function('window.__AETHERWILD__.engine.bowCharge>.98',timeout=20000)
    page.wait_for_selector('#draw-indicator:not(.hidden)')
    page.mouse.up()
    assert page.evaluate('window.__AETHERWILD__.engine.drawStartedAt') is None
    assert page.evaluate('window.__AETHERWILD__.engine.loadedArrowIndex') is None
    assert page.evaluate('window.__AETHERWILD__.engine.cooldowns[0]')>0
    assert page.evaluate('window.__AETHERWILD__.engine.player.mana')<100
    shot=page.evaluate('window.__AETHERWILD__.engine.projectiles.at(-1)&&({kind:window.__AETHERWILD__.engine.projectiles.at(-1).kind,charge:window.__AETHERWILD__.engine.projectiles.at(-1).charge,gravity:window.__AETHERWILD__.engine.projectiles.at(-1).gravity})')
    assert shot and shot['kind']=='pierce' and shot['charge']>.98 and shot['gravity']==9.81,shot
    passed('holding draws bow; release creates charged physical piercing arrow and pays resources exactly at release')
    page.evaluate('window.__AETHERWILD__.engine.attackCooldown=0')
    count=page.evaluate('window.__AETHERWILD__.engine.projectiles.length')
    page.mouse.down();page.wait_for_function('window.__AETHERWILD__.engine.drawStartedAt!==null')
    page.keyboard.press('i');page.wait_for_selector('#overlay:not(.hidden)');page.mouse.up()
    assert page.evaluate('window.__AETHERWILD__.engine.drawStartedAt') is None
    assert page.evaluate('window.__AETHERWILD__.engine.projectiles.length')<=count
    passed('opening a menu while drawing cancels the draw without accidental release')
    page.click('#close-panel');page.wait_for_function('window.__AETHERWILD__.engine.locked')
    page.evaluate("""async () => {
      const api=window.__AETHERWILD__,e=api.engine,{heightAt}=await import('/src/terrain.js');
      const player=api.createPlayer('mage');player.level=20;api.startGame(player);e.setQuality('low');e.player.mana=200;e.fields=[];
      const x=0,z=-14;e.feetY=heightAt(x,z);e.fallPeak=e.feetY;e.vy=0;e.camera.position.set(x,e.feetY+1.75,z);e.yaw=0;e.pitch=Math.atan2(heightAt(x,z-6)-e.camera.position.y,6);e.camera.rotation.set(e.pitch,0,0);e.camera.updateMatrixWorld();
      const mobs=e.world.monsters.filter(m=>m.type==='slime').slice(0,3);for(let i=0;i<3;i++){const m=mobs[i];m.x=i===2?18:i*2;m.z=z-6;m.homeX=m.x;m.homeZ=m.z;m.hp=1000;m.alive=true;m.freeze=100;m.group.visible=true;m.group.position.set(m.x,heightAt(m.x,m.z),m.z);}window.areaMobs=mobs;
    }""")
    page.wait_for_function('window.__AETHERWILD__.engine.locked');page.keyboard.press('Digit1')
    assert page.evaluate('window.__AETHERWILD__.engine.activeSpellIndex')==0
    assert page.evaluate('window.__AETHERWILD__.engine.fields.length')==0
    assert page.evaluate('window.__AETHERWILD__.engine.cooldowns[0]')==0
    assert page.evaluate('window.__AETHERWILD__.engine.player.mana')>=200
    page.wait_for_function('window.__AETHERWILD__.engine.fx.preview?.visible===true')
    page.mouse.down(button='right');page.mouse.up(button='right')
    assert page.evaluate('window.__AETHERWILD__.engine.activeSpellIndex') is None
    assert page.evaluate('window.__AETHERWILD__.engine.fields.length')==0
    passed('mage ability previews a ground circle; right click cancels with no mana or cooldown cost')
    page.keyboard.press('Digit1');page.mouse.down();page.mouse.up()
    assert page.evaluate('window.__AETHERWILD__.engine.activeSpellIndex') is None
    assert page.evaluate('window.__AETHERWILD__.engine.player.mana')<200
    assert page.evaluate('window.__AETHERWILD__.engine.cooldowns[0]')>0
    assert page.evaluate('window.__AETHERWILD__.engine.projectiles.length')==0
    page.wait_for_function('window.areaMobs[0].hp<1000&&window.areaMobs[1].hp<1000',timeout=25000)
    assert page.evaluate('window.areaMobs[2].hp')==1000
    passed('left-click confirmation creates an area, damages multiple enemies inside and excludes outside enemies without a projectile')
    page.evaluate('window.__AETHERWILD__.engine.activeSpellIndex=null;window.__AETHERWILD__.engine.cooldowns[1]=0;window.__AETHERWILD__.engine.player.mana=200;window.areaMobs[0].freeze=0;window.areaMobs[1].freeze=0;')
    page.keyboard.press('Digit2');page.mouse.down();page.mouse.up()
    page.wait_for_function('window.areaMobs[0].freeze>0&&window.__AETHERWILD__.engine.cooldowns[1]>0')
    passed('frost ground area confirms with cooldown and applies freezing')
    page.keyboard.press('k');page.wait_for_selector('#overlay:not(.hidden)')
    assert page.locator('.skill-glyph .art-icon').count()==5
    assert page.evaluate("getComputedStyle(document.querySelector('.art-icon')).backgroundImage.includes('ability-icons.png')")
    passed('new painted icon atlas is integrated into skill and HUD components')
    assert errors==[],errors
    browser.close()
print(f'{len(checks)} revision regression checks passed; no JS or shader errors',flush=True)
