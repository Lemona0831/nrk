# 가독성 측정 (0.6a.2-113): 12개 화면 상태를 390 · 1280px로 그려 글자 크기, 줄 간격, 글자 대 배경 대비, 위계, 터치 대상, 줄 길이, 정보량을 센다.
# 실행: python tools/readability.py [--site 06a2] [--out 파일.json] [--shots 폴더] [--fs 1.3] [--widths 390,1280]
# 진짜 Supabase에 기록이 가지 않게 config.js는 빈 파일로 막는다. 글꼴(Google Fonts)은 막아 시스템 글꼴로 잰다(줄 바뀜은 실제 글꼴과 조금 다를 수 있다).
import json, os, sys, argparse, statistics
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# 화면 안의 모든 글자 노드를 훑는 측정 코드. 결과는 JSON 하나.
MEASURE_JS = r"""
() => {
  const parseC = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,1]; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const blend = (f, b) => { const a = f[3]; return [f[0]*a + b[0]*(1-a), f[1]*a + b[1]*(1-a), f[2]*a + b[2]*(1-a), 1]; };
  const lum = c => { const l = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*l(c[0]) + 0.7152*l(c[1]) + 0.0722*l(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const bodyBg = parseC(getComputedStyle(document.documentElement).backgroundColor);
  const bgOf = el => { // 조상의 배경색을 위로 겹쳐 올린다(그라데이션 이미지는 칠한 바탕색으로 어림)
    const chain = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); const c = parseC(cs.backgroundColor); if (c[3] > 0) chain.push(c); if (c[3] >= 1) break; }
    let bg = (chain.length && chain[chain.length-1][3] >= 1) ? chain.pop() : bodyBg; while (chain.length) bg = blend(chain.pop(), bg); return bg; };
  const opOf = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const visible = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; if (e.classList && e.classList.contains('sr')) return false; if (e.hasAttribute && e.hasAttribute('hidden')) return false; } return true; };
  const texts = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = tw.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t) continue; const el = n.parentElement; if (!el || ['SCRIPT','STYLE'].includes(el.tagName) || el.closest('.dpop, .skip')) continue; if (!visible(el)) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize); const fg = parseC(cs.color); const op = opOf(el); fg[3] *= op;
    const bg = bgOf(el); const eff = blend(fg, bg); const dis = !!(el.closest('[disabled],[aria-disabled=true],.adis'));
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / fs;
    texts.push({ t: t.length, fs, w: parseInt(cs.fontWeight), c: Math.round(eff[0]) + ',' + Math.round(eff[1]) + ',' + Math.round(eff[2]), cr: ratio(eff, bg), lh, dis, s: (el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ':' + t.slice(0,14), fam: cs.fontFamily.split(',')[0].replace(/['"]/g,'') });
  }
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], summary, [tabindex="0"]';
  const targets = []; document.querySelectorAll(sel).forEach(e => { if (!visible(e)) return; if (e.closest('[inert]')) return; const r = e.getBoundingClientRect(); if (e.classList.contains('skip')) return; targets.push({ w: r.width, h: r.height, c: e.tagName + '.' + String(e.className && e.className.baseVal === undefined ? e.className : '').replace(/ /g,'.') + (e.dataset && e.dataset.a ? '[' + e.dataset.a + ']' : '') }); });
  // 줄 길이: 글자가 30자 넘는 요소의 한 줄 글자 수(범위의 줄 상자를 센다)
  const lines = []; const seen = new Set();
  document.querySelectorAll('p, li, div, span, small, dd, dt, td, label, b').forEach(e => {
    if (!visible(e) || seen.has(e)) return; let own = ''; e.childNodes.forEach(c => { if (c.nodeType === 3) own += c.nodeValue; }); own = own.replace(/\s+/g, ' ').trim(); if (own.length < 30) return;
    const rg = document.createRange(); rg.selectNodeContents(e); const tops = new Set(); for (const r of rg.getClientRects()) { if (r.width > 1) tops.add(Math.round(r.top / 4)); } const nl = Math.max(1, tops.size);
    if (nl >= 2 || own.length >= 30) lines.push({ chars: own.length, n: nl, perLine: own.length / nl, nl });
  });
  const total = texts.reduce((a, x) => a + x.t, 0);
  const bodyText = document.body.innerText || ''; 
  return { texts, targets, lines, total, nodes: texts.length, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, pageH: document.documentElement.scrollHeight, root: getComputedStyle(document.body).color };
}
"""

def wq(items, q):
    # 글자 수 가중 분위수. items = [(값, 가중치)]
    items = sorted(items); tot = sum(w for _, w in items)
    if not tot: return None
    acc = 0
    for v, w in items:
        acc += w
        if acc >= tot * q: return v
    return items[-1][0]

def summarize(m):
    T = [x for x in m['texts']]; tot = sum(x['t'] for x in T) or 1
    live = [x for x in T if not x['dis']]; ltot = sum(x['t'] for x in live) or 1
    fs = [(x['fs'], x['t']) for x in T]
    cr = [(x['cr'], x['t']) for x in live]
    share = lambda f, arr=T, den=tot: round(100 * sum(x['t'] for x in arr if f(x)) / den, 1)
    styles = {(round(x['fs'] * 2) / 2, 'b' if x['w'] >= 600 else 'r', x['c']) for x in T if x['t'] >= 2}
    sizes = {round(x['fs']) for x in T if x['t'] >= 2}
    weights = {('b' if x['w'] >= 600 else 'r') for x in T if x['t'] >= 2}
    # 색은 8단계 격자로 묶어 비슷한 색을 한 가지로 센다
    def q(c): return tuple(int(v) // 48 for v in c.split(','))
    colors = {q(x['c']) for x in T if x['t'] >= 2}
    tg = m['targets']; tw = [min(t['w'], 9999) for t in tg]; th = [t['h'] for t in tg]
    lens = [l for l in m['lines'] if l['nl'] >= 2]
    plv = [l['perLine'] for l in lens]
    lhv = [(x['lh'], x['t']) for x in T if x['t'] >= 12]
    return {
        'chars': m['total'], 'nodes': m['nodes'], 'pageH': round(m['pageH']),
        'fsMin': round(min((x['fs'] for x in T), default=0), 1), 'fsP10': wq(fs, .10), 'fsMed': wq(fs, .5),
        'pct_lt12': share(lambda x: x['fs'] < 12), 'pct_lt13': share(lambda x: x['fs'] < 13), 'pct_lt14': share(lambda x: x['fs'] < 14),
        'lhMin': round(min((v for v, _ in lhv), default=0), 2), 'lhMed': round(wq(lhv, .5) or 0, 2), 'lhP10': round(wq(lhv, .10) or 0, 2),
        'crMin': round(min((x['cr'] for x in live), default=0), 2), 'crP10': round(wq(cr, .10) or 0, 2), 'crMed': round(wq(cr, .5) or 0, 2),
        'pct_cr45': share(lambda x: x['cr'] < 4.5, live, ltot), 'pct_cr7': share(lambda x: x['cr'] < 7, live, ltot), 'disChars': tot - ltot,
        'nSizes': len(sizes), 'nWeights': len(weights), 'nColors': len(colors), 'nStyles': len(styles),
        'tgN': len(tg), 'tgMinW': round(min(tw, default=0)), 'tgMinH': round(min(th, default=0)), 'tgLt24': sum(1 for t in tg if t['w'] < 24 or t['h'] < 24), 'tgLt44': sum(1 for t in tg if t['h'] < 44),
        'tgSmall': sorted({t['c'] + ' ' + str(round(t['h'])) for t in tg if t['h'] < 44}), 'tgMedH': round(statistics.median(th)) if th else 0,
        'lineN': len(lens), 'lineMed': round(statistics.median(plv), 1) if plv else 0, 'lineMax': round(max(plv), 1) if plv else 0, 'lineGt44': sum(1 for v in plv if v > 44),
        'hScroll': m['scrollW'] - m['clientW'], 'small': sorted({x['s'] + ' ' + str(x['fs']) for x in T if x['fs'] < 13}), 'low': sorted({x['s'] + ' ' + str(round(x['cr'], 1)) for x in live if x['cr'] < 7}), 'worst': [x['s'] + ' ' + str(round(x['cr'], 2)) for x in sorted(live, key=lambda x: x['cr'])[:4]],
    }

def drive(pg, width):
    """12개 화면 상태를 차례로 만든다(이름, 준비가 끝난 뒤 한 번 yield). 던전 안 상태는 G 객체로 곧바로 이어 간다."""
    def settle(ms=350): pg.wait_for_timeout(ms)
    pg.goto(SITE, wait_until='load'); settle(700)
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.pace='instant'}")
    yield '01-title'
    pg.click('[data-a=newchar]'); settle()
    for _ in range(3):  # 수련장 안내와 처음 안내는 순서가 달라도 넘긴다
        if pg.query_selector('[data-a=tutskip]'): pg.click('[data-a=tutskip]'); settle()
        elif pg.query_selector('button.link[data-a=gdone]'): pg.click('button.link[data-a=gdone]'); settle()
    pg.evaluate("()=>{G.data.seenCoach=true; G.data.seenBreak=true; G.data.name='민수'}")
    yield '02-create-name'
    pg.fill('#cname', '검은손'); pg.click('[data-a=cnok]'); settle()
    pg.click('[data-a=clspick][data-k=assassin]'); settle()
    yield '03-create-class'
    pg.click('button[data-a=start][data-b=assassin]'); settle()
    yield '04-create-skill'
    pg.click('button[data-a=skillok]'); settle()
    if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]'); settle()
    yield '05-create-stat'
    pg.click('button[data-a=statok]'); settle()
    yield '06-map-doors'
    pg.click('button[data-a=door][data-k="0"]'); settle(); pg.click('button[data-a=enter]'); settle(500)
    pg.evaluate("()=>{G.pace='instant'; hudPreset('simple'); render()}"); settle()
    for _ in range(2):  # 두 번 싸워 상태 칩과 로그가 생긴 판으로 잰다
        pg.keyboard.press('1')
        try: pg.wait_for_function("()=>!G.busy", timeout=3000)
        except Exception: pass
    settle()
    yield '07-battle-simple'
    pg.evaluate("()=>{hudPreset('full'); render()}"); settle()
    yield '08-battle-full'
    pg.evaluate("()=>{hudPreset('simple'); hudModeLive('align'); render(); hudEdBegin()}"); settle(500)
    yield '17-editor-align'
    pg.evaluate("()=>{hudEdEnd('cancel'); hudPreset('simple'); hudModeLive('free'); render()}"); settle(500)
    yield '19-battle-free'
    pg.evaluate("()=>{hudEdBegin()}"); settle(500)
    yield '18-editor-free'
    pg.evaluate("()=>{hudEdEnd('cancel'); hudPreset('simple'); hudModeLive('align'); render()}"); settle()
    for _ in range(60):
        if pg.query_selector('button[data-a=bcont]'): break
        pg.keyboard.press('1')
        try: pg.wait_for_function("()=>!G.busy", timeout=3000)
        except Exception: pass
    settle()
    yield '09-battle-won'
    if pg.query_selector('button[data-a=bcont]'): pg.click('button[data-a=bcont]'); settle(500)
    yield '10-loot-sheet'
    # 시트 정리
    pg.evaluate("()=>{G.sheet=null; render()}")
    pg.evaluate("()=>{const r=G.run; r.ch=1; startSettle(r); G.scr='settle'; render()}"); settle()
    yield '11-settle'
    pg.click('button[data-a=settleok]'); settle(500)
    pg.evaluate("()=>{G.sheet=null; render()}"); settle()
    yield '12-shop'
    pg.evaluate("()=>{G.sheet=null; G.scr='tree'; G.back='run'; render()}"); settle(500)
    yield '13-skill-tree'
    pg.evaluate("()=>{G.scr='run'; G.sheet=null; render(); openSheet('settings')}"); settle(400)
    yield '14-settings'
    pg.evaluate("()=>{G.sheet=null; render(); openSheet('help', {k:''})}"); settle(400)
    yield '15-help'
    pg.evaluate("""()=>{G.sheet=null; const run=G.run; run.grave={kill:null,hits:[],id:run.id,cname:run.cname||'',lv:run.lv||1,room:run.room,roomN:'1층',build:run.build,name:'민수',eq:Object.values(run.p.eq).filter(Boolean),last:['basic','guard'],stats:Object.assign({},run.stats),at:Date.now()}; run.result='lose'; G.scr='dead'; render()}"""); settle(400)
    yield '16-dead'

SITE = None
MOCK = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_sb.js'), encoding='utf-8').read()

def main():
    global SITE
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', default='06a2'); ap.add_argument('--out', default=None); ap.add_argument('--shots', default=None)
    ap.add_argument('--fs', default='1'); ap.add_argument('--axe', default=None); ap.add_argument('--only', default=None); ap.add_argument('--widths', default='390,1280')
    a = ap.parse_args()
    SITE = 'file://' + os.path.join(ROOT, a.site, 'index.html').replace(os.sep, '/')  # --site에는 절대 경로도 된다(전 판을 git archive로 풀어 둔 곳)
    res = {}
    with sync_playwright() as p:
        br = p.chromium.launch()
        for w in [int(x) for x in a.widths.split(',')]:
            ctx = br.new_context(viewport={'width': w, 'height': 844 if w < 700 else 800})
            # 접속한 지인 화면을 보려고 가짜 Supabase(tools/mock_sb.js)를 쓴다. 진짜 서버에는 닿지 않는다
            ctx.add_init_script("window.__cfgOverride=1;")
            # 같은 상태가 매번 나오게 난수를 씨앗으로 고정한다(전 · 후 화면을 비교하려고)
            ctx.add_init_script("(function(){let s=20241010;Math.random=function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})()")
            ctx.route('**/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
            ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'};"))
            ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            for name in drive(pg, w):
                if a.fs != '1': pg.evaluate("(f)=>{G.data.fs=+f; render()}", a.fs); pg.wait_for_timeout(250)
                pg.mouse.move(2, 2); pg.wait_for_timeout(1300); pg.evaluate("()=>document.querySelectorAll('.toast').forEach(e=>e.remove())")  # 알림(토스트)은 곧 사라지는 덮개라 재지 않는다
                if a.only and not any(name.startswith(x) for x in a.only.split(',')): continue
                m = pg.evaluate(MEASURE_JS); s = summarize(m); s['errs'] = len(errs)
                if a.axe:  # axe-core(wcag2a · 2aa · 2.1 · 2.2 aa · best-practice). 규칙은 끄지 않는다
                    if not pg.evaluate("()=>!!window.axe"): pg.add_script_tag(path=a.axe)
                    r = pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return r.violations.map(v=>({id:v.id,n:v.nodes.length,t:v.nodes[0].target.join(' ').slice(0,80)}))}")
                    s['axe'] = r
                res[f'{name}@{w}'] = s
                if a.shots:
                    os.makedirs(a.shots, exist_ok=True); pg.screenshot(path=os.path.join(a.shots, f'{name}_{w}.png'), full_page=(w >= 700 and not name.startswith('0') or w < 700))
            ctx.close()
        br.close()
    if a.out:
        json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if os.environ.get('LIST'):
        for k, v in res.items():
            print(k, '| axe:', v.get('axe'), '| 44 아래:', v['tgSmall'], '| 13px 아래:', v['small'], '| 대비 7 아래:', v['low'])
        return
    for k, v in res.items():
        print(k, 'chars', v['chars'], 'fsMin', v['fsMin'], 'lt13', v['pct_lt13'], 'crMin', v['crMin'], v['worst'][:2], 'crP10', v['crP10'], 'sizes', v['nSizes'], 'colors', v['nColors'], 'tgLt44', v['tgLt44'], 'lineMax', v['lineMax'], 'hs', v['hScroll'])

if __name__ == '__main__':
    main()
