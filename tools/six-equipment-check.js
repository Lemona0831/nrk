'use strict';process.env.DGDIR='06a2';const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;let n=0;
for(const build of V('Object.keys(TREE2)')) {
 const run={build,p:E.mkPlayer(build,{}),bag:[],inv:{},eqU:{}};E.initGear(run);
 for(const [tpl,I] of Object.entries(E.ITEMS)) {
  const it=E.mkItem(tpl,{b:0});const r=JSON.parse(JSON.stringify(run));r.inv[it.uid]=it;r.bag.push(it.uid);const slot=E.tplKind(tpl)==='ring'?'ring1':E.tplKind(tpl);E.__cmpRun=r;E.__cmpId=it.uid;E.__cmpSlot=slot;
  const before=JSON.stringify(r),html=V('compareHtml(__cmpRun,__cmpId,__cmpSlot)');assert.equal(JSON.stringify(r),before);
  const cur=r.eqU[slot]&&r.inv[r.eqU[slot]];if(!cur||cur.tpl!==tpl){if(I.act)assert(html.includes('얻는 효과: '+V('esc')(I.act)));if(I.cost)assert(html.includes('새 대가: '+V('esc')(I.cost)));}
  assert(!html.includes('더 좋아집니다'));assert(!html.includes('더 나빠집니다'));assert(!html.includes('최대 마나 <b>'));
  n++;
 }
}
console.log('장비 비교 효과·대가·원본 불변:',n,'직업×장비 조건 통과');
