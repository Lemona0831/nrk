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
  page.evaluate("()=>{G.run.ch=2;G.run.room=13;G.run.cur={type:'altar',altar:'bone'};G.run.cons=[{id:'herb',g:'n',n:2},{id:'leaf',g:'n',n:2}];render()}")
  assert '약초 묶음 ×2' in page.inner_text('main') and '각성 잎 ×1' in page.inner_text('main')
  page.click('[data-a=altar][data-k="1"]')
  x=page.evaluate('G.run.lastAltar');assert x['paid']==['약초 묶음 ×2','각성 잎 ×1'] and len(x['received'])==2
  assert '바친 것' in page.inner_text('main') and '받은 것' in page.inner_text('main')
  page.reload();page.wait_for_function('SITE_UPDATE.started');page.click('[data-a=resume]');assert '약초 묶음 ×2' in page.inner_text('main')
  page.evaluate("()=>{G.run.ch=3;G.run.room=17;G.run.cur={type:'altar',altar:'ash'};G.run.cons=[{id:'silver',g:'n',n:5},{id:'stone',g:'n',n:5},{id:'herb',g:'n',n:4}];render()}")
  assert '바칠 소모품' in page.inner_text('main');page.click('[data-a=altar][data-k="1"]');x=page.evaluate('G.run.lastAltar');assert x['paid']==['약초 묶음 ×4'] and len(x['received'])==2
  page.evaluate("()=>{G.run.room=19;G.run.cur={type:'altar',altar:'gold'};G.run.gold=100;G.run.p.flask.life=0;G.run.p.flask.mana=flaskCap(G.run.p,'mana');G.run.p.flask.stam=1;render()}")
  page.click('[data-a=altar][data-k="1"]');x=page.evaluate('G.run.lastAltar');assert x['paid']==['골드 90'] and '최대 충전' in x['received'][1] and page.evaluate('G.run.gold')==10
  page.evaluate("()=>{G.run.room=20;G.run.cur={type:'altar',altar:'blood'};render()}")
  page.click('[data-a=altar][data-k="1"]');x=page.evaluate('G.run.lastAltar');assert '최대 생명력' in x['paid'][0] and '→' in x['paid'][0] and len(x['received'])==1
  page.click('[data-a=dropkeep]')
  page.evaluate("()=>{G.run.room=21;G.run.cur={type:'altar',altar:'offer'};render()}")
  page.click('[data-a=altar][data-k="1"]');page.click('[data-a=offerpick] >> nth=0');x=page.evaluate('G.run.lastAltar');assert len(x['paid'])==len(x['received'])==1 and page.evaluate('G.run.rooms[G.run.rooms.length-1].exchange.received[0]')==x['received'][0]
  assert not errors,errors
  print('제단 브라우저: 실제 소모품 미리보기·뼈/재 교환 결과·판매품/돌멩이 제외·골드와 플라스크 실제 변화·새로고침 후 결과 유지 통과')
  browser.close()
finally:server.shutdown();server.server_close()
