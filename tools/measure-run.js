'use strict';
/* 측정 묶음 실행기 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   4단계 측정의 비공개 하네스(m4run · prun · mkjobs · mkslim · merge)에서 되풀이 쓰는 부분을 옮겼다.
   - 돌리기 전에 기대 판 목록(<out>.manifest.json: 변형 · 시작 챕터 · 챕터 수 · 환경 변수 · 직업 × 성향 × 시드)을 먼저 쓴다. 중간에 멈춰도 빠진 판이 드러난다
   - 판마다 한 줄(JSONL)을 바로 쓴다. 줄에는 dgqa의 꼬리표(meta: 게임 · 도구 지문, 시드, 성향, 직업, 시작 챕터, 변형, 정책 이름, 환경 변수)와 실패 칸(fails)이 든다
   - 판 밖 예외는 그 판을 실패 줄(res 'crash')로 남기고 다음 판을 돈다
   - --jobs N: 조각마다 가벼운 사본(data · js · css · tools · index.html)을 임시 폴더에 만들어 동시에 돈다(tools/eng.gen.js를 겹쳐 쓰지 않게). 합칠 때 기대 목록 순서로 쓴다
   - 끝에 tools/measure-validate.js로 점검하고, 문제가 있으면 끝 코드 1
   사용: node tools/measure-run.js --out <x.jsonl> --cls a,b --pk careful,expert --seeds "5000+13*i,i<10" [--chapters 1] [--from 1] [--variant base] [--pol 정책.js] [--jobs 1] [--detail 1]
     --pol: module.exports = (D, G0) => ({ chooseAction, battleStart, … }) (dgqa OPT.policy 훅). 이름이 꼬리표 pol에 남는다
     FOCUS · CFG · DG_JUMP 같은 환경 변수는 그대로 넘어가고 꼬리표 env에 남는다
   M3 측정 프로토콜(10월 19일): 시드를 안 주면 120판(5000+13*i). 끝에 성향 · 지표마다 Wilson 95%를 낸다.
     --ab <기준.jsonl>: 같은 (성향 · 직업 · 시드) 짝으로 비교하고, 성향 둘 이상이 같은 방향으로 유의할 때만 "게임 원인"이라 적는다(tools/measure-stats.js).
     manifest에 data/*.js 파일 해시와 게임 커밋(git)을 남긴다. 스위치 레지스트리는 tools/variants.json */
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const MM = require('./measure-meta.js');
const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; }; const flag = k => argv.includes(k);
const O = { out: arg('--out'), cls: (arg('--cls', '') || '').split(',').filter(Boolean), pk: (arg('--pk', 'careful') || '').split(',').filter(Boolean), seeds: MM.seedList(arg('--seeds', '5000+13*i,i<120')), ab: arg('--ab', null),
  chapters: +arg('--chapters', 1), from: +arg('--from', process.env.DG_FROM || 1), variant: arg('--variant', process.env.DG_VARIANT || 'base'), pol: arg('--pol', null), jobs: +arg('--jobs', 1), detail: arg('--detail', '1') !== '0' };
if (O.pol) O.pol = path.resolve(O.pol);
process.env.DG_VARIANT = O.variant; if (O.from > 1) process.env.DG_FROM = String(O.from);

/* 한 프로세스에서 일 목록을 돈다 */
function runJobs(jobs, outFile) {
  process.env.DGDIR = process.env.DGDIR || '.';
  const D = require('./dgqa.js'); D.OPT.chapters = O.chapters; D.OPT.detail = O.detail; D.OPT.variant = O.variant;
  if (O.pol) { D.OPT.policy = require(O.pol)(D, D.G0); D.OPT.polId = path.basename(O.pol); }
  const fd = fs.openSync(outFile, 'w');
  for (const j of jobs) {
    const t0 = Date.now(); let row; try { row = D.playChar(j.pk, j.build, j.seed); } catch (e) { row = D.crashRow(j, e); }
    delete row.snap; row.ms = Date.now() - t0; fs.writeSync(fd, JSON.stringify(row) + '\n');
  }
  fs.closeSync(fd);
}
if (flag('--child')) { runJobs(JSON.parse(fs.readFileSync(arg('--jobfile'), 'utf8')), O.out); process.exit(0); }

if (!O.out || !O.cls.length) { console.error('사용: node tools/measure-run.js --out <x.jsonl> --cls a,b --pk careful,expert --seeds "5000+13*i,i<10" [--chapters 1] [--from 1] [--variant base] [--pol 정책.js] [--jobs 1]'); process.exit(2); }
const jobs = []; for (const pk of O.pk) for (const build of O.cls) for (const seed of O.seeds) jobs.push({ pk, build, seed });
const REV = MM.revision(ROOT);
const dataHash = {}; for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.js')).sort()) dataHash[f] = MM.h12(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const manifest = { tool: 'measure-run', rev: REV.id, git: REV.git, gameCommit: REV.git ? REV.git.rev + (REV.git.dirty ? '+' : '') : null, data: dataHash, variant: O.variant, from: O.from, chapters: O.chapters, env: REV.env, pol: O.pol ? path.basename(O.pol) : null, groups: [] };
{ const g = {}; for (const j of jobs) { const k = j.pk + '|' + j.build; (g[k] = g[k] || { pk: j.pk, build: j.build, seeds: [] }).seeds.push(j.seed); } manifest.groups = Object.values(g); }
fs.mkdirSync(path.dirname(path.resolve(O.out)), { recursive: true });
fs.writeFileSync(O.out + '.manifest.json', JSON.stringify(manifest));
const t0 = Date.now();
const finish = () => {
  const V = require('./measure-validate.js'); const rep = V.validate([{ file: O.out }]);
  console.log(`판 ${jobs.length} · ${((Date.now() - t0) / 1000).toFixed(0)}초 → ${O.out}`); console.log(V.summaryText(rep));
  try { const ST = require('./measure-stats.js'); const rows = ST.load(O.out); console.log('\n# Wilson 95%\n' + ST.table(rows)); if (O.ab) console.log('\n# 같은 시드 A/B (A = ' + O.ab + ')\n' + ST.ab(ST.load(O.ab), rows)); } catch (e) { console.log('통계 출력 실패: ' + e.message); }
  process.exit(rep.problems ? 1 : 0);
};
if (O.jobs <= 1) { runJobs(jobs, O.out); finish(); }
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mrun-')); const J = Math.min(O.jobs, jobs.length); const per = Math.ceil(jobs.length / J); const parts = [];
  for (let k = 0; k < J; k++) {
    const dir = path.join(tmp, String(k)); fs.mkdirSync(dir);
    for (const x of ['data', 'js', 'css', 'tools', 'index.html']) if (fs.existsSync(path.join(ROOT, x))) fs.cpSync(path.join(ROOT, x), path.join(dir, x), { recursive: true });
    const mine = jobs.slice(k * per, (k + 1) * per); if (!mine.length) continue; fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(mine));
    parts.push(new Promise(res => { const args = [path.join(dir, 'tools', 'measure-run.js'), '--child', '--jobfile', path.join(dir, 'jobs.json'), '--out', path.join(dir, 'part.jsonl'), '--chapters', String(O.chapters), '--from', String(O.from), '--variant', O.variant, '--detail', O.detail ? '1' : '0'].concat(O.pol ? ['--pol', O.pol] : []);
      const c = cp.spawn(process.execPath, args, { cwd: dir, env: Object.assign({}, process.env, { DGDIR: '.' }, REV.git ? { MEASURE_GIT: REV.git.rev + (REV.git.dirty ? '+' : '') } : {}), stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; c.stderr.on('data', d => err += d);
      c.on('close', code => { if (code) console.error(`조각 ${k} 끝 코드 ${code}: ${err.slice(-300)}`); res(path.join(dir, 'part.jsonl')); }); }));
  }
  Promise.all(parts).then(files => {
    const byKey = new Map(); for (const f of files) { if (!fs.existsSync(f)) continue; for (const ln of fs.readFileSync(f, 'utf8').split('\n')) { if (!ln.trim()) continue; const r = JSON.parse(ln); const k = r.pk + '|' + r.build + '|' + r.seed; if (byKey.has(k)) byKey.get(k).push(ln); else byKey.set(k, [ln]); } }
    const out = []; for (const j of jobs) for (const ln of byKey.get(j.pk + '|' + j.build + '|' + j.seed) || []) out.push(ln);
    fs.writeFileSync(O.out, out.join('\n') + (out.length ? '\n' : '')); fs.rmSync(tmp, { recursive: true, force: true }); finish();
  });
}
