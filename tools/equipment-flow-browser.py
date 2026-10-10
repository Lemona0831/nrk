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
    pg.fill('#cname', '사냥꾼민수'); pg.click('[data-a=cnok]'); cls = 'hunter' if pg.query_selector('[data-a=clspick][data-k=hunter]') else pg.get_attribute('[data-a=clspick]', 'data-k')  # 0.6a.2 시험판(06a2)에는 사냥꾼이 아직 없다
    pg.click(f'[data-a=clspick][data-k={cls}]')
    pg.click(f'button[data-a=start][data-b={cls}]'); pg.click('button[data-a=skillok]')
    for k in ['dex']*6: pg.click(f'button[data-a="stat+"][data-k={k}]')
    if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')  # 06a2 능력치 다섯(15점): 남은 점수는 추천 배분으로
    pg.click('button[data-a=statok]'); pg.click('button[data-a=door][data-k="0"]'); pg.click('button[data-a=enter]'); pg.evaluate("()=>{G.pace='instant'}")  # 휴대폰 폭에서는 진행 속도 고르기가 설정 창에만 있다
    from pathlib import Path
    out=Path('output/playwright/equipment');out.mkdir(parents=True,exist_ok=True)
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.evaluate("""()=>{G.b=null;G.run.p.hp=1;G.run.cons=[{id:'stone',g:'n',n:1},{id:'herb',g:'n',n:2},{id:'bandage',g:'n',n:1}];openSheet('cons')}""")
        pg.click('[data-a=consfilter][data-k=restore]');pg.click('[data-a=consonly]')
        assert pg.locator('[data-a=consuse]').count()==1
        assert pg.locator('[data-a=consuse]').get_attribute('data-k')=='1'
        pg.click('.sheet [data-a=consuse]')
        assert pg.evaluate('G.run.cons[1].n')==1
        assert pg.locator('[data-a=consfilter][data-k=restore]').get_attribute('aria-pressed')=='true'
        pg.click('[data-a=consfilter][data-k=all]');pg.click('[data-a=consonly]')
        pg.fill('#consquery','돌멩이');pg.press('#consquery','Enter')
        assert pg.locator('[data-a=consdiscard]').count()==1
        pg.once('dialog',lambda d:d.dismiss());pg.click('[data-a=consdiscard]')
        assert pg.evaluate('G.run.cons.length')==3
        pg.once('dialog',lambda d:d.accept());pg.click('[data-a=consdiscard]')
        assert pg.evaluate('G.run.cons.length')==2
        pg.fill('#consquery','');pg.click('[data-a=conssearch]')
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.locator('.toast').wait_for(state='hidden',timeout=15000)
        pg.screenshot(path=str(out/f'cons-{width}.png'),full_page=True)
        pg.evaluate("""()=>{G.run.p=mkPlayer(G.run.build,{});G.run.bag=[];delete G.run.inv;initGear(G.run);G.run.swaps=[];for(const kind of ['weapon','armor','ring']){const k=Object.keys(ITEMS).find(k=>tplKind(k)===kind&&ITEMS[k].g==='r'&&ITEMS[k].kind!=='start');addItem(G.run,mkItem(k,{ch:2,b:20}));}G.eqFilter='all';G.eqSel=null;openSheet('equip')}""")
        pg.click('[data-a=eqsel][data-k=armor]')
        assert pg.locator('[data-a=eqpick]').count()==1
        pg.click('[data-a=eqpick]')
        assert pg.locator('[data-a=eqon]').get_attribute('data-s')=='armor'
        assert pg.locator('.cmp').count()==1
        pg.click('[data-a=eqon]')
        assert pg.evaluate("G.run.p.eq.armor!== 'start_armor'")
        assert pg.evaluate('gearCheck(G.run)')
        pg.click('[data-a=eqfilter][data-k=all]');pg.click('[data-a=eqorder]')
        assert pg.locator('[data-a=eqpick]').count()==3
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.locator('.eqbag').scroll_into_view_if_needed();pg.locator('.toast').wait_for(state='hidden',timeout=15000);pg.screenshot(path=str(out/f'gear-{width}.png'),full_page=True)
        pg.evaluate("""()=>{G.run.p.hp=G.run.p.hpMax;const b=roomBattle(G.run.p,{ch:1,lv:1,en:[['bruiser',0],['archer',0]]},null,9);b.queue=['p'];G.b=b;G.run.cons=[{id:'chalk',g:'n',n:1}];openSheet('cons')}""")
        assert pg.locator('[data-a=constarget]').count()==2
        pg.locator('[data-a=constarget]').last.click()
        assert '사용 대상:' in pg.locator('.bagline').inner_text()
        assert pg.locator('[data-a=consdiscard]').is_disabled()
        target=pg.locator('[data-a=constarget]').last.get_attribute('data-k')
        pg.click('.sheet [data-a=consuse]')
        assert pg.evaluate('(id)=>G.b.en.find(e=>e.id===id).markDmg>0',target)
        assert pg.evaluate('G.run.cons.length')==0
        pg.evaluate("""()=>{G.b=null;G.run.cons=Array.from({length:BAG_MAX-G.run.bag.length},()=>({id:'herb',g:'n',n:1}));G.eqSel={slot:'armor'};openSheet('equip')}""")
        assert pg.locator('[data-a=eqoff]').is_disabled()
        ring=pg.evaluate("G.run.bag.find(u=>tplKind(G.run.inv[u].tpl)==='ring')")
        pg.evaluate("()=>{G.eqSel={slot:'ring2'};G.eqFilter='all';render()}")
        pg.click(f'[data-a=eqpick][data-k="{ring}"]')
        assert pg.locator('[data-a=eqon]').first.get_attribute('data-s')=='ring2'
        pg.evaluate("()=>{G.run.cons=[];G.dropQ=[];queueDrops([mkItem('start_armor'),mkItem('start_armor')])}")
        assert pg.locator('[data-a=droporganize]').count()==0
        pg.click('[data-a=dropkeep]')
        pg.click('[data-a=droporganize]')
        assert pg.evaluate("G.sheet.kind==='equip'&&G.dropQ.length===0&&gearCheck(G.run)")
    assert not errs,errs
    print('소모품 필터·검색·사용·대상·정리, 장비 슬롯·교체·정렬 390·1280 통과',errs)
    br.close()
