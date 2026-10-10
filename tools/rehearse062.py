# release062.py로 만든 사본을 브라우저(file://)로 한 번 지나가 본다. 도구가 읽는 방식(vm)이 아니라 실제 브라우저로 본다.
# 실행: python tools/rehearse062.py [사본폴더]   (기본 $TEMP/nrk-release062/)
# 점검: 콘솔 오류 0 · 요청 실패 0 · G가 뜸 · 곡 선택(musicFor)이 가리키는 파일이 사본에 있음 · 직업 선택 → 첫 전투 → 설정 → 편집기 진입.
# config.js는 사본 안의 빈 파일 그대로 읽는다(진짜 Supabase로 기록이 가지 않는다. 밖으로 가는 요청은 폰트만 막는다).
import os, sys, tempfile
from playwright.sync_api import sync_playwright

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'nrk-release062')
SITE = 'file:///' + OUT.replace(os.sep, '/').lstrip('/') + '/index.html'
bad = []


def ok(name, cond, info=''):
    print(('통과' if cond else '실패'), name, info)
    if not cond:
        bad.append(name)


if os.path.getsize(os.path.join(OUT, 'config.js')) != 0:
    sys.exit('사본의 config.js가 빈 파일이 아닙니다')
with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    reqfail = []
    outside = []
    ctx = br.new_context(viewport={'width': 390, 'height': 844})
    ctx.add_init_script("window.__cfgOverride=1;")

    def route(r):
        u = r.request.url
        if u.startswith('file:'):
            return r.continue_()
        if 'fonts.g' in u:
            return r.abort()
        outside.append(u)
        return r.abort()
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
    pg.on('console', lambda m: errs.append('console.error ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'fonts.g' not in m.text else None)
    pg.on('requestfailed', lambda r: reqfail.append(r.url) if r.url.startswith('file:') and not r.url.endswith('.mp3') else None)  # mp3는 읽기 시험 뒤 새로 고칠 때 중단되므로 위의 "음원 읽기"로 본다
    pg.goto(SITE)
    pg.wait_for_timeout(800)
    st = pg.evaluate("()=>[typeof G, typeof window.G, typeof MUSIC, G.scr, G.site, G.conn]")
    ok('G가 뜸', st[0] == 'object', 'typeof G=%s, window.G=%s, scr=%s, site=%s, conn=%s' % (st[0], st[1], st[3], st[4], st[5]))
    # 곡 선택: 모든 화면에서 musicFor가 고른 곡과 MUSIC · SFX 모든 파일이 사본에 있고 브라우저가 읽는다
    res = pg.evaluate("""async()=>{
      const out={want:{},load:{}};
      const set=(scr,run,b,back)=>{G.scr=scr;G.run=run;G.b=b||null;G.back=back;};
      const tests={title:['title',null],shop:['shop',{ch:2}],dead:['dead',{ch:1}],settle1:['settle',{ch:1}],settle3:['settle',{ch:3}],run1:['run',{ch:1}],run2:['run',{ch:2}],run3:['run',{ch:3}]};
      for(const k in tests){ set(tests[k][0],tests[k][1],null,'title'); out.want[k]=musicFor(); }
      set('run',{ch:1},{ctx:{boss:1}}); out.want.boss1=musicFor(); set('run',{ch:2},{ctx:{boss:1}}); out.want.boss2=musicFor(); set('run',{ch:3},{ctx:{boss:1}}); out.want.boss3=musicFor();
      const all=Object.assign({},MUSIC,SFX);
      for(const k in all){ out.load[k]=await new Promise(res=>{ const a=new Audio(); a.preload='metadata'; a.onloadedmetadata=()=>res('ok '+Math.round(a.duration)+'s'); a.onerror=()=>res('오류'); setTimeout(()=>res('시간 초과'),8000); a.src=all[k].src; }); }
      out.srcs=Object.fromEntries(Object.entries(all).map(([k,v])=>[k,v.src]));
      return out; }""")
    for k, v in res['want'].items():
        ok('musicFor ' + k, v in res['srcs'] and os.path.isfile(os.path.join(OUT, res['srcs'][v])), '-> %s (%s)' % (v, res['srcs'].get(v)))
    for k, v in res['load'].items():
        ok('음원 읽기 ' + k, v.startswith('ok'), v)
    pg.reload()
    pg.wait_for_timeout(800)
    # 흐름: 새 캐릭터 -> 직업 -> 첫 전투
    if pg.query_selector('[data-a=newchar]'):
        pg.click('[data-a=newchar]')
    if pg.query_selector('[data-a=tutskip]'):
        pg.click('[data-a=tutskip]')
    if pg.query_selector('button.link[data-a=gdone]'):
        pg.click('button.link[data-a=gdone]')
    pg.wait_for_timeout(300)
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='점검'}")
    pg.fill('#cname', '점검')
    pg.click('[data-a=cnok]')
    cls = 'hunter' if pg.query_selector('[data-a=clspick][data-k=hunter]') else pg.get_attribute('[data-a=clspick]', 'data-k')
    pg.click('[data-a=clspick][data-k=%s]' % cls)
    pg.click('button[data-a=start][data-b=%s]' % cls)
    pg.click('button[data-a=skillok]')
    if pg.query_selector('button[data-a=statrec]:not([disabled])'):
        pg.click('button[data-a=statrec]')
    pg.click('button[data-a=statok]')
    pg.click('button[data-a=door][data-k="0"]')
    pg.click('button[data-a=enter]')
    pg.evaluate("()=>{G.pace='instant'}")
    ok('직업 선택 뒤 전투에 들어감', pg.evaluate("()=>!!G.b && G.scr==='run'"), '직업 ' + cls)
    for i in range(3):
        pg.keyboard.press('1')
        pg.wait_for_function("()=>!G.busy")
    ok('전투 행동 3번', pg.evaluate("()=>!!G.b || G.scr!=='run'"), 'log %d줄' % pg.evaluate("()=>G.b?G.b.log.length:-1"))
    # 설정 창 -> 전투 탭 -> 화면에서 편집
    pg.click('[data-a=menu]')
    pg.click('.mnav [data-a=settings]')
    pg.wait_for_timeout(200)
    ok('설정 창이 열림', pg.evaluate("()=>!!G.sheet && G.sheet.kind==='settings'"))
    if pg.query_selector('#settab-battle'):
        pg.click('#settab-battle')
    ok('전투 탭 · 편집 단추', bool(pg.query_selector('button[data-a=hedstart]')))
    pg.click('button[data-a=hedstart]')
    pg.wait_for_timeout(300)
    ok('편집기 진입', pg.evaluate("()=>!!G.hudEd && document.documentElement.classList.contains('hedit')"), '막대 ' + str(bool(pg.query_selector('#hedbar'))))
    pg.evaluate("()=>hudEdEnd('x')")
    ok('편집기 나감', pg.evaluate("()=>!G.hudEd"))
    # 저장 키
    keys = pg.evaluate("()=>Object.keys(localStorage)")
    ok('브라우저 저장 키', keys == ['nrk_062_v1'] or all(k.startswith('nrk_062') for k in keys), str(keys))
    ok('밖으로 나간 요청(폰트 제외) 0', not outside, str(outside[:3]))
    ok('요청 실패(file) 0', not reqfail, str(reqfail[:3]))
    ok('콘솔 · 페이지 오류 0', not errs, str(errs[:3]))
    br.close()
print('결과:', ('실패 %d건 ' % len(bad)) + ', '.join(bad) if bad else '모두 통과')
sys.exit(1 if bad else 0)
