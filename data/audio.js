/* 나락의 유산 데이터: 음악과 효과음
   index.html보다 먼저 읽힌다. 원본은 저장소 밖 bgm/에 두고, 웹용(MP3 96kbps, 음량 맞춤)으로 줄여 audio/에 둔다.
   0.6a.2 스킬 시험판(06a2/)은 1 · 2챕터 곡을 지인 주소(루트)의 audio/와 함께 쓰고, 3챕터 곡 셋(던전 · 보스 · 돌파)은 루트를 건드리지 않게 06a2/audio/에 둔다.
   화면별 곡은 index.html의 musicFor()가 고른다. */
const MUSIC = {
  title: { src: 'audio/title.mp3', n: '타이틀' },
  ch1_dungeon: { src: 'audio/ch1_dungeon.mp3', n: '1챕터 던전' },
  ch1_boss: { src: 'audio/ch1_boss.mp3', n: '1챕터 보스' },
  ch2_boss: { src: 'audio/ch2_boss.mp3', n: '2챕터 보스' },
  ch3_dungeon: { src: 'audio/ch3_dungeon.mp3', n: '3챕터 던전' }, // 06a2/audio/. 3챕터 곡은 06a2 안에 둔다
  ch3_boss: { src: 'audio/ch3_boss.mp3', n: '3챕터 보스' },
  shop: { src: 'audio/shop.mp3', n: '상점' },
  failed: { src: 'audio/failed.mp3', n: '쓰러짐' },
  finished: { src: 'audio/finished.mp3', n: '챕터 돌파' },
  ch3_finished: { src: 'audio/ch3_finished.mp3', n: '3챕터 돌파' },
};
/* 전투 효과음(10월 11일): 파일은 06a2/audio/sfx_*.mp3, 출처 · 라이선스(Kenney, CC0)는 docs/조사/효과음-출처.md. 키는 'b_' + 사건 이름 */
const SFX = {
  coin: { src: 'audio/coin.mp3', n: '골드' },
  b_slash: { src: 'audio/sfx_slash.mp3', n: '베기' },
  b_slash2: { src: 'audio/sfx_slash2.mp3', n: '베기 2' },
  b_dot_fire: { src: 'audio/sfx_dot_fire.mp3', n: '화상' },
  b_dot_frost: { src: 'audio/sfx_dot_frost.mp3', n: '냉기 지속 피해' },
  b_levelup: { src: 'audio/sfx_levelup.mp3', n: '레벨 올림' },
  b_pierce: { src: 'audio/sfx_pierce.mp3', n: '찌르기' },
  b_blunt: { src: 'audio/sfx_blunt.mp3', n: '타격' },
  b_arrow: { src: 'audio/sfx_arrow.mp3', n: '화살' },
  b_ctr: { src: 'audio/sfx_ctr.mp3', n: '반격' },
  b_big: { src: 'audio/sfx_big.mp3', n: '강타' },
  b_sp_arcane: { src: 'audio/sfx_sp_arcane.mp3', n: '주문' },
  b_sp_fire: { src: 'audio/sfx_sp_fire.mp3', n: '불꽃 주문' },
  b_sp_frost: { src: 'audio/sfx_sp_frost.mp3', n: '냉기 주문' },
  b_sp_venom: { src: 'audio/sfx_sp_venom.mp3', n: '독 주문' },
  b_sp_blood: { src: 'audio/sfx_sp_blood.mp3', n: '피 주문' },
  b_sp_shock: { src: 'audio/sfx_sp_shock.mp3', n: '번개 주문' },
  b_dot: { src: 'audio/sfx_dot.mp3', n: '지속 피해' },
  b_dot_venom: { src: 'audio/sfx_dot_venom.mp3', n: '중독' },
  b_dot_blood: { src: 'audio/sfx_dot_blood.mp3', n: '출혈' },
  b_miss: { src: 'audio/sfx_miss.mp3', n: '회피' },
  b_brk: { src: 'audio/sfx_brk.mp3', n: '붕괴' },
  b_kill: { src: 'audio/sfx_kill.mp3', n: '처치' },
  b_phit: { src: 'audio/sfx_phit.mp3', n: '내가 맞음' },
  b_phit_big: { src: 'audio/sfx_phit_big.mp3', n: '큰 피해' },
  b_pgd: { src: 'audio/sfx_pgd.mp3', n: '막음' },
  b_pwd: { src: 'audio/sfx_pwd.mp3', n: '보호막이 막음' },
  b_ppr: { src: 'audio/sfx_ppr.mp3', n: '흘리기' },
  b_heal: { src: 'audio/sfx_heal.mp3', n: '회복' },
  b_wgain: { src: 'audio/sfx_wgain.mp3', n: '보호막 얻음' },
  b_buff: { src: 'audio/sfx_buff.mp3', n: '강화' },
  b_debuff: { src: 'audio/sfx_debuff.mp3', n: '약화' },
};
