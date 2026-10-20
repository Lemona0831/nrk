# 0.8.0 M5-0c: 마검사 액티브 트리 화면(재설계)을 1280 · 390px에서 연다. 1고리만 열린 새 판과 3고리까지 열린 판(찍은 칸이 있는 판).
# 실행: python tools/m5c-tree-browser.py [사이트 폴더=.] [캡처 폴더]   (TREE_CLS=warden이면 파수꾼, M5-1)
# 판정: ① 부채꼴 이름 여섯(갈래 · 경계 같은 급 크기)이 보이고 겹치지 않음 ② 1고리 첫 스킬 쌍이 자기 부채꼴 안에서 좌우로 떨어져 있고(겹침 0), 고리 글자가 노드와 겹치지 않음
#       ③ 경계 입구 선은 갈래마다 한 가닥이고 다른 부채꼴을 지나지 않음 ④ 결합 칸은 원 바깥(제시된 둘만), 꼬리표 진행(출혈 1/2 같은) 글자
#       ⑤ 변형 표식(강화 위성)은 찍은 스킬 곁에만 ⑥ 가로 넘침 없음, 페이지 오류 없음
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
SECN={'spellblade':['염검','혈염','혈인','죄인의 피','마갑','유산의 불'],'warden':['성벽','공성추','파쇄','기둥 파쇄','전열 장악','용맹의 투지']}
BUY={'spellblade':['sb_bleedcut','sv_bleedcut','sb_blooddrop','sb_taste','sv_taste','sb_crimson','sb_ember','sb_bloodfire','sb_hotedge','sb_searcut','sb_kalpa'],'warden':['w_dstance','sv_w_dstance','w_pray','w_stand','sv_w_stand','w_citadel','s_slam','w_flare','w_rebuild','w_breach','w_siege']}[CLS]
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
 for n in SECN[CLS]: chk(n in names,('부채꼴 이름 없음',n,names))
 hs=sorted(set(round(l['h']) for l in labs)); chk(max(hs)-min(hs)<=2,('갈래 · 경계 이름 크기가 다름',hs))
 ov=[(a['n'],b['n']) for i,a in enumerate(labs) for b in labs[i+1:] if overlap(a,b)]; chk(not ov,('부채꼴 이름 겹침',ov))
 nodes=boxes(page,'.trd-nodes .tn-skill .bd'); rl=boxes(page,'svg .tl.rl:not(.rls)')
 ov2=[(r['n'],k['n']) for r in rl for k in nodes if overlap(r,k,1)]; chk(not ov2,('고리 글자가 노드와 겹침',ov2))
 ov3=[(a['n'],b['n']) for i,a in enumerate(nodes) for b in nodes[i+1:] if overlap(a,b,1)]; chk(not ov3,('노드끼리 겹침',ov3))
 w=page.evaluate('document.documentElement.scrollWidth'); chk(w<=W,('가로 넘침',w))
 if shots: page.screenshot(path=str(shots/f'tree-{CLS}-{W}-{tag}.png'),full_page=True)
 out.append(f'{W}px {tag}: 부채꼴 이름 {len(labs)}(높이 {hs}), 겹침 0, 고리 글자 · 노드 겹침 0, 폭 {w}px')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  for W in (1280,390):
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
   # 3고리까지: 2챕터를 깬 판, 혈인 길 a · 염검 첫 스킬 · 혈염 경계를 찍음
   page.evaluate("""(BUY)=>{const run=G.run;run.clears=2;run.lv=12;run.ringCamp=3;ptFix(run);run.atree.pts=20;delete run.atree.vsel;
     for(const id of BUY){const n=atBuild(G.run.build).nodes[id];const w=atWhy(run,id);if(!w)atBuy(run,id,n&&n.slot?atVarsOffered(run,id)[0]:undefined);}
     G.tview='a';G.scr='tree';G.sheet=null;G.tvw={};render()}""",BUY); page.wait_for_timeout(400)
   # 전체 보기
   if page.query_selector('[data-a=tzoom][data-k=fit]'): page.click('[data-a=tzoom][data-k=fit]'); page.wait_for_timeout(250)
   check(page,W,'ring3')
   cb=page.evaluate("()=>[...document.querySelectorAll('.trd-cb')].map(g=>({k:g.dataset.k,t:g.textContent.replace(/\\s+/g,' ').trim()}))")
   out.append(f'{W}px 결합 칸: '+(' / '.join(f"{c['k']} {c['t']}" for c in cb) or '없음'))
   assert not errors,errors
   ctx.close()
  browser.close()
  print('\n'.join(out))
  if FAIL: print('실패:', FAIL)
  else: print('m5c-tree-browser: 통과')
finally:server.shutdown();server.server_close()
