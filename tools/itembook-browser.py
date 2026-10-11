from pathlib import Path
import http.server,threading,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':844})
  ctx.add_init_script('window.__cfgOverride=1;')
  ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(root/'tools/mock_sb.js').read_text(encoding='utf-8')))
  ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
  ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort());ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('SITE_UPDATE.started && G.conn==="ok"')
  page.evaluate("G.data.name='도감 점검';G.data.tutSeen=true;G.data.seenGuide=true;G.data.seenCoach=true;saveLocal();render()")
  page.click('[data-a=menu]');page.click('.mnav [data-a=itembook]')
  assert page.locator('.ibcard').count()==24 and '552종' in page.inner_text('#ibresults')
  page.click('[data-a=ibpage][data-k="1"]');assert '2/23페이지' in page.inner_text('#ibresults')
  page.locator('.ibcard').first.click();page.click('[data-a=ibback]');assert '2/23페이지' in page.inner_text('#ibresults')
  page.fill('#ibquery','피를 마시는 칼');assert page.locator('.ibcard').count()==1
  assert page.evaluate('document.activeElement.id==="ibquery"')
  page.click('.ibcard');assert '최대 생명력 −10%' in page.inner_text('.sheet') and '9.4 ~ 10.1' in page.inner_text('.sheet')
  page.click('[data-a=ibback]');assert page.input_value('#ibquery')=='피를 마시는 칼'
  page.wait_for_function('document.activeElement.classList.contains("ibcard")')
  page.fill('#ibquery','없는 아이템 <script>');assert page.locator('.ibcard').count()==0
  page.click('[data-a=ibreset]');assert page.input_value('#ibquery')==''
  page.select_option('[data-ibfilter=ch]','2');page.select_option('[data-ibfilter=group]','weapon');page.select_option('[data-ibfilter=grade]','r')
  assert page.locator('.ibcard').count()>0 and all('2챕터 · 무기 · 희귀' in t for t in [page.locator('.ibcard').nth(i).locator('small').first.inner_text() for i in range(page.locator('.ibcard').count())])
  page.click('[data-a=ibtype][data-k=cons]');page.select_option('[data-ibfilter=ch]','all')
  page.fill('#ibquery','약초 묶음');page.click('.ibcard');text=page.inner_text('.sheet');assert '12%' in text and '20%' in text and '5개' in text
  page.click('[data-a=ibback]');page.fill('#ibquery','종 조각');page.click('.ibcard');assert '보스와 땅속에 숨은 적은 제외' in page.inner_text('.sheet')
  assert not page.locator('.sheet [data-a=eqon],.sheet [data-a=consuse]').count()
  page.click('[data-a=ibback]');page.fill('#ibquery','');page.select_option('[data-ibfilter=group]','restore');page.select_option('[data-ibfilter=grade]','m')
  assert page.locator('.ibcard').count()>0
  out=root/'output/playwright/itembook';out.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(out/'390.png'))
  for width in [320,1280]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('G.data.fs=1.3;applyPrefs();render()')
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
   page.screenshot(path=str(out/f'{width}.png'))
  page.click('.sheet [data-a=close]');assert page.locator('.sh-itembook').count()==0
  page.evaluate("()=>{startRun('spellblade');G.creating=false;G.sheet=null;G.run.phase='fight';G.b=roomBattle(G.run.p,{ch:1,lv:1,floor:24,names:ENEMY_NAMES[1],boss:1},'abbot',300);G.scr='run';render();}")
  before=page.evaluate('JSON.stringify([G.run.p,G.run.inv,G.run.bag,G.run.cons,G.b])')
  page.click('[data-a=menu]');page.click('.mnav [data-a=itembook]');page.fill('#ibquery','피');page.fill('#ibquery','피를 마시는 칼');page.click('.ibcard');page.click('[data-a=ibback]');page.click('.sheet [data-a=close]')
  assert page.evaluate('JSON.stringify([G.run.p,G.run.inv,G.run.bag,G.run.cons,G.b])')==before
  assert not errors,errors
  print('아이템 도감 브라우저 통과: 메뉴·닫기·검색 입력 유지·24개 페이지·상세 복귀·챕터/부위/등급·회복 용도·일반/고급·보스 제외·320/390/1280px·전투 상태 불변')
  browser.close()
finally:server.shutdown();server.server_close()
