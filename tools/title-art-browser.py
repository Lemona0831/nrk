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
    from pathlib import Path
    out=Path('output/playwright/title-art');out.mkdir(parents=True,exist_ok=True)
    pg.goto(SITE);pg.wait_for_timeout(300)
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.evaluate("()=>{G.data.seenVer=CHANGE_VER;G.sheet=null;G.scr='title';render()}")
        pg.wait_for_function("document.querySelector('.title-art img').naturalWidth>0")
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert pg.locator('[data-a=newchar]').is_visible()
        pg.screenshot(path=str(out/f'title-{width}.png'),full_page=True)
    for width,height,zoom in [(1738,828,1.1),(1280,720,1.25),(390,844,1)]:
        pg.set_viewport_size({'width':width,'height':height})
        pg.evaluate("(zoom)=>{document.documentElement.style.zoom=zoom;G.data.cur={build:'hunter',lv:2,room:5,ch:1,cname:'시험 캐릭터',p:mkPlayer('hunter',{})};G.data.tutSeen=true;G.data.tutDone=true;G.data.menuOpen=true;G.scr='title';render()}",zoom)
        pg.evaluate('window.scrollTo(0,150)')
        pg.wait_for_timeout(100)
        assert pg.evaluate("()=>{const a=document.querySelector('.hdr').getBoundingClientRect(),b=document.querySelector('.tlogo').getBoundingClientRect();return a.bottom<=b.top}")
        assert pg.locator('[data-a=resume]').is_visible()
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.screenshot(path=str(out/f'resume-scroll-{width}.png'),full_page=True)
    pg.evaluate("()=>{document.documentElement.style.zoom=1;G.data.cur=null;G.scr='title';render();window.scrollTo(0,0)}")
    pg.click('[data-a=newchar]')
    assert pg.locator('.title-art').count()==0
    assert not errs,errs
    print('타이틀·이어하기·110/125% 확대·스크롤 메뉴 겹침·모바일·시작 동작 통과')
    br.close()
