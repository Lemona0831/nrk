from pathlib import Path
import os,sys,json,re,threading,http.server,functools
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=(root/(sys.argv[1] if len(sys.argv)>1 else '.')).resolve()
mock=(root/'tools/mock_sb.js').read_text(encoding='utf-8')
html=(site/'index.html').read_text(encoding='utf-8-sig')
old=re.search(r'name="nrk-release" content="([a-f0-9]+)"',html).group(1)
new='f'*64 if old!='f'*64 else 'e'*64
state={'revision':old,'ready':False}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(site)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':844})
  ctx.add_init_script('window.__cfgOverride=1;')
  ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
  ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
  ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort())
  ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
  ctx.route('**/release.json?*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'revision':state['revision']})))
  def index_route(r):
   rev=new if state['ready'] else old
   r.fulfill(status=200,content_type='text/html',body=html.replace(old,rev))
  ctx.route('**/index.html?*',index_route)
  ctx.route(base+'?nrk_update=*',index_route)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.wait_for_function('SITE_UPDATE.started && G.conn==="ok"')
  page.click('[data-a=newchar]')
  if page.query_selector('[data-a=tutskip]'):page.click('[data-a=tutskip]')
  page.click('button.link[data-a=gdone]')
  page.evaluate("G.data.name='갱신 점검';G.data.seenCoach=true;G.data.seenBreak=true")
  page.fill('#cname','갱신 점검');page.click('[data-a=cnok]')
  page.click('[data-a=clspick][data-k=spellblade]');page.click('button[data-a=start][data-b=spellblade]');page.click('button[data-a=skillok]')
  page.click('button[data-a=statrec]');page.click('button[data-a=statok]')
  page.evaluate("()=>{const r=G.run;r.cons=[];while(bagUsed(r)<BAG_MAX)addItem(r,mkItem('bloodblade'));window.testOld=r.eqU.weapon;window.testItem=mkItem('bloodblade');testItem.g='h';giveItem(testItem)}")
  page.once('dialog',lambda d:d.dismiss());page.click('[data-a=bfequip][data-s=weapon]')
  assert page.evaluate('G.run.eqU.weapon===testOld && !!G.run.gearPending')
  page.reload();page.wait_for_function('SITE_UPDATE.started');page.click('[data-a=resume]')
  page.wait_for_selector('[data-a=bfequip][data-s=weapon]')
  page.once('dialog',lambda d:d.accept());page.click('[data-a=bfequip][data-s=weapon]')
  assert page.evaluate("G.run.inv[G.run.eqU.weapon].g==='h' && !G.run.gearPending && gearCheck(G.run) && bagUsed(G.run)===BAG_MAX")
  page.evaluate("()=>{G.b=null;G.run.ch=2;G.run.settle={};G.run.settle.loot=bossLoot(G.run);nextDrop()}")
  assert page.evaluate('!!G.run.gearPending && G.run.settle.loot.pending===1')
  page.once('dialog',lambda d:d.accept());page.click('[data-a=bfequip]:not([disabled]) >> nth=0')
  assert page.evaluate('!G.run.gearPending && G.run.settle.loot.pending===0 && gearCheck(G.run)')
  page.evaluate("()=>{const e=mkEnemy('skeleton',false,0);e.pile={wait:1};G.b=newBattle(G.run.p,[e],{ch:2});G.sel=e.id;G.scr='run';render()}")
  page.mouse.move(0,0);page.evaluate('G.infoOn=true');page.hover('[data-info^="epile:"]');page.wait_for_selector('#pop',state='visible',timeout=1500)
  assert '1라운드' in page.inner_text('#pop') and '석회 가루' in page.inner_text('#pop')
  assert not errors,errors
  print('실제 브라우저: 가득 찬 가방 영웅 교체·취소·새로고침 후 보상 복원·뼈 아이콘 설명 표시 통과')
  browser.close()
finally:server.shutdown();server.server_close()

