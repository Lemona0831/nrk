'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert = require('assert/strict'), D = require('./dgqa.js'), E = D.G0, V = D.run_;
// 10월 16일 0.8.0 2단계: 시작 20점 · 능력치 보충(statFix)은 패시브 트리(시작 6 + 레벨마다 2, 불러올 때 다시 맞춤)로 바뀌었다
assert.equal(V('PT.pts.start'), 6); assert.equal(V('PT.pts.lv'), 2);
for (const lv of [1,5,10,15]) { E.__G.data = E.blankData(); E.__G.cre = { name: 'c' }; E.startRun('monk'); const r = E.__G.run; delete r.alloc; r.lv = lv; E.ptFix(r); assert.equal(r.ptree.pts, 6 + 2 * (lv - 1)); const once = JSON.stringify(r.ptree); E.ptFix(r); assert.equal(JSON.stringify(r.ptree), once); assert.equal(Object.values(r.stats).reduce((x, v) => x + v, 0), 12); }
function battle(){const p=E.mkPlayer('butcher',{});p.hpMax=100;p.hp=40;const e=E.mkEnemy('bruiser',false,0);e.hp=e.hpMax=100;const b=E.newBattle(p,[e],{test:1});b.cur={id:'b_hook'};b.turnIdx=1;b.rngF=()=>0.99;return b;}
let b=battle();assert.equal(E.bHeal(b,20,'eat'),20);assert.equal(b.p.hp,60); // 전투 시작 생명력보다 회복
assert.equal(E.bHeal(b,100,'eat'),20);assert.equal(E.bHeal(b,1,'eat'),0); // 전투당 40%
b=battle();E.addS(b,b.en[0],'bleed',3);E.hurtEnemy(b,b.en[0],20,{melee:1,single:1});assert(Math.abs(b.p.hp-42.4)<1e-6);
b=battle();E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert(Math.abs(b.p.hp-42.4)<1e-6); // 처음 거는 타격부터
b=battle();b.en[0].hp=2;E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert(Math.abs(b.p.hp-43.24)<1e-6);assert.equal(b.over,'win'); // 초과 피해는 흡혈에 넣지 않음, 마지막 적 수확
b=battle();b.en[0].hp=1;E.addS(b,b.en[0],'bleed',1);E.kwBleed(b,b.en[0]);assert.equal(b.p.hp,43); // 출혈 1이 사라진 뒤 처치도 회복
b=battle();b.en[0].evading=1;E.hurtEnemy(b,b.en[0],20,{melee:1,single:1,leechBleed:3});assert(Math.abs(b.p.hp-41.2)<1e-6); // 0.8.0 6단계 A-7: 몸 낮춘 적은 피해 절반(전에는 빗나감) → 흡혈도 절반 몫
b=battle();b.stepMode=true;b.en[0].hp=2;E.playerAct(b,'b_hook',b.en[0].id);assert.equal(b.over,'win');assert(Math.abs(b.p.hp-43.24)<1e-6); // 0.8.0: 쿨타임 대신 유산 비용(p.cd는 전투마다 1번 스킬 표시에만) — 쿨타임 확인은 뺐다
b=battle();b.over='win';assert.equal(E.bHeal(b,12,'eat'),12);b.over='lose';assert.equal(E.bHeal(b,12,'eat'),0);
b=battle();E.buHarvest(b,b.en[0]);E.buHarvest(b,b.en[0]);assert.equal(b.p.hp,43);
for(let i=0;i<6;i++)E.buHarvest(b,{role:'melee',alive:true});assert.equal(b.harvestGot,12);assert.equal(b.p.hp,52);
b=battle();for(const role of ['root','candle','bonewall','crown'])E.buHarvest(b,{role});E.buHarvest(b,{role:'melee',summoned:1});assert.equal(b.p.hp,40);
b=battle();E.bHeal(b,100,'leech');assert.equal(b.p.hp,48);E.bHeal(b,100,'leech');assert.equal(b.p.hp,48);b.turnIdx++;E.bHeal(b,100,'leech');assert.equal(b.p.hp,56);
for(const build of V('ALL_CLASS_KEYS()')) {const h=V(`classRuleHtml(${JSON.stringify(build)})`);assert(h.includes('rule-details'));assert(h.includes('자세한 조건과 예외'));}
assert(V("classRuleHtml('elementalist')").includes('상한 16'));
assert(V("classRuleHtml('elementalist')").includes('빙결 · 영겁의 정적으로 행동을 놓친 적은 그다음 라운드가 끝날 때까지 다시 얼거나 멈추지 않고 둔화만 남습니다') && V('typeof elFrzLk')==='function'); // 10월 24일 S-5: 직업 카드도 다시 얼림 막기(js/10 elFrzLk)를 적는다
const sb=E.newBattle(E.mkPlayer('elementalist',{}),[E.mkEnemy('bruiser',false,0)],{test:1});sb.actN=1;sb.en[0].hp=sb.en[0].hpMax=1000;E.addS(sb,sb.en[0],'ignite',10);E.addS(sb,sb.en[0],'chill',10);E.elemShock(sb,'me');assert.equal(sb.rec.find(x=>x.k==='shock').T,16);assert.equal(sb.rec.find(x=>x.k==='shock').dmg,48);assert.equal(sb.rec.find(x=>x.k==='shock').brk,36);
b=battle();b.stepMode=true;b.p.eq.flask='hungerflask';E.playerAct(b,'flaskL');assert.equal(b.p.hp,73);assert(Math.abs(E.bHeal(b,2,'leech')-2.2)<1e-6);
// 쿨타임 표(SK2[id].cd) 확인은 뺐다: 0.8.0 M5-0(10월 19일)부터 비용은 트리 노드 ys만 읽고 cd는 쓰지 않는다(data/skillkit.js skCost)
console.log('패시브 포인트 시작 6 · 레벨마다 2 · 다시 맞춤 중복 방지·흡혈/먹기/피 수확·처치/출혈 마지막 적·빗나감/소환물 제외·상한·열충격 공식 통과');
