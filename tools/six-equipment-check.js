'use strict';process.env.DGDIR='06a2';const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;let n=0;
for(const build of V('Object.keys(TREE2)')) {
 const run={build,p:E.mkPlayer(build,{}),bag:[]};E.initGear(run);
 for(const [tpl,I] of Object.entries(E.ITEMS)) {
  const it=E.mkItem(tpl,{b:0});const r=JSON.parse(JSON.stringify(run));r.inv[it.uid]=it;r.bag.push(it.uid);const slot=E.tplKind(tpl)==='ring'?'ring1':E.tplKind(tpl);E.__cmpRun=r;E.__cmpId=it.uid;E.__cmpSlot=slot;
  const before=JSON.stringify(r),html=V('compareHtml(__cmpRun,__cmpId,__cmpSlot)');assert.equal(JSON.stringify(r),before);
  const cur=r.eqU[slot]&&r.inv[r.eqU[slot]];if(!cur||cur.tpl!==tpl){if(I.act)assert(html.includes('얻는 효과: '+V('esc')(I.act)));if(I.cost)assert(html.includes('새 대가: '+V('esc')(I.cost)));}
  if(cur&&cur.tpl!==tpl){const old=E.ITEMS[cur.tpl];if(old.act)assert(html.includes('효과가 사라집니다: '+V('esc')(old.act)));if(old.cost)assert(html.includes('없어지는 대가: '+V('esc')(old.cost)));}
  const replacement=Object.keys(E.ITEMS).find(k=>k!==tpl&&E.tplKind(k)===E.tplKind(tpl));
  if(replacement){const swapped=JSON.parse(JSON.stringify(r));swapped.eqU[slot]=it.uid;E.applyGear(swapped);const next=E.mkItem(replacement,{b:0});swapped.inv[next.uid]=next;E.__cmpRun=swapped;E.__cmpId=next.uid;const original=JSON.stringify(swapped),reverse=V('compareHtml(__cmpRun,__cmpId,__cmpSlot)');assert.equal(JSON.stringify(swapped),original);if(I.act)assert(reverse.includes('효과가 사라집니다: '+V('esc')(I.act)));if(I.cost)assert(reverse.includes('없어지는 대가: '+V('esc')(I.cost)));}
  assert(!html.includes('더 좋아집니다'));assert(!html.includes('더 나빠집니다'));assert(!html.includes('최대 마나 <b>'));
  n++;
 }
}
console.log('장비 비교 효과·대가·원본 불변:',n,'직업×장비 조건 통과');
