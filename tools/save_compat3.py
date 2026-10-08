"""old-code save -> new-code resume. A page from the old 06a2 (cf7fbb8) plays to a mid-dungeon save; the new 06a2 resumes it."""
import pathlib, sys, json
from playwright.sync_api import sync_playwright
R = pathlib.Path(r'C:\Users\ardwi\Downloads\나락의 심연\nrk')
S = pathlib.Path(r'C:\Users\ardwi\AppData\Local\Temp\claude\c--Users-ardwi-Downloads--------nrk\11bb231f-de11-4691-95a0-6521bc309beb\scratchpad')
OLD = (S / 'oldsite' / '06a2' / 'index.html').as_uri(); NEW = (R / '06a2' / 'index.html').as_uri()
mock = (R / 'tools' / 'mock_sb.js').read_text(encoding='utf-8')
errs = []
def mk(pw, w, h):
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': w, 'height': h})
    ctx.add_init_script("window.__cfgOverride=1;")
    ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
    ctx.route("**/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    return br, ctx
with sync_playwright() as pw:
    for cls in ['hunter', 'butcher', 'monk']:
        br, ctx = mk(pw, 390, 844)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('old:' + str(e)))
        pg.goto(OLD); pg.wait_for_timeout(500)
        pg.evaluate("() => { G.data.unlAll = 1; }")
        pg.click('[data-a=newchar]')
        if pg.query_selector('[data-a=tutskip]'): pg.click('[data-a=tutskip]')
        if pg.query_selector('button.link[data-a=gdone]'): pg.click('button.link[data-a=gdone]'); pg.wait_for_timeout(300)
        pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='시험'}")
        pg.fill('#cname', '옛저장'); pg.click('[data-a=cnok]')
        pg.click(f'[data-a=clspick][data-k={cls}]'); pg.click(f'button[data-a=start][data-b={cls}]'); pg.click('button[data-a=skillok]')
        if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')
        pg.click('button[data-a=statok]'); pg.wait_for_timeout(200)
        pg.click('button[data-a=door][data-k="0"]'); pg.click('button[data-a=enter]'); pg.wait_for_timeout(200)
        # play the first fight a few turns, then save mid-battle
        for k in range(3):
            pg.evaluate("() => { if (!G.b || G.b.over) return; G.b.stepMode = false; const L = actionList(G.b).filter(a => a.ok && a.id !== 'flee'); const a = L.find(x => x.id === 'basic') || L[0]; playerAct(G.b, a.id, null); render(); }")
        pg.evaluate("() => { saveBattle(); }")
        st = pg.evaluate("() => ({ v: typeof VERSION !== 'undefined' ? VERSION : '?', scr: G.scr, room: G.run.room, hp: Math.round(G.run.p.hp), hasMode: 'mode' in G.run, hasAwk: 'awk' in G.run, inB: !!G.b })")
        blob = pg.evaluate("() => localStorage.getItem('nrk_062_v1')")
        br.close()
        # new code
        br, ctx = mk(pw, 390, 844)
        ctx.add_init_script("try { localStorage.setItem('nrk_062_v1', %s); } catch (e) {}" % json.dumps(blob))
        pg2 = ctx.new_page(); pg2.on('pageerror', lambda e: errs.append('new:' + str(e))); pg2.on('console', lambda m: errs.append('new-console:' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        pg2.goto(NEW); pg2.wait_for_timeout(700)
        has = pg2.query_selector('[data-a=resume]') is not None
        if has: pg2.click('[data-a=resume]'); pg2.wait_for_timeout(500)
        after = pg2.evaluate("() => ({ scr: G.scr, mode: G.run && G.run.mode, awk: G.run && G.run.awk, legSeen: G.run && G.run.legSeen, inB: !!G.b, room: G.run && G.run.room, ch: G.run && G.run.ch })")
        print(cls, 'BATTLE restored:', pg2.evaluate("() => ({ inB: !!G.b, over: G.b && G.b.over, round: G.b && G.b.round, en: G.b ? G.b.en.filter(e => e.alive).length : 0 })"))
        # continue playing: finish the fight and open a door
        try:
            if pg2.query_selector('button[data-a=enter]'): pg2.click('button[data-a=enter]'); pg2.wait_for_timeout(300)
        except Exception as e: errs.append('door:' + str(e)[:80])
        res = pg2.evaluate("""() => { let n = 0; try { while (G.b && !G.b.over && n++ < 200) { G.b.stepMode = false; const L = actionList(G.b).filter(a => a.ok && a.id !== 'flee'); const a = L.find(x => x.id === 'basic') || L[0]; playerAct(G.b, a.id, null); } render(); return { over: G.b && G.b.over, acts: n }; } catch (e) { return { err: String(e) }; } }""")
        print('PAGE:', pg2.evaluate("() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => (b.dataset.a || '') + ':' + b.textContent.trim().slice(0, 14)).join(' / ')")[:600]); print('G.run keys', pg2.evaluate("() => JSON.stringify({ doors: !!(G.run && G.run.doors), cur: !!(G.run && G.run.cur), phase: G.run && G.run.phase, room: G.run && G.run.room })"))
        res2 = pg2.evaluate("() => { try { battleContinue(); render(); return { scr: G.scr, room: G.run.room, hp: Math.round(G.run.p.hp), sheet: G.sheet && G.sheet.kind }; } catch (e) { return { err: String(e) }; } }"); print(cls, 'after fight+continue:', res2); print(cls, '| old:', st, '| resume btn:', has, '| new after resume:', after, '| play on:', res)
        br.close()
print('errors', errs[:8])
