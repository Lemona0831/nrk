# 0.8.0 M5-0a: 승부수 컷인 · 카드 동작 · 상태 표시 · 설명란을 브라우저에서 확인한다(마검사 승부수 셋).
# 실행: python tools/cutin-browser.py [사이트 폴더=.] [캡처 폴더]
# 판정: ① 세 승부수가 전투마다 첫 사용에 컷인(종류별 문법 클래스)과 전투 기록 대사 한 줄, 두 번째 사용은 컷인 없음
#       ② 컷인 중에도 행동 단추가 눌림(덮개 pointer-events:none · aria-hidden) ③ 카드 상태 표시(겁화 3 → 2, 불의 몸 3 → 2, 죄인의 벽)
#       ④ 움직임 줄이기: 띠와 글만(가르기 선 · 입자 없음) ⑤ 이펙트 끔(효과음 켬 · 끔 모두): 컷인 없이 기록 한 줄, 컷인 소리 없음
#       ⑥ 효과음 끔 + 이펙트 보통: 컷인은 뜨고 소리는 없음 ⑦ 설명란 세 곳(트리 · 장착 창 · 전투 스킬 정보): 대사 칸이 위, 효과 · 대가 · 대상 줄, 화면 읽기 순서 "대사: … 효과: …"
#       ⑧ 390px · 1280px 가로 넘침 없음, 페이지 오류 없음
from pathlib import Path
import sys,json,re,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=(root/(sys.argv[1] if len(sys.argv)>1 else '.')).resolve(); shots=Path(sys.argv[2]) if len(sys.argv)>2 else None
if shots: shots.mkdir(parents=True,exist_ok=True)
mock=(root/'tools/mock_sb.js').read_text(encoding='utf-8')
html=(site/'index.html').read_text(encoding='utf-8-sig')
rev=re.search(r'name="nrk-release" content="([a-f0-9]+)"',html).group(1)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(site)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
FIN=[('sb_kalpa','blade','겁화','피와 화염이 몸을 감싸니'),('sb_sinwall','guard','죄인의 벽','죄인의 피가 오만방자하게도'),('sb_firebody','arcane','불의 몸','과거의 유산은, 결국 자신도')]
out=[]
def shot(page,name):
 if shots: page.screenshot(path=str(shots/(name+'.png')))
def setup(ctx,W):
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_viewport_size({'width':W,'height':844 if W<600 else 800})
 page.goto(base);page.wait_for_function('SITE_UPDATE.started && G.conn==="ok"')
 page.click('[data-a=newchar]')
 if page.query_selector('[data-a=tutskip]'):page.click('[data-a=tutskip]')
 page.click('button.link[data-a=gdone]')
 page.evaluate("G.data.name='컷인 점검';G.data.seenCoach=true;G.data.seenBreak=true")
 page.fill('#cname','컷인 점검');page.click('[data-a=cnok]')
 page.click('[data-a=clspick][data-k=spellblade]');page.click('button[data-a=start][data-b=spellblade]')
 page.evaluate('ask=()=>true')
 for _ in range(12):
  if page.evaluate("G.scr==='run' && !G.creating && !G.sheet"):break
  for s in ['button[data-a=allocgo]','button[data-a=allocnext]','button[data-a=kspick]','button[data-a=allocok]','button[data-a=statok]']:
   if page.query_selector(s):page.click(s+' >> nth=0');break
  page.wait_for_timeout(100)
 # 소리 흔적: 컷인 합성음(웹 오디오)과 효과음 파일 재생을 센다
 page.evaluate("()=>{window.__snd=[];const o=window.cutSound;window.cutSound=function(c,a,d){window.__snd.push(c);};SND.unlocked=true}")
 return page,errors
FIGHT="""(o)=>{G.data.fx=o.fx;G.data.rm=o.rm?1:0;G.data.audio=Object.assign({},G.data.audio||{},{on:o.snd,bfx:o.snd});G.pace='normal';G.skip=false;
 const p=mkPlayer('spellblade',{},{},['sb_kalpa','sb_sinwall','sb_firebody']);p.hpMax=p.hp=400;G.run.p=p;
 const es=[mkEnemy('skeleton',false,0),mkEnemy('skeleton',false,1),mkEnemy('skeleton',false,2)];for(const e of es){e.hpMax=e.hp=500;}
 G.b=newBattle(p,es,{ch:1});G.sel=es[0].id;G.scr='run';G.sheet=null;render();
 const b=G.b;p.ys=Math.max(p.ys||0,8);if(typeof ysCapOf==='function')p.ys=Math.min(ysCapOf(p),Math.max(p.ys,8));p.ward=20;render();return {ys:p.ys}}"""
def ready(page,ms=20000): page.wait_for_function("G.b && !G.busy && !G.b.waiting && !G.b.over",timeout=ms)
def use(page,sid):
 ready(page); page.evaluate("()=>{window.__snd.length=0}")
 btn=page.query_selector(f'[data-a=act][data-id={sid}]'); assert btn,('스킬 단추 없음',sid)
 page.evaluate(f"()=>{{G.b.p.ys=Math.max(G.b.p.ys,4);G.b.p.cd={{}};render()}}")
 page.click(f'[data-a=act][data-id={sid}]')
 page.mouse.move(2,2); page.evaluate("()=>{if(typeof hidePop==='function')hidePop()}") # 눌린 단추 위 설명 창이 컷인을 가리지 않게
def logHas(page,frag): return page.evaluate("f=>G.b.log.some(x=>x.m.includes(f))",frag)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  for W in (390,1280):
   ctx=browser.new_context(viewport={'width':W,'height':844})
   ctx.add_init_script('window.__cfgOverride=1;')
   ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
   ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
   ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort()); ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
   ctx.route('**/release.json?*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'revision':rev})))
   page,errors=setup(ctx,W)
   # ① ② ③ 세 승부수(이펙트 보통 = 화려 단계, 효과음 켬)
   for sid,cut,nm,frag in FIN:
    page.evaluate(FIGHT,{'fx':'normal','rm':False,'snd':True}); use(page,sid)
    page.wait_for_selector('#vfx .cutin',timeout=3000)
    info=page.evaluate("()=>{const c=document.querySelector('#vfx .cutin');const v=document.getElementById('vfx');return {cls:c.className,hid:v.getAttribute('aria-hidden'),pe:getComputedStyle(v).pointerEvents,w:c.getBoundingClientRect().width}}")
    assert ('cu-'+cut) in info['cls'] and 'cu-fancy' in info['cls'],(sid,info); assert info['hid']=='true' and info['pe']=='none',info
    assert logHas(page,frag),(sid,'기록에 대사 없음')
    hitAt={'blade':.56,'guard':.16,'arcane':.2}[cut]*2250
    page.wait_for_timeout(int(hitAt)+120); shot(page,f'{W}-{cut}-hit')
    page.wait_for_timeout(500); shot(page,f'{W}-{cut}-linger')
    # 컷인 중에도 단추가 눌린다(덮개가 막지 않음): 그 자리의 맨 위 요소가 덮개가 아님
    top=page.evaluate("()=>{const b=document.querySelector('[data-a=act]');const r=b.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el&&!el.closest('#vfx')}")
    assert top,('덮개가 단추를 가림',sid)
    snd=page.evaluate("()=>window.__snd.slice()"); assert cut in snd,(sid,'컷인 소리 없음',snd)
    page.wait_for_function("!document.querySelector('#vfx .cutin')",timeout=4000)
    ready(page)
    badge=page.evaluate("()=>[...document.querySelectorAll('.fstat .stt')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())")
    st=page.evaluate("()=>document.querySelector('.fstat').className")
    shot(page,f'{W}-{cut}-badge')
    if cut=='blade': assert any('겁화' in x and '3' in x for x in badge) or any('겁화' in x and '2' in x for x in badge),badge; assert 'st-blaze' in st,st
    if cut=='guard': assert any('죄인의 벽' in x for x in badge),badge; assert 'st-wall' in st,st
    if cut=='arcane': assert any('불의 몸' in x for x in badge),badge; assert 'st-fire' in st,st
    n0=page.evaluate("k=>G.b.p.sbSt[k]",{'blade':'blaze','guard':'sinWall','arcane':'fireBody'}[cut])
    # 차례 하나 넘기기(기본 공격) → 남은 차례 감소
    page.evaluate("()=>{G.b.p.cd={};render()}"); page.click('[data-a=act][data-id=basic]'); page.wait_for_timeout(200); ready(page)
    n1=page.evaluate("k=>G.b.p.sbSt[k]",{'blade':'blaze','guard':'sinWall','arcane':'fireBody'}[cut])
    badge2=page.evaluate("()=>[...document.querySelectorAll('.fstat .stt')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())")
    if cut!='guard': assert n1==n0-1 and any(str(n1) in x for x in badge2),(cut,n0,n1,badge2)
    # 같은 전투에서 두 번째 사용: 컷인 없음
    if cut=='blade':
     page.evaluate("()=>{G.b.p.sbSt.blaze=0;render()}"); use(page,sid); page.wait_for_timeout(400)
     assert not page.query_selector('#vfx .cutin'),'두 번째 사용에 컷인'
    out.append(f'{W}px {nm}: 컷인 {cut} · 기록 대사 · 소리 {cut} · 상태 {badge} → 다음 차례 {badge2}')
   # ④ 움직임 줄이기
   page.evaluate(FIGHT,{'fx':'normal','rm':True,'snd':True}); use(page,'sb_kalpa'); page.wait_for_selector('#vfx .cutin',timeout=3000); page.wait_for_timeout(900)
   rmI=page.evaluate("()=>{const c=document.querySelector('#vfx .cutin');const sl=[...c.querySelectorAll('.cu-slash')].map(e=>+getComputedStyle(e).opacity);return {cls:c.className,slash:Math.max(...sl),lb:getComputedStyle(c.querySelector('.cu-layer.lb')).display,anim:document.querySelector('.fstat').getAnimations().length}}")
   assert 'cu-fancy' not in rmI['cls'] and rmI['slash']==0 and rmI['lb']=='none' and rmI['anim']==0,rmI
   shot(page,f'{W}-rm'); out.append(f'{W}px 움직임 줄이기: 띠와 글만(가르기 선 0, 카드 움직임 0)')
   page.wait_for_function("!document.querySelector('#vfx .cutin')",timeout=4000)
   # ⑤ 이펙트 끔(효과음 켬 · 끔)
   for snd in (True,False):
    page.evaluate(FIGHT,{'fx':'off','rm':False,'snd':snd}); use(page,'sb_kalpa'); page.wait_for_timeout(700)
    assert not page.query_selector('#vfx .cutin'),('이펙트 끔에 컷인',snd); assert logHas(page,'피와 화염이 몸을 감싸니'),'이펙트 끔: 기록 한 줄 없음'
    assert page.evaluate("()=>window.__snd.length")==0,'이펙트 끔에 컷인 소리'
   out.append(f'{W}px 이펙트 끔(효과음 켬 · 끔): 컷인 없음, 기록 한 줄, 컷인 소리 없음')
   # ⑥ 효과음 끔 + 이펙트 보통
   page.evaluate(FIGHT,{'fx':'normal','rm':False,'snd':False}); use(page,'sb_sinwall'); page.wait_for_selector('#vfx .cutin',timeout=3000)
   real=page.evaluate("()=>vfxSndOn()"); assert not real,'효과음 끔인데 켜짐'
   out.append(f'{W}px 효과음 끔 + 이펙트 보통: 컷인은 뜨고 소리 판정 꺼짐')
   page.wait_for_function("!document.querySelector('#vfx .cutin')",timeout=4000)
   # ⑦ 설명란: 전투 스킬 정보
   ready(page); page.evaluate("()=>{G.data.fx='normal'}")
   h=page.evaluate("()=>infoHtml('act:sb_kalpa')")
   assert 'skd-line' in h and h.index('대사: ')<h.index('효과') and 'skd-r pay' in h and '>대가<' in h and '>대상<' in h,h[:300]
   if W==390:
    el=page.query_selector('[data-a=act][data-id=sb_sinwall]'); showp=page.evaluate("()=>{const el=document.querySelector('[data-a=act][data-id=sb_sinwall]');showPop(el,true);return !!document.querySelector('.skd')}")
    assert showp,'전투 정보 창에 설명란 없음'; shot(page,f'{W}-desc-battle')
   # 트리(방사형 상세)
   page.evaluate("()=>{G.b=null;const run=G.run;run.p=mkPlayer('spellblade',{},{},['sb_kalpa']);G.tview='a';G.scr='tree';G.sheet=null;render()}"); page.wait_for_timeout(300)
   page.evaluate("()=>{const n=document.querySelector('.tn[data-k=sb_firebody]')||document.querySelector('[data-k=sb_firebody]');if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))}"); page.wait_for_timeout(250)
   VIS="()=>{const L=[...document.querySelectorAll('.skd')].filter(x=>x.getClientRects().length&&x.offsetParent!==null);if(L[0])L[0].scrollIntoView({block:'center'});return L.length}"
   tr=page.evaluate(VIS)
   if not tr:
    page.evaluate("()=>{G.tsel=G.tsel||{};G.tsel.a='sb_firebody';render()}"); page.wait_for_timeout(200); tr=page.evaluate(VIS)
   assert tr,('트리 설명란 없음',page.evaluate("()=>document.querySelectorAll('.skd').length"))
   shot(page,f'{W}-desc-tree')
   # 장착 창: 트리 목록 보기(찍은 스킬마다 장착 단추). 승부수 셋을 연 상태로 본다
   hs=page.evaluate("()=>infoHtml('sk:sb_sinwall')"); assert 'skd-line' in hs and '>대가<' in hs,hs[:200]
   page.evaluate("()=>{const a=G.run.atree;for(const k of ['sb_kalpa','sb_sinwall','sb_firebody'])if(!a.own.includes(k))a.own.push(k);G.data.treeList=true;G.abr='죄인의 피';delete G.run.offer;G.tview='a';G.scr='tree';G.sheet=null;render()}"); page.wait_for_timeout(300)
   eqn=page.evaluate("()=>{const L=[...document.querySelectorAll('.ptnode')].filter(x=>x.querySelector('.skd'));const n=L.find(x=>/죄인의 벽/.test(x.textContent))||L[0];if(n)n.scrollIntoView({block:'center'});return {n:L.length,eq:L.filter(x=>x.querySelector('[data-a=ateq]')).length}}")
   assert eqn['n']>=1,('장착 목록 설명란',eqn); shot(page,f'{W}-desc-equip'); out.append(f'{W}px 장착 목록(트리 목록 보기): 승부수 설명란 {eqn["n"]}칸, 장착 단추 {eqn["eq"]}')
   page.evaluate("()=>{G.data.treeList=false}")
   w=page.evaluate('document.documentElement.scrollWidth'); assert w<=W,('가로 넘침',w)
   assert not errors,errors
   ctx.close()
  browser.close()
  print('\n'.join(out)); print('cutin-browser: 통과')
finally:server.shutdown();server.server_close()
