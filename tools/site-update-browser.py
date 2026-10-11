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
  snapshot=page.evaluate("""()=>{G.run.gold=123;G.run.consFav=['herb'];G.run.cons=[{id:'herb',g:'n',n:2}];const u=Object.keys(G.run.inv)[0];G.run.inv[u].locked=true;return {id:G.run.id,stats:G.run.stats,eqU:G.run.eqU,u};}""")
  state['revision']=new
  page.evaluate('G.b={};')
  page.evaluate('siteUpdateCheck()');page.wait_for_timeout(900)
  assert 'nrk_update=' not in page.url and page.evaluate('SITE_UPDATE.pending')==new
  page.evaluate("G.b=null;G.sheet={kind:'choice',data:{}}")
  page.evaluate('siteUpdateApply()');page.wait_for_timeout(900);assert 'nrk_update=' not in page.url
  page.evaluate('G.sheet=null')
  page.evaluate('siteUpdateApply()');page.wait_for_timeout(900);assert 'nrk_update=' not in page.url # HTML 아직 이전 배포
  state['ready']=True
  page.evaluate('siteUpdateApply()')
  page.wait_for_url('**?nrk_update=*',timeout=10000)
  page.wait_for_function('SITE_UPDATE.current === '+json.dumps(new)+' && G.run && G.scr==="run"',timeout=10000)
  restored=page.evaluate('({id:G.run.id,stats:G.run.stats,eqU:G.run.eqU,gold:G.run.gold,fav:G.run.consFav,cons:G.run.cons,inv:G.run.inv})')
  assert restored['id']==snapshot['id'] and restored['stats']==snapshot['stats'] and restored['eqU']==snapshot['eqU']
  assert restored['gold']==123 and restored['fav']==['herb'] and restored['cons'][0]['n']==2 and restored['inv'][snapshot['u']]['locked']
  page.wait_for_timeout(2200);assert not errors,errors
  print('실제 브라우저: 전투·보상 선택·배포 도중 대기 → 저장 → 자동 갱신 → 같은 캐릭터·스탯·장비·잠금·소모품·즐겨찾기 복원, 오류 0')
  browser.close()
finally:server.shutdown();server.server_close()

