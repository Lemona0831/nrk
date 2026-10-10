# 쓰러진 판 되살아남 점검 (10월 10일). 쓰러진 판은 설문을 마치기 전에도 이어하기(G.data.cur)에 들어가지 않고 메뉴에서 고칠 수 없어야 한다.
# 실행: python tools/deadrun_check.py [폴더, 기본 06a2]  (옛 코드로 재현하려면 옛 06a2를 푼 폴더의 index.html 경로를 인자로 준다)
# 가짜 Supabase를 쓰므로 진짜 기록은 가지 않는다. 끝에 FAIL 수를 내고, 0이 아니면 종료 코드 1.
from playwright.sync_api import sync_playwright
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
mock = open(os.path.join(HERE, 'mock_sb.js'), encoding='utf-8').read()
arg = sys.argv[1] if len(sys.argv) > 1 else '06a2'
path = arg if arg.endswith('.html') else os.path.join(HERE, '..', arg, 'index.html')
SITE = 'file://' + os.path.abspath(path).replace(os.sep, '/')
errs, fails = [], []


def check(name, ok, info=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(info) if info != '' else ''))
    if not ok:
        fails.append(name)


def new_page(ctx):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(SITE)
    pg.wait_for_timeout(600)
    pg.click('[data-a=newchar]')
    if pg.query_selector('[data-a=tutskip]'):
        pg.click('[data-a=tutskip]')
    pg.click('button.link[data-a=gdone]')
    pg.wait_for_timeout(300)
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='점검'}")
    pg.fill('#cname', '쓰러질이')
    pg.click('[data-a=cnok]')
    cls = 'assassin' if pg.query_selector('[data-a=clspick][data-k=assassin]') else pg.get_attribute('[data-a=clspick]', 'data-k')
    pg.click(f'[data-a=clspick][data-k={cls}]')
    pg.click(f'button[data-a=start][data-b={cls}]')
    pg.click('button[data-a=skillok]')
    if pg.query_selector('button[data-a=statrec]:not([disabled])'):
        pg.click('button[data-a=statrec]')
    pg.click('button[data-a=statok]')
    pg.click('button[data-a=door][data-k="0"]')
    pg.click('button[data-a=enter]')
    pg.evaluate("()=>{G.pace='instant'}")
    return pg


def die(pg):
    # 전투 안에서 쓰러뜨리고, 쓰러짐 처리(battleContinue)는 진짜 버튼으로 지나간다
    pg.evaluate("()=>{G.b.p.hp=0; G.b.over='lose'; render();}")
    pg.click('button[data-a=bcont]')
    pg.wait_for_timeout(300)


def menu_has(pg, act):
    pg.evaluate("()=>{G.menuOpen=true; render();}")
    return bool(pg.query_selector(f'.mnav [data-a={act}]'))


def to_title_by_menu(pg):
    pg.evaluate("()=>{G.menuOpen=true; render();}")
    pg.click('.mnav [data-a=title]')
    pg.wait_for_timeout(300)


def try_unlock(pg):
    # 트리 화면에서 열 수 있는 칸을 눌러 본다(메뉴 항목이 없어도 화면을 직접 연다: 막혀야 한다)
    pg.evaluate("()=>{G.back='title'; G.scr='tree'; G.sheet=null; render();}")
    pts0 = pg.evaluate("()=>G.run.tree.pts")
    ids = pg.evaluate("()=>SKILLS2[G.run.build].filter(s=>!s.start && (s.row||1)===1).map(s=>s.id)")
    for i in ids:
        pg.evaluate("(i)=>{G.tsel=i; render();}", i)
        b = pg.query_selector('button[data-a=tunlock]')
        if b:
            b.click()
            pg.wait_for_timeout(200)
            break
    return pts0, pg.evaluate("()=>G.run.tree.pts")


with sync_playwright() as p:
    br = p.chromium.launch()
    for case in ['skip', 'survey']:
        print('--- 설문', '건너뜀' if case == 'skip' else '마침')
        ctx = br.new_context(viewport={'width': 390, 'height': 844})
        ctx.add_init_script("window.__cfgOverride=1;")
        ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
        ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
        ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        pg = new_page(ctx)
        check('전투에 들어옴', pg.evaluate("()=>G.scr==='run' && !!G.b"))
        pg.evaluate("()=>{saveRunLocal(); saveCur();}")  # 전투 앞 이어하기 저장본이 있는 흔한 상태
        die(pg)
        check('쓰러짐 화면', pg.evaluate("()=>G.scr==='dead'"))
        check('쓰러지면 이어하기 저장본이 지워짐', pg.evaluate("()=>!G.data.cur"))
        check('쓰러진 판의 메뉴에 스킬 트리 · 장비 · 깨달음이 없음', not any(menu_has(pg, a) for a in ['tree', 'equip', 'awkview']))
        if case == 'survey':
            pg.evaluate("()=>{G.menuOpen=false; render();}")
            pg.click('button[data-a=giveupend]')
            pg.wait_for_timeout(200)
            pg.check('input[name=fun][value="4"]')
            pg.click('button[data-a=survey]')
            pg.wait_for_timeout(1500)
            check('설문을 마치면 endedAt이 붙고 타이틀', pg.evaluate("()=>G.scr==='title' && G.data.runs.every(r=>r.endedAt)"))
        else:
            to_title_by_menu(pg)
            check('타이틀로 돌아옴', pg.evaluate("()=>G.scr==='title'"))
        check('타이틀에서 이어하기 저장본이 없음', pg.evaluate("()=>!G.data.cur"))
        check('타이틀에 이어하기 버튼이 없고 시작이 있음', not pg.query_selector('[data-a=resume]') and bool(pg.query_selector('[data-a=newchar]')))
        check('타이틀 메뉴에 스킬 트리가 없음', not menu_has(pg, 'tree'))
        if case == 'skip':
            pts0, pts1 = try_unlock(pg)
            check('쓰러진 판의 트리는 고칠 수 없음(포인트 그대로)', pts0 == pts1, [pts0, pts1])
            check('트리를 만져도 이어하기 저장본이 생기지 않음', pg.evaluate("()=>!G.data.cur"))
            pg.evaluate("()=>{G.scr='title'; render();}")
            check('트리 뒤에도 이어하기 버튼이 없음', not pg.query_selector('[data-a=resume]'))
            pg.reload()
            pg.wait_for_timeout(600)
            check('새로 고침 뒤에도 이어하기가 없음', pg.evaluate("()=>!G.data.cur") and not pg.query_selector('[data-a=resume]'))
            # 옛 저장본: 죽은 판이 cur에 들어 있는 상태를 흉내 낸다
            pg.evaluate("()=>{const b=G.data.runs[0].build; const dead={id:'old1',build:b,result:'lose',phase:'run',clears:0,lv:3,cname:'옛 죽은 판'}; G.data.cur=dead; G.data.kept=[Object.assign({},dead,{id:'old2',phase:'wait',clears:1})]; saveLocal();}")
            pg.reload()
            pg.wait_for_timeout(600)
            check('옛 저장본의 죽은 판은 이어하기에 안 보임', pg.evaluate("()=>!G.data.cur && !(G.data.kept||[]).length") and not pg.query_selector('[data-a=resume]'))
            check('기록(runs)은 남아 있음', pg.evaluate("()=>G.data.runs.length>=1"))
        ctx.close()
    br.close()
check('페이지 오류 없음', not errs, errs[:3])
print('FAIL', len(fails))
sys.exit(1 if fails else 0)
