"""old-code settle/shop saves -> new-code resume."""
import pathlib, json
from playwright.sync_api import sync_playwright
R = pathlib.Path(r'C:\Users\ardwi\Downloads\나락의 심연\nrk')
S = pathlib.Path(r'C:\Users\ardwi\AppData\Local\Temp\claude\c--Users-ardwi-Downloads--------nrk\11bb231f-de11-4691-95a0-6521bc309beb\scratchpad')
OLD = (S / 'oldsite' / '06a2' / 'index.html').as_uri(); NEW = (R / '06a2' / 'index.html').as_uri()
mock = (R / 'tools' / 'mock_sb.js').read_text(encoding='utf-8')
CFG = "window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"
errs = []
def mk(pw):
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 390, 'height': 844})
    ctx.add_init_script("window.__cfgOverride=1;")
    ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=CFG))
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    return br, ctx
def old_save(pw, cls, phase):
    br, ctx = mk(pw); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('old:' + str(e)))
    pg.goto(OLD); pg.wait_for_timeout(500)
    pg.click('[data-a=newchar]')
    if pg.query_selector('[data-a=tutskip]'): pg.click('[data-a=tutskip]')
    if pg.query_selector('button.link[data-a=gdone]'): pg.click('button.link[data-a=gdone]'); pg.wait_for_timeout(300)
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='시험'}")
    pg.fill('#cname', '옛저장'); pg.click('[data-a=cnok]'); pg.click(f'[data-a=clspick][data-k={cls}]'); pg.click(f'button[data-a=start][data-b={cls}]'); pg.click('button[data-a=skillok]')
    if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')
    pg.click('button[data-a=statok]'); pg.wait_for_timeout(200)
    js = """phase => { const run = G.run; run.clears = 1; run.result = 'win'; run.rooms.push({ room: run.room, type: 'boss', res: 'win' }); startSettle(run); G.scr = 'settle'; G.b = null; G.sheet = null;
      if (phase === 'shop') { genShop(run); run.phase = 'shop'; G.scr = 'shop'; } render(); saveRunLocal(); saveCur(); return { scr: G.scr, phase: run.phase, gold: run.gold }; }"""
    st = pg.evaluate(js, phase); blob = pg.evaluate("() => localStorage.getItem('nrk_062_v1')"); br.close(); return st, blob
def new_resume(pw, blob, phase):
    br, ctx = mk(pw)
    ctx.add_init_script("try { localStorage.setItem('nrk_062_v1', %s); } catch (e) {}" % json.dumps(blob))
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('new:' + str(e))); pg.on('console', lambda m: errs.append('new-console:' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.goto(NEW); pg.wait_for_timeout(700)
    has = pg.query_selector('[data-a=resume]') is not None
    if has: pg.click('[data-a=resume]'); pg.wait_for_timeout(600)
    a = pg.evaluate("() => ({ scr: G.scr, phase: G.run && G.run.phase, mode: G.run && G.run.mode, awk: G.run && G.run.awk, ch: G.run && G.run.ch, hasSettle: !!(G.run && G.run.settle), hasShop: !!(G.run && G.run.shop) })")
    # play on: settle -> (stats/awakening sheets) -> shop -> leave
    steps = []
    for k in range(8):
        sc = pg.evaluate("() => ({ scr: G.scr, sheet: G.sheet && G.sheet.kind })")
        steps.append(sc['scr'] + ('/' + sc['sheet'] if sc['sheet'] else ''))
        if pg.query_selector('[data-a=settleok]'): pg.click('[data-a=settleok]')
        elif pg.query_selector('button[data-a=statok]'):
            if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')
            pg.click('button[data-a=statok]')
        elif pg.query_selector('[data-a=awkpick]'): pg.click('[data-a=awkpick] >> nth=0')
        elif pg.query_selector('[data-a=shopleave]'): pg.click('[data-a=shopleave]')
        else: break
        pg.wait_for_timeout(300)
    br.close(); return has, a, steps
with sync_playwright() as pw:
    for cls in ['hunter', 'warden']:
        for phase in ['settle', 'shop']:
            st, blob = old_save(pw, cls, phase)
            has, a, steps = new_resume(pw, blob, phase)
            print(cls, phase, '| old', st, '| resume', has, a, '| steps', ' > '.join(steps))
print('errors', errs[:8])
