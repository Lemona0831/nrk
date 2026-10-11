'use strict';
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/ardwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});const errors=[];
for(const dir of ['.','06a2'])for(const width of [1280,390]){
 const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addInitScript('window.__cfgOverride=1');
 await ctx.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'mock_sb.js'),'utf8')}));
 await ctx.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.NRK_CONFIG={supabaseUrl:'https://demo.supabase.co',anonKey:'demo'};"}));
 await ctx.route('**/fonts.googleapis.com/**',r=>r.abort());const pg=await ctx.newPage();pg.on('pageerror',e=>errors.push(String(e)));
 await pg.goto(pathToFileURL(path.resolve(__dirname,'..',dir,'index.html')).href);await pg.waitForTimeout(500);
 await pg.evaluate(()=>{startRun('monk');const r=G.run;r.cname='검증 캐릭터';r.stats={str:10,dex:5,int:0,con:5,wil:0};const node=SKILLS2.monk.find(n=>!n.start);r.tree.open=[node.id];r.skills=[node.id];r.treeLog=[{id:node.id,room:1,lv:1,t:Date.now()}];r.statLog=[{add:r.stats,room:1,t:Date.now()}];r.acts=[{k:'act',a:'basic',r:1,t:1,hp:.5,mp:0,st:20}];G.dashRaw=[{uid:'one',name:'검증 플레이어',runs:[runRecord(r)]},{uid:'two',name:'다른 플레이어',runs:[runRecord(r)]}];G.dash=aggregate(G.dashRaw);G.owner=true;G.scr='admin';G.sheet=null;G.creating=false;render();});
 await pg.locator('[data-a=runperson]').first().click();await pg.locator('[data-a=runopen]').first().click();
 await pg.getByRole('heading',{name:'장비 세부 내용'}).waitFor();await pg.getByRole('heading',{name:'스킬 트리',exact:true}).waitFor();
 if(await pg.locator('meter').count()!==5)throw Error('stat meters');
 if(!(await pg.locator('body').innerText()).includes('생명력 50%'))throw Error('HP ratio');
 const overflow=await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)throw Error('page overflow '+width);
 fs.mkdirSync(path.resolve('output/playwright/admin-details'),{recursive:true});await pg.screenshot({path:path.resolve('output/playwright/admin-details/'+(dir==='.'?'public':'dev')+'-'+width+'.png'),fullPage:true});
 await ctx.close();console.log(dir+' '+width+': 개인 선택·장비 상세·스탯·트리·행동·가로 넘침 점검 통과');
}await browser.close();if(errors.length)throw Error(errors.join('\n'));})().catch(e=>{console.error(e);process.exitCode=1;});
