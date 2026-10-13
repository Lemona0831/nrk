'use strict';
/* 테스트 사이트 만들기 (10월 14일). 지금 작업 트리의 게임 파일을 복사해, 실제 게임과 섞이지 않는 시험용 사이트를 만든다.
   - 브라우저 저장소 키·리모컨 채널 이름을 테스트용으로 바꾼다(같은 github.io 주소라 바꾸지 않으면 실제 세이브와 섞인다)
   - 클라우드(계정·랭킹·클라우드 저장·관리자 기록)를 끈다: config.js를 빈 설정으로 둔다
   - 테스트 메뉴(tools/testsite/devtools.js, 화면 오른쪽 가장자리 🧪)를 넣는다
   - 검색 차단(noindex)과 "테스트 서버" 띠를 넣고, 릴리스 지문을 이 사본 기준으로 다시 계산한다
   실행: node tools/build-test-site.js <출력 폴더>   (출력 폴더의 .git은 남기고 나머지는 지운 뒤 다시 만든다) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] && path.resolve(process.argv[2]);
if (!OUT) { console.error('출력 폴더를 주세요'); process.exit(1); }
if (OUT === ROOT || OUT.startsWith(ROOT + path.sep)) { console.error('출력 폴더는 저장소 밖이어야 합니다'); process.exit(1); }

const COPY = ['index.html', 'remote.html', 'privacy.html', 'css', 'js', 'data', 'audio', 'images', 'remote'];
const RENAME = [ // [원래, 테스트용] — 원래 이름이 사본에 남으면 실패
  ['nrk_062_v1', 'nrk_test_v1'],
  ['nrkLoginName', 'nrkTestLoginName'],
  ['nrkLogin', 'nrkTestLogin'],
  ['nrkSaveDevice', 'nrkTestSaveDevice'],
  ['nrkUpdateResume', 'nrkTestUpdateResume'],
  ['nrk062_hud_remote_msg', 'nrktest_hud_remote_msg'],
  ['nrk062-hud-remote', 'nrktest-hud-remote'],
  ['nrk062', 'nrktest'], // 남은 리모컨 창 이름·메시지 꼬리표(위의 구체적인 이름을 먼저 바꾼 뒤)
];

// 1. 출력 폴더 비우기(.git은 보존)
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f !== '.git') fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
// 2. 복사
for (const f of COPY) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
// 3. 이름 바꾸기 (텍스트 파일만)
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const textFiles = walk(OUT).filter(f => /\.(js|html|css)$/.test(f) && !f.includes(path.sep + '.git' + path.sep));
let renamed = 0;
for (const f of textFiles) {
  let t = fs.readFileSync(f, 'utf8'); const o = t;
  for (const [a, b] of RENAME) t = t.split(a).join(b);
  if (t !== o) { fs.writeFileSync(f, t); renamed++; }
}
const left = [];
for (const f of textFiles) { const t = fs.readFileSync(f, 'utf8'); for (const [a] of RENAME) if (t.includes(a)) left.push(path.relative(OUT, f) + ': ' + a); }
if (left.length) { console.error('원래 저장소 이름이 남았습니다:\n' + left.join('\n')); process.exit(1); }
// 4. 클라우드 끄기
fs.writeFileSync(path.join(OUT, 'config.js'), '/* 테스트 사이트: 클라우드(계정·랭킹·클라우드 저장·관리자 기록)를 쓰지 않는다 */\nwindow.NRK_CONFIG = {};\n');
// 5. 검색 차단과 테스트 표시
const BANNER = '<div id="test-banner" title="테스트 서버: 실제 게임과 기록이 분리됩니다. 계정·랭킹 꺼짐" style="position:fixed;left:0;top:0;z-index:99999;padding:1px 6px;font:bold 10px/1.4 sans-serif;color:#111;background:#f5c542;border-radius:0 0 6px 0;pointer-events:none;opacity:.9">TEST</div>'; // 아래쪽 행동 버튼을 가리지 않게 왼쪽 위 작은 표시로
for (const page of ['index.html', 'remote.html', 'privacy.html']) {
  const p = path.join(OUT, page); if (!fs.existsSync(p)) continue;
  let h = fs.readFileSync(p, 'utf8');
  h = h.replace(/(<meta charset="utf-8">\r?\n)/, '$1<meta name="robots" content="noindex,nofollow">\n');
  if (page === 'index.html') h = h.replace(/<\/body>/, BANNER + '\n</body>');
  h = h.replace(/<title>([^<]*)<\/title>/, '<title>[테스트] $1</title>');
  fs.writeFileSync(p, h);
}
// 5-1. 테스트 메뉴(tools/testsite/devtools.js)를 테스트 사이트에만 넣는다
{
  const pj = path.join(__dirname, 'testsite', 'presets.json'); fs.mkdirSync(path.join(OUT, 'test'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'test', 'presets.js'), '/* 테스트 메뉴 프리셋(실제 플레이 기록의 보스전 직전 상태, 개인 정보 없음) */\nwindow.TM_PRESETS = ' + (fs.existsSync(pj) ? fs.readFileSync(pj, 'utf8').trim() : '[]') + ';\n');
  const src = path.join(__dirname, 'testsite', 'devtools.js'); const dst = path.join(OUT, 'test', 'devtools.js');
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
  const v = crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex').slice(0, 16);
  const index = path.join(OUT, 'index.html'); let h = fs.readFileSync(index, 'utf8');
  h = h.replace('</body>', '<script src="test/presets.js"></script>\n<script src="test/devtools.js?v=' + v + '"></script>\n</body>'); fs.writeFileSync(index, h);
}
// 6. 릴리스 지문(tools/stamp-release.js와 같은 방식)을 사본 기준으로
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
{
  const index = path.join(OUT, 'index.html');
  let html = fs.readFileSync(index, 'utf8').replace(/<meta name="nrk-release" content="[a-f0-9]+">\r?\n/g, '').replace(/\?v=[a-f0-9]+/g, '');
  const assets = {};
  html = html.replace(/((?:src|href)=")((?:data|js|css|test)\/[^"?]+)(")/g, (_, a, file, z) => { const d = hash(fs.readFileSync(path.join(OUT, file))); assets[file] = d; return a + file + '?v=' + d.slice(0, 16) + z; });
  const revision = hash(html + JSON.stringify(assets));
  html = html.replace(/(<meta charset="utf-8">\r?\n)/, '$1<meta name="nrk-release" content="' + revision + '">\n');
  fs.writeFileSync(index, html); fs.writeFileSync(path.join(OUT, 'release.json'), JSON.stringify({ revision }, null, 2) + '\n');
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'README.md'), '# 나락의 유산 테스트 서버\n\n공개 전 시험용 사본입니다. 실제 게임은 https://lemona0831.github.io/nrk/ 입니다.\n이 사이트는 실제 게임과 브라우저 저장소가 분리되어 있고 계정·랭킹을 쓰지 않습니다.\n\n만드는 법: 게임 저장소에서 `node tools/build-test-site.js <이 폴더>`\n');
console.log('테스트 사이트: ' + OUT + ' · 이름 바꾼 파일 ' + renamed + '개 · 저장소 키 ' + RENAME.length + '종 분리 · 클라우드 꺼짐');
