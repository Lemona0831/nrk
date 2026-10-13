'use strict';
// Mobile viewport and real Chromium quota. Synthetic saves; no real account writes.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html')));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(data);});
});
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.route('**/config.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.NRK_CONFIG=null;'}));
    await context.route('**/fonts.googleapis.com/**',r=>r.abort());await context.route('**/fonts.gstatic.com/**',r=>r.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/'+(process.argv[2]?process.argv[2].replace(/\/$/,'')+'/':''));await page.waitForFunction(()=>SITE_UPDATE.started);
    await page.evaluate(()=>{G.data.name='모바일 저장 시험';G.data.tutSeen=true;G.data.seenGuide=true;G.data.seenCoach=true;G.data.seenBreak=true;saveLocal();render();});
    const create=async name=>{
      await page.click(await page.$('[data-a=restart]')?'[data-a=restart]':'[data-a=newchar]');await page.fill('#cname',name);await page.click('[data-a=cnok]');
      const step=await page.evaluate(()=>({scr:G.scr,step:G.cre && G.cre.step,sheet:G.sheet && G.sheet.kind,classes:CLASS_KEYS(),name:document.getElementById('cname')?.value}));
      if(step.step!=='cls')throw Error('Creation did not reach class selection: '+JSON.stringify(step));
      await page.click('[data-a=clspick][data-k=spellblade]');await page.click('[data-a=start][data-b=spellblade]');
      await page.click('[data-a=skillok]');await page.click('[data-a=statrec]');await page.click('[data-a=statok]');
    };
    const title=()=>page.evaluate(()=>{const el=document.createElement('button');el.dataset.a='title';onClick({target:el});});
    await create('첫 캐릭터');
    await page.evaluate(()=>{G.data.kept=Array.from({length:3},(_,i)=>{const r=clone(G.data.cur);r.id='mobile-slot-'+i;r.cname='보관 '+i;r.gold=100+i;return r;});saveLocal();G.run=null;G.scr='title';render();});
    const originalIds=await page.evaluate(()=>cloudLive().map(r=>r.id));assert.equal(await page.evaluate(()=>saveCount()),4);
    const result=await page.evaluate(()=>{
      const acts=Array.from({length:20000},(_,i)=>({k:'act',a:'basic',tick:i,hp:130-i%70,st:80,note:'cumulative battle record '.repeat(10)}));
      G.data.runs.push({id:'large-history',build:'spellblade',endedAt:1,acts});const json=JSON.stringify(G.data);let rawFailed=false;
      try{localStorage.setItem(SKEY,json);}catch(e){if(e.name!=='QuotaExceededError')throw e;rawFailed=true;}
      const start=performance.now(),saved=saveLocal();
      return{rawFailed,saved,packed:G.localSaveInfo.packed,rawChars:json.length,storedChars:localStorage.getItem(SKEY).length,ms:performance.now()-start,exact:localSaveText(localStorage.getItem(SKEY))===json};
    });
    assert(result.rawFailed&&result.saved&&result.packed&&result.exact,'quota recovery');
    await page.reload();await page.waitForFunction(()=>SITE_UPDATE.started);assert.equal(await page.evaluate(()=>saveCount()),4);
    assert.equal(await page.evaluate(()=>G.data.runs.find(r=>r.id==='large-history').acts.length),20000);
    await page.click('[data-a=resumekept][data-k="mobile-slot-1"]');assert(await page.evaluate(()=>G.run.id==='mobile-slot-1'&&G.run.gold===101));
    await title();await create('다섯째 캐릭터');assert.equal(await page.evaluate(()=>saveCount()),5);
    await title();await page.reload();await page.waitForFunction(()=>SITE_UPDATE.started);assert.equal(await page.evaluate(()=>saveCount()),5);
    const ids=await page.evaluate(()=>cloudLive().map(r=>r.id));assert(originalIds.every(id=>ids.includes(id)));
    assert(await page.evaluate(()=>siteUpdateSave()));
    await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};window.rollbackSource=localStorage.getItem(SKEY);window.rollbackData=clone(G.data);window.sameRollback=()=>JSON.stringify(G.data.cur)===JSON.stringify(rollbackData.cur)&&JSON.stringify(G.data.kept)===JSON.stringify(rollbackData.kept)&&JSON.stringify(G.data.runs)===JSON.stringify(rollbackData.runs)&&localStorage.getItem(SKEY)===rollbackSource;});
    await page.click('[data-a=resumekept][data-k="mobile-slot-0"]');assert(await page.evaluate(()=>sameRollback()),'selection failure rollback');
    assert((await page.innerText('body')).includes('브라우저 저장 용량이 부족합니다'));
    await create('실패해야 하는 캐릭터');assert(await page.evaluate(()=>G.creating&&G.sheet.kind==='stats'&&saveCount()===5&&G.run.statLog.length===0),'creation failure rollback');
    assert(await page.evaluate(()=>sameRollback()),'creation preserves all original characters and history');
    await page.evaluate(()=>{Storage.prototype.setItem=savedSetItem;});await page.click('[data-a=statok]');assert.equal(await page.evaluate(()=>saveCount()),6);
    assert.equal(await page.evaluate(()=>G.run.statLog.length),1);
    await title();await page.reload();await page.waitForFunction(()=>SITE_UPDATE.started);assert.equal(await page.evaluate(()=>saveCount()),6);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({mobileQuota:result,originalCharactersPreserved:4,finalSlots:6,pageErrors:0}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
