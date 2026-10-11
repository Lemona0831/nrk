"""Two isolated browser contexts against one in-memory mock account store; no real Supabase writes."""
from pathlib import Path
import os,json,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
store={'docs':{}};deny=False
class Server(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/__cloudtest':
   raw=json.dumps(store).encode();self.send_response(200);self.end_headers();self.wfile.write(raw)
  else:super().do_GET()
 def do_POST(self):
  global store
  if self.path!='/__cloudtest':self.send_error(404);return
  raw=self.rfile.read(int(self.headers['Content-Length']))
  if deny:self.send_error(503);return
  store=json.loads(raw);self.send_response(200);self.end_headers();self.wfile.write(b'{}')
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Server,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
mock=(root/'tools/mock_sb.js').read_text(encoding='utf-8')
mock=mock.replace("const load=()=>JSON.parse(localStorage.getItem(LS)||'{\"docs\":{}}'); const save=s=>localStorage.setItem(LS,JSON.stringify(s));", "const load=()=>{const x=new XMLHttpRequest();x.open('GET','/__cloudtest',false);x.send();return JSON.parse(x.responseText)};const save=s=>{const x=new XMLHttpRequest();x.open('POST','/__cloudtest',false);x.send(JSON.stringify(s));if(x.status!==200)throw Error('offline')};")
assert 'XMLHttpRequest' in mock
errors=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  def device(uid,width):
   ctx=browser.new_context(viewport={'width':width,'height':844})
   ctx.add_init_script("window.__cfgOverride=1;sessionStorage.setItem('MOCK_UID',"+json.dumps(uid)+");sessionStorage.setItem('MOCK_PROV','google');")
   ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
   ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
   ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort());ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('G.cloud?.ready && !G.cloud.loading && SITE_UPDATE.started')
   return ctx,page
  pcctx,pc=device('cloud-owner',1280)
  pc.evaluate("G.data.name='ㅤ';G.data.tutSeen=true;G.data.seenGuide=true;G.data.seenCoach=true;G.data.seenBreak=true;saveLocal();render()")
  def create(page,name,build):
   page.click('[data-a=restart]' if page.query_selector('[data-a=restart]') else '[data-a=newchar]')
   page.fill('#cname',name);page.click('[data-a=cnok]');page.click(f'[data-a=clspick][data-k={build}]')
   page.click(f'button[data-a=start][data-b={build}]');page.click('button[data-a=skillok]');page.click('button[data-a=statrec]');page.click('button[data-a=statok]')
  def title(page):page.evaluate("()=>{const el=document.createElement('button');el.dataset.a='title';onClick({target:el});}")
  create(pc,'PC 마검사','spellblade');first=pc.evaluate('G.run.id')
  pc.evaluate("()=>{G.run.gold=123;G.run.cons=[{id:'herb',g:'n',n:2}];G.b=newBattle(G.run.p,[mkEnemy('skeleton',false,0)],{ch:2});G.b.queue=['p'];G.b.turnIdx=7;saveBattle();}")
  title(pc);create(pc,'두 번째','hunter');second=pc.evaluate('G.run.id');title(pc)
  pc.evaluate("async()=>{saveLocal();await cloudFlush();await pushName();await syncRun(G.data.cur,'progress');}")
  mobctx,mob=device('cloud-owner',390)
  assert mob.evaluate('saveCount()===2 && G.data.name==="ㅤ" && G.data.runs.length>0')
  mob.click(f'[data-a=resumekept][data-k="{first}"]')
  assert mob.evaluate('G.b.turnIdx===7 && G.run.gold===123 && G.run.cons[0].n===2')
  title(mob);mob.evaluate('cloudFlush()')
  # Importing an unchanged PC copy must choose the descendant, without a conflict dialog.
  pc.on('dialog',lambda d:(_ for _ in ()).throw(AssertionError('Unexpected conflict')))
  pc.evaluate('cloudLoad()');assert pc.evaluate(f'cloudLive().some(r=>r.id==={json.dumps(first)})')
  pc.click(f'[data-a=resumekept][data-k="{first}"]');title(pc)
  # Separate branches of the same character must ask, back up, and retain the chosen branch.
  pc.evaluate('G.data.cur.gold=200;saveLocal()');pc.evaluate('cloudFlush()')
  mob.evaluate('G.data.cur.gold=300;saveLocal()');mob.evaluate('cloudFlush()')
  mob.once('dialog',lambda d:d.accept());mob.evaluate('cloudLoad()')
  assert mob.evaluate('G.data.cur.gold===200')
  assert any('/saveBackups62/' in p for p in store['docs'])
  mob.evaluate('cloudFlush()');pc.evaluate('cloudLoad()');assert pc.evaluate('G.data.cur.gold===200')
  # Deleting on one device is a descendant tombstone: no stale resurrection.
  mob.evaluate("G.data.kept=[];saveLocal()");mob.evaluate('cloudFlush()');pc.evaluate('cloudLoad()')
  assert pc.evaluate('saveCount()===1')
  # Existing third-party account cannot read these saves or records.
  otherctx,other=device('other-account',390)
  assert other.evaluate('saveCount()===0 && G.data.runs.length===0')
  # Failed upload retains local data, retries on reconnect, and never clears the server.
  deny=True;mob.evaluate('G.data.cur.gold=444;saveLocal()');assert not mob.evaluate('cloudFlush()')
  assert mob.evaluate('G.data.cur.gold===444 && G.cloud.dirty')
  deny=False;assert mob.evaluate('cloudFlush()');pc.evaluate('cloudLoad()');assert pc.evaluate('G.data.cur.gold===444')
  assert mob.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print('PASS: PC/mobile two saves, battle restore, blank nickname, remote records, descendant merge, conflicting edits, deletion, account isolation, failed upload/retry, mobile layout')
  browser.close()
finally:server.shutdown()
