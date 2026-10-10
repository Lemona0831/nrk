/* 나락의 유산 데이터: 음악과 효과음
   index.html보다 먼저 읽힌다. 원본은 저장소 밖 bgm/에 두고, 웹용(MP3 96kbps, 음량 맞춤)으로 줄여 audio/에 둔다.
   0.6a.2 스킬 시험판(06a2/)은 1 · 2챕터 곡을 지인 주소(루트)의 audio/와 함께 쓰고, 3챕터 곡 셋(던전 · 보스 · 돌파)은 루트를 건드리지 않게 06a2/audio/에 둔다.
   화면별 곡은 index.html의 musicFor()가 고른다. */
const MUSIC = {
  title: { src: '../audio/title.mp3', n: '타이틀' },
  ch1_dungeon: { src: '../audio/ch1_dungeon.mp3', n: '1챕터 던전' },
  ch1_boss: { src: '../audio/ch1_boss.mp3', n: '1챕터 보스' },
  ch2_boss: { src: '../audio/ch2_boss.mp3', n: '2챕터 보스' },
  ch3_dungeon: { src: 'audio/ch3_dungeon.mp3', n: '3챕터 던전' }, // 06a2/audio/. 3챕터 곡은 06a2 안에 둔다
  ch3_boss: { src: 'audio/ch3_boss.mp3', n: '3챕터 보스' },
  shop: { src: '../audio/shop.mp3', n: '상점' },
  failed: { src: '../audio/failed.mp3', n: '쓰러짐' },
  finished: { src: '../audio/finished.mp3', n: '챕터 돌파' },
  ch3_finished: { src: 'audio/ch3_finished.mp3', n: '3챕터 돌파' },
};
const SFX = {
  coin: { src: '../audio/coin.mp3', n: '골드' },
};
