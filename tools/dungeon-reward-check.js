'use strict';
process.env.DGDIR=process.env.DGDIR||'.';
const assert=require('assert/strict'),D=require('./dgqa'),E=D.G0;
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
// 과거 배율만 대조한다. 적 구성·능력치·매복·접사·특성은 현재 실전 엔진을 그대로 쓴다.
const current=E.roomXpMul;
let cases=0;
for(const build of Object.keys(E.TREE2))for(const ch of [1,2,3])for(const mode of ['normal','hard'])for(const floor of [2,8,16,22])for(const type of ['normal','ambush','strong','trial','treasure'])for(const path of ['main','quiet','rough']){
 const room={type,ch,mode,floor,path,lv:E.mlvOf(floor,ch),en:[['bruiser',1],['healer',0],['archer',0]],mods:['bell'], /* M8: 뼈 더미(bonepile)는 옛 2챕터와 함께 data/archive로 */tough:[0],ambush:type==='ambush'?1:0,strong:type==='strong'?'시험 강적':null};
 E.roomXpMul=(r,mode)=>current(r,mode)/(!r.boss&&(r.ch||1)===1&&r.type==='normal'?1.5:1);
 const before=E.roomBattle(E.mkPlayer(build,{}, {con:10,int:10}),room,null,400);
 E.roomXpMul=current;
 const after=E.roomBattle(E.mkPlayer(build,{}, {con:10,int:10}),room,null,400);
 const factor=ch===1&&type==='normal'?1.5:1;
 const omitXp=b=>JSON.stringify(b.en.map(({xpCh,...e})=>e));
 assert.equal(omitXp(after),omitXp(before),'경험치 이외 적 데이터 유지');
 for(let i=0;i<after.en.length;i++)near(E.xpOf(after.en[i]),E.xpOf(before.en[i])*factor);
 assert.equal(E.roomExpectedXp(room,mode),Math.round(after.en.filter(e=>!e.summoned).reduce((n,e)=>n+E.xpOf(e),0)));
 E.__G.run={mode};const html=E.doorCard(room,0);
 assert(html.includes('기본 경험치 '+E.roomExpectedXp(room,mode)));
 for(let i=0;i<room.en.length;i++)assert(html.includes(E.roomEnemyName(room,room.en[i],i)));
 assert.equal(html.includes('정예 '+D.run_('AMBUSH.elite')+' · 생명력'),type==='ambush'); // 0.8.0 6단계 A-6: 순찰대는 먼저 덮치지 않고 정예가 둘
 cases++;
}
E.roomXpMul=current;
assert.equal(E.xpOf({role:'minion',lv:1,summoned:true,xpCh:100}),0);
const hidden={type:'normal',ch:1,lv:1,en:[['minion',0]],hide:1,mods:[],risk:1,gold:123};
E.__G.run={mode:'normal'};const h=E.doorCard(hidden,0);
assert(h.includes('기본 경험치 11'));assert(h.includes('보상은 열어 봐야 안다'));assert(!h.includes('123')); // 0.8.0 6단계 A-2: 경험치 ×1.5(전에는 8). M8: 주석에 묻혀 있던 뒤 두 확인을 살렸다
for(const ch of [1,2,3])for(const mode of ['normal','hard'])near(E.roomXpMul({ch,mode,type:'normal',boss:1}),D.run_('chData('+ch+').xp')*(mode==='hard'?D.run_('MODES.hard.xp'):1));
assert.equal(E.roomEnemyName({swift:[0],fire:[0]},['archer',1],0),'[신속] [화염 강화] 정예 사수');
console.log(JSON.stringify({passed:true,cases,classes:Object.keys(E.TREE2).length,scope:'적 수치 유지, 방 유형·챕터·난이도별 경험치, 표시와 실제 보상, 소환 적 제외, 숨긴 보상 유지'}));
