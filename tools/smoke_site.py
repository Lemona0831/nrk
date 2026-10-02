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
    pg.click('[data-a=newchar]'); pg.click('button.link[data-a=gdone]'); pg.wait_for_timeout(300)
    print('지인 연결:', pg.evaluate("()=>[G.site,G.conn,G.uid&&G.uid.slice(0,10),G.owner]"), '| 경고 카드:', bool(pg.query_selector('.warncard')))
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.name='민수'}")
    pg.fill('#cname', '사냥꾼민수'); pg.click('[data-a=cnok]'); pg.click('[data-a=clspick][data-k=hunter]')
    pg.click('button[data-a=start][data-b=hunter]'); pg.click('button[data-a=skillok]')
    for k in ['dex']*6: pg.click(f'button[data-a="stat+"][data-k={k}]')
    pg.click('button[data-a=statok]'); pg.click('button[data-a=door][data-k="0"]'); pg.click('button[data-a=enter]'); pg.evaluate("()=>{G.pace='instant'}")  # 휴대폰 폭에서는 진행 속도 고르기가 설정 창에만 있다
    for i in range(30):
        if pg.query_selector('button[data-a=bcont]'): break
        pg.keyboard.press('1'); pg.wait_for_function("()=>!G.busy")
    if pg.query_selector('button[data-a=bcont]'): pg.click('button[data-a=bcont]')
    pg.wait_for_timeout(300)
    if pg.query_selector('button[data-a=choose]'): pg.click('button[data-a=choose] >> nth=0')
    if pg.query_selector('button[data-a=dropkeep]'): pg.click('button[data-a=dropkeep]')
    pg.evaluate("()=>{G.run.result='win'; G.scr='survey'; G.b=null; G.sheet=null; render();}")
    pg.check('input[name=fun][value="4"]'); pg.fill('#isnote' if pg.query_selector('#isnote') else '#snote','사이트 시험'); pg.click('button[data-a=survey]'); pg.wait_for_timeout(1500)  # 0.6b 설문은 한 줄 칸(#snote)만 있다
    st=pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('MOCKSB')); return Object.keys(s.docs)}")
    print('저장소에 쌓인 문서:', len(st), [k.split('/')[0]+'/…'+('/'+k.split('/')[2] if k.count('/')>1 else '')+'/'+k.split('/')[-1][:6] for k in st][:8])
    print('판 끝난 뒤 기록 보내기 창(사이트면 안 떠야 함):', pg.inner_text('#shtitle') if pg.query_selector('#shtitle') else '안 뜸')
    # 남의 경로에 쓰기 시도 → 거절
    r=pg.evaluate("async()=>{ try { await G.db.doc('playtest/someone-else/runs/x').set({a:1}); return '써짐'; } catch(e) { return '거절: '+e.message; } }")
    print('남의 경로 쓰기:', r)
    # 구글 로그인: 익명 계정에 구글을 이어 붙이면 uid와 기록이 그대로여야 한다
    uid0=pg.evaluate("()=>G.uid")
    pg.click('[data-a=menu]'); pg.click('.mnav [data-a=login][data-k=google]'); pg.wait_for_timeout(900)
    pg.click('[data-a=menu]'); print('구글 연결:', pg.evaluate("()=>[G.acct.anon, G.acct.provider, G.uid===%r, G.data.name]" % uid0), '| 메뉴:', pg.inner_text('.mnav').replace(chr(10), ' ')); pg.click('[data-a=menu]')
    # 다른 기기(새 탭 = 새 익명 계정)에서 같은 구글 계정으로 이으려 하면 → 그 계정으로 들어가기
    pg3=ctx.new_page(); pg3.on('pageerror',lambda e:errs.append('둘째 기기:'+str(e)))
    pg3.goto(SITE); pg3.wait_for_timeout(600)
    pg3.click('[data-a=menu]'); pg3.click('.mnav [data-a=login][data-k=google]'); pg3.wait_for_timeout(900)
    print('이미 쓰는 계정 안내:', bool(pg3.query_selector('button[data-a=loginswitch]')), '| 주소 정리:', '#' not in pg3.url)
    pg3.click('button[data-a=loginswitch]'); pg3.wait_for_timeout(900)
    print('그 계정으로 들어감:', pg3.evaluate("()=>[G.acct.anon, G.uid===%r, G.data.name]" % uid0))
    pg3.on('dialog', lambda d: d.accept()); pg3.click('[data-a=menu]'); pg3.click('.mnav [data-a=logout]'); pg3.wait_for_timeout(900)
    print('로그아웃 뒤 익명:', pg3.evaluate("()=>[G.acct.anon, G.uid!==%r, G.data.name]" % uid0)); pg3.close()
    # 만든 사람 (다른 탭 = 다른 익명 계정)
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errs.append('관리자:'+str(e)))
    pg2.goto(SITE + '#admin'); pg2.wait_for_timeout(600)
    print('관리자 페이지:', pg2.evaluate("()=>G.scr"), '| 메뉴에 관리자(암호 전):', bool(pg2.query_selector('.mnav [data-a=admin]')))
    pg2.fill('#adminpass','틀린암호'); pg2.click('button[data-a=admingo]'); pg2.wait_for_timeout(300)
    print('틀린 암호:', pg2.inner_text('main [role=status]') if pg2.query_selector('main [role=status]') else None)
    pg2.fill('#adminpass','test-pass'); pg2.press('#adminpass', 'Enter'); pg2.wait_for_timeout(1500)
    print('관리자 됨:', pg2.evaluate("()=>G.owner"))
    t=pg2.inner_text('main'); i=t.find('테스터별 진행'); print('결과 보기:', t[i:i+160].replace('\n',' ') if i>=0 else t[:200])
    t2=t.find('0.6 캐릭터'); print('0.6 요약:', t[t2:t2+60].replace(chr(10),' ') if t2>=0 else '없음')
    print('랭킹(지인 판):', pg2.evaluate("async()=>{ G.board=null; await loadBoard(); return rankRows().map(e=>[e.nick,e.cname,e.build,rankProg(e)]) }"))
    print('errs', errs); br.close()
