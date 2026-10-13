'use strict';
process.env.DGDIR=process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};G.data={};G.busy=false;
function run(id,stacks,free=0){return {build:'hunter',p:E.mkPlayer('hunter',{}),phase:'shop',bag:Array(E.BAG_MAX-stacks.length-free).fill('gear'),cons:stacks,gold:10000,stats:{},shop:{stock:[],cons:[{id,price:12}],log:[]}};}
function state(r){return JSON.stringify({cons:r.cons,bag:r.bag,gold:r.gold,shop:r.shop});}
function buy(r){G.run=r;D.click('consbuy','0');}
let cases=0,grantCases=0;
for(const [id,C] of Object.entries(E.CONS)){
 for(const grade of ['n',undefined])for(let n=1;n<C.max;n++){
  const r=run(id,[{id,g:grade,n}]),before=state(r);assert.equal(E.consSpace(r,id,'n').capacity,C.max-n);assert.equal(state(r),before,'읽기만 하는 공간 계산');
  for(let k=n;k<C.max;k++){buy(r);assert.equal(r.cons[0].n,k+1);assert.equal(E.bagUsed(r),E.BAG_MAX);}
  assert.equal(r.gold,10000-12*(C.max-n));assert.equal(r.cons[0].g,'n');
  const full=state(r);buy(r);assert.equal(state(r),full,'실패 구매는 골드·로그·개수 불변');cases++;
 }
 if(C.vm!=null){const r=run(id,[{id,g:'m',n:1}]);assert(E.consBuyWhy(r,r.shop.cons[0]));const before=state(r);buy(r);assert.equal(state(r),before,'일반·고급 합치지 않음');cases++;}
 const r=run(id,[{id,g:'n',n:C.max}],1);buy(r);assert.equal(r.cons.length,2);assert.equal(r.cons[1].n,1);assert.equal(E.bagUsed(r),E.BAG_MAX);
 for(let k=1;k<C.max;k++)buy(r);assert.equal(r.cons[1].n,C.max);assert.equal(r.gold,10000-12*C.max);cases++;
 const restored=JSON.parse(JSON.stringify(r));assert.equal(E.consSpace(restored,id,'n').capacity,0);restored.cons[1].n--;buy(restored);assert.equal(restored.cons[1].n,C.max);cases++;
 const poor=run(id,[],1);poor.gold=11;const before=state(poor);buy(poor);assert.equal(state(poor),before,'골드 부족 시 획득 금지');cases++;
 // 획득·보류 보상도 등급별로 마지막 묶음의 빈 자리를 채워야 한다.
 for(const grade of C.vm!=null?['n','m']:['n'])for(let n=1;n<C.max;n++){
  const r=run(id,[{id,g:grade,n}]),snapshot=state(r);
  assert.equal(E.consSpace(r,id,grade).capacity,C.max-n);
  assert.equal(state(r),snapshot,'고급 포함 공간 조회는 저장본 불변');
  assert.equal(E.consGrant(r,id,grade,C.max-n+2),2);
  assert.equal(r.cons[0].n,C.max);assert.equal(r.cons[0].g,grade);
  assert.equal(E.bagUsed(r),E.BAG_MAX);assert.equal(r.consPending[0].n,2);
  assert.equal(r.consGainLog[0].received,C.max-n);assert.equal(r.consGainLog[0].pending,2);
  const saved=JSON.parse(JSON.stringify(r));saved.cons[0].n=C.max-1;
  assert.equal(E.consPendingTry(saved),false);assert.equal(saved.cons[0].n,C.max);
  assert.equal(saved.consPending[0].n,1);saved.cons[0].n--;
  assert.equal(E.consPendingTry(saved),true);assert.equal(saved.cons[0].n,C.max);
  assert.equal(saved.consPending.length,0);grantCases++;
 }
 if(C.vm!=null){
  for(const grade of ['n','m']){
   const other=grade==='n'?'m':'n',r=run(id,[{id,g:grade,n:1}]);
   assert.equal(E.consSpace(r,id,other).capacity,0);
   assert.equal(E.consGrant(r,id,other,1),1);assert.equal(r.cons[0].n,1);
   assert.equal(r.consPending[0].g,other);assert.equal(E.consPendingTry(r),false);
   r.bag.pop();assert.equal(E.consPendingTry(r),true);
   assert.equal(r.cons.length,2);assert.equal(r.cons[1].g,other);
   assert.equal(r.cons[1].n,1);assert.equal(E.bagUsed(r),E.BAG_MAX);grantCases++;
  }
 }
}
const herbs=run('herb',Array.from({length:5},()=>({id:'herb',g:'n',n:5})),15);assert.equal(E.bagUsed(herbs),5,'약초25개는5칸');
const last=run('herb',[{id:'herb',g:'n',n:5}],1);for(let i=0;i<5;i++)buy(last);assert.equal(last.cons[1].n,5);assert.equal(last.shop.log.length,5);
last.consPending=[{id:'herb',g:'n',n:1}];last.cons[1].n--;assert(E.consPendingTry(last));assert.equal(last.cons[1].n,5);assert.equal(last.consPending.length,0);
const legacyFav=run('herb',[{id:'herb',n:1}]);legacyFav.consFav=['herb:undefined'];buy(legacyFav);assert(D.run_('consFavorite(__G.run,__G.run.cons[0])'));assert.equal(legacyFav.consFav[0],'herb:n');
const saved=JSON.parse(JSON.stringify(last));saved.bag=[];saved.inv={};saved.cons=Array.from({length:E.BAG_MAX},()=>({id:'herb',g:'n',n:5}));G.run=saved;const html=E.vShop();assert(html.includes('가방 20/20칸'));assert(html.includes('일반 묶음 빈 자리 없음'));assert(!html.includes('몇 개든 삽니다'));assert(!html.includes('가득 차 더 살 수 없습니다'));
console.log(JSON.stringify({passed:true,items:Object.keys(E.CONS).length,cases,grantCases,total:cases+grantCases}));
