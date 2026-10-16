'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), fs = require('fs'), vm = require('vm');
const {execFileSync} = require('child_process');
const D = require('./dgqa.js'), E = D.G0, V = D.run_;
let count = 0;
// 10월 16일 0.8.0 2단계: 옛 트리 고치기(treeFix) · 능력치 보충(statFix)은 두 트리의 포인트 다시 맞추기(ptFix)와 옛 세이브 옮기기(treeMigrate08)로 바뀌었다
function fresh(build){E.__G.data=E.blankData();E.__G.cre={name:'g'};E.startRun(build||'assassin');const r=E.__G.run;delete r.alloc;E.__G.sheet=null;E.__G.creating=false;return r;}
for (const build of V('ALL_CLASS_KEYS()')) for (let lv = 1; lv <= 15; lv++) {
  const r = fresh(build); const open = lv > 1 ? [E.SKILLS2[build].find(s => s.row === 1).id] : [];
  r.lv = lv; r.atree.own = open.slice(); r.skills = open.slice(); E.ptFix(r);
  assert.equal(r.atree.pts + r.atree.own.length, lv); assert.equal(r.ptree.pts, 6 + 2 * (lv - 1));
  const once = JSON.stringify([r.atree, r.ptree]); E.ptFix(r); assert.equal(JSON.stringify([r.atree, r.ptree]), once);
  assert.equal(JSON.stringify(r.skills), JSON.stringify(open)); count++;
}
{ const r = fresh('spellblade'); r.lv = 3; r.atree.own = ['sb_bleedcut', 'sb_boil', 'sb_ember', 'sb_kindle', 'sb_bladeward']; r.skills = ['sb_boil']; E.ptFix(r); assert.equal(r.atree.own.length, 3); assert.equal(r.atree.pts, 0); assert(!r.atree.own.includes('sb_boil') || r.atree.own.includes('sb_bleedcut')); } // 넘친 포인트는 가장 바깥의 끝 노드부터 거둔다
const legacy = {build:'spellblade',lv:10,xp:1350,ch:2,clears:1,skills:['sb_bleedcut'],stats:{str:20,dex:0,int:20,con:7,wil:0},statPending:3,tree:{pts:7,open:['sb_bleedcut','sb_ember','sb_bladeward'],spent:{피칼날:1,불칼:1,주문갑:1}},awk:['a_eye']};
assert(E.treeMigrate08(legacy)); assert.equal(legacy.atree.pts,10); assert.equal(legacy.ptree.pts,24); assert.equal(legacy.treeOld.open.length,3); assert.equal(legacy.statPending,undefined); assert.equal(legacy.ksPending,1);
const once=JSON.stringify(legacy); legacy.tv=2; assert(!E.treeMigrate08(legacy)); delete legacy.tv; assert.equal(JSON.stringify(legacy),once);
{ const r = fresh('spellblade'); r.lv = 10; E.ptFix(r); E.atBuy(r,'sb_ember'); E.atBuy(r,'sb_kindle'); E.atReset(r); assert.equal(r.atree.pts,10); E.ptFix(r); assert.equal(r.atree.pts,10); }
{ const r=fresh(); const target=V('LV_XP')[4]; E.gainXp(r,target); assert.equal(r.lv,5);assert.equal(r.atree.pts,5);assert.equal(r.ptree.pts,14);E.ptFix(r);assert.equal(r.atree.pts,5);assert.equal(r.ptree.pts,14); }
for (const ch of [2,3]) {const r=fresh();E.__G.data={}; E.markSetup(r,{ch,ids:[]});assert.equal(r.atree.pts,r.lv);assert.equal(r.ptree.pts,6+2*(r.lv-1));assert.equal(r.ksPending,ch-1);E.ptFix(r);assert.equal(r.atree.pts,r.lv);}
// 이름과 표시 문장 이외의 전투 데이터를 비교합니다.
function data(old){const c={};vm.createContext(c);for(const f of ['classes.js','skills.js']){const text=old?execFileSync('git',['show','HEAD:data/'+f],{encoding:'utf8'}):fs.readFileSync('data/'+f,'utf8');vm.runInContext(text,c);}return JSON.parse(vm.runInContext('JSON.stringify({BUILDS,SKILLS2,TREE2})',c));}
function normalize(x){for(const b of Object.values(x.BUILDS)){delete b.lore;delete b.rule;delete b.intro;}for(const list of Object.values(x.SKILLS2))for(const s of list){delete s.n;if(s.start)delete s.cd;}for(const t of Object.values(x.TREE2))delete t.bd;return JSON.stringify(x).replaceAll('피칼날','혈인').replaceAll('불칼','염검').replaceAll('주문갑','마갑');}
assert.equal(normalize(data(false)),normalize(data(true)));
assert.equal(V("vfxSfxKey({k:'hit',st:'slash',build:'warden',big:true,seq:1})"),'slash');
assert.equal(V("vfxSfxKey({k:'hit',st:'arrow',build:'hunter',big:true})"),'arrow');
assert.equal(V("vfxSfxKey({k:'hit',st:'blunt',build:'spellblade',big:true})"),'slash2');
assert.equal(V("vfxSfxKey({k:'st',st:'weak'})"),null);
console.log('두 트리 포인트',count,'조건·넘친 포인트 거두기·옛 세이브 옮기기·중복 방지·액티브 되돌리기·여러 레벨업·표식 시작·스킬 전투값 유지·무기별 소리 통과');
