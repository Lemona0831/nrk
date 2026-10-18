'use strict';
process.env.DGDIR = process.env.DGDIR || '.';
const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,G=E.__G;
E.render=()=>{};E.saveRunLocal=()=>{};E.saveCur=()=>{};E.saveBattle=()=>{};
G.data={seenRole:{},seenFoe:{},seenBoss:{}};E.startRun('spellblade');G.creating=false;G.sheet=null;
const run=G.run;
for(let n=0;n<1000;n++) {
 for(const f of [2,3]) {run.dg.fsq=[];run.dg.lastSquad=null;assert.notEqual(E.pickSquad(run,f).id,'wall');assert(!E.genDoors(run,f).some(r=>r.type==='strong'));}
}
assert(E.typeOk(run,'strong',4));
run.ch=2;assert(!E.typeOk(run,'strong',1));assert(E.typeOk(run,'strong',3)); // 0.8.0 6단계 A-4: 구간마다 강적 길(예외는 1챕터 1구간뿐)이라 2챕터는 2층부터
run.ch=1;run.room=2;run.cur=E.mkRoom(run,'normal',2);run.p.flask={life:0,mana:2,stam:1};
E.enterRoom();run.p.flask.mana=1;run.p.flask.stam=0;G.b.over='win';E.afterBattle();
const rec=run.rooms.at(-1);assert.equal(rec.flIn,3);assert.equal(rec.flOut,1);assert.equal(rec.flasksIn.life,0);assert.equal(rec.flasksIn.mana,2);assert.equal(rec.flasksOut.mana,1);
G.b=null;run.cur=null;assert(E.vRunMap().includes('생명력 플라스크 0/'));
E.consGrant(run,'herb','n',2);const exported=E.runRecord(run);assert.equal(exported.consGainLog.at(-1).received,2);assert(exported.cons.some(c=>c.id==='herb'));assert(Array.isArray(exported.consLog));
console.log('초반 문·방패 조합 2000회 생성, 이후 강적 유지, 플라스크 종류별 전후 기록·합계, 회복 잔량·소모품 내보내기 통과');
