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
    for width in [390,1280]:
        pg.set_viewport_size({'width':width,'height':844})
        result=pg.evaluate("""()=>{
          const persisted=JSON.stringify(G.data.hud);
          hudEdBegin();hudFreeSetMode('free');
          const id=HUD_MODS.find(m=>!m.lock).id, dev=hudDev();
          G.hudEd.draft.fr[dev].m[id].x=-100;G.hudEd.draft.fr[dev].m[id].y=-100;
          G.hudEd.draft.fr[dev].off.push(id);
          const before=JSON.stringify(G.hudEd.draft);hudEdResetOne(id);
          const recovered=!G.hudEd.draft.fr[dev].off.includes(id)&&G.hudEd.draft.fr[dev].m[id].x>=0;
          hudEdUndo();const undone=JSON.stringify(G.hudEd.draft)===before;
          hudEdRedo();const redone=!G.hudEd.draft.fr[dev].off.includes(id);
          hudEdCancel(true);const cancelled=JSON.stringify(G.data.hud)===persisted;
          hudEdBegin();hudFreeSetMode('free');hudEdSave();
          const saved=G.data.hud.lay.md[dev]==='free';hudEdBegin();const reopened=G.hudEd.draft.md[dev]==='free';
          const tile=document.querySelector('[data-fm="'+id+'"]');tile.style.left='-150px';
          const oldUndo=G.hudEd.undo.length;hudFreeGather();
          const gathered=G.hudEd.undo.length===oldUndo+1&&G.hudEd.draft.fr[dev].m[id].x>=0;hudEdCancel(true);
          return {recovered,undone,redone,cancelled,saved,reopened,gathered};
        }""")
        assert all(result.values()),result
        print(width,'편집 복구·되돌리기·다시실행·취소·저장·재열기',result)
    assert not errs,errs
    print('errs',errs);br.close()
