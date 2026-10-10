'use strict';
process.env.DGDIR='06a2';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_,G=E.__G;
const run={build:'hunter',p:E.mkPlayer('hunter',{}),bag:[],cons:[],swaps:[],rooms:[],gold:100,shop:{log:[]}};
E.initGear(run);G.run=run;G.data={};G.busy=false;E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{}; // 실제 저장·복원은 브라우저 점검에서 검증합니다.
const it=E.mkItem('twinblades',{b:0});E.addItem(run,it);assert(it.fresh);
it.locked=true;const state=()=>JSON.stringify({inv:run.inv,bag:run.bag,gold:run.gold,rooms:run.rooms,shop:run.shop});const snapshot=state();
assert(E.discardUid(run,it.uid));assert(E.fateCan(run,it));assert.equal(E.fateRun(run,it.uid),null);
for(const action of ['sell','eqdrop','dropdiscard','offerpick']){D.click(action,it.uid);assert.equal(state(),snapshot);}
G.sheet={kind:'bagfull',data:{item:E.mkItem('cloak'),then:'drop'}};D.click('bfdrop',it.uid);assert.equal(state(),snapshot);
assert.equal(E.equipUid(run,it.uid,'weapon'), '');assert(it.locked);assert(!it.fresh);assert(E.gearCheck(run));
const old=run.bag[0];E.equipUid(run,old,'weapon');assert(run.inv[it.uid].locked);
it.locked=false;assert.equal(E.discardUid(run,it.uid),'');assert(E.gearCheck(run));
for(const id of ['herb','bandage','chalk','dart'])E.consAdd(run,id,'n',1);
assert(run.cons.every(c=>c.fresh));
for(const c of run.cons.slice(0,3))assert.equal(E.toggleConsFavorite(run,c),'');
assert(E.toggleConsFavorite(run,run.cons[3]));assert.equal(run.consFav.length,3);
assert.equal(E.consRows(run,null,'fav',false,'',null).length,3);
const b=E.roomBattle(run.p,{ch:1,lv:1,en:[['bruiser',0]]},null,1);b.queue=['p'];G.b=b;
const html=E.consQuick(b,{qcons:1});assert(html.includes('data-q="1"'));assert(html.includes('aria-disabled="true"')); // 사용할 수 없어도 선택한 칸을 유지합니다.
run.cons.splice(0,1);const next=E.consQuick(b,{qcons:1});assert(!next.includes('data-q="1"'));assert(next.includes('data-q="2"'));
E.consAdd(run,'herb','n',1);assert(E.consQuick(b,{qcons:1}).includes('data-q="1"'));
const c=run.cons.find(c=>c.id==='herb');c.fresh=false;E.consAdd(run,'herb','n',1);assert(c.fresh);
const saved=JSON.parse(JSON.stringify(run));assert.equal(JSON.stringify(saved.consFav),JSON.stringify(run.consFav));assert(saved.cons.some(c=>c.fresh));
D.click('consfavremove','herb:n');assert(!run.consFav.includes('herb:n'));
console.log('잠금 파괴 경로 차단·잠긴 장비 교체·즐겨찾기 한도/필터/고정 단축키·재획득 표시·저장 통과');
