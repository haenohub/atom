"""Run against a built game server; uses DOM and actual input, no dev hooks."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('GAME_ARTIFACTS','/tmp/aetherwild-production'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1000,'height':700});page.set_default_timeout(120000);errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR',e,flush=True)))
    page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR',m.text,flush=True)) if m.type=='error' else None)
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:4173/?quality=low'),wait_until='networkidle',timeout=120000)
    page.wait_for_selector('#welcome:not(.hidden)');assert not page.evaluate("'__AETHERWILD__' in window")
    page.click('[data-class="ranger"]');page.click('#new-game')
    page.wait_for_function('!!document.pointerLockElement && document.querySelector("#player-class").textContent==="궁수"')
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.keyboard.press('F1');page.wait_for_function('document.querySelector("#location-state").textContent.startsWith("3인칭")')
    page.screenshot(path=str(out/'third-person.png'),timeout=120000)
    page.keyboard.press('F1');page.wait_for_function('document.querySelector("#location-state").textContent.startsWith("1인칭")')
    page.keyboard.press('Digit1')
    try:page.wait_for_selector('#combat-state:not(.hidden)')
    except Exception:
        print(page.evaluate('({locked:!!document.pointerLockElement,cls:document.querySelector("#player-class").textContent,mana:document.querySelector("#mp-value").textContent,toasts:document.querySelector("#messages").innerText,pause:document.querySelector("#pause").className,dead:document.querySelector("#death").className})'),flush=True)
        raise
    page.mouse.down();page.wait_for_selector('#draw-indicator:not(.hidden)');page.wait_for_function('document.querySelector("#draw-percent").textContent==="100"')
    page.screenshot(path=str(out/'bow.png'),timeout=120000);page.mouse.up();page.keyboard.press('KeyI');page.wait_for_selector('#overlay:not(.hidden)');assert page.locator('.item-card').count()==7
    assert '/assets/assets/' not in page.locator('.item-card .item-art').first.evaluate('(el)=>getComputedStyle(el).backgroundImage')
    assert page.locator('.equipment-slot').count()==5
    assert page.locator('[data-stat]').count()==4
    assert page.locator('[data-stat]:disabled').count()==4
    page.click('[data-unequip="helmet"]');assert page.locator('.slot-helmet.filled').count()==0
    page.click('[data-item="ranger_basic_helmet"]');assert page.locator('.slot-helmet.filled').count()==1
    page.screenshot(path=str(out/'inventory.png'),timeout=120000)
    page.click('#close-panel');page.wait_for_function('!!document.pointerLockElement')
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.keyboard.down('KeyW')
    page.wait_for_function('!document.querySelector("#interaction").classList.contains("hidden")&&document.querySelector("#interaction strong").textContent==="레아"')
    page.keyboard.up('KeyW');page.keyboard.press('KeyE');page.wait_for_selector('[data-quest="road"]')
    assert '레아' in page.locator('#panel-title').inner_text()
    page.click('[data-quest="road"]');assert page.locator('[data-quest="road"]').is_disabled()
    page.screenshot(path=str(out/'npc-dialogue.png'),timeout=120000)
    assert not errors,errors
    print('PASS production: no dev hook; ranger arrow selection, full draw/release, F1 third-person, five gear slots, native helmet equip/unequip, new inventory/icons, actual WASD approach to NPC, E dialogue and quest acceptance; zero JS/shader errors',flush=True)
    browser.close()
