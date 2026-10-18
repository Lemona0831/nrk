# 0.8.0 6단계 D-2: 16층 던전의 새 화면 요소를 휴대폰 폭(390px)에서 연다. 갈림길 지도 · 순찰대 보상 · 챕터 시작 꾸러미 고르기 · 야영지 쉬기 · 숨은 직업 칸
# 실행: python tools/floor16-browser.py [사이트 폴더=.] [캡처 폴더]. 판정: 페이지 오류 0, 화면마다 가로 넘침 없음, 보이는 버튼이 눌린다
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
  page.evaluate("G.data.name='16층 점검';G.data.seenCoach=true;G.data.seenBreak=true")
  page.fill('#cname','16층 점검');page.click('[data-a=cnok]')
  page.evaluate('G.data.unlAll=true;render()');t=page.inner_text('main');assert '숨겨진 직업' in t and '준비 중' in t,'숨은 직업 칸이 없음'
  assert not page.query_selector('[data-a=clspick][data-k=butcher]'),'잠근 숨은 직업을 고를 수 있음'
  check(page,'1-classes')
  page.click('[data-a=clspick][data-k=spellblade]');page.click('button[data-a=start][data-b=spellblade]')
  page.evaluate('ask=()=>true') # 남은 포인트 확인 창은 '예'
  for _ in range(12): # 배분 흐름(패시브 → 큰 각인 → 액티브)은 단계 수가 판마다 다르다: 보이는 다음 버튼을 누른다
   if page.evaluate("G.scr==='run' && !G.creating && !G.sheet"):break
   for s in ['button[data-a=allocgo]','button[data-a=allocnext]','button[data-a=kspick]','button[data-a=allocok]','button[data-a=statok]']:
    if page.query_selector(s):page.click(s+' >> nth=0');break
   page.wait_for_timeout(100)
  assert page.evaluate("G.scr==='run' && !!G.run"),'캐릭터 만들기가 끝나지 않음'
  # 갈림길: 3층을 지나 4층에 들어선 자리
  page.evaluate("()=>{const r=G.run;r.room=3;r.cur=null;r.doors=null;G.sheet=null;advanceFloor();render()}")
  assert page.evaluate('!!G.run.cross'),'4층 갈림길이 아님'
  t=page.inner_text('main');assert '등불이 밝힌 곳만 보인다' in t and '야영지 상인' in t,'갈림길 지도 문구'
  check(page,'2-cross')
  page.click('[data-a=path][data-k=main]') if page.query_selector('[data-a=path][data-k=main]') else page.evaluate("choosePath('main');render()")
  assert page.evaluate('!G.run.cross && !!G.run.doors'),'길을 고른 뒤 문이 없음'
  # 순찰대 보상
  page.evaluate("()=>{G.run.patrolPend={cons:patrolCons(G.run),room:4};G.sheet=null;G.dropQ=[];render()}")
  assert '순찰대를 넘었습니다' in page.inner_text('body'),'순찰대 창'
  check(page,'3-patrol')
  pt0=page.evaluate('G.run.ptBonus||0');page.click('[data-a=patrolpick][data-k=pt]')
  assert page.evaluate('!G.run.patrolPend && (G.run.patrolPt||{})[1]===1'),'순찰대 포인트 고르기'
  # 야영지
  page.evaluate("()=>{const r=G.run;r.room=7;r.cur=null;r.doors=null;G.sheet=null;advanceFloor();render()}")
  t=page.inner_text('main');assert '60%' in t,'야영지 쉬기 문구'
  check(page,'4-camp')
  hp=page.evaluate("()=>{G.run.p.hp=1;render();return G.run.p.hpMax}");page.click('[data-a=rest]')
  assert page.evaluate('G.run.p.hp')==min(hp,1+hp*0.6) or abs(page.evaluate('G.run.p.hp')-(1+hp*0.6))<1e-6,'쉬기 회복량'
  # 챕터 시작 꾸러미(표식 도전 2챕터와 같은 길): 꾸러미 → 앞 챕터 정산 뒤 상점 → 무기 · 갑옷 고르기 → 2챕터 1층
  page.evaluate("()=>{const r=G.run;G.sheet=null;r.ch=2;r.room=0;r.cur=null;markKit(r,2);markShopOpen(r)}")
  assert page.evaluate("G.scr==='shop' && G.sheet && G.sheet.kind==='kitpick'"),'꾸러미 고르기 창'
  check(page,'5-kitpick')
  page.click('[data-a=kitpick] >> nth=0');page.click('[data-a=kitpick] >> nth=0')
  assert page.evaluate('!G.run.kitPick && !G.sheet'),'꾸러미 두 번 고른 뒤 창이 남음'
  check(page,'6-markshop')
  page.click('[data-a=shopleave]')
  assert page.evaluate("G.scr==='run' && !G.run.markShop"),'상점에서 챕터로'
  assert not errors,errors
  print('16층 브라우저(390px): '+', '.join(f'{n} {w}px' for n,w in res)+' · 숨은 직업 칸 · 갈림길 지도 · 순찰대 고르기 · 야영지 60% · 꾸러미 고르기 → 상점 → 챕터 통과')
  browser.close()
finally:server.shutdown();server.server_close()
