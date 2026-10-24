'use strict';
/* 측정 기록 꼬리표 (10월 17일 측정 도구 보완, docs/검증/0.8.0-측정도구-보완-2026-10-17.md)
   판 기록마다 "어느 코드로 · 어느 조건으로 돌렸는가"를 남긴다. tools/measure-validate.js가 이 꼬리표로 실패 · 누락 · 중복 · 섞인 개정을 찾는다.
   - rev: 게임 지문(실제로 불러온 게임 글자 전체의 sha256 앞 12자) + 도구 지문(측정 도구 파일의 sha256 앞 12자). git 커밋은 참고로만(사본에는 git이 없다)
   - env: 측정 도구가 읽는 환경 변수 가운데 판의 행동을 바꾸는 것(도구 글자에서 process.env.이름을 찾아 모은다). 시험 수치 CFG도 여기 든다
   - variant: 같은 코드에서 조건을 나눠 돌릴 때의 이름(DG_VARIANT, 기본 base) · pol: 기록 기반 정책 이름(OPT.polId, 없으면 null) */
const crypto = require('crypto'), fs = require('fs'), path = require('path'), cp = require('child_process');
const h12 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const TOOL_FILES = ['dgqa.js', 'qa.js', 'skeval.js', 'measure-meta.js'];
const NOT_BEHAVIOR = new Set(['PK', 'CLS', 'SEED', 'SEEDS', 'SHARD', 'DETAIL', 'DGDIR', 'DG_LOCK', 'DG_SOON', 'DG_VARIANT', 'N', 'REPO', 'JSON_OUT', 'MET', 'SITJSON', 'MEASURE_GIT']); // 무엇을 몇 판 돌릴지 · 어디에 쓸지만 정하는 것
function behaviorEnvKeys() {
  const ks = new Set(); for (const f of TOOL_FILES) { let s = ''; try { s = fs.readFileSync(path.join(__dirname, f), 'utf8'); } catch (e) { continue; } for (const m of s.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) if (!NOT_BEHAVIOR.has(m[1])) ks.add(m[1]); }
  return [...ks].sort();
}
function gitRev(dir) {
  if (process.env.MEASURE_GIT) { const g = process.env.MEASURE_GIT; return { rev: g.replace(/\+$/, ''), dirty: /\+$/.test(g) }; } // measure-run --jobs: 사본(git 없음)에 원본의 커밋을 넘긴다
  const git = args => cp.execFileSync('git', ['-C', dir].concat(args), { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  try {
    const top = git(['rev-parse', '--show-toplevel']); if (path.resolve(top).toLowerCase() !== path.resolve(dir).toLowerCase()) return null; // 다른 저장소 안의 사본이면 그 저장소의 커밋을 쓰지 않는다
    return { rev: git(['rev-parse', '--short=10', 'HEAD']), dirty: !!git(['status', '--porcelain', '--', 'js', 'data', 'css', 'index.html']) };
  } catch (e) { return null; }
}
/* 한 번만 계산한다(도구를 불러올 때) */
/* 스위치 레지스트리(tools/variants.json, M3): 도구가 읽는 동작 환경 변수가 등록되지 않았거나, 켜진 환경 변수가 등록되지 않았으면 stderr에 경고(결과 파일은 그대로) */
function registryWarn(keys) {
  let reg; try { reg = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'variants.json'), 'utf8')).switches.map(s => s.name)); } catch (e) { console.warn('[variants] tools/variants.json을 읽지 못함: ' + e.message); return; }
  const miss = keys.filter(k => !reg.has(k)); if (miss.length) console.warn('[variants] 등록되지 않은 스위치를 도구가 읽음: ' + miss.join(', '));
  const on = keys.filter(k => process.env[k] != null && process.env[k] !== '' && !reg.has(k)); if (on.length) console.warn('[variants] 등록되지 않은 스위치가 켜져 있음: ' + on.join(', '));
}
function revision(gameDir) {
  const PS = require('./pagesrc.js');
  const game = h12(PS.pageData(gameDir) + '\n' + PS.pageScript(gameDir));
  const tool = h12(TOOL_FILES.map(f => { try { return f + '\n' + fs.readFileSync(path.join(__dirname, f), 'utf8'); } catch (e) { return f; } }).join('\n'));
  registryWarn(behaviorEnvKeys());
  const env = {}; for (const k of behaviorEnvKeys()) if (process.env[k] != null && process.env[k] !== '') env[k] = process.env[k];
  return { id: game + '.' + tool, game, tool, git: gitRev(gameDir), env };
}
/* 판 기록 한 줄의 꼬리표 */
function rowMeta(REV, o) {
  return { rev: REV.id, game: REV.game, tool: REV.tool, git: REV.git ? REV.git.rev + (REV.git.dirty ? '+' : '') : null, seed: o.seed, pk: o.pk, build: o.build, from: o.from || 1, chapters: o.chapters || 1, variant: o.variant || process.env.DG_VARIANT || 'base', pol: o.pol || null, env: REV.env };
}
/* 시드 목록식: "5000+13*i,i<10" 또는 "5000,5013,…" */
function seedList(expr) {
  const m = /^(\d+)\+(\d+)\*i,i<(\d+)$/.exec(String(expr).trim()); if (m) { const a = []; for (let i = 0; i < +m[3]; i++) a.push(+m[1] + +m[2] * i); return a; }
  return String(expr).split(',').filter(Boolean).map(Number);
}
module.exports = { revision, rowMeta, seedList, behaviorEnvKeys, h12 };
