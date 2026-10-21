# 0.8.0 M5-0c: 마검사 액티브 트리 화면(재설계)을 1280 · 390px에서 연다. 1고리만 열린 새 판과 3고리까지 열린 판(찍은 칸이 있는 판).
# 실행: python tools/m5c-tree-browser.py [사이트 폴더=.] [캡처 폴더]   (TREE_CLS=warden이면 파수꾼, M5-1)
# 판정: ① 부채꼴 이름 여섯(갈래 · 경계 같은 급 크기)이 보이고 겹치지 않음 ② 1고리 첫 스킬 쌍이 자기 부채꼴 안에서 좌우로 떨어져 있고(겹침 0), 고리 글자가 노드와 겹치지 않음
#       ③ 경계 입구 선은 갈래마다 한 가닥이고 다른 부채꼴을 지나지 않음 ④ 결합 칸은 원 바깥(제시된 둘만), 꼬리표 진행(출혈 1/2 같은) 글자
#       ⑤ 변형 표식(강화 위성)은 찍은 스킬 곁에만 ⑥ 가로 넘침 없음, 페이지 오류 없음
#       M5-0d(10월 20일): ⑦ 보이는 글자(부채꼴 · 길 · 고리 · 칸 이름 · 결합 칸 조건)끼리 겹침 0 ⑧ 그림(svg) 밖으로 잘린 글자 0 ⑨ 1고리 칸 이름은 모두 보임(고리 글자보다 먼저)
#       ⑩ 길이 다른 칸끼리의 선은 옅은 점선(.lk-x), 기본 보기와 "전체" 보기 둘 다 ⑪ "전체" 보기에서 확대 단추 뒤에 가린 글자 0(잘림에 셈)
#       TREE_CLS=monk 같은 다른 직업 · 패시브 트리(passive-full)는 ⑦ ⑧ ⑪만 본다. TREE_W=1600,1280 처럼 너비를 바꿀 수 있다(기본 1280,390)
from pathlib import Path
import sys,json,re,math,threading,http.server,functools
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
out=[]
import os
CLS=os.environ.get('TREE_CLS','spellblade')
SECN={'spellblade':['염검','혈염','혈인','죄인의 피','마갑','유산의 불'],'warden':['성벽','공성추','파쇄','기둥 파쇄','전열 장악','용맹의 투지'],'monk':['철권','반탄','부동','역혈','혈도','파혈'],'assassin':['독사','독화','격발','암영','그림자','잔영'],'hunter':['저격','명궁','연사','유격','기동','잠복'],'elementalist':['불꽃','빙염','서리','정적','마력','마염']}
BUY={'elementalist':['e5_firebolt','sv_e5_firebolt','e5_icespear','sv_e5_icespear','e5_cloak','e5_burnout','e5_weave','e5_catalyst','e5_arc','e5_avatar','e5_charge'],'hunter':['h5_pierce','sv_h5_pierce','h5_volley','sv_h5_volley','h5_cover','h5_heavy','h5_aimvol','h5_steady','h5_pinpoint','h5_mangung','h5_counter'],'assassin':['a_dokkal','sv_a_dokkal','a_heulbe','sv_a_heulbe','a_gyeonu','a_heulkal','sv_a_heulkal','a_janjjil','a_geurimdok','a_kalchum','a_pagodeul','a_gyeokpyo'],'monk':['m_geumgang','sv_m_geumgang','m_balgyeong','m_cheolsan','sv_m_cheolsan','m_jeomhyeol','m_yeokmaek','m_maekji','m_cheongeun','m_hyeolryu','m_yeonhwan'],'spellblade':['sb_bleedcut','sv_bleedcut','sb_blooddrop','sb_taste','sv_taste','sb_crimson','sb_ember','sb_bloodfire','sb_hotedge','sb_searcut','sb_kalpa'],'warden':['w_dstance','sv_w_dstance','w_pray','w_stand','sv_w_stand','w_citadel','s_slam','w_flare','w_rebuild','w_breach','w_siege']}.get(CLS,[])
def boxes(page,sel): return page.evaluate("s=>[...document.querySelectorAll(s)].filter(t=>getComputedStyle(t).display!=='none'&&t.getAttribute('visibility')!=='hidden'&&+getComputedStyle(t).opacity>0.05).map(t=>{const r=t.getBoundingClientRect();return {n:t.textContent||t.dataset.k,x:r.left,y:r.top,w:r.width,h:r.height}})",sel)
def overlap(a,b,pad=0): return a['x']<b['x']+b['w']-pad and b['x']<a['x']+a['w']-pad and a['y']<b['y']+b['h']-pad and b['y']<a['y']+a['h']-pad
import os
FAIL=[]
def chk(c,m):
 if c: return
 if os.environ.get('SOFT'): FAIL.append(m)
 else: raise AssertionError(m)
def check(page,W,tag):
 labs=boxes(page,'svg .tl.dl'); names=[l['n'] for l in labs]
 M5=CLS in SECN and not tag.startswith('passive') # 부채꼴 · 1고리 · 길 점선 판정은 6부채꼴 트리(마검사 · 파수꾼)만, 겹침 · 잘림 · 단추 가림은 모든 직업 · 패시브
 for n in (SECN[CLS] if M5 else []): chk(n in names,('부채꼴 이름 없음',n,names))
 hs=sorted(set(round(l['h']) for l in labs)) or [0]; chk(max(hs)-min(hs)<=2,('갈래 · 경계 이름 크기가 다름',hs))
 ov=[(a['n'],b['n']) for i,a in enumerate(labs) for b in labs[i+1:] if overlap(a,b)]; chk(not ov,('부채꼴 이름 겹침',ov))
 nodes=boxes(page,'.trd-nodes .tn-skill .bd'); rl=boxes(page,'svg .tl.rl:not(.rls)')
 ov2=[(r['n'],k['n']) for r in rl for k in nodes if overlap(r,k,1)]; chk(not ov2,('고리 글자가 노드와 겹침',ov2))
 ov3=[(a['n'],b['n']) for i,a in enumerate(nodes) for b in nodes[i+1:] if overlap(a,b,1)]; chk(not ov3,('노드끼리 겹침',ov3))
 w=page.evaluate('document.documentElement.scrollWidth'); chk(w<=W,('가로 넘침',w))
 T=page.evaluate("""()=>{const sv=document.querySelector('.trd-svg').getBoundingClientRect();return [...document.querySelectorAll('.trd-svg .trd-labs text')].filter(x=>getComputedStyle(x).display!=='none'&&!x.classList.contains('cull')&&(x.textContent||'').trim()).map(x=>{const r=x.getBoundingClientRect();return {n:x.textContent,c:x.getAttribute('class'),x:r.left,y:r.top,w:r.width,h:r.height,out:r.left<sv.left-0.5||r.right>sv.right+0.5||r.top<sv.top-0.5||r.bottom>sv.bottom+0.5}})}""")
 ovT=[(a['n'],b['n']) for i,a in enumerate(T) for b in T[i+1:] if overlap(a,b,1)]; chk(not ovT,('글자끼리 겹침',tag,ovT[:6]))
 cut=[x['n'] for x in T if x['out']] if 'full' in tag else []; chk(not cut,('그림 밖으로 잘린 글자',tag,cut))
 ct=page.evaluate("()=>{const c=document.querySelector('.trd-ctl');if(!c)return null;const r=c.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}}")
 if ct and 'full' in tag: hid=[x['n'] for x in T if overlap(x,ct,1)]; cut+=hid; chk(not hid,('확대 단추 뒤에 가린 글자',tag,hid))
 r1=page.evaluate("()=>{const A=atBuild(G.run.build);return Object.values(A.nodes).filter(n=>n.kind==='skill'&&n.ring===1&&!n.reqTags).map(n=>n.n)}"); shown=[x['n'] for x in T]; miss=[n for n in r1 if n not in shown]
 if not M5: miss=[]
 if 'full' in tag: chk(not miss,('1고리 칸 이름이 안 보임',tag,miss,W))
 nx=page.evaluate("()=>document.querySelectorAll('.trd-lk .lk-x').length"); chk(nx>0 or not M5,('다른 길 선(점선)이 없음',tag))
 if shots: page.screenshot(path=str(shots/f'tree-{CLS}-{W}-{tag}.png'),full_page=True)
 out.append(f'{W}px {tag}: 부채꼴 이름 {len(labs)}, 보이는 글자 {len(T)}개 겹침 {len(ovT)} · 잘림 {len(cut)}, 1고리 이름 빠짐 {len(miss)}, 다른 길 점선 {nx}, 폭 {w}px')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  for W in [int(x) for x in os.environ.get('TREE_W','1280,390').split(',')]:
   ctx=browser.new_context(viewport={'width':W,'height':900 if W>600 else 844})
   ctx.add_init_script('window.__cfgOverride=1;')
   ctx.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
   ctx.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
   ctx.route('**/fonts.googleapis.com/**',lambda r:r.abort()); ctx.route('**/fonts.gstatic.com/**',lambda r:r.abort())
   ctx.route('**/release.json?*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'revision':rev})))
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base);page.wait_for_function('SITE_UPDATE.started && G.conn==="ok"')
   page.click('[data-a=newchar]')
   if page.query_selector('[data-a=tutskip]'):page.click('[data-a=tutskip]')
   page.click('button.link[data-a=gdone]')
   page.evaluate("G.data.name='트리 점검';G.data.seenCoach=true;G.data.seenBreak=true")
   page.fill('#cname','트리 점검');page.click('[data-a=cnok]')
   page.click(f'[data-a=clspick][data-k={CLS}]');page.click(f'button[data-a=start][data-b={CLS}]')
   page.evaluate('ask=()=>true')
   for _ in range(12):
    if page.evaluate("G.scr==='run' && !G.creating && !G.sheet"):break
    for s in ['button[data-a=allocgo]','button[data-a=allocnext]','button[data-a=kspick]','button[data-a=allocok]','button[data-a=statok]']:
     if page.query_selector(s):page.click(s+' >> nth=0');break
    page.wait_for_timeout(100)
   # 1고리만(새 판)
   page.evaluate("()=>{G.data.treeList=false;G.tview='a';G.scr='tree';G.sheet=null;G.tvw={};render()}"); page.wait_for_timeout(400)
   check(page,W,'ring1')
   if page.query_selector('[data-a=tzoom][data-k=fit]'): page.click('[data-a=tzoom][data-k=fit]'); page.wait_for_timeout(250)
   check(page,W,'ring1-full')
   # 3고리까지: 2챕터를 깬 판, 혈인 길 a · 염검 첫 스킬 · 혈염 경계를 찍음
   page.evaluate("""(BUY)=>{const run=G.run;run.clears=2;run.lv=12;run.ringCamp=3;ptFix(run);run.atree.pts=20;delete run.atree.vsel;
     for(const id of BUY){const n=atBuild(G.run.build).nodes[id];const w=atWhy(run,id);if(!w)atBuy(run,id,n&&n.slot?atVarsOffered(run,id)[0]:undefined);}
     G.tview='a';G.scr='tree';G.sheet=null;G.tvw={};render()}""",BUY); page.wait_for_timeout(400)
   # 전체 보기
   check(page,W,'ring3')
   if page.query_selector('[data-a=tzoom][data-k=fit]'): page.click('[data-a=tzoom][data-k=fit]'); page.wait_for_timeout(250)
   check(page,W,'ring3-full')
   page.evaluate("()=>{G.tview='p';G.tvw={};render()}"); page.wait_for_timeout(400)
   if page.query_selector('[data-a=tzoom][data-k=fit]'): page.click('[data-a=tzoom][data-k=fit]'); page.wait_for_timeout(250)
   check(page,W,'passive-full'); page.evaluate("()=>{G.tview='a';render()}")
   cb=page.evaluate("()=>[...document.querySelectorAll('.trd-cb')].map(g=>({k:g.dataset.k,t:g.textContent.replace(/\\s+/g,' ').trim()}))")
   out.append(f'{W}px 결합 칸: '+(' / '.join(f"{c['k']} {c['t']}" for c in cb) or '없음'))
   assert not errors,errors
   ctx.close()
  browser.close()
  print('\n'.join(out))
  if FAIL: print('실패:', FAIL)
  else: print('m5c-tree-browser: 통과')
finally:server.shutdown();server.server_close()
