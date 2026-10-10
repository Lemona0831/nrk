'use strict';
process.env.DGDIR = '06a2';
const assert = require('assert/strict'), fs = require('fs'), vm = require('vm');
const {execFileSync} = require('child_process');
const D = require('./dgqa.js'), E = D.G0, V = D.run_;
let count = 0;
for (const build of V('ALL_CLASS_KEYS()')) for (let lv = 1; lv <= 15; lv++) {
  const open = lv > 1 ? [E.SKILLS2[build].find(s => s.row === 1).id] : [];
  const run = {build, lv, skills: open.slice(), tree: {pts: lv - open.length, open, spent: {}}};
  for (const id of open) run.tree.spent[E.SK2[id].b] = 1;
  E.treeFix(run);
  assert.equal(run.tree.pts + run.tree.open.length, lv);
  const once = JSON.stringify(run); E.treeFix(run); assert.equal(JSON.stringify(run), once);
  assert.deepEqual(run.skills, open); count++;
}
const legacy = {build:'spellblade',lv:10,skills:['sb_bleedcut'],tree:{pts:7,open:['sb_bleedcut','sb_ember','sb_bladeward'],spent:{피칼날:1,불칼:1,주문갑:1}}};
E.treeFix(legacy);
assert.equal(legacy.tree.pts,7);
assert.equal(legacy.tree.spent.혈인,1); assert.equal(legacy.tree.spent.염검,1); assert.equal(legacy.tree.spent.마갑,1);
assert(!Object.hasOwn(legacy.tree.spent,'피칼날'));
for(let lv=1;lv<=15;lv++){const r={lv,stats:{str:15,dex:0,int:0,con:0,wil:0},statPending:4};E.statFix(r);assert.equal(r.statPending,9+lv-1);assert.equal(r.statGrowth,3);E.statFix(r);assert.equal(r.statPending,9+lv-1);assert.equal(r.stats.str,15);}
const current={lv:10,statGrowth:3,statBase:20,stats:{str:42,dex:0,int:0,con:0,wil:0}};E.statFix(current);assert.equal(current.statPending,undefined);assert.equal(V('LV_POINTS'),3);
const once=JSON.stringify(legacy); E.treeFix(legacy); assert.equal(JSON.stringify(legacy),once);
E.treeReset(legacy); assert.equal(legacy.tree.pts,10); E.treeFix(legacy); assert.equal(legacy.tree.pts,10);
function fresh(){const r={build:'assassin',lv:1,xp:0,stats:{str:0,dex:0,int:0,con:0,wil:0},p:E.mkPlayer('assassin',{}),bag:[],cons:[],swaps:[]};E.treeInit(r);E.initGear(r);return r;}
const r=fresh(); const target=V('LV_XP')[4]; E.gainXp(r,target);
assert.equal(r.lv,5);assert.equal(r.tree.pts,5);E.treeFix(r);assert.equal(r.tree.pts,5);
for (const ch of [2,3]) {const r=fresh();E.__G.data={}; E.markSetup(r,{ch,ids:[]});assert.equal(r.tree.pts,r.lv);assert.equal(r.markStat,3*(r.lv-1));E.treeFix(r);assert.equal(r.tree.pts,r.lv);}
// 이름과 표시 문장 이외의 전투 데이터를 비교합니다.
function data(old){const c={};vm.createContext(c);for(const f of ['classes.js','skills.js']){const text=old?execFileSync('git',['show','HEAD:06a2/data/'+f],{encoding:'utf8'}):fs.readFileSync('06a2/data/'+f,'utf8');vm.runInContext(text,c);}return JSON.parse(vm.runInContext('JSON.stringify({BUILDS,SKILLS2,TREE2})',c));}
function normalize(x){for(const b of Object.values(x.BUILDS)){delete b.lore;delete b.rule;delete b.intro;}for(const list of Object.values(x.SKILLS2))for(const s of list){delete s.n;if(s.start)delete s.cd;}for(const t of Object.values(x.TREE2))delete t.bd;return JSON.stringify(x).replaceAll('피칼날','혈인').replaceAll('불칼','염검').replaceAll('주문갑','마갑');}
assert.equal(normalize(data(false)),normalize(data(true)));
assert.equal(V("vfxSfxKey({k:'hit',st:'slash',build:'warden',big:true,seq:1})"),'slash');
assert.equal(V("vfxSfxKey({k:'hit',st:'arrow',build:'hunter',big:true})"),'arrow');
assert.equal(V("vfxSfxKey({k:'hit',st:'blunt',build:'spellblade',big:true})"),'slash2');
assert.equal(V("vfxSfxKey({k:'st',st:'weak'})"),null);
console.log('기존 저장본',count,'조건·능력치 추가 보충 15조건·중복 보충 방지·갈래 이전·초기화·여러 레벨업·표식 시작·스킬 전투값 유지·무기별 소리 통과');
