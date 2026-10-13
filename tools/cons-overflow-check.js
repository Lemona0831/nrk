'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};E.ask=()=>true;
const run={build:'hunter',p:E.mkPlayer('hunter',{}),bag:[],cons:[],swaps:[],rooms:[],drops:[]};
E.initGear(run);G.run=run;G.data={};G.b=null;
const max=D.run_('BAG_MAX');
while(E.bagUsed(run)<max) E.addItem(run,E.mkItem('cloak'));
const locked=run.bag[0];run.inv[locked].locked=true;
assert.equal(E.consGrant(run,'herb','n',2),2);
assert.equal(run.consPending[0].n,2);assert.equal(run.cons.length,0);
G.sheet={kind:'consfull',data:{}};
D.click('cpreplace',locked,{s:'gear'});assert.equal(run.bag.length,max);assert.equal(run.consPending[0].n,2);
G.run=JSON.parse(JSON.stringify(run)); // 이어 하기에서도 미수령 보상을 유지합니다.
G.sheet={kind:'consfull',data:{}};
D.click('cpreplace',G.run.bag[1],{s:'gear'});
assert.equal(G.run.cons[0].id,'herb');assert.equal(G.run.cons[0].n,2);assert.equal(G.run.consPending.length,0);
assert.equal(E.consGrant(G.run,'herb','n',1),0);assert.equal(G.run.cons[0].n,3); // 가득 차도 같은 묶음에 합칩니다.
E.consGrant(G.run,'dagger','n',1);G.sheet={kind:'consfull',data:{}};
E.ask=()=>false;D.click('cpreplace','0',{s:'cons'});assert.equal(G.run.cons[0].id,'herb');
E.ask=()=>true;D.click('cpreplace','0',{s:'cons'});assert.equal(G.run.cons[0].id,'dagger');
E.consGrant(G.run,'bandage','n',1);G.sheet={kind:'consfull',data:{}};D.click('cpskip');
assert.equal(G.run.consPending.length,0);assert.equal(G.run.cons[0].id,'dagger');
console.log('소모품 대기·저장 복원·장비 잠금·교체 확인 취소·묶음 교체·합치기·명시적 포기 통과');
