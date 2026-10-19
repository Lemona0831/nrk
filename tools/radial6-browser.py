# 0.8.0 M5-0: 액티브 방사 트리 6부채꼴을 휴대폰 폭(390px)에서 연다(마검사). 판정: 부채꼴 이름 여섯이 보이고 서로 겹치지 않음, 경계 입구 셋은 양쪽 첫 노드 전까지 흐림(req), 가로 넘침 · 페이지 오류 0
# 실행: python tools/radial6-browser.py [사이트 폴더=.] [캡처 폴더]
from pathlib import Path
import sys,json,re,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=(root/(sys.argv[1] if len(sys.argv)>1 else '.')).resolve(); shots=Path(sys.argv[2]) if len(sys.argv)>2 else None
mock=(root/'tools/mock_sb.js').read_text(encoding='utf-8')
html=(site/'index.html').read_text(encoding='utf-8-sig')
rev=re.search(r'name="nrk-release" content="([a-f0-9]+)"',html).group(1)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(site)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
res=[]
def check(page,name):
 w=page.evaluate('document.documentElement.scrollWidth')
 if shots:page.screenshot(path=str(shots/(name+'.png')),full_page=True)
 res.append((name,w));assert w<=390,(name,'가로 넘침',w)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':844})
  ctx.add_init_script('window.__cfgOverride=1;')
  ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
  ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
  ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort())
  ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
  ctx.route('**/release.json?*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'revision':rev})))
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.wait_for_function('SITE_UPDATE.started && G.conn==="ok"')
  page.click('[data-a=newchar]')
  if page.query_selector('[data-a=tutskip]'):page.click('[data-a=tutskip]')
  page.click('button.link[data-a=gdone]')
  page.evaluate("G.data.name='부채꼴 점검';G.data.seenCoach=true;G.data.seenBreak=true")
  page.fill('#cname','부채꼴 점검');page.click('[data-a=cnok]')
  page.click('[data-a=clspick][data-k=spellblade]');page.click('button[data-a=start][data-b=spellblade]')
  page.evaluate('ask=()=>true')
  for _ in range(12):
   if page.evaluate("G.scr==='run' && !G.creating && !G.sheet"):break
   for s in ['button[data-a=allocgo]','button[data-a=allocnext]','button[data-a=kspick]','button[data-a=allocok]','button[data-a=statok]']:
    if page.query_selector(s):page.click(s+' >> nth=0');break
   page.wait_for_timeout(100)
  page.evaluate("()=>{G.tview='a';G.scr='tree';G.sheet=null;render()}")
  page.wait_for_timeout(300)
  labs=page.evaluate("()=>[...document.querySelectorAll('svg .tl.dl')].map(t=>{const r=t.getBoundingClientRect();return {n:t.textContent,x:r.left,y:r.top,w:r.width,h:r.height}})")
  names=[l['n'] for l in labs]
  for n in ['염검','혈염','혈인','죄인의 피','마갑','유산의 불']: assert n in names,('부채꼴 이름 없음',n,names)
  over=[]
  for i,a in enumerate(labs):
   for b2 in labs[i+1:]:
    if a['x']<b2['x']+b2['w'] and b2['x']<a['x']+a['w'] and a['y']<b2['y']+b2['h'] and b2['y']<a['y']+a['h']: over.append((a['n'],b2['n']))
  assert not over,('이름 겹침',over)
  req=page.evaluate("()=>[...document.querySelectorAll('.tn.req')].map(g=>g.dataset.k)")
  for k in ['sb_bloodfire','sb_bloodmail','sb_heatmail']: assert k in req,('경계 입구가 흐리지 않음',k,req)
  w=page.evaluate('document.documentElement.scrollWidth'); assert w<=390,('가로 넘침',w)
  if shots: page.screenshot(path=str(shots/'radial6.png'),full_page=True)
  assert not errors,errors
  print('부채꼴 6(390px): 이름 '+' · '.join(names)+', 겹침 0, 경계 입구 흐림 '+', '.join(sorted(set(req)))+', 폭 '+str(w)+'px')
  browser.close()
finally:server.shutdown();server.server_close()
