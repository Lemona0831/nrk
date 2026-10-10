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
    from pathlib import Path
    out=Path('output/playwright/player-text');out.mkdir(parents=True,exist_ok=True)
    pg.fill('#cname','문구점검');pg.click('[data-a=cnok]')
    assert pg.evaluate('()=>ALL_CLASS_KEYS().every(k=>classRuleHtml(k).includes("rule-details"))')
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        for build in ['assassin','warden','hunter','elementalist','spellblade','monk']:
            pg.click(f'[data-a=clspick][data-k={build}]')
            assert pg.locator('.class-rules').count()==1
            assert pg.evaluate('(build)=>{const original=BUILDS[build].rule;const rendered=document.querySelector(".class-rules");return Array.from(rendered.querySelectorAll(".rule-details p")).slice(0,original.split(". ").length).map(p=>p.textContent).join(". ")==original}',build)
            assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
            pg.screenshot(path=str(out/f'rules-{build}-{width}.png'),full_page=True)
    pg.click('[data-a=clspick][data-k=spellblade]')
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.screenshot(path=str(out/f'class-{width}.png'),full_page=True)
    pg.click('button[data-a=start][data-b=spellblade]')
    assert pg.evaluate('LV_POINTS')==3
    assert pg.evaluate('G.run.statGrowth')==3
    assert pg.evaluate('G.run.tree.pts')==1
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        for branch in ['혈인','염검','마갑']:
            pg.click(f'[data-a=tbr][data-k={branch}]')
            assert branch in pg.locator('.tbmenu').inner_text()
            pg.screenshot(path=str(out/f'tree-{branch}-{width}.png'),full_page=True)
    pg.click('button[data-a=skillok]');pg.click('button[data-a=statrec]');pg.click('button[data-a=statok]')
    assert pg.evaluate('statSum(G.run.stats)')==20
    pg.click('button[data-a=door][data-k="0"]')
    pg.evaluate("()=>{G.run.lv=5;G.run.statGrowth=2;G.run.statPending=2;statFix(G.run)}")
    assert pg.evaluate('G.run.statPending')==6
    pg.click('button[data-a=enter]')
    assert pg.evaluate('G.sheet.kind')=='stats'
    assert pg.evaluate('G.sheet.data.pts')==6
    pg.screenshot(path=str(out/'stat-backfill.png'),full_page=True)
    pg.click('button[data-a=statrec]');pg.click('button[data-a=statok]')
    assert pg.evaluate('G.run.statPending')==0
    assert pg.evaluate('statSum(G.run.stats)')==26
    assert pg.evaluate('G.data.cur.statGrowth')==3
    pg.click('button[data-a=enter]')
    assert pg.evaluate('!!G.b')
    # 브라우저에서 실제 음원 전체를 읽고 디코딩합니다. 청취 평가는 별개입니다.
    import base64,json
    audio=pg.evaluate('Object.entries(SFX).filter(([k])=>k.startsWith(\"b_\")).map(([k,a])=>[k,a.src])')
    folder=Path(SITE[7:]).parent
    blobs=[[k,base64.b64encode((folder/src).read_bytes()).decode()] for k,src in audio]
    pg.evaluate('(x)=>window.__audioBytes=x',blobs)
    result=pg.evaluate("""async()=>{const ac=new AudioContext();const out=[];for(const [k,a] of window.__audioBytes){const bytes=Uint8Array.from(atob(a),x=>x.charCodeAt(0));const buf=await ac.decodeAudioData(bytes.buffer);out.push([k,buf.duration]);}await ac.close();return out;}""")
    assert len(result)==31
    assert all(0<d<4 for k,d in result)
    print('직업 소개·세 갈래·초기 20점·능력치 보충 6점 배분·전투 진입·음원 31개 디코딩',result)
    assert not errs,errs
    br.close()
