// helpcheck 모듈: 던전 · 이벤트 · 제단 · 성소 · 방 특성 · 길 · 표식 · 모드 · 적 소개 문장의 숫자를 코드와 대조한다 (10월 10일, 0.6a.2-95).
// 출처 이름은 world- 로 시작한다. 문장 앞의 [id] 꼬리표는 같은 문장이 여럿일 때 항목을 가르려고 붙인 것이다(화면에는 없다).
// 대조 방식: 처리 코드(06a2/js)에서 숫자를 정규식으로 읽거나 게임 상수를 계산해, 문장 속 숫자와 같은지 본다. 문장의 숫자를 베껴 쓰지 않는다.
const fs = require('fs'), path = require('path');
module.exports = function (api) {
  const E = api.E;
  const J = f => fs.readFileSync(path.join(api.ROOT, '06a2/js', f), 'utf8');
  const S80 = J('80-events.js'), S66 = J('66-dungeon-flow.js'), S24 = J('24-clock-damage.js'), S20 = J('20-battle-state.js'), S32 = J('32-player-action.js'),
    S34 = J('34-rounds-setup.js'), S14 = J('14-chapter-bodies.js'), S30 = J('30-enemy-ai.js'), S42 = J('42-chrome-map.js'), S22 = J('22-class-tree-rules.js');
  const L80 = S80.split('\n');
  const SPLIT = /(?<=[.?!])\s+(?=\S)/;
  const pref = (id, text) => String(text).split(SPLIT).filter(Boolean).map(s => '[' + id + '] ' + s).join(' ');
  const strip = h => String(h).replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  const mx = (s, re) => { const m = s.match(re); if (!m) throw new Error('코드에서 못 찾음: ' + re); return m; };
  const nx = (s, re) => +mx(s, re)[1];
  const pct = f => Math.round(Math.abs(f - 1) * 100);          // 배율 → 늘거나 준 퍼센트
  const rooms = buff => buff - 1;                                // run.buffs 값 → 이어지는 방 수 (advanceFloor가 방을 넘길 때마다 1씩 줄이고, 고른 방에서 한 번 줄어든 채 시작한다)
  const igSnuff0 = /hasBt\(u, 'snuff'\)\) x = isCf\(u\) \?.*?\) : 0; if \(\(b\.ctx\.ch/.test(S20); // 꺼진 촛불: 내게 오는 화상 피해 0 (숨겨진 직업의 고행 몫만 예외)
  const durOk =/for \(const k in run\.buffs\) \{ run\.buffs\[k\]--; if \(run\.buffs\[k\] <= 0\) delete run\.buffs\[k\]; \}/.test(S66);

  // ===== 이벤트 =====
  const EV = E('EVENTS.map(e => ({ id: e.id, n: e.n, lore: e.lore, opts: e.opts.map(o => ({ id: o.id, n: o.n, d: o.d })) }))');
  api.source('world-events', EV.flatMap(e => e.opts.filter(o => o.d).map(o => ({ id: e.id + '.' + o.id, text: pref(e.id + '.' + o.id, o.d) }))));
  const optText = (id, o) => E('EVENTS.find(e => e.id === "' + id + '").opts.find(x => x.id === "' + o + '").d');
  const H = (id, o) => L80.filter(l => l.includes("R.event === '" + id + "' && o === '" + o + "'")).join('\n');
  const sentFind = (tag, text, loc) => { const s = String(text).split(SPLIT).find(x => x.includes(loc)); if (!s) throw new Error('문장 없음: ' + tag + ' ' + loc); return '[' + tag + '] ' + s; }; // 꼬리표가 문장 맨 앞에 붙으므로 찾을글은 그 문장 통째로 쓴다
  const ev = (id, o, loc, fn) => api.add('world-events', sentFind(id + '.' + o, optText(id, o), loc), '80-events.js ' + id + '.' + o, () => { const h = H(id, o); return !!h && fn(optText(id, o), h); });
  const gold = h => nx(h, /gainGold\(run, (\d+),/);
  const heal1 = (h, k) => nx(h, new RegExp('p\\.flask\\.' + k + ' \\+ (\\d+)'));
  const KWN = k => E('KW_N.' + k);
  const pre = (h, k) => nx(h, new RegExp(k + ': (\\d+)'));

  ev('confess', 'do', '대신 약화', (t, h) => t.includes('약화 ' + pre(h, 'weak') + ' · 취약 ' + pre(h, 'vuln') + '을'));
  ev('pilgrim', 'loot', '대신 다음 전투를', (t, h) => t.includes(KWN('poison') + ' ' + pre(h, 'poison') + '으로'));
  ev('pilgrim', 'pray', '생명력 플라스크', (t, h) => t.includes('플라스크 +' + heal1(h, 'life') + '.'));
  ev('reliquary', 'force', '스태미나', (t, h) => { const g = mx(h, /dropKey\(run, '(\w)'\)/)[1]; return t.includes('스태미나 ' + nx(h, /p\.st - (\d+)/) + '을 쓰고 골드 ' + gold(h) + ' 또는 ' + E('GRADE.' + g + '.n') + ' 장비') && nx(S42, /id === 'force' && run\.p\.st < (\d+)/) === nx(h, /p\.st - (\d+)/); });
  ev('chalice', 'drink', '최대 생명력', (t, h) => t.includes('최대 생명력 +' + nx(h, /p\.hpBonus \|\| 0\) \+ (\d+)/) + '(영구)'));
  ev('chalice', 'drink', '지금 생명력', (t, h) => t.includes('지금 생명력은 ' + pct(1 - nx(h, /p\.hpMax \* ([\d.]+)/)) + '% 줄어'));
  ev('chalice', 'spill', '정화 플라스크', (t, h) => /mana: '정화 플라스크'/.test(S24) && t.includes('정화 플라스크 +' + heal1(h, 'mana') + '.'));
  ev('candle', 'snuff', '받는 화상 피해가', (t, h) => durOk && t.includes('다음 ' + rooms(nx(h, /run\.buffs\.snuff = (\d+)/)) + '개 방 동안 받는 화상 피해가 ' + (igSnuff0 ? 0 : -1) + '이'));
  ev('candle', 'snuff', '대신 주는 피해', (t, h) => t.includes('주는 피해 −' + pct(nx(S32, /hasBt\(p, 'snuff'\)\) d \*= ([\d.]+)/)) + '%'));
  ev('library', 'read', '능력치', (t, h) => t.includes('능력치 ' + nx(h, /openSheet\('stats', \{ pts: (\d+)/) + '점'));
  ev('library', 'sell', '골드', (t, h) => t.includes('골드 ' + gold(h) + '.'));
  ev('monk', 'chase', '이기면 골드', (t, h) => /run\.next\.chase = 1/.test(h) && t.includes('이기면 골드 ' + nx(S66, /nu\.chase \? (\d+)/)));
  ev('bell', 'pull', '골드', (t, h) => /run\.dg\.force = 'strong'/.test(h) && t.includes('골드 ' + gold(h) + '.'));
  ev('tomb', 'carve', '최대 생명력', (t, h) => t.includes('최대 생명력 +' + nx(h, /p\.hpBonus \|\| 0\) \+ (\d+)/) + '(영구)'));
  ev('tomb', 'carve', '다음 전투를 약화', (t, h) => t.includes('약화 ' + pre(h, 'weak') + ' · 취약 ' + pre(h, 'vuln') + '를'));
  ev('procession', 'follow', '다음', (t, h) => { const b = nx(h, /run\.buffs\.procession = (\d+)/); return durOk && t.includes('다음 ' + rooms(b) + '개 방 동안 받는 직접 피해 −' + pct(nx(S24, /hasBt\(p, 'procession'\) && !o\.dot\) d \*= ([\d.]+)/)) + '%, 주는 피해 −' + pct(nx(S32, /hasBt\(p, 'procession'\)\) d \*= ([\d.]+)/)) + '%'); });
  ev('procession', 'block', '이기면 골드', (t, h) => t.includes('이기면 골드 ' + nx(S66, /nu\.block \? (\d+)/)));
  ev('robber', 'loot', '골드', (t, h) => nx(h, /Math\.random\(\) < ([\d.]+)/) === 0.5 && t.includes('골드 ' + gold(h) + ' 또는 장비'));
  ev('robber', 'loot', '다음 전투를', (t, h) => t.includes(KWN('poison') + ' ' + nx(h, /\.poison \|\| 0\) \+ (\d+)/) + '으로'));
  ev('robber', 'bury', '생명력 플라스크', (t, h) => t.includes('플라스크 +' + heal1(h, 'life') + '.'));
  ev('blackwell', 'drink', '플라스크 각', (t, h) => t.includes('정화 · 스태미나 플라스크 각 +' + heal1(h, 'mana') + '.') && heal1(h, 'mana') === nx(h, /\(p\.flask\.stam \|\| 0\) \+ (\d+)/));
  ev('blackwell', 'drink', '다음 전투를', (t, h) => t.includes(KWN('vuln') + ' ' + pre(h, 'vuln') + '를'));
  ev('bonepipe', 'blow', '골드', (t, h) => /run\.dg\.force = 'strong'/.test(h) && t.includes('골드 ' + gold(h) + '.'));
  ev('camel', 'loot', '다음 전투를', (t, h) => { const m = mx(h, /n3pre\(run, '(\w+)', (\d+)\)/); return t.includes(KWN(m[1]) + ' ' + m[2] + '로'); });
  ev('oasis', 'drink', '반반 확률로', (t, h) => { const m = mx(h, /n3pre\(run, '(\w+)', (\d+)\)/); return nx(h, /Math\.random\(\) < ([\d.]+)/) === 0.5 && t.includes('생명력 ' + pct(1 + nx(h, /p\.hpMax \* ([\d.]+)/)) + '%') && t.includes(KWN(m[1]) + ' ' + m[2] + '로'); });
  ev('sundial', 'turn', '열기', (t, h) => t.includes('열기 ' + nx(h, /noon: (\d+)/) + '에서') && /room\.heat0 = n3\.noon/.test(S66));
  ev('sundial', 'hasten', '골드', (t, h) => /run\.dg\.force = 'strong'/.test(h) && t.includes('골드 ' + gold(h) + '.'));
  ev('archive', 'pull', '능력치', (t, h) => t.includes('능력치 ' + nx(L80.filter(l => l.includes("R.event === 'archive' && o === 'pull'")).join('\n'), /openSheet\('stats', \{ pts: (\d+)/) + '점'));
  ev('archive', 'pull', '대신 다음 전투를', (t, h) => { const m = mx(h, /n3pre\(run, '(\w+)', (\d+)\)/); return t.includes(KWN(m[1]) + ' ' + m[2] + '로'); });
  ev('archive', 'sweep', '골드', (t, h) => t.includes('골드 ' + gold(h) + '.'));
  ev('names', 'call', '레벨', (t, h) => { const m = mx(h, /Math\.min\((\d+), \(gv\.lv \|\| 1\) \* (\d+)\)/); return t.includes('레벨 × ' + m[2] + ', 최대 ' + m[1]); });
  ev('names', 'call', '기록이 없으면', (t, h) => t.includes('기록이 없으면 골드 ' + nx(h, /\) : (\d+); gainGold/) + '입니다'));
  ev('names', 'cover', '다음', (t, h) => durOk && t.includes('다음 ' + rooms(nx(h, /run\.buffs\.ashcover = (\d+)/)) + '개 방 동안 받는 직접 피해 −' + pct(nx(S24, /hasBt\(p, 'ashcover'\) && !o\.dot\) d \*= ([\d.]+)/)) + '%'));
  ev('glass', 'take', '다음 전투를', (t, h) => { const m = mx(h, /n3pre\(run, '(\w+)', (\d+)\)/); return t.includes(KWN(m[1]) + ' ' + m[2] + '으로'); });
  ev('buried', 'dig', '스태미나', (t, h) => t.includes('스태미나 ' + nx(h, /p\.st - (\d+)/) + '을 씁니다') && nx(S42, /id === 'dig' && run\.p\.st < (\d+)/) === nx(h, /p\.st - (\d+)/));
  ev('herald', 'kneel', '다음', (t, h) => { const b = nx(h, /run\.buffs\.herald = (\d+)/); const ig0 = /hasBt\(u, 'herald'\)\) x = 0;/.test(S20) ? 0 : -1; return durOk && t.includes('다음 ' + rooms(b) + '개 방 동안 받는 화상 피해 ' + ig0 + ', 주는 피해 −' + pct(nx(S32, /hasBt\(p, 'herald'\)\) d \*= ([\d.]+)/)) + '%'); });

  // ===== 이벤트로 얻는 몇 방 동안의 효과 (상단 칩과 설명 창) =====
  const EVB = E('Object.keys(EVBUFF).map(k => ({ k, n: EVBUFF[k][0], d: EVBUFF[k][1] }))');
  api.source('world-evbuff', EVB.map(x => ({ id: x.k, text: pref(x.k, x.d) })));
  const mulD = (S, re) => nx(S, re);
  api.add('world-evbuff', '[snuff] ', '24-clock-damage.js · 20-battle-state.js · 32-player-action.js snuff', () => { const d = E('EVBUFF.snuff[1]'); return d.includes('받는 화상 피해 ' + (igSnuff0 ? 0 : -1)) && d.includes('주는 피해 −' + pct(mulD(S32, /hasBt\(p, 'snuff'\)\) d \*= ([\d.]+)/)) + '%'); });
  api.add('world-evbuff', '[procession] ', '24-clock-damage.js · 32-player-action.js procession', () => { const d = E('EVBUFF.procession[1]'); return d.includes('받는 직접 피해 −' + pct(mulD(S24, /hasBt\(p, 'procession'\) && !o\.dot\) d \*= ([\d.]+)/)) + '%') && d.includes('주는 피해 −' + pct(mulD(S32, /hasBt\(p, 'procession'\)\) d \*= ([\d.]+)/)) + '%'); });
  api.add('world-evbuff', '[ashcover] ', '24-clock-damage.js ashcover', () => E('EVBUFF.ashcover[1]').includes('받는 직접 피해 −' + pct(mulD(S24, /hasBt\(p, 'ashcover'\) && !o\.dot\) d \*= ([\d.]+)/)) + '%'));
  api.add('world-evbuff', '[herald] ', '20-battle-state.js · 32-player-action.js herald', () => { const d = E('EVBUFF.herald[1]'); return d.includes('받는 화상 피해 ' + (/hasBt\(u, 'herald'\)\) x = 0;/.test(S20) ? 0 : -1)) && d.includes('주는 피해 −' + pct(mulD(S32, /hasBt\(p, 'herald'\)\) d \*= ([\d.]+)/)) + '%'); });

  // ===== 제단 =====
  const ALT = E('ALTARS.map(a => ({ id: a.id, d: a.d }))');
  api.source('world-altars', ALT.map(a => ({ id: a.id, text: pref(a.id, a.d) })));
  const altH = k => L80.filter(l => l.includes("R.altar === '" + k + "'")).join('\n');
  api.add('world-altars', '[blood] ', '80-events.js altar blood hpPen', () => E('ALTARS.find(a => a.id === "blood").d').includes('최대 생명력 ' + Math.round(nx(altH('blood'), /p\.hpPen \|\| 0\) \+ ([\d.]+)/) * 100) + '%를'));
  api.add('world-altars', '[gold] ', '66-dungeon-flow.js altarGold · ALTARS.gold.cost[0]', () => E('ALTARS.find(a => a.id === "gold").d').includes('골드 ' + E('altarGold({ ch: 1 })') + '을 내면') && E('ALTARS.find(a => a.id === "gold").cost[0]') === E('altarGold({ ch: 1 })') && /run\.gold -= altarGold\(run\)/.test(altH('gold')));
  api.add('world-altars', '[scale] 최대 생명력', '80-events.js altar scale hpPen', () => { const t = E('ALTARS.find(a => a.id === "scale").d'); return t.includes('최대 생명력 ' + Math.round(nx(altH('scale'), /p\.hpPen \|\| 0\) \+ ([\d.]+)/) * 100) + '%를') && t.includes('능력치 ' + nx(altH('scale'), /pts: (\d+)/) + '점'); });

  // 화면에 그려지는 제단 카드: 챕터마다 황금 촛대의 값이 다르다 (A.d의 40을 실제 값으로 바꿔 보인다)
  const altUi = [];
  const FAKE = "{ mode: 'normal', room: 4, ch: CH, cons: [], bag: [], gold: 0, p: { st: 100, flask: { life: 1, mana: 1, stam: 1 } } }";
  const withRun = (ch, body) => E('(function(){ const o = G.run; G.run = ' + FAKE.replace('CH', ch) + '; try { ' + body + ' } finally { G.run = o; } })()');
  for (const ch of [1, 2, 3]) altUi.push({ id: 'gold.ch' + ch, text: strip(withRun(ch, "return vRoom(G.run, { type: 'altar', altar: 'gold' });")).replace(/가진 골드 \d+/, '') });
  api.source('world-altars-ui', altUi);
  for (const ch of [1, 2, 3]) api.add('world-altars-ui', '골드 ' + E('altarGold({ ch: ' + ch + ' })') + '을 내면', '66-dungeon-flow.js altarGold(ch' + ch + ') = ALTARS.gold.cost', () => E('altarGold({ ch: ' + ch + ' })') === E('ALTARS.find(a => a.id === "gold").cost[' + (ch - 1) + ']') && /run\.gold -= altarGold\(run\)/.test(altH('gold')));

  // ===== 성소 =====
  const SH = E('SHRINES.map(s => ({ id: s.id, d: s.d }))');
  api.source('world-shrines', SH.map(s => ({ id: s.id, text: pref(s.id, s.d) })));
  const shd = id => E('SHRINES.find(s => s.id === "' + id + '").d');
  api.add('world-shrines', '[break] ', '32-player-action.js hasBt break', () => shd('break').includes('+' + pct(nx(S32, /hasBt\(b\.p, 'break'\)\) v \*= ([\d.]+)/)) + '%'));
  api.add('world-shrines', '[ward] ', '24-clock-damage.js hasBt ward', () => shd('ward').includes('−' + pct(nx(S24, /hasBt\(u, 'ward'\)\) amt \*= ([\d.]+)/)) + '%'));
  api.add('world-shrines', '[wrath] ', '32-player-action.js hasBt wrath', () => shd('wrath').includes('+' + pct(nx(S32, /hasBt\(p, 'wrath'\)\) d \*= ([\d.]+)/)) + '%'));
  api.add('world-shrines', '[breath] ', '24-clock-damage.js hasBt breath', () => shd('breath').includes('+' + nx(S24, /hasBt\(p, 'breath'\)\) p\.st = Math\.min\(p\.stMax, p\.st \+ (\d+)\)/)));
  api.add('world-shrines', '[mercy] ', '20-battle-state.js flaskHealFrac mercy', () => shd('mercy').includes('+' + Math.round(nx(S20, /hasBt\(p, 'mercy'\) \? ([\d.]+)/) * 100) + '%p'));
  api.add('world-shrines', '[firm] ', '24-clock-damage.js hasBt firm', () => shd('firm').includes('−' + pct(nx(S24, /hasBt\(p, 'firm'\)\) raw \*= ([\d.]+)/)) + '%'));
  api.add('world-shrines', '[shade] 받는 화상', '20-battle-state.js hasBt shade', () => shd('shade').includes('화상 피해 −' + pct(nx(S20, /u === b\.p && hasBt\(u, 'shade'\)\) x \*= ([\d.]+)/)) + '%'));
  api.add('world-shrines', '[shade] 열기', '14-chapter-bodies.js heatRise shade', () => shd('shade').includes('열기가 오르는 양 −' + pct(nx(S14, /hasBt\(b\.p, 'shade'\) \? ([\d.]+)/)) + '%'));

  // 성소가 이어지는 방 수: 문 · 방 카드 · 상단 칩 설명이 모두 "3개 방"이라고 쓴다
  const shUi = [
    { id: 'door', text: strip(E("doorCard({ type: 'shrine', shrine: 'break' }, 0)")) },
    { id: 'room', text: strip(withRun(1, "return vRoom(G.run, { type: 'shrine', shrine: 'break' });")) },
  ];
  const shDs = SH.map(s => s.d);
  const shrineUi = shUi.map(x => shDs.reduce((t, d) => t.split(d).join(''), x.text));
  api.source('world-shrines-ui', shUi.map((x, i) => ({ id: x.id, text: shrineUi[i] })));
  const shrineRooms = rooms(nx(S80, /run\.buffs\[R\.shrine\] = (\d+)/));
  api.add('world-shrines-ui', '개 방 동안', '80-events.js run.buffs[R.shrine] = 4, 66-dungeon-flow.js advanceFloor가 방을 넘길 때마다 1 줄임 → 이어지는 방 수 = 값 − 1', () => durOk && shrineUi.every(x => x.includes(shrineRooms + '개 방 동안')) && E('ROOM_TYPES.shrine.hint').includes(shrineRooms + '개 방 동안'));

  // ===== 방 유형 (문에 적히는 보상 줄) =====
  const RT = E('Object.keys(ROOM_TYPES).map(k => ({ id: k, n: ROOM_TYPES[k].n, hint: ROOM_TYPES[k].hint }))');
  api.source('world-roomtypes', RT.map(x => ({ id: x.id, text: pref(x.id, x.hint) })));
  const drops1 = /if \(t === 'normal' \|\| t === 'ambush'\) drops\.push\(mkItem\(/.test(S66);
  api.add('world-roomtypes', '[normal] ', '66-dungeon-flow.js: 일반 방은 장비 mkItem 하나', () => drops1 && E('ROOM_TYPES.normal.hint').includes('장비 1') && !/drops\.push\(mkItem[^;]*;\s*drops\.push\(mkItem[^;]*\/\/ normal/.test(S66));
  api.add('world-roomtypes', '[ambush] ', '66-dungeon-flow.js: 매복 방도 장비 mkItem 하나', () => drops1 && E('ROOM_TYPES.ambush.hint').includes('장비 1'));
  api.add('world-roomtypes', '[spring] ', '80-events.js rest: 생명력 0.5, 플라스크 life/mana/stam 각 +1', () => { const h = L80.filter(l => l.includes("const sp = 0.5")).join('') + L80.filter(l => l.includes('p.flask.life = Math.min(flaskCap(p, \'life\')')).join(''); const sp = nx(h, /const sp = ([\d.]+)/); return E('ROOM_TYPES.spring.hint').includes('생명력 ' + Math.round(sp * 100) + '% 회복') && E('ROOM_TYPES.spring.hint').includes('플라스크 각 ' + nx(h, /p\.flask\.mana \+ (\d+)/)) && nx(h, /p\.flask\.life \+ (\d+)/) === 1 && nx(h, /\(p\.flask\.stam \|\| 0\) \+ (\d+)/) === 1; });
  api.add('world-roomtypes', '[shrine] ', '80-events.js run.buffs[R.shrine] = 4 → 방 수 = 값 − 1', () => durOk && E('ROOM_TYPES.shrine.hint').includes(shrineRooms + '개 방'));

  // 방 카드에 그려지는 글 (샘 · 보상 줄)
  const spUi = strip(withRun(1, "return vRoom(G.run, { type: 'spring' });"));
  const frHtml = (extra) => { const t = strip(withRun(1, "return vRoom(G.run, { type: 'normal', floor: 1, lv: 1, en: [['bruiser']], gold: " + E('ROOM_TYPES.normal.gold[0]') + ", mods: " + extra + ", names: {} });")); return t.slice(t.indexOf('보상:')).replace(/\s*방에 들어가기$/, ''); };
  api.source('world-rooms-ui', [{ id: 'spring', text: spUi }, { id: 'fight', text: frHtml('[]') }, { id: 'fight-bell', text: frHtml("['bell']") }]);
  api.add('world-rooms-ui', '샘에서 쉬면', '80-events.js rest: p.hp + p.hpMax × 0.5', () => spUi.includes('생명력이 ' + Math.round(nx(S80, /const sp = ([\d.]+)/) * 100) + '% 차고'));
  api.add('world-rooms-ui', '보상: 골드', '66-dungeon-flow.js battleContinue: 골드 = R.gold × (종소리 · 북소리 1.5), 일반 방 장비 1', () => { const g1 = nx(S66, /let gold = \(R\.gold \|\| 0\) \* \(R\.mods && \(R\.mods\.includes\('bell'\) \|\| R\.mods\.includes\('drums'\)\) \? ([\d.]+) : 1\)/); const g0 = E('ROOM_TYPES.normal.gold[0]'); return frHtml('[]').includes('보상: 골드 ' + g0 + ', ' + E('ROOM_TYPES.normal.hint')) && frHtml("['bell']").includes('골드 ' + g0 + ' ×' + g1) && E('ROOM_TYPES.normal.hint') === '장비 1' && drops1; });

  // ===== 방 특성 =====
  const RM = E('Object.keys(ROOM_MODS).map(k => ({ id: k, d: ROOM_MODS[k].d }))');
  api.source('world-mods', RM.map(x => ({ id: x.id, text: pref(x.id, x.d) })));
  const md = id => E('ROOM_MODS.' + id + '.d');
  for (const k of ['narrow', 'alley']) api.add('world-mods', '[' + k + '] ', '34-rounds-setup.js narrow/alley: 전열 f > n이면 후열', () => md(k).includes('전열에 적이 ' + nx(S34, /mods\.includes\('narrow'\) \|\| mods\.includes\('alley'\)\) \{ let f = 0; for \(const e of en\) if \(e\.row === 'front' && e\.role !== 'boss'\) \{ f\+\+; if \(f > (\d+)\)/) + '기까지'));
  const ceil = () => ({ T: nx(S24, /hasMod\(b, 'pillar'\)\) && T % (\d+) === 0/), a: nx(S24, /hurtPlayer\(b, (\d+), \{ aoe: 1, label: '무너지는 천장' \}\)/), b: nx(S24, /hurtEnemy\(b, e, (\d+), \{ aoe: 1, label: '무너지는 천장' \}\)/) });
  for (const k of ['ceiling', 'pillar']) api.add('world-mods', '[' + k + '] ', '24-clock-damage.js tickOnce: T % n === 0, 나와 적 모두 n 피해', () => { const c = ceil(); return c.a === c.b && md(k).includes(c.T + '라운드마다 모두가 피해 ' + c.a); });
  for (const k of ['holy', 'shade']) api.add('world-mods', '[' + k + '] ', '24-clock-damage.js tickOnce: 나와 적 hpMax × 0.01', () => { const h = mx(S24, /hasMod\(b, 'holy'\) \|\| hasMod\(b, 'shade'\)\) \{ p\.hp = Math\.min\(p\.hpMax, p\.hp \+ p\.hpMax \* ([\d.]+)\); for \(const e of alive\(b\)\) e\.hp = Math\.min\(e\.hpMax, e\.hp \+ e\.hpMax \* ([\d.]+)\)/); return h[1] === h[2] && md(k).includes('생명력 ' + Math.round(h[1] * 100) + '%를') && (k !== 'shade' || md(k).includes('화상 피해는 절반') && nx(S20, /hasMod\(b, 'shade'\)\) x \*= ([\d.]+)/) === 0.5); });
  api.add('world-mods', '[candle] ', '20-battle-state.js kwTaken: 화상 × 1.5', () => md('candle').includes('화상 피해가 모두 ' + pct(nx(S20, /hasMod\(b, 'candle'\) \? ([\d.]+)/)) + '% 늘'));
  api.add('world-mods', '[brazier] ', '20-battle-state.js kwTaken: 화상 × 1.5', () => md('brazier').includes('화상 피해가 모두 ' + pct(nx(S20, /hasMod\(b, 'brazier'\)\) x \*= ([\d.]+)/)) + '% 늘'));
  api.add('world-mods', '[bloodpool] ', '24-clock-damage.js dmgDot: 출혈 × 2', () => md('bloodpool').includes('출혈 피해가 모두 ' + nx(S24, /label === '출혈' && hasMod\(b, 'bloodpool'\)\) amt \*= (\d+)/) + '배'));
  for (const k of ['bell', 'drums']) {
    api.add('world-mods', '[' + k + '] 적 속도', '24-clock-damage.js eSpeed: 속도 × 1.1', () => md(k).includes('적 속도 +' + pct(nx(S24, /hasMod\(b, 'bell'\) \|\| hasMod\(b, 'drums'\) \? ([\d.]+)/)) + '%'));
    api.add('world-mods', '[' + k + '] 이 방의 골드', '66-dungeon-flow.js battleContinue: 골드 × 1.5', () => md(k).includes('이 방의 골드 +' + pct(nx(S66, /R\.mods\.includes\('bell'\) \|\| R\.mods\.includes\('drums'\)\) \? ([\d.]+)/)) + '%'));
  }
  api.add('world-mods', '[calm] ', '24-clock-damage.js tickOnce: 마나 회복 × 2 (rollMods가 뽑지 않아 화면에는 안 나온다)', () => md('calm').includes('양이 ' + nx(S24, /hasMod\(b, 'calm'\) \? (\d+) : 1/) + '배'));
  api.add('world-mods', '[bonepile] 2라운드', '34-rounds-setup.js bonepile: 뼈 더미 둘, RISE.wait 라운드 뒤 일어섬', () => { const n = nx(S34, /bonepile'\)\) \{[^}]*?for \(let k = 0; k < (\d+); k\+\+\)/); return n === 2 && md('bonepile').includes('뼈 더미 둘') && /s\.pile = \{ wait: RISE\.wait, born: -1 \}/.test(S34) && md('bonepile').includes(E('RISE.wait') + '라운드 뒤'); });
  api.add('world-mods', '[flooded] ', '34-rounds-setup.js flooded: 나와 모든 적에게 둔화 1', () => md('flooded').includes('둔화 ' + nx(S34, /mods\.includes\('flooded'\)\) \{ addS\(b, player, 'chill', (\d+)\)/) + '을'));
  api.add('world-mods', '[noon] 라운드가', '14-chapter-bodies.js heatRise: HEAT.mod', () => md('noon').includes('열기가 ' + E('HEAT.mod') + ' 오릅니다') && /return Math\.round\(HEAT\.mod \* sh\)/.test(S14));
  api.add('world-mods', '[noon] 100이', '14-chapter-bodies.js heatAdd 상한 100 · heatStorm 뒤 HEAT.reset', () => /b\.heat = Math\.max\(0, Math\.min\((\d+), b\.heat \+ n\)\)/.test(S14) && nx(S14, /b\.heat = Math\.max\(0, Math\.min\((\d+), b\.heat \+ n\)\)/) === 100 && nx(S14, /b\.heat >= (\d+)\) \{ if \(b\.heatWarn/) === 100 && md('noon').includes('100이 되면') && md('noon').includes(E('HEAT.reset') + '으로 내려갑니다') && /b\.heat = q \? QUEEN\.stormReset : HEAT\.reset/.test(S14));
  api.add('world-mods', '[haze] ', '14-chapter-bodies.js ch3Setup: 허상 1', () => md('haze').includes('허상 ' + nx(S14, /mods\.includes\('haze'\)\) for \(const e of alive\(b\)\) if \(realFoe\(e\)\) e\.haze = Math\.max\(e\.haze \|\| 0, (\d+)\)/) + '을'));
  api.add('world-mods', '[sandstorm] ', '14-chapter-bodies.js ch3HitMul · 30-enemy-ai.js: 후열 × 0.8 (받는 · 주는)', () => { const a = nx(S14, /hasMod\(b, 'sandstorm'\)\) m \*= ([\d.]+)/), b = nx(S30, /hasMod\(b, 'sandstorm'\)\) d \*= ([\d.]+)/); return a === b && md('sandstorm').includes('모두 ' + pct(a) + '% 줄어듭니다'); });

  // ===== 갈래길 (화면에 그려진 카드의 숫자) =====
  const pathCards = [];
  const cross = (id, mode, room) => strip(E('(function(){ const o = G.run; G.run = { mode: "' + mode + '", room: ' + room + ' }; try { return crossCard("' + id + '"); } finally { G.run = o; } })()'));
  for (const mode of ['normal', 'hard']) for (const id of ['rough', 'main', 'quiet']) pathCards.push({ id: id + '.' + mode, text: pref(id + '.' + mode, cross(id, mode, 4)) });
  const PAT = E('PATH_AT');
  const rl = i => 'range.' + String.fromCharCode(97 + i); // 꼬리표에는 숫자를 넣지 않는다(숫자 센 셈이 어긋남)
  PAT.forEach((f, i) => pathCards.push({ id: rl(i), text: pref(rl(i), cross('main', 'normal', f)) }));
  api.source('world-paths', pathCards);
  const pathUsed = /P\.hp\); e\.hp = e\.hpMax; e\.dmg \*= D\.dmg \* P\.dmg/.test(S34) && /\.lootMul = \(room\.ambush \? AMBUSH\.loot : 1\) \* pathOf\(room\.path, room\.mode\)\.loot/.test(S34) && /P\.gold \* \(chData\(ch\)\.gold \|\| 1\)/.test(S66) && /const PU = pathOf\(R\.path, G\.run && G\.run\.mode\)\.up/.test(S66) && /const PW = pathOf\(run\.path, run\.mode\)\.w;/.test(S66);
  const pathText = (id, mode) => { const P = E('pathOf("' + id + '", "' + mode + '")'); const w = Object.entries(P.w || {}).filter(([t]) => E('!!ROOM_TYPES.' + t)).map(([t, v]) => E('ROOM_TYPES.' + t + '.n') + ' ×' + v);
    return [P.hp === 1 && P.dmg === 1 ? '적 체력 · 피해 그대로' : '적 체력 ×' + P.hp + ' · 피해 ×' + P.dmg, '전리품 ×' + P.loot + ' · 골드 ×' + P.gold].concat(P.up ? ['장비 등급 ' + (P.up > 0 ? '오름' : '내림') + ' ' + Math.round(Math.abs(P.up) * 100) + '%'] : []).concat(w.length ? ['나오는 문(큰 길 대비): ' + w.join(', ')] : []); };
  for (const mode of ['normal', 'hard']) for (const id of ['rough', 'main', 'quiet']) {
    api.add('world-paths', '[' + id + '.' + mode + '] 적 체력', '42-chrome-map.js crossCard가 PATHS' + (mode === 'hard' ? '_HARD' : '') + '.' + id + '의 hp · dmg · loot · gold · up · w를 그대로 그림. 34-rounds-setup.js(hp · dmg · loot) · 66-dungeon-flow.js(gold · up · w)가 같은 pathOf 값을 씀', () => {
      const t = pathCards.find(c => c.id === id + '.' + mode).text; const P = E('pathOf("' + id + '", "' + mode + '")');
      return pathUsed && P && pathText(id, mode).every(s => t.includes(s)); });
  }
  PAT.forEach((f, i) => api.add('world-paths', '[' + rl(i) + '] 적 체력', '66-dungeon-flow.js: 길은 f층에서 고르고 다음 갈래길 · 야영지 · 보스 바로 앞까지 간다 (PATH_AT, FLOOR_CAMP, FLOOR_BOSS)', () => {
    const stops = PAT.concat([E('FLOOR_CAMP'), E('FLOOR_BOSS')]).filter(x => x > f).sort((a, b) => a - b); const t = pathCards.find(c => c.id === rl(i)).text;
    return pathText('main', 'normal').every(s => t.includes(s)) && t.includes(f + '층부터 ' + (stops[0] - 1) + '층까지') && /PATH_AT\.includes\(run\.room\)\) \{ run\.cross = /.test(S66); }));

  // ===== 모드 =====
  const MWHY = E('MODES.hard.why');
  api.source('world-modes', MWHY.map((t, i) => ({ id: 'hard.' + String.fromCharCode(97 + i), text: pref('hard.' + String.fromCharCode(97 + i), t) })));
  api.add('world-modes', '[hard.a] ', '24-clock-damage.js hurtPlayer: d *= MODES.hard.dmg (직접 피해만, 한 번 피해 상한 앞)', () => E('MODES.hard.why[0]').includes(pct(E('MODES.hard.dmg')) + '% 더') && /d \*= MODES\.hard\.dmg/.test(S24));

  // ===== 표식 =====
  const MK = E('Object.keys(MARKS).map(k => ({ id: k, d: MARKS[k].d }))');
  api.source('world-marks', MK.map(x => ({ id: x.id, text: pref(x.id, x.d) })));
  api.add('world-marks', '[dmg] ', '24-clock-damage.js: d *= MARKS.dmg.dmg', () => E('MARKS.dmg.d').includes(pct(E('MARKS.dmg.dmg')) + '% 늘') && /d \*= MARKS\.dmg\.dmg/.test(S24));
  api.add('world-marks', '[hp] ', '22-class-tree-rules.js: 보스 아닌 적의 생명력 × MARKS.hp.hp', () => E('MARKS.hp.d').includes('생명력이 ' + pct(E('MARKS.hp.hp')) + '% 늘') && /\? 1 : MARKS\.hp\.hp\)/.test(S22));
  api.add('world-marks', '[boss] ', '22-class-tree-rules.js: 보스 생명력 × MARKS.boss.hp', () => E('MARKS.boss.d').includes('생명력이 ' + pct(E('MARKS.boss.hp')) + '% 늘') && /marks\.indexOf\('boss'\) >= 0 \? MARKS\.boss\.hp : 1/.test(S22));

  // ===== 처음 만남 (역할 소개) =====
  const RI = E('Object.keys(ROLE_INTRO).map(k => ({ k, a: ROLE_INTRO[k][0], b: ROLE_INTRO[k][1] }))');
  api.source('world-roleintro', RI.map(x => ({ id: x.k, text: pref(x.k, x.a + ' ' + x.b) })));
  api.add('world-roleintro', '[ember] ', '20-battle-state.js kwTaken: 화상 n 더하고 kwDec 기본 1', () => { const t = E('ROLE_INTRO.ember[1]'); return t.includes('그 수만큼 피해를 더하고 ' + nx(S20, /function kwDec\(u, k, n\) \{[^}]*x\.stacks -= \(n \|\| (\d+)\)/) + ' 줄어듭니다') && /const n = stk\(u, 'ignite'\); kwDec\(u, 'ignite'\);/.test(S20) && /d \+= x; \}/.test(S20); });
  api.add('world-roleintro', '[noon] ', '14-chapter-bodies.js heatAdd: 열기 100이면 열풍', () => nx(S14, /b\.heat >= (\d+)\) \{ if \(b\.heatWarn/) === 100 && E('ROLE_INTRO.noon[1]').includes('100이 되면 열풍이 붑니다'));
  api.add('world-roleintro', '[swift] ', '34-rounds-setup.js startRound: 신속은 라운드마다 haste stacks 1', () => E('ROLE_INTRO.swift[1]').includes('가속 ' + nx(S34, /e\.swift && !e\.s\.chill && !e\.s\.broken && !e\.s\.haste\) e\.s\.haste = \{ stacks: (\d+)/) + '을') && E('ROLE_INTRO.swift[1]').includes('둔화가 걸리면'));

  // ===== 이야기 · 도감 · 층 이름: 숫자가 없어야 한다 (숫자가 생기면 이 출처에서 걸린다) =====
  const lore = [];
  const add = (id, t) => { if (t) lore.push({ id, text: String(t) }); };
  for (const [k, v] of Object.entries(E('FOE_INTRO'))) { add('intro.' + k + '.lore', v.lore); (v.see || []).forEach((s, i) => add('intro.' + k + '.see' + i, s)); }
  for (const [k, v] of Object.entries(E('CODEX'))) for (const [j, s] of Object.entries(v)) add('codex.' + k + '.' + j, s);
  for (const [k, v] of Object.entries(E('CHAPTERS'))) for (const j of ['n', 'settleLore', 'nextLore', 'enterLore', 'deathLine']) add('chapter.' + k + '.' + j, v[j]);
  for (const [i, b] of E('BANDS3').entries()) { add('band.' + i + '.n', b.n); add('band.' + i + '.line', b.line); }
  for (const [k, v] of Object.entries(E('ROLE_INTRO'))) add('role.' + k + '.0', v[0]);
  for (const e of EV) add('lore.' + e.id, e.lore);
  for (const [k, v] of Object.entries(E('BOSSES'))) if (['abbot', 'cryptlord', 'queen'].includes(k)) { add('boss.' + k + '.d', v.d); add('boss.' + k + '.lore', v.lore); }
  api.source('world-lore', lore);

  // ===== 전투 기록 · 예고에 찍히는 문장 (적 행동 · 방 시작). 글은 코드의 문자열에서 읽어 오고, 숫자는 처리 코드와 대조한다 =====
  const lit = (S, re) => mx(S, re)[1];
  const lg = {
    pyrea: '장송곡 · 중독 ' + lit(S30, /'장송곡 ' \+ r1\(chantDmg\(b, e\)\) \+ ' · 중독 (\d+)'/),
    pyrec: '장송곡 · 중독 ' + lit(S30, /\? '장송곡 · 중독 (\d+)' :/),
    hex: '저주를 맺는다. 나에게 약화 ' + lit(S30, /logp\(b, 'bad', e\.n \+ '이\(가\) 저주를 맺는다\. 약화 (\d+) · 취약 \d+'\)/) + ' · 취약 ' + lit(S30, /저주를 맺는다\. 약화 \d+ · 취약 (\d+)'/),
    bless: '동료에게 축복. 다음 공격 피해 +' + lit(S30, /에게 축복\. 다음 공격 피해 \+(\d+)%/) + '%',
    prayer: '최후의 기도를 올린다. 강화 ' + lit(S30, /최후의 기도를 올린다\. 강화 (\d+)'/),
    flooded: '발목까지 물이 찬다. 모두 둔화 ' + lit(S34, /발목까지 물이 찬다\. 모두 둔화 (\d+)'/),
    rot: '썩은 기운이 몸에 남았습니다. 다음 전투에 중독 ' + lit(S66, /썩은 기운이 몸에 남았습니다\. 다음 전투에 중독 (\d+)'/),
    charged: '자세가 흔들린다. 붕괴 게이지 +' + lit(S24, /자세가 흔들린다\. 붕괴 게이지 \+(\d+)'/),
    pyreb: '화형 · 화상 ' + E('CHANT.burn'),
    vuln: '취약 2(으)로 +' + lit(S24, /취약 ' \+ hx\.vu \+ '\(으\)로 \+(\d+)%/) + '%',
    prot: '보호 2(으)로 −' + lit(S24, /보호 ' \+ hx\.pr \+ '\(으\)로 −(\d+)%/) + '%',
    exh: '탈진으로 +' + lit(S24, /탈진으로 \+(\d+)%/) + '%',
    brace: '버티기로 −' + lit(S24, /버티기로 −(\d+)%/) + '%',
    weakOut: '약화 2로 내 피해 −' + lit(S24, /약화 ' \+ W0\.wk \+ '로 내 피해 −(\d+)%/) + '%',
    empOut: '강화 2로 +' + lit(S24, /W0\.em \+ '로 \+(\d+)%'\)/) + '%',
  };
  api.source('world-battlelog', Object.entries(lg).map(([id, t]) => ({ id, text: pref(id, t) })));
  const bl = (loc, ev2, fn) => api.add('world-battlelog', loc, ev2, fn);
  bl('[pyrea] 장송곡 · 중독', '30-enemy-ai.js burn(2챕터) 기록 글: addPoison(b, b.p, n, 0)의 n', () => lg.pyrea.endsWith(' ' + nx(S30, /addPoison\(b, b\.p, (\d+), 0\)/)));
  bl('[pyrec] 장송곡 · 중독', '30-enemy-ai.js burn(2챕터) 예고 글: addPoison(b, b.p, n, 0)의 n', () => lg.pyrec.endsWith(' ' + nx(S30, /addPoison\(b, b\.p, (\d+), 0\)/)));
  bl('[hex] 나에게 약화', '30-enemy-ai.js hexcurse: addS weak · vuln', () => { const m = mx(S30, /case 'hexcurse': \{ addS\(b, b\.p, 'weak', (\d+)\); addS\(b, b\.p, 'vuln', (\d+)\)/); return lg.hex.endsWith('약화 ' + m[1] + ' · 취약 ' + m[2]); });
  bl('[bless] 다음 공격', '30-enemy-ai.js bless: addS empower 1, 강화 한 겹이면 적의 피해 × 1.25', () => nx(S30, /addS\(b, t, 'empower', (\d+)\)/) === 1 && lg.bless.endsWith('+' + pct(nx(S30, /if \(e\.s\.empower\) d \*= ([\d.]+)/)) + '%'));
  bl('[prayer] 강화', '30-enemy-ai.js lastprayer: addS empower n', () => lg.prayer.endsWith('강화 ' + nx(S30, /addS\(b, e, 'empower', (\d+)\); logp\(b, 'bad', e\.n \+ '이\(가\) 최후의 기도/)));
  bl('[flooded] 모두 둔화', '34-rounds-setup.js flooded: 나와 모든 적에게 addS chill n', () => { const n = nx(S34, /mods\.includes\('flooded'\)\) \{ addS\(b, player, 'chill', (\d+)\)/); return n === nx(S34, /if \(e\.role !== 'root'\) addS\(b, e, 'chill', (\d+)\)/) && lg.flooded.endsWith('둔화 ' + n); });
  bl('[rot] 다음 전투에', '66-dungeon-flow.js battleContinue: 다음 전투 시작 중독 + n', () => lg.rot.endsWith('중독 ' + nx(S66, /\.poison \|\| 0\) \+ (\d+) \}\); toast\('썩은 기운/)));
  bl('[charged] 붕괴 게이지', '24-clock-damage.js hurtPlayer: 강타를 맞으면 공격자 addBreak n', () => lg.charged.endsWith('+' + nx(S24, /if \(o\.charged\) \{ addBreak\(b, o\.src, (\d+)\)/)));
  bl('[pyreb] 화형 · 화상', '30-enemy-ai.js burn: addS ignite CHANT.burn, 예고 글도 CHANT.burn', () => /addS\(b, b\.p, 'ignite', CHANT\.burn\)/.test(S30) && /'화형 · 화상 ' \+ CHANT\.burn/.test(S30));
  bl('[vuln] ', '20-battle-state.js kwTaken: 취약이면 받는 피해 × 1.25', () => lg.vuln.endsWith('+' + pct(nx(S20, /if \(u\.s\.vuln\) \{ d \*= ([\d.]+)/)) + '%'));
  bl('[prot] ', '20-battle-state.js kwTaken: 보호면 받는 피해 × 0.75', () => lg.prot.endsWith('−' + pct(nx(S20, /if \(u\.s\.protect\) \{ d \*= ([\d.]+)/)) + '%'));
  bl('[exh] ', '24-clock-damage.js hurtPlayer: 스태미나 0이면 받는 피해 × 1.2', () => lg.exh.endsWith('+' + pct(nx(S24, /if \(p\.st <= 0 \|\| p\.exhaust\) d \*= ([\d.]+)/)) + '%'));
  bl('[brace] ', '24-clock-damage.js hurtPlayer: p.brace면 받는 피해 × 0.65', () => lg.brace.endsWith('−' + pct(nx(S24, /if \(p\.brace\) d \*= ([\d.]+)/)) + '%'));
  bl('[weakOut] ', '32-player-action.js: 약화면 내 피해 × 0.75', () => lg.weakOut.endsWith('−' + pct(nx(S32, /s\.weak\) d \*= ([\d.]+)/)) + '%'));
  bl('[empOut] ', '32-player-action.js: 강화면 내 피해 × 1.25', () => lg.empOut.endsWith('+' + pct(nx(S32, /s\.empower && !\(p\.build === 'monk' && b\.curFast\)\) \{ d \*= ([\d.]+)/)) + '%'));

  // ===== 이벤트 · 성소 · 제단 처리 중 알림(toast)과 시트 제목에 찍히는 글 (80-events.js의 글을 그대로 읽는다) =====
  const tl = {
    shrine: lit(S80, /toast\('(성소의 힘이 \d+개 방 동안 함께합니다)'\)/),
    scale: lit(S80, /why: '(유리 저울에서 능력치 \d+점)'/),
    refundA: lit(S80, /SK2\[c\]\.n \+ '( 칸을 되돌렸습니다\. 포인트 \+\d+)'/).trim(),
    refundB: lit(S80, /case 'trefund'[^\n]*toast\('(되돌렸습니다\. 포인트 \+\d+)'\)/),
    camel: lit(S80, /toast\('(짐에서 소모품 셋을 찾았습니다\. 다음 전투에 화상 \d+)'\)/),
    oasisA: lit(S80, /toast\('(샘물이 상처를 씻어 낸다\. 생명력 \d+%)'\)/),
    oasisB: lit(S80, /toast\('(물이 무겁게 가라앉는다\. 다음 전투에 둔화 \d+)'\)/),
    library: lit(S80, /why: '(무너진 서고에서 능력치 \d+점)'/),
    archive: lit(S80, /why: '(불타는 서고에서 능력치 \d+점)'/),
    testfull: lit(S80, /toast\('(\d+칸이 찼습니다\. 하나를 빼고 고르세요)'\)/),
  };
  api.source('world-toasts', Object.entries(tl).map(([id, t]) => ({ id, text: pref(id, t) })));
  const tt = (tag, loc, ev2, fn) => api.add('world-toasts', sentFind(tag, tl[tag], loc), ev2, fn);
  tt('shrine', '성소의 힘이', '80-events.js run.buffs[R.shrine] = 4 → 방 수 = 값 − 1', () => durOk && tl.shrine.includes(shrineRooms + '개 방 동안'));
  tt('scale', '유리 저울', '80-events.js altar scale: openSheet stats pts', () => tl.scale.includes('능력치 ' + nx(altH('scale'), /pts: (\d+)/) + '점'));
  tt('refundA', '포인트', '66-dungeon-flow.js refundDeepest: t.pts++ (포인트 1 돌려줌)', () => tl.refundA.endsWith('+' + (/t\.pts\+\+/.test(S66) ? 1 : NaN)));
  tt('refundB', '포인트', '22-class-tree-rules.js treeRefund: t.pts++ (포인트 1 돌려줌)', () => tl.refundB.endsWith('+' + (/t\.open = t\.open\.filter\(x => x !== id\); t\.pts\+\+;/.test(S22) ? 1 : NaN)));
  tt('camel', '화상', '80-events.js camel loot: n3pre ignite n', () => tl.camel.endsWith('화상 ' + nx(H('camel', 'loot'), /n3pre\(run, 'ignite', (\d+)\)/)));
  tt('oasisA', '생명력', '80-events.js oasis drink: p.hpMax × 0.3', () => tl.oasisA.endsWith('생명력 ' + pct(1 + nx(H('oasis', 'drink'), /p\.hpMax \* ([\d.]+)/)) + '%'));
  tt('oasisB', '둔화', '80-events.js oasis drink: n3pre chill n', () => tl.oasisB.endsWith('둔화 ' + nx(H('oasis', 'drink'), /n3pre\(run, 'chill', (\d+)\)/)));
  tt('library', '서고', '80-events.js library read: openSheet stats pts', () => tl.library.includes('능력치 ' + nx(H('library', 'read'), /pts: (\d+)/) + '점'));
  tt('archive', '서고', '80-events.js archive pull: openSheet stats pts', () => tl.archive.includes('능력치 ' + nx(H('archive', 'pull'), /pts: (\d+)/) + '점'));
  tt('testfull', '칸이 찼습니다', 'data/skills.js EQUIP_SLOTS2', () => tl.testfull.startsWith(E('EQUIP_SLOTS2') + '칸이'));

  // ===== 옛 B0.5 자리: 06a2에서 고를 길이 없다 =====
  const legacyT = [{ id: 'mother', text: E('BOSSES.mother.d') }, { id: 'tree', text: E('BOSSES.tree.d') }].concat(E('SCEN').map(s => ({ id: s.id, text: s.d }))).concat(E('ROOMS').map((r, i) => ({ id: 'room' + i, text: r.n })));
  api.source('world-legacy', legacyT);
  const legacy = 'B0.5 시험 상황 · 옛 보스(늪의 어머니 · 수호목) · 고정 방 목록. 06a2 화면에서 열리는 길이 없다(startScen을 부르는 버튼이 없고 던전 보스는 abbot · cryptlord · queen뿐)';
  for (const it of legacyT) for (const s of it.text.split(SPLIT)) if (/\d/.test(s)) api.note('world-legacy', s, legacy);
};
