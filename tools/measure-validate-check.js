'use strict';
/* measure-validate.js 자체 점검 (10월 17일 측정 도구 보완): 일부러 망가뜨린 묶음마다 해당 검사가 잡는지, 멀쩡한 묶음은 통과하는지.
   게임을 돌리지 않는다(만든 기록 줄만). 실행: node tools/measure-validate-check.js */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const V = require('./measure-validate.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; console.log('  ok ' + m); };
const meta = (seed, o) => Object.assign({ rev: 'g1.t1', game: 'g1', tool: 't1', git: null, seed, pk: 'careful', build: 'spellblade', from: 1, chapters: 1, variant: 'base', pol: null, env: {} }, o || {});
const row = (seed, o, m) => Object.assign({ pk: 'careful', build: 'spellblade', seed, res: 'lose', floor: 7, lv: 4, ch: 1, acts: 120, steps: 30, bugs: [], rooms: [], fights: [{ res: 'win', hpIn: 100, hpOut: 80, rounds: 4, acts: 6 }, { res: 'lose', hpIn: 80, hpOut: 0, rounds: 6, acts: 9 }], meta: meta(seed, m) }, o || {});
const seeds = [5000, 5013, 5026, 5039];
const man = { tool: 'expect', variant: 'base', from: 1, chapters: 1, groups: [{ pk: 'careful', build: 'spellblade', seeds }] };
const run = (rows, mans) => V.validate([{ file: 'x.json', rows }], { manifests: mans || [man] });
{ const R = run(seeds.map(s => row(s))); ok(R.problems === 0, '멀쩡한 묶음은 통과'); }
{ const R = run(seeds.slice(0, 3).map(s => row(s))); ok(R.missing.length === 1 && /5039/.test(R.missing[0]), '빠진 시드를 잡음: ' + R.missing[0]); }
{ const R = run(seeds.map(s => row(s)).concat([row(5000)])); ok(R.dup.length === 1 && /내용 같음/.test(R.dup[0]), '중복(같은 내용)을 잡음'); }
{ const R = run(seeds.map(s => row(s)).concat([row(5000, { lv: 5 })])); ok(R.dup.length === 1 && /내용 다름/.test(R.dup[0]), '중복(다른 내용)을 잡음'); }
{ const R = run(seeds.map(s => row(s)).concat([row(9999)])); ok(R.extra.length === 1, '기대 밖 판을 잡음'); }
{ const R = run(seeds.map((s, i) => row(s, null, i ? {} : { rev: 'g2.t1', game: 'g2' }))); ok(R.mixed.some(x => /지문이 2가지/.test(x)), '섞인 개정(게임 지문 둘)을 잡음'); }
{ const R = run(seeds.map((s, i) => row(s, null, i ? {} : { env: { CFG: 'X=1' } }))); ok(R.mixed.some(x => /환경 변수 2가지/.test(x)), '같은 변형 안의 다른 조건(환경 변수)을 잡음'); }
{ const R = run(seeds.map((s, i) => row(s, i === 0 ? { fails: [{ k: 'actcap', room: 5, t: 'ambush', ch: 1 }], bugs: ['300행동 안에 끝나지 않음 5'] } : i === 1 ? { fails: [{ k: 'exception', msg: 'x is undefined', room: 3 }] } : i === 2 ? { res: 'crash', fails: [{ k: 'crash', msg: 'boom' }] } : {})));
  const ks = R.fails.map(f => f.k).sort().join(','); ok(ks === 'actcap,crash,exception', '실패 · 중단(행동 한도 · 예외 · 판 밖 예외)을 잡음: ' + ks); }
{ const R = run(seeds.map((s, i) => row(s, i ? {} : { fails: undefined, bugs: ['300행동 안에 끝나지 않음 9'] }))); ok(R.fails.length === 1 && R.fails[0].k === 'actcap', '꼬리표 전 기록(글로만 남은 300행동)도 잡음'); }
{ const R = run(seeds.map((s, i) => row(s, i ? {} : { fails: [{ k: 'stepcap', room: 12 }] }))); ok(R.fails.length === 1 && R.fails[0].k === 'stepcap', '걸음 한도(끝나지 않은 판)를 잡음'); }
{ const R = run([row(5000, { lv: 0 }), row(5013, { fights: [{ res: 'win', hpIn: 100, hpOut: 120 }] }), row(5026, { fights: [{ res: 'lose', hpIn: 50, hpOut: 0 }, { res: 'win', hpIn: 0, hpOut: 10 }] }), row(5039, { res: 'clear', ch: 1, fights: [{ res: 'lose', hpIn: 10, hpOut: 0 }] })]);
  ok(R.impossible.length >= 4, '불가능한 값(레벨 0 · 생명력 120 · 진 전투 뒤 전투 · 완주인데 짐)을 잡음: ' + R.impossible.length + '건'); }
{ const R = run(seeds.map((s, i) => { const r = row(s); if (!i) delete r.meta; return r; })); ok(R.noMeta.length === 1, '꼬리표 없는 줄을 잡음'); }
{ const R = run([row(5000, null, { seed: 5013 })].concat(seeds.slice(1).map(s => row(s))), [man]); ok(R.impossible.some(x => /꼬리표 seed/.test(x)), '꼬리표와 줄의 시드가 다르면 잡음'); }
{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-')); try {
    const a = path.join(d, 'a.jsonl'), b = path.join(d, 'b.jsonl'), c = path.join(d, 'c.jsonl');
    fs.writeFileSync(a, seeds.map(s => JSON.stringify(Object.assign(row(s), { ms: 5 }))).join('\n') + '\n');
    fs.writeFileSync(b, seeds.slice().reverse().map(s => JSON.stringify(Object.assign(row(s), { ms: 9 }))).join('\n') + '\n');
    fs.writeFileSync(c, seeds.map(s => JSON.stringify(row(s, s === 5013 ? { floor: 8 } : {}))).join('\n') + '\n{bad\n');
    const S1 = V.same([a], [b]); ok(S1.n === 4 && S1.same === 4, '같은 시드 두 번: 걸린 시간(ms)만 다르면 같다고 봄');
    const S2 = V.same([a], [c]); ok(S2.same === 3 && S2.diff.length === 1, '같은 시드 두 번: 한 판이 다르면 잡음');
    fs.writeFileSync(a + '.manifest.json', JSON.stringify(Object.assign({}, man, { groups: [{ pk: 'careful', build: 'spellblade', seeds: seeds.concat([5052]) }] })));
    const R = V.validate([{ file: a }]); ok(R.missing.length === 1 && /5052/.test(R.missing[0]), '결과 옆 manifest를 저절로 읽어 빠진 판을 잡음');
    const R2 = V.validate([{ file: c }], { manifests: [man] }); ok(R2.bad.length === 1, 'JSONL의 깨진 줄을 잡음');
  } finally { fs.rmSync(d, { recursive: true, force: true }); } }
{ const E = V.parseExpect('pk=careful,expert;build=a,b;seeds=5000+13*i,i<3;variant=v1;from=3;chapters=3'); ok(E.groups.length === 4 && E.groups[0].seeds.join() === '5000,5013,5026' && E.from === 3 && E.variant === 'v1', '--expect 식 읽기'); }
console.log(`measure-validate 점검: ${n}개 통과`);
