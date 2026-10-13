/* 판 기록 보강 점검 (10월 14일): 방 기록에 약초·빵·골드·가방·배포 식별자가 들어가고,
   챕터를 넘어가도 지난 상점 방문이 shopHist에 남는지 본다. 게임 코드를 vm에서 그대로 돌린다.
   실행: DGDIR=. node tools/log-fields-check.js   (DGDIR=06a2 로 개발본도 확인) */
const D = require('./dgqa.js');
const { G0, OPT, PERSONAS } = D;
OPT.chapters = 2; OPT.detail = false;
const pk = Object.keys(PERSONAS)[0];
let ok = 0, bad = [];
for (const [build, seed] of [['assassin', 5101], ['warden', 5102], ['hunter', 5103]]) {
  const out = D.playChar(pk, build, seed);
  const run = G0.__G.run; if (!run) { bad.push(build + ': 진행 기록 없음'); continue; }
  const rooms = (run.rooms || []).filter(r => typeof r.flIn === "number"); // 전투 방만. 제단·이벤트 방은 다른 코드가 기록을 만든다
  if (!rooms.length) { bad.push(build + ': 방 기록 없음'); continue; }
  for (const k of ['herbIn', 'breadIn', 'goldIn', 'bagIn']) if (rooms.some(r => typeof r[k] !== 'number')) bad.push(build + ': 방 기록에 ' + k + ' 없음');
  if (rooms.some(r => typeof r.rev !== 'string')) bad.push(build + ': rev 형식 오류');
  const rec = D.run_('runRecord(G.run)');
  if (!Array.isArray(rec.shopHist)) bad.push(build + ': runRecord에 shopHist 없음');
  if ((out.res === 'clear' || (run.ch || 1) >= 2) && !(rec.shopHist || []).length) bad.push(build + ': 2챕터까지 갔는데 shopHist가 비어 있음');
  ok++;
  console.log(build, '방', rooms.length, '챕터', run.ch, 'shopHist', (rec.shopHist || []).length, '첫 방', JSON.stringify({ herbIn: rooms[0].herbIn, breadIn: rooms[0].breadIn, goldIn: rooms[0].goldIn, bagIn: rooms[0].bagIn, rev: rooms[0].rev }));
}
// 챕터 전환 단위 시험: 상점을 열어 둔 채 다음 챕터로 넘어가면 지난 방문이 shopHist에 남아야 한다
{
  const out = D.playChar(pk, "warden", 5104); const run = G0.__G.run;
  D.run_("genShop(G.run)"); run.phase = "shop"; run.shop.log.push({ a: "consbuy", id: "herb", price: 12, t: 1 });
  const had = run.shop.stock.length, ch0 = run.ch || 1;
  const moved = D.run_("enterChapter(G.run)");
  const h = (G0.__G.run.shopHist || []);
  if (!moved) bad.push("챕터 전환 실패");
  else if (h.length !== 1 || h[0].ch !== ch0 || h[0].stock.length !== had || !h[0].log.some(x => x.a === "consbuy")) bad.push("shopHist 내용 불일치 " + JSON.stringify(h).slice(0, 200));
  else if (G0.__G.run.shop) bad.push("전환 뒤 현재 상점이 남아 있음");
  else console.log("shopHist 보관 확인: 챕터", h[0].ch, "진열", h[0].stock.length, "소모품 진열", h[0].cons.length);
}
if (bad.length) { console.error('실패\n' + bad.join('\n')); process.exit(1); }
console.log('통과', ok + '개 직업');
