"""Cold browser: first meteor reuses prepared geometry and shader variants."""
import os,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':700});page.set_default_timeout(120000);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:5173/?quality=low'),wait_until='networkidle',timeout=120000)
 page.click('[data-class="mage"]');page.click('#new-game');page.wait_for_function('window.__AETHERWILD__.engine.locked')
 report=page.evaluate('''async()=>{const e=window.__AETHERWILD__.engine,{BRANCH_SKILLS}=await import('/src/data.js'),{heightAt}=await import('/src/terrain.js');e.paused=true;e.player.branch='archmage';e.player.level=20;e.player.mana=999;e.camera.position.set(0,heightAt(0,-14)+1.75,-14);e.feetY=heightAt(0,-14);e.yaw=0;e.pitch=-.4;e.camera.rotation.set(-.4,0,0);e.camera.updateMatrixWorld();for(const m of e.world.monsters){m.group.visible=false;m.alive=false;}const c=e.groundTarget(35).point,m=e.world.monsters[0];Object.assign(m,{alive:true,hp:10000,x:c.x,z:c.z});m.group.visible=true;m.group.position.copy(c);e.renderer.render(e.scene,e.camera);const programs=new Set(e.renderer.info.programs),built=e.fx.preparationStats.built;const before=performance.now();e.createField(c,BRANCH_SKILLS.archmage[0]);const commitMs=performance.now()-before;e.renderer.render(e.scene,e.camera);const castPrograms=e.renderer.info.programs.filter(p=>!programs.has(p)).map(p=>({name:p.name,key:p.cacheKey}));e.updateCombat(1.11);e.updateEffects(1/60);e.renderer.render(e.scene,e.camera);return {prepared:e.fx.prepared,builtBefore:built,builtAfter:e.fx.preparationStats.built,commitMs,castPrograms,impactPrograms:e.renderer.info.programs.filter(p=>!programs.has(p)).map(p=>({name:p.name,key:p.cacheKey}))};}''')
 open('/tmp/aetherwild-warmup-report.json','w').write(json.dumps(report));print('MEASURE '+str({k:v if not k.endswith('Programs') else [p['name'] for p in v] for k,v in report.items()}),flush=True)
 assert report['prepared'] and report['builtBefore']==report['builtAfter'] and report['commitMs']<150
 assert not report['castPrograms'] and not report['impactPrograms'],report
 assert not errors,errors
 b.close();print('PASS first meteor reuses preloaded geometry/materials; zero JavaScript/shader/asset errors',flush=True)
