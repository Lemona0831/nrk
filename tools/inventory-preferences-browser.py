# 가짜 Supabase 연결로 잠금·즐겨찾기·획득 표시·저장 복원과 단축키를 점검합니다.
# 실행: python tools/inventory-preferences-browser.py 06a2 (공개판은 .)
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
    if pg.query_selector('button[data-a=statrec]:not([disabled])'): pg.click('button[data-a=statrec]')  # 남은 시작 점수를 추천 배분으로 채웁니다.
    pg.click('button[data-a=statok]'); pg.click('button[data-a=door][data-k="0"]'); pg.click('button[data-a=enter]'); pg.evaluate("()=>{G.pace='instant'}")  # 휴대폰 폭에서는 진행 속도 고르기가 설정 창에만 있다
    from pathlib import Path
    out=Path('output/playwright/inventory-preferences');out.mkdir(parents=True,exist_ok=True)
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.evaluate("""()=>{G.b=null;G.scr='run';G.run.cons=[];G.run.consFav=[];G.run.bag=[];G.run.p=mkPlayer('hunter',{});delete G.run.inv;initGear(G.run);G.run.swaps=[];addItem(G.run,mkItem('twinblades',{ch:2,b:20}));addItem(G.run,mkItem('cloak',{ch:2,b:10}));G.eqSel={slot:'weapon'};G.eqFilter='all';openSheet('equip')}""")
        assert pg.locator('.bagc .item-new').count()==2
        pg.locator('.baggrid').scroll_into_view_if_needed()
        assert pg.evaluate("""()=>Array.from(document.querySelectorAll('.bagc .item-new')).every(x=>{const a=x.getBoundingClientRect(),b=x.parentElement.getBoundingClientRect();return a.top>=b.top&&a.top<b.top+24&&a.right<=b.right&&a.right>b.right-20})""")
        pg.screenshot(path=str(out/f'new-{width}.png'),full_page=True)
        uid=pg.locator('[data-a=eqpick]').first.get_attribute('data-k')
        pg.click(f'[data-a=eqpick][data-k="{uid}"]')
        assert pg.locator('.bagc .item-new').count()==1
        pg.click('[data-a=eqlock]')
        assert pg.locator('[data-a=eqdrop]').is_disabled()
        pg.locator('[data-a=eqlock]').scroll_into_view_if_needed()
        assert pg.locator('.item-lock').count()==1
        pg.evaluate("()=>{saveCur();G.run=JSON.parse(JSON.stringify(G.data.cur));render()}")
        assert pg.locator('[data-a=eqlock]').get_attribute('aria-pressed')=='true'
        assert pg.locator('[data-a=eqdrop]').is_disabled()
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.screenshot(path=str(out/f'equipment-{width}.png'),full_page=True)
        pg.click('[data-a=eqlock]')
        assert not pg.locator('[data-a=eqdrop]').is_disabled()
        pg.evaluate("""()=>{consAdd(G.run,'herb','n',2);consAdd(G.run,'bandage','n',1);consAdd(G.run,'chalk','n',1);openSheet('cons')}""")
        assert pg.locator('.bagline .item-new').count()==3
        pg.click('[data-a=consseen][data-k="1"]')
        assert pg.locator('.bagline .item-new').count()==2
        pg.click('[data-a=consfav][data-k="0"]')
        pg.click('[data-a=consfav][data-k="2"]')
        pg.click('[data-a=consfilter][data-k=fav]')
        assert pg.locator('[data-a=consuse]').count()==2
        pg.evaluate("()=>{saveCur();G.run=JSON.parse(JSON.stringify(G.data.cur));render()}")
        assert pg.locator('[data-a=consfavremove]').count()==2
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.screenshot(path=str(out/f'consumables-{width}.png'),full_page=True)
        pg.click('[data-a=close]')
        pg.evaluate("""()=>{G.b=roomBattle(G.run.p,{ch:1,lv:1,en:[['bruiser',0]]},null,9);G.b.queue=['p'];G.busy=false;G.scr='run';G.data.hudShow=Object.assign({},G.data.hudShow,{qcons:1});render()}""")
        assert pg.locator('.qcons [data-q="1"]').get_attribute('data-k')=='0'
        assert pg.locator('.qcons [data-q="1"]').get_attribute('aria-disabled')=='true'
        pg.evaluate("()=>{G.run.p.hp=1;render()}")
        pg.press('body','q')
        assert pg.evaluate('G.run.cons[0].n')==1
        pg.screenshot(path=str(out/f'quick-{width}.png'),full_page=True)
    assert not errs,errs
    print('390/1280 실제 잠금·해제·새 획득 확인·즐겨찾기·저장 복원·Q 사용·가로 넘침 통과')
    br.close()
