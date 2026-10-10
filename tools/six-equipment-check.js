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

// 비용 증가가 나빠짐으로, 감소가 좋아짐으로 표시되고 실제 충전 손실도 안내해야 합니다.
const r={build:'hunter',p:E.mkPlayer('hunter',{}),bag:[],swaps:[]};E.initGear(r);
for(const tpl of ['twinblades','saintgrail']) {
 const it=E.mkItem(tpl,{b:0});r.inv[it.uid]=it;r.bag.push(it.uid);const slot=E.tplKind(tpl);E.__cmpRun=r;E.__cmpId=it.uid;E.__cmpSlot=slot;
 const original=JSON.stringify(r),html=V('compareHtml(__cmpRun,__cmpId,__cmpSlot)');assert.equal(JSON.stringify(r),original);
 assert(!html.includes('equip-burden'));
 if(tpl==='twinblades')assert(/class="dn"[^]*강공격 스태미나 비용 <b>\+10<\/b>/.test(html));
 else {assert(html.includes('생명력 플라스크 최대 충전 <b>−1회</b> <small>3회 → 2회</small>'));assert(html.includes('장착 후 남은 생명력 플라스크 3 → 2회'));}
 const old=r.eqU[slot];E.equipUid(r,it.uid,slot);E.__cmpId=old;const reverse=V('compareHtml(__cmpRun,__cmpId,__cmpSlot)');
 if(tpl==='twinblades')assert(/class="up"[^]*강공격 스태미나 비용 <b>−10<\/b>/.test(reverse));
 assert(!reverse.includes('사용 부담이 늘어납니다'));
}
for(const ids of [[],['h_double'],['h_double','h_triple'],['h_double','h_mark']]) {
 E.__hintRun={build:'hunter',skills:ids};const original=JSON.stringify(E.__hintRun),html=V('hunterLoadoutHint(__hintRun)');assert.equal(JSON.stringify(E.__hintRun),original);
 assert(html.includes('다른 갈래 스킬을 이어 쓰면 피해 +30%'));assert(!html.includes('<button'));assert(!html.includes('연계 불가'));assert(html.includes('data-info="elink"'));
 if(ids.includes('h_mark'))assert(html.includes('피해 +30%'));
}
assert.equal(V('hunterLoadoutHint({build:"warden",skills:[]})'),'');
console.log('사냥꾼 단일/복수 갈래 안내·비용 증감 방향·플라스크 즉시 손실·원본 불변 통과');
