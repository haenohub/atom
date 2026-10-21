"""Real Chromium smoke tests. Run against `npm run dev`.
Optional tools: pip install playwright; install Chromium or set CHROMIUM_PATH.
No test fixtures are shipped in production; /src debug access is Vite-dev only.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('GAME_URL', 'http://127.0.0.1:5173')
ARTIFACTS = Path(os.environ.get('GAME_ARTIFACTS', '/tmp/aetherwild-browser'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
errors = []
checks = []

def passed(name):
    checks.append(name)
    print(f'PASS {name}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1000, 'height': 700}, device_scale_factor=1)
    page.on('pageerror', lambda e: (errors.append(str(e)), print('BROWSER ERROR', str(e), flush=True)))
    page.goto(URL, wait_until='networkidle')
    page.wait_for_selector('#welcome:not(.hidden)', timeout=60000)
    assert page.locator('.class-choice').count() == 3
    page.screenshot(path=str(ARTIFACTS / 'title.png'))
    passed('WebGL world renders and three classes are selectable')
    page.click('[data-class="mage"]')
    page.click('#new-game')
    page.wait_for_function('window.__AETHERWILD__.engine.locked && !window.__AETHERWILD__.engine.paused')
    assert page.evaluate('window.__AETHERWILD__.engine.player.classId') == 'mage'
    page.evaluate("window.__AETHERWILD__.engine.setQuality('low')")
    passed('new mage game starts with actual pointer lock')
    before = page.evaluate('window.__AETHERWILD__.engine.camera.position.z')
    page.keyboard.down('KeyW')
    page.wait_for_function(f'window.__AETHERWILD__.engine.camera.position.z < {before-1}', timeout=30000)
    page.keyboard.up('KeyW')
    passed('real WASD input moves the player')
    page.keyboard.press('Space')
    page.wait_for_function('!window.__AETHERWILD__.engine.grounded', timeout=10000)
    page.wait_for_function('window.__AETHERWILD__.engine.grounded', timeout=30000)
    passed('jump leaves ground and gravity lands player')
    page.evaluate("""async () => {
      const e=window.__AETHERWILD__.engine, {heightAt}=await import('/src/terrain.js');
      const n=e.world.nodes.find(n=>n.kind==='herb');
      e.camera.position.set(n.x,heightAt(n.x,n.z)+1.75,n.z+1);e.feetY=heightAt(n.x,n.z+1);e.fallPeak=e.feetY;e.vy=0;
      window.testNode=n;
    }""")
    page.keyboard.press('KeyE')
    page.wait_for_function('window.__AETHERWILD__.engine.player.stats.gathers===1')
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.herb') >= 2
    assert not page.evaluate('window.testNode.group.visible')
    passed('E gathers a real world node, grants materials, hides it for regrowth')
    page.evaluate("""async () => {
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');
      const c=e.world.chests[0]; e.camera.position.set(c.x,heightAt(c.x,c.z)+1.75,c.z+1);e.feetY=heightAt(c.x,c.z+1);e.fallPeak=e.feetY;e.vy=0;
    }""")
    page.keyboard.press('KeyE')
    page.wait_for_function('window.__AETHERWILD__.engine.player.stats.chests===1')
    page.keyboard.press('KeyE')
    assert page.evaluate('window.__AETHERWILD__.engine.player.stats.chests') == 1
    passed('treasure grants loot once and opened state is persistent')
    page.evaluate("""async () => {
      const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');
      const x=0,z=-14;e.camera.position.set(x,heightAt(x,z)+1.75,z);e.feetY=heightAt(x,z);e.fallPeak=e.feetY;e.vy=0;e.yaw=0;
      const m=e.world.monsters.find(m=>m.type==='slime');m.x=x;m.z=z-5;m.homeX=x;m.homeZ=z-5;m.hp=20;m.alive=true;m.group.visible=true;m.group.position.set(x,heightAt(x,z-5),z-5);m.freeze=100;
      e.pitch=Math.atan2(m.group.position.y-e.camera.position.y,5);e.camera.rotation.set(e.pitch,e.yaw,0);e.camera.updateMatrixWorld();e.cooldowns[0]=0;e.player.mana=100;window.testMonster=m;window.testKills=e.player.stats.kills;
    }""")
    page.keyboard.press('Digit1')
    page.wait_for_function('window.__AETHERWILD__.engine.activeSpellIndex===0')
    assert page.evaluate('window.__AETHERWILD__.engine.player.mana') >= 100
    page.mouse.down()
    page.mouse.up()
    page.wait_for_function('!window.testMonster.alive', timeout=60000)
    assert page.evaluate('window.__AETHERWILD__.engine.player.stats.kills > window.testKills')
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.slime > 0')
    assert page.evaluate('window.__AETHERWILD__.engine.projectiles.length') == 0
    passed('confirmed ground fire area kills creature, grants XP and loot without projectiles')
    page.evaluate('window.__AETHERWILD__.engine.player.mana=0;window.__AETHERWILD__.engine.cooldowns[0]=0;')
    page.keyboard.press('Digit1')
    page.wait_for_selector('.toast:text("마나가 부족합니다.")')
    passed('skills enforce actual mana requirements')
    page.keyboard.press('KeyC')
    page.wait_for_selector('#overlay:not(.hidden)')
    assert page.evaluate('window.__AETHERWILD__.engine.paused')
    page.evaluate("""() => {const p=window.__AETHERWILD__.engine.player;p.level=10;p.inventory.wood=3;p.inventory.crystal=2;p.inventory.water=1;}""")
    page.click('[data-filter="cooking"]')
    page.click('[data-filter="smith"]')
    page.click('[data-craft="crystalStaff"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.crystalStaff') == 1
    assert page.evaluate('window.__AETHERWILD__.engine.player.inventory.wood') == 0
    page.click('[data-tab="inventory"]')
    page.click('[data-item="crystalStaff"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.weapon') == 'crystalStaff'
    passed('craft UI consumes materials, creates weapon and inventory UI equips it')
    page.click('[data-tab="skills"]')
    page.click('[data-advance="archmage"]')
    page.wait_for_selector('.toast:text("새벽의 숲 야영지에서 전직할 수 있습니다.")')
    assert page.evaluate('window.__AETHERWILD__.engine.player.branch') is None
    page.evaluate("""async () => {const e=window.__AETHERWILD__.engine,{heightAt}=await import('/src/terrain.js');e.camera.position.set(0,heightAt(0,44)+1.75,44);e.feetY=heightAt(0,44);} """)
    page.click('[data-advance="archmage"]')
    assert page.evaluate('window.__AETHERWILD__.engine.player.branch') == 'archmage'
    page.wait_for_selector('.branch-card.chosen')
    passed('advancement UI requires camp, chooses archmage and unlocks branch skill')
    page.click('[data-tab="journal"]')
    assert page.locator('.bestiary-card').count() == 9
    assert '25%' in page.locator('#panel-content').inner_text()
    page.click('[data-tab="map"]')
    assert page.locator('#world-map').is_visible()
    page.screenshot(path=str(ARTIFACTS / 'map.png'))
    passed('journal exposes all nine drop tables and terrain map renders')
    page.click('[data-tab="settings"]')
    page.click('#manual-save')
    page.reload(wait_until='networkidle')
    page.wait_for_selector('#continue-game:not(.hidden)', timeout=60000)
    page.click('#continue-game')
    page.wait_for_function('window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.player.branch') == 'archmage'
    assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.weapon') == 'crystalStaff'
    assert page.evaluate('window.__AETHERWILD__.engine.world.chests[0].opened')
    passed('page reload and continue restore class, equipment, inventory and opened chest')
    page.evaluate("window.__AETHERWILD__.engine.hurt(9999,'smoke test')")
    page.wait_for_selector('#death:not(.hidden)')
    page.click('#respawn')
    page.wait_for_function('window.__AETHERWILD__.engine.player.hp>0 && window.__AETHERWILD__.engine.locked')
    assert page.evaluate('window.__AETHERWILD__.engine.camera.position.z') == 44
    assert page.evaluate('window.__AETHERWILD__.engine.player.equipment.weapon') == 'crystalStaff'
    passed('death and respawn return to camp without item loss')
    page.screenshot(path=str(ARTIFACTS / 'game.png'))
    assert errors == [], errors
    passed('no JavaScript runtime errors during full smoke flow')
    browser.close()
print(json.dumps({'passed': len(checks), 'errors': errors, 'artifacts': str(ARTIFACTS)}, ensure_ascii=False), flush=True)
