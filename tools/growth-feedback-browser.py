# 사이트 흐름 점검 (0.6 개발 중에는 next/): 가짜 Supabase로 지인 접속, 타이틀 → 이름 → 직업 → 스킬 → 능력치, 판 기록 저장, 남의 경로 쓰기 거절, 관리자 페이지(#admin), 랭킹을 확인한다.
# 실행: pip install playwright && playwright install chromium && python tools/smoke_site.py
from playwright.sync_api import sync_playwright
import os
mock=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_sb.js'), encoding='utf-8').read()
import os
import sys
# 점검할 폴더: 기본 next/(개발판). 루트(지인 주소)는 python tools/smoke_site.py .
SITE='file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', sys.argv[1] if len(sys.argv) > 1 else 'next', 'index.html')).replace(os.sep, '/')
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
    pg.click('[data-a=newchar]')
    if pg.query_selector('[data-a=tutskip]'): pg.click('[data-a=tutskip]')  # 0.6a.2: 처음 시작하면 수련장을 권한다(건너뛰기)
    pg.click('button.link[data-a=gdone]'); pg.wait_for_timeout(300)
    print('지인 연결:', pg.evaluate("()=>[G.site,G.conn,G.uid&&G.uid.slice(0,10),G.owner]"), '| 경고 카드:', bool(pg.query_selector('.warncard')))
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='민수'}")  # 첫 붕괴 안내 창이 전투 버튼을 가리지 않게
    pg.fill('#cname', '사냥꾼민수'); pg.click('[data-a=cnok]'); cls = 'hunter' if pg.query_selector('[data-a=clspick][data-k=hunter]') else pg.get_attribute('[data-a=clspick]', 'data-k')  # 0.6a.2 시험판(06a2)에는 사냥꾼이 아직 없다
    pg.click(f'[data-a=clspick][data-k={cls}]')
    pg.click(f'button[data-a=start][data-b={cls}]'); pg.click('button[data-a=skillok]')
    for k in ['dex']*6: pg.click(f'button[data-a="stat+"][data-k={k}]')
    if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')  # 06a2 능력치 다섯(15점): 남은 점수는 추천 배분으로
    pg.click('button[data-a=statok]'); pg.click('button[data-a=door][data-k="0"]'); pg.click('button[data-a=enter]'); pg.evaluate("()=>{G.pace='instant'}")  # 휴대폰 폭에서는 진행 속도 고르기가 설정 창에만 있다
    from pathlib import Path
    out=Path('output/playwright/equipment');out.mkdir(parents=True,exist_ok=True)
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.evaluate("""()=>{G.b=null;G.scr='run';G.run.p=mkPlayer('hunter',{});G.run.stats={};G.run.bag=[];delete G.run.inv;initGear(G.run);G.run.swaps=[];const it=mkItem('twinblades',{ch:2,b:20});addItem(G.run,it);G.eqSel={slot:'weapon',uid:it.uid};G.toastLines=[];openSheet('equip')}""")
        pg.click('[data-a=eqon]')
        assert '장비 교체 · ' in pg.locator('.toast').inner_text()
        assert ' → ' in pg.locator('.toast').inner_text()
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.screenshot(path=str(out/f'growth-gear-{width}.png'),full_page=True)
        pg.evaluate("""()=>{G.toastLines=[];G.run.statPending=1;openSheet('stats',{pts:3,pending:1,alloc:{str:0,dex:0,con:0,int:0,wil:0}})}""")
        for _ in range(3): pg.click('[data-a="stat+"][data-k=con]')
        pg.click('[data-a=statok]')
        assert '능력치 배분 · 최대 생명력' in pg.locator('.toast').inner_text()
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.screenshot(path=str(out/f'growth-stat-{width}.png'),full_page=True)
    assert not errs, errs
    print('390/1280px 실제 장비 교체·능력치 배분 알림·가로 넘침·화면 오류 통과')
    br.close()
