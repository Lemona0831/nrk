# 0.8.0 M6-2 장비 생성 화면 점검(8절 기준 5): 상점 진열(새 장비) · "지금 빌드에 맞음" · 비교 · 다시 굴리기 · 장비 칸. 장비 카드 · 비교 창 다섯 줄 이하, 1280 · 390 가로 넘침 없음.
# 캡처는 비공개 폴더로. 실행: python tools/gear8-shop-browser.py <캡처 폴더>
from playwright.sync_api import sync_playwright
import os, sys
from pathlib import Path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
mock = open(os.path.join(ROOT, 'tools', 'mock_sb.js'), encoding='utf-8').read()
SITE = 'file://' + os.path.join(ROOT, 'index.html').replace(os.sep, '/')
out = Path(sys.argv[1] if len(sys.argv) > 1 else 'output/playwright/gear8-shop'); out.mkdir(parents=True, exist_ok=True)
LINES = """(sel)=>[...document.querySelectorAll(sel)].map(d=>{let n=0;for(const c of d.children){if(c.classList.contains('item-new'))continue;if(c.tagName==='UL'){n+=c.children.length;continue;}if(c.tagName==='P'&&c.classList.contains('lore')&&!c.textContent.trim())continue;n++;}return n;})"""
errs = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for cls in ['spellblade', 'hunter']:
        for width in [1280, 390]:
            ctx = br.new_context(viewport={'width': width, 'height': 900})
            ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
            ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
            ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(SITE); pg.wait_for_timeout(500)
            if not pg.evaluate('GEAR8.on'): errs.append('GEAR8 기본값이 켜져 있지 않음')
            pg.evaluate("""(c)=>{G.data.seenCoach=true;G.data.seenBreak=true;G.data.unlAll=1;G.cre={name:'t'};startRun(c);const run=G.run;initGear(run);run.ch=2;run.gold=2000;const sk=Object.values(atBuild(c).nodes).filter(x=>x.kind==="skill"&&x.ring===1).map(x=>x.id).slice(0,3);run.atree.own=sk.slice();run.skills=sk.slice();atSync(run);
              const r1=g8Gen(run,{slot:'ring',g:'r',ch:2,noUq:true});run.inv[r1.uid]=r1;run.eqU.ring1=r1.uid;const w=g8Gen(run,{slot:'weapon',g:'m',ch:2,noUq:true});run.inv[w.uid]=w;run.eqU.weapon=w.uid;applyGear(run);
              genShop(run);run.phase='shop';G.scr='shop';G.sheet=null;render();}""", cls)
            pg.wait_for_timeout(300)
            n = pg.evaluate(LINES, '.sitem .idet')
            if not n or max(n) > 5: errs.append(f'{cls} {width}: 상점 장비 카드 줄 {n}')
            c = pg.evaluate(LINES, '.sitem .cmp')
            if c and max(c) > 5: errs.append(f'{cls} {width}: 상점 비교 창 줄 {c}')
            if pg.locator('.sitem').count() < 6: errs.append(f'{cls} {width}: 진열 여섯 미만')
            if pg.locator('.tag.cfit').count() < 1: errs.append(f'{cls} {width}: "지금 빌드에 맞음" 표시 없음')
            if pg.evaluate("[...document.querySelectorAll('.sitem')].some(x=>/마나|캔트립|쿨타임/.test(x.textContent))"): errs.append(f'{cls} {width}: 사어')
            if not pg.evaluate('document.documentElement.scrollWidth<=innerWidth'): errs.append(f'{cls} {width}: 가로 넘침(상점)')
            pg.screenshot(path=str(out / f'{cls}-{width}-shop.png'), full_page=True)
            # 다시 굴리기
            rr = pg.locator('section.reroll')
            if rr.count() != 1: errs.append(f'{cls} {width}: 다시 굴리기 칸 없음')
            else:
                if '같은 묶음은 안 나옵니다' not in rr.inner_text(): errs.append(f'{cls} {width}: 다시 굴리기 안내 없음')
                n = pg.evaluate(LINES, 'section.reroll .idet')
                if n and max(n) > 5: errs.append(f'{cls} {width}: 다시 굴리기 카드 줄 {n}')
                g0 = pg.evaluate('G.run.gold'); a0 = pg.evaluate("(()=>{const it=G.run.inv[document.querySelector('[data-a=reroll]').dataset.k.split(':')[0]];return JSON.stringify(it.af)})()")
                pg.evaluate("document.querySelector('[data-a=reroll]').scrollIntoView()"); pg.locator('[data-a=reroll]').first.click(); pg.wait_for_timeout(200)
                g1 = pg.evaluate('G.run.gold'); a1 = pg.evaluate("(()=>{const u=document.querySelector('[data-a=reroll]').dataset.k.split(':')[0];return JSON.stringify(G.run.inv[u].af)})()")
                if not (g1 < g0 and a1 != a0): errs.append(f'{cls} {width}: 다시 굴리기가 골드 · 접사를 바꾸지 않음')
                pg.locator('section.reroll').scroll_into_view_if_needed(); pg.screenshot(path=str(out / f'{cls}-{width}-reroll.png'), full_page=True)
            # 장비 칸 · 비교(산 장비)
            pg.evaluate("()=>{const S=G.run.shop;const i=S.stock.findIndex(x=>!x.sold&&x.it.g!=='n');const x=S.stock[i];G.run.inv[x.it.uid]=x.it;G.run.bag.push(x.it.uid);x.sold=1;G.eqSel={slot:g8Slot(x.it)==='ring'?'ring2':g8Slot(x.it),uid:x.it.uid};openSheet('equip')}"); pg.wait_for_timeout(200)
            n = pg.evaluate(LINES, '.eqdet .idet'); c = pg.evaluate(LINES, '.eqdet .cmp')
            if (n and max(n) > 5) or (c and max(c) > 5): errs.append(f'{cls} {width}: 장비 칸 {n} · 비교 {c} 줄')
            if not pg.evaluate('document.documentElement.scrollWidth<=innerWidth'): errs.append(f'{cls} {width}: 가로 넘침(장비)')
            pg.screenshot(path=str(out / f'{cls}-{width}-equip.png'), full_page=True)
            ctx.close()
    br.close()
print('gear8-shop-browser:', '통과' if not errs else '실패 ' + str(len(errs)))
for e in errs: print('  ', e)
sys.exit(1 if errs else 0)
