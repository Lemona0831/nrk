"""가짜 계정으로 로그인·계정 분리와 접근성 설정을 검증합니다. 실제 서버에 쓰지 않습니다."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
site=(root/(sys.argv[1] if len(sys.argv)>1 else '06a2')/'index.html').as_uri()
mock=(root/'tools/mock_sb.js').read_text(encoding='utf-8')
out=root/'output/playwright/account-access';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script('window.__cfgOverride=1;')
    context.route('**/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=mock))
    context.route('**/config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body="window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock'};"))
    context.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg=context.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.on('dialog',lambda d:d.accept())
    pg.goto(site);pg.wait_for_function("typeof G!=='undefined' && G.conn==='ok' && !!G.acct")
    assert pg.locator('.tbelow [data-a=login]').count()==1
    login_box=pg.locator('.tmenu [data-a=login]').bounding_box()
    assert login_box and login_box['y']>=0 and login_box['y']+login_box['height']<=844
    pg.fill('#pname','민수');pg.click('[data-a=namesave]')
    # 기록이 없는 새 플레이어는 구글 인증으로 곧바로 연결합니다.
    pg.click('.tbelow [data-a=login]');pg.wait_for_function("typeof G!=='undefined' && G.acct && !G.acct.anon")
    pg.wait_for_function("typeof G!=='undefined' && G.data.name==='민수'")
    account=pg.evaluate('G.uid')
    pg.evaluate("()=>{G.data.runs.push({id:'account-record',build:'assassin',endedAt:1,acts:[]});saveLocal()}")
    pg.screenshot(path=str(out/'login-390.png'),full_page=True)
    # 로그아웃은 계정의 로컬 기록을 보관하고 새 손님에게 섞지 않습니다.
    pg.click('.tbelow [data-a=logout]');pg.wait_for_function('typeof G!=="undefined" && G.acct && G.acct.anon')
    assert pg.evaluate('G.data.runs.length')==0
    assert pg.evaluate('G.data.name || ""')==''
    pg.click('.tbelow [data-a=login]');pg.wait_for_function('typeof G!=="undefined" && G.acct && !G.acct.anon')
    assert pg.evaluate('G.uid')==account
    assert pg.evaluate('G.data.runs.some(r=>r.id==="account-record")')
    assert pg.evaluate('G.data.name')=='민수'
    assert pg.evaluate('testerLabel({uid:"abc12345-1",name:"같은이름",login:"google"},0)!==testerLabel({uid:"def12345-2",name:"같은이름",login:"google"},0)')
    # 손님 기록의 계정 연결이 막힌 서버에서도 일반 로그인 선택지가 남습니다.
    pg.click('.tbelow [data-a=logout]');pg.wait_for_function('typeof G!=="undefined" && G.acct && G.acct.anon')
    pg.evaluate("()=>{G.data.runs=[{id:'guest-record',build:'assassin',endedAt:1,acts:[]}];saveLocal();G.sb.auth.linkIdentity=async()=>({error:{message:'Manual linking is disabled'}})}")
    pg.click('.tbelow [data-a=login]');pg.wait_for_selector('[data-a=loginswitch]')
    assert pg.locator('.tbelow [data-a=dl]').count()==1
    pg.click('[data-a=loginswitch]');pg.wait_for_function('typeof G!=="undefined" && G.acct && !G.acct.anon')
    assert pg.evaluate('G.uid')==account
    assert not pg.evaluate('G.data.runs.some(r=>r.id==="guest-record")')
    assert pg.evaluate('G.data.runs.some(r=>r.id==="account-record")')
    pg.evaluate("()=>{G.b=roomBattle(mkPlayer('hunter',{}),ROOMS[0],null,7);G.scr='run';G.b.waiting=true;G.b.stepMode=true;render();openSheet('settings',{})}")
    pg.click('[data-a=settab][data-k=access]')
    before=pg.evaluate('JSON.stringify(G.b)')
    for key in ['focus','scroll','noHover']:
        pg.click(f'[data-a=optsw][data-k={key}]')
        assert pg.locator(f'[data-a=optsw][data-k={key}]').get_attribute('aria-checked')=='true'
    pg.select_option('#opthold','long')
    assert pg.evaluate('HOLD_MS[optGet("hold")]')==800
    assert pg.evaluate('JSON.stringify(G.b)')==before
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        pg.evaluate('()=>{hidePop();const t=document.querySelector(".toast");if(t)t.remove();document.querySelector(".sheet").scrollTop=0}');pg.screenshot(path=str(out/f'access-{width}.png'),full_page=True)
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    pg.evaluate('()=>{G.sheet=null;render();hidePop()}')
    assert pg.evaluate('document.documentElement.classList.contains("focus")')
    assert pg.evaluate('document.documentElement.classList.contains("fitscroll")')
    target=pg.locator('.mehead [data-info=buildrule]')
    target.hover();pg.wait_for_timeout(250)
    assert not pg.locator('#pop').is_visible()
    pg.keyboard.press('Tab');target.focus();pg.wait_for_timeout(50)
    assert pg.locator('#pop').is_visible()
    pg.keyboard.press('Escape')
    assert not pg.locator('#pop').is_visible()
    target.dispatch_event('pointerdown',{'pointerType':'touch'})
    pg.wait_for_timeout(400);assert not pg.locator('#pop').is_visible()
    pg.wait_for_timeout(450);assert pg.locator('#pop').is_visible()
    target.dispatch_event('pointerup',{'pointerType':'touch'})
    pg.reload();pg.wait_for_function("typeof G!=='undefined' && G.conn==='ok' && !!G.acct")
    assert pg.evaluate('optGet("focus") && optGet("scroll") && optGet("noHover") && optGet("hold")==="long"')
    assert not errors,errors
    print('구글 로그인·닉네임·로그아웃·기존 계정 복귀·연결 실패 대안·계정 기록 분리·접근성 4종·키보드/긴 누르기·재접속 저장 통과')
    browser.close()
