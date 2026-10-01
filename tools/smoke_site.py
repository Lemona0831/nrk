# 사이트 흐름 점검: 가짜 Supabase로 지인 접속, 판 기록 저장, 남의 경로 쓰기 거절, 관리자 결과 보기, 기록판을 확인한다.
# 실행: pip install playwright && playwright install chromium && python tools/smoke_site.py
from playwright.sync_api import sync_playwright
import os
mock=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_sb.js'), encoding='utf-8').read()
import os
SITE='file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html')).replace(os.sep, '/')
with sync_playwright() as p:
    br=p.chromium.launch(); errs=[]
    ctx=br.new_context(viewport={'width':390,'height':844})
    ctx.add_init_script("window.__cfgOverride=1;")
    ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    # 지인
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append('지인:'+str(e)))
    pg.goto(SITE); pg.wait_for_timeout(600)
    pg.click('button.link[data-a=gdone]'); pg.wait_for_timeout(300)
    print('지인 연결:', pg.evaluate("()=>[G.site,G.conn,G.uid&&G.uid.slice(0,10),G.owner]"), '| 경고 카드:', bool(pg.query_selector('.warncard')))
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.name='민수'}")
    pg.click('button[data-a=start][data-b=hunter][data-boss=mother]'); pg.click('button[data-a=skillok]')
    for k in ['dex']*6: pg.click(f'button[data-a="stat+"][data-k={k}]')
    pg.click('button[data-a=statok]'); pg.click('button[data-a=enter]'); pg.select_option('#pace','instant')
    for i in range(30):
        if pg.query_selector('button[data-a=bcont]'): break
        pg.keyboard.press('1'); pg.wait_for_function("()=>!G.busy")
    if pg.query_selector('button[data-a=bcont]'): pg.click('button[data-a=bcont]')
    pg.wait_for_timeout(300)
    if pg.query_selector('button[data-a=choose]'): pg.click('button[data-a=choose] >> nth=0')
    if pg.query_selector('button[data-a=dropkeep]'): pg.click('button[data-a=dropkeep]')
    pg.evaluate("()=>{G.run.result='win'; G.scr='survey'; G.b=null; G.sheet=null; render();}")
    pg.check('input[name=fun][value="4"]'); pg.fill('#isnote','사이트 시험'); pg.click('button[data-a=survey]'); pg.wait_for_timeout(1500)
    st=pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('MOCKSB')); return Object.keys(s.docs)}")
    print('저장소에 쌓인 문서:', len(st), [k.split('/')[0]+'/…/'+k.split('/')[-1] for k in st][:8])
    print('판 끝난 뒤 기록 보내기 창(사이트면 안 떠야 함):', pg.inner_text('#shtitle') if pg.query_selector('#shtitle') else '안 뜸')
    # 남의 경로에 쓰기 시도 → 거절
    r=pg.evaluate("async()=>{ try { await G.db.doc('playtest/someone-else/runs/x').set({a:1}); return '써짐'; } catch(e) { return '거절: '+e.message; } }")
    print('남의 경로 쓰기:', r)
    # 만든 사람 (다른 탭 = 다른 익명 계정)
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errs.append('관리자:'+str(e)))
    pg2.goto(SITE); pg2.wait_for_timeout(600)
    if pg2.query_selector('button.link[data-a=gdone]'): pg2.click('button.link[data-a=gdone]')
    print('관리자 버튼:', bool(pg2.query_selector('button[data-a=admin]')))
    pg2.click('button[data-a=admin]'); pg2.fill('#adminpass','틀린암호'); pg2.click('button[data-a=admingo]'); pg2.wait_for_timeout(300)
    print('틀린 암호:', pg2.inner_text('.sheet [role=status]') if pg2.query_selector('.sheet [role=status]') else None)
    pg2.fill('#adminpass','test-pass'); pg2.click('button[data-a=admingo]'); pg2.wait_for_timeout(400)
    print('관리자 됨:', pg2.evaluate("()=>G.owner"))
    pg2.click('button[data-a=dash]'); pg2.wait_for_timeout(1500)
    t=pg2.inner_text('main'); i=t.find('테스터별 진행'); print('결과 보기:', t[i:i+160].replace('\n',' ') if i>=0 else t[:200])
    print('기록판(지인 승리):', pg2.evaluate("async()=>{ G.board=null; await loadBoard(); return (G.board||[]).map(x=>x.name) }"))
    print('errs', errs); br.close()
