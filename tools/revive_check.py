# 되살리기 점검 (10월 10일). reviveRun이 방 기록에서 최대 생명력 효과(피 묻은 성배, 이름 없는 묘비, 피 제단, 유리 저울)를
# 실제 이벤트 · 제단 id와 같은 이름으로 다시 세우는지 본다. 실행: python tools/revive_check.py  (FAIL이 있으면 종료 코드 1)
# 옛 코드로 재현하려면 옛 06a2 index.html 경로를 인자로 준다.
from playwright.sync_api import sync_playwright
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
mock = open(os.path.join(HERE, 'mock_sb.js'), encoding='utf-8').read()
arg = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '06a2', 'index.html')
SITE = 'file://' + os.path.abspath(arg).replace(os.sep, '/')
errs, fails = [], []
JS = """() => {
  const ids = EVENTS.map(e => e.id), altars = ALTARS.map(a => a.id);
  const mk = rooms => { const r = { id: 'rv', build: 'assassin', boss: 'abbot', startedAt: 1, roomReached: 3, rooms, acts: [], clears: 1, phase: 'settle', result: 'abandon', endedAt: 1, inv: [], eq7: [], lv: 5, stats: {} };
    const run = reviveRun(r); return { hpMax: run.p.hpMax, bonus: run.p.hpBonus || 0, pen: run.p.hpPen || 0, phase: run.phase }; };
  const ev = (e, t) => ({ type: 'event', event: e, took: t }), al = t => ({ type: 'altar', took: t });
  return { ids, altars, base: mk([]), chalice: mk([ev('chalice', 'drink')]), tomb: mk([ev('tomb', 'carve')]), tombPass: mk([ev('tomb', 'pass')]), blood: mk([al('blood')]), scale: mk([al('scale')]) };
}"""


def check(name, ok, info=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(info) if info != '' else ''))
    if not ok:
        fails.append(name)


with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context()
    ctx.add_init_script("window.__cfgOverride=1;")
    ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock))
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(SITE)
    pg.wait_for_timeout(600)
    o = None
    try:
        o = pg.evaluate(JS)
    except Exception as e:
        check('evaluate', False, str(e)[:200])
    if o:
        b = o['base']
        check('이벤트 id tomb 있음, nameless 없음', 'tomb' in o['ids'] and 'nameless' not in o['ids'])
        check('제단 id blood · scale 있음', 'blood' in o['altars'] and 'scale' in o['altars'])
        check('성배 최대 생명력 +5', o['chalice']['bonus'] == 5 and o['chalice']['hpMax'] > b['hpMax'], o['chalice'])
        check('묘비 새기기 최대 생명력 +5', o['tomb']['bonus'] == 5 and o['tomb']['hpMax'] > b['hpMax'], o['tomb'])
        check('묘비 지나치면 그대로', o['tombPass']['hpMax'] == b['hpMax'], o['tombPass'])
        check('피 제단 -5%', abs(o['blood']['pen'] - 0.05) < 1e-9 and o['blood']['hpMax'] < b['hpMax'], o['blood'])
        check('유리 저울 -3%', abs(o['scale']['pen'] - 0.03) < 1e-9 and o['scale']['hpMax'] < b['hpMax'], o['scale'])
        check('되살린 판 phase wait', o['tomb']['phase'] == 'wait')
    check('페이지 오류 없음', not errs, errs[:2])
print('FAIL', len(fails))
sys.exit(1 if fails else 0)
