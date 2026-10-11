from pathlib import Path
import os,json,threading,http.server,functools
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
  page.evaluate("G.data.name='세이브 점검';G.data.tutSeen=true;G.data.seenGuide=true;G.data.seenCoach=true;G.data.seenBreak=true;saveLocal();render()")
  def create(name,build):
   page.click('[data-a=restart]' if page.query_selector('[data-a=restart]') else '[data-a=newchar]')
   page.fill('#cname',name);page.click('[data-a=cnok]');page.click(f'[data-a=clspick][data-k={build}]')
   page.click(f'button[data-a=start][data-b={build}]');page.click('button[data-a=skillok]');page.click('button[data-a=statrec]');page.click('button[data-a=statok]')
  def title():page.evaluate("()=>{const el=document.createElement('button');el.dataset.a='title';onClick({target:el});}")
  create('첫 캐릭터','spellblade')
  first=page.evaluate('G.run.id')
  page.evaluate("()=>{G.run.gold=123;G.run.cons=[{id:'herb',g:'n',n:2}];G.b=newBattle(G.run.p,[mkEnemy('skeleton',false,0)],{ch:2});G.b.queue=['p'];G.b.turnIdx=7;saveBattle();}")
  title();page.click('[data-a=restart]');page.click('[data-a=createcancel]')
  assert page.evaluate('G.data.cur.battle.b.turnIdx===7 && !G.data.cur.endedAt && !G.data.kept?.length')
  create('둘째 캐릭터','hunter');second=page.evaluate('G.run.id');title()
  assert page.evaluate('saveCount()===2 && G.data.kept[0].gold===123 && G.data.kept[0].battle.b.turnIdx===7 && !G.data.kept[0].endedAt')
  page.reload();page.wait_for_function('SITE_UPDATE.started')
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  page.click(f'[data-a=resumekept][data-k="{first}"]')
  assert page.evaluate(f'G.run.id==={json.dumps(first)} && G.b.turnIdx===7 && G.run.gold===123 && G.run.cons[0].n===2')
  title();page.click(f'[data-a=resumekept][data-k="{second}"]');assert page.evaluate(f'G.run.id==={json.dumps(second)} && !G.b')
  title()
  page.evaluate("()=>{while(saveCount()<SAVE_MAX){const c=JSON.parse(JSON.stringify(G.data.cur));c.id='slot'+saveCount();c.cname='보관 '+saveCount();G.data.kept.push(c);}saveLocal();render();}")
  before=page.evaluate('JSON.stringify([G.data.cur,G.data.kept])');page.click('[data-a=restart]')
  assert page.evaluate('G.scr==="title" && saveCount()===8') and page.evaluate('JSON.stringify([G.data.cur,G.data.kept])')==before
  page.once('dialog',lambda d:d.dismiss());page.click('[data-a=saveabandon] >> nth=0');assert page.evaluate('saveCount()===8')
  page.once('dialog',lambda d:d.accept());page.click('[data-a=saveabandon][data-k="slot2"]');assert page.evaluate('saveCount()===7 && G.data.runs.some(r=>r.id==="slot2" && r.result==="abandon")')
  page.evaluate("window.originalSaveLocal=saveLocal;saveLocal=()=>false")
  before=page.evaluate('JSON.stringify([G.data.cur,G.data.kept])');page.click(f'[data-a=resumekept][data-k="{first}"]');assert page.evaluate('JSON.stringify([G.data.cur,G.data.kept])')==before
  page.evaluate('saveLocal=originalSaveLocal')
  for ch,boss in [(1,'abbot'),(2,'cryptlord'),(3,'queen'),(1,'mother'),(1,'tree')]:
   page.evaluate("([ch,boss])=>{G.run.ch=ch;G.run.mode='normal';G.sheet=null;G.b=roomBattle(G.run.p,{ch,lv:10,floor:24,names:ENEMY_NAMES[ch],boss:1},boss,300);G.scr='run';render();}",[ch,boss])
   assert page.query_selector('.boss-mechanics') and '다음 행동' in page.inner_text('.boss-mechanics')
   page.click('.boss-mechanics summary');assert page.query_selector('.boss-mechanics details[open]')
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  page.evaluate("()=>{G.run.ch=1;G.run.mode='hard';G.run.phase='wait';G.b=null;G.scr='wait';render();}")
  gear=page.evaluate('JSON.stringify(G.run.eqU)')
  assert '2챕터 가혹으로 내려간다' in page.inner_text('[data-a=nextch]')
  page.click('[data-a=nextch]');assert page.evaluate('G.run.ch===2 && G.run.mode==="hard" && runRecord(G.run).mode==="hard" && G.run.chLog.at(-1).mode==="hard"')
  assert page.evaluate('JSON.stringify(G.run.eqU)')==gear
  page.evaluate('G.run.cur=G.run.doors[0];enterRoom()');assert page.evaluate('G.b.ctx.mode==="hard"')
  page.evaluate("G.run.phase='wait';G.sheet=null;G.b=null;G.scr='wait';render()")
  page.click('[data-a=nextch]');assert page.evaluate('G.run.ch===3 && G.run.mode==="hard"')
  title();page.reload();page.wait_for_function('SITE_UPDATE.started');page.click('[data-a=resume]');assert page.evaluate('G.run.ch===3 && G.run.mode==="hard"')
  page.evaluate("G.run.stats={str:0,dex:0,int:0,con:30,wil:33};applyStats(G.run.p,G.run.stats);saveCur();render()")
  unchanged=page.evaluate('JSON.stringify([G.run.p,G.run.stats])')
  page.click('[data-a=menu]');page.click('.mnav [data-a=statview]')
  assert page.locator('.sheet .stat-read dd').all_text_contents()==['0','0','0','30','33']
  assert page.locator('.sheet [data-a="stat+"]').count()==0
  page.click('.sheet [data-a=close]');assert page.evaluate('JSON.stringify([G.run.p,G.run.stats])')==unchanged
  page.evaluate("openSheet('equip')");unchanged=page.evaluate('JSON.stringify([G.run.p,G.run.stats])');page.click('.sheet [data-a=statview]')
  assert page.evaluate('JSON.stringify([G.run.p,G.run.stats])')==unchanged
  page.click('.sheet [data-a=equip]');assert page.query_selector('.eqsum')
  page.click('.sheet [data-a=close]');assert page.evaluate('JSON.stringify(G.run.stats)')=='{"str":0,"dex":0,"int":0,"con":30,"wil":33}'
  page.evaluate("()=>{G.data.runs.push({...runRecord(G.run),id:'statdone',build:'spellblade',skills:['sb_bolt'],awk:[Object.keys(AWK_MAP)[0]],endedAt:Date.now(),result:'win',ch:3,clears:3});G.scr='records';G.rc={...rcS(),open:'statdone'};render();}")
  assert page.locator('.rcsec .stat-read dd').all_text_contents()==['0','0','0','30','33']
  assert '최종 장비' in page.inner_text('body')
  page.locator('.rcsec details summary').filter(has_text='마갑탄').click()
  assert '마갑탄' in page.inner_text('body') and '현재 보호막의 50%' in page.inner_text('body')
  assert page.evaluate("rcRunDetail('statdone').includes(AWK_MAP[Object.keys(AWK_MAP)[0]].n)")
  assert page.evaluate("()=>{const r=G.data.runs.find(r=>r.id==='statdone');return r.eqDetails.length>0 && rcRunDetail(r.id).includes(r.eqDetails[0].base) && Number.isFinite(r.combatStats.hp) && rcRunDetail(r.id).includes('전투 수치');}")
  assert page.evaluate("()=>{const old=G.run,s=SK2.sb_bolt;G.run={...old,build:'spellblade',p:mkPlayer('spellblade',{}, {int:5}),tree:{...old.tree,open:[s.id]}};const html=infoHtml('tn:'+s.id);G.run=old;return html.includes('현재 기본 피해 10.8') && html.includes('현재 보호막의 50%');}")
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  assert page.evaluate("statReadHtml(null).includes('기록이 없습니다') && statReadHtml({con:30}).includes('기록 없음')")
  assert not errors,errors
  print('세이브 검증 통과: 생성 취소·서로 다른 캐릭터 보관·새로고침·전투 복원·8칸 한도·포기 확인·저장 실패 시 교체 취소')
  print('보스 5종의 기믹·다음 행동 표시와 모바일 설명, 1→2→3챕터 가혹 이동·장비 유지·저장 복원 통과')
  print('능력치·완주 빌드: 메뉴·장비 창·완주 기록 30/33, 전투 수치·장비 실수치·스킬 펼침·각인, 현재 스킬 피해 설명·모바일 화면 통과')
  browser.close()
finally:server.shutdown();server.server_close()
