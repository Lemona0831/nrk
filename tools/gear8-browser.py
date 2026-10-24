# 0.8.0 M6-1 장비 틀 화면 점검(8절 기준 5): gear8 장비의 장비 칸 · 상세 · 비교 창이 다섯 줄을 넘지 않는가, 영웅 이름은 축이 정하는가, 고유는 이름 · 규칙 · 대가 · 글귀,
# 같은 묶음은 "큰 쪽만 듭니다" 안내, 1280 · 390 가로 넘침 없음. 캡처는 비공개 폴더로.
# 실행: python tools/gear8-browser.py <캡처 폴더>
from playwright.sync_api import sync_playwright
import os, sys
from pathlib import Path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
mock = open(os.path.join(ROOT, 'tools', 'mock_sb.js'), encoding='utf-8').read()
SITE = 'file://' + os.path.join(ROOT, 'index.html').replace(os.sep, '/')
out = Path(sys.argv[1] if len(sys.argv) > 1 else 'output/playwright/gear8'); out.mkdir(parents=True, exist_ok=True)
SETUP = """(cls)=>{GEAR8.on=true;const run=G.run;run.bag=[];
 const put=(it,sl)=>{run.inv[it.uid]=it;if(sl)run.eqU[sl]=it.uid;else run.bag.push(it.uid);return it;};
 const W={warden:['mace','plate','gauntlet','wd_h1','wd_r3','wd_ax_dstance'],assassin:['dagger','leather','gloves','as_h5','as_r2','as_ax_parry']}[cls];
 put(mkItem8({base:W[0],g:'h',ch:2,af:[['basicDmg',4],['heavyBrk',30]],ax:[W[5],AFFIX[W[5]].tier[2][1]]}),'weapon');
 put(mkItem8({base:'ring',g:'r',ch:1,af:[['vsBig',40],['sameTgt',25]]}),'ring1');
 put(mkUq(W[3]));put(mkUq(W[4]));put(mkUq('cm_fastflask'));
 put(mkItem8({base:'seal',g:'m',ch:1,af:[['vsBig',30]]}));
 put(mkItem8({base:W[1],g:'r',ch:2,af:[['hp',28],['wardRed',18]]}));
 put(mkItem8({base:W[2],g:'n',ch:1,af:[]}));
 applyGear(run);G.b=null;G.sheet=null;}"""
LINES = """(sel)=>{const d=document.querySelector(sel);if(!d)return -1;let n=0;for(const c of d.children){if(c.classList.contains('item-new'))continue;if(c.tagName==='UL'){n+=c.children.length;continue;}n++;}return n;}"""
errs = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for cls in ['warden', 'assassin']:
        for width in [1280, 390]:
            ctx = br.new_context(viewport={'width': width, 'height': 900})
            ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
            ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
            ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(SITE); pg.wait_for_timeout(500)
            pg.evaluate("(c)=>{G.data.seenCoach=true;G.data.seenBreak=true;G.data.unlAll=1;G.cre={name:'t'};startRun(c);G.scr='dungeon';render();}", cls)
            pg.evaluate(SETUP, cls)
            # 장비 칸(무기 · 영웅) · 반지 칸
            pg.evaluate("()=>{G.eqSel={slot:'weapon'};openSheet('equip')}"); pg.wait_for_timeout(200)
            name = pg.locator('.eqdet .idet-h b').inner_text()
            ax = pg.evaluate("()=>AFFIX[G.run.inv[G.run.eqU.weapon].ax.id].n[0]")
            if not name.split('\n')[-1].strip().startswith(ax): errs.append(f'{cls} {width}: 영웅 이름이 축 이름({ax})으로 시작하지 않음: {name}')
            n = pg.evaluate(LINES, '.eqdet .idet');
            if n > 5: errs.append(f'{cls} {width}: 장비 칸 {n}줄')
            pg.screenshot(path=str(out / f'{cls}-{width}-slot.png'), full_page=True)
            # 고유 상세 + 비교(무기 칸에 고유가 아니면 그 칸으로)
            for k, u in enumerate(pg.evaluate("()=>G.run.bag.filter(u=>G.run.inv[u].uq)")):
                pg.evaluate("(u)=>{const it=G.run.inv[u];G.eqSel={slot:g8Slot(it)==='ring'?'ring1':g8Slot(it),uid:u};openSheet('equip')}", u); pg.wait_for_timeout(150)
                n = pg.evaluate(LINES, '.eqdet .idet')
                if n > 5: errs.append(f'{cls} {width}: 고유 상세 {n}줄')
                t = pg.locator('.eqdet .idet').inner_text()
                U = pg.evaluate("(u)=>{const x=UNIQUE[G.run.inv[u].uq];return [x.n,x.rule.txt,x.cost.txt,x.lore]}", u)
                for s in U:
                    if s not in t: errs.append(f'{cls} {width}: 고유 상세에 "{s}" 없음')
                c = pg.evaluate(LINES, '.eqdet .cmp')
                if c > 5: errs.append(f'{cls} {width}: 비교 창 {c}줄')
                pg.screenshot(path=str(out / f'{cls}-{width}-unique{k}.png'), full_page=True)
            # 반지: 같은 묶음 안내
            u = pg.evaluate("()=>G.run.bag.find(u=>G.run.inv[u].tpl==='seal')")
            pg.evaluate("(u)=>{G.eqSel={slot:'ring2',uid:u};openSheet('equip')}", u); pg.wait_for_timeout(150)
            if '같은 묶음은 큰 쪽만 듭니다' not in pg.locator('.eqdet').inner_text(): errs.append(f'{cls} {width}: 같은 묶음 안내 없음')
            pg.screenshot(path=str(out / f'{cls}-{width}-ring.png'), full_page=True)
            if not pg.evaluate('document.documentElement.scrollWidth<=innerWidth'): errs.append(f'{cls} {width}: 가로 넘침')
            ctx.close()
    br.close()
print('gear8-browser:', '통과' if not errs else '실패 ' + str(len(errs)))
for e in errs: print('  ', e)
sys.exit(1 if errs else 0)
