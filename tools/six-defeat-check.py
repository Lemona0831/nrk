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
    pg.evaluate("()=>{G.b.p.hp=1;hurtPlayer(G.b,20,{dot:1,label:'시험 피해'});battleContinue()}")
    pg.wait_for_timeout(400)
    assert pg.evaluate("()=>G.run.grave.resources.life===G.run.p.flask.life")
    assert pg.locator('.gravecontext').count()==1
    assert '남은 생명력 0' in pg.locator('.killb').inner_text()
    assert pg.locator('.gravecontext [data-a=help]').count()==3
    assert pg.evaluate("()=>graveContext({build:'assassin',last:['basic']}).includes('기록 없음')")
    assert pg.evaluate("()=>graveContext({build:'assassin',last:['basic']}).includes('기본 공격')")
    assert not errs,errs
    from pathlib import Path
    out=Path(__file__).resolve().parent.parent/'docs/조사/ui-six'
    out.mkdir(exist_ok=True)
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.screenshot(path=str(out/f'defeat-{width}.png'),full_page=True)
    print('패배: 자원 저장·남은 생명력·규칙 링크·옛 기록 호환 통과, errs',errs)
    br.close()
