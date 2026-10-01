/* 나락의 유산 데이터: 음악과 효과음
   index.html보다 먼저 읽힌다. 원본은 저장소 밖 bgm/에 두고, 웹용(MP3 96kbps, 음량 맞춤)으로 줄여 audio/에 둔다. */
const MUSIC = {
  title: { src: 'audio/title.mp3', n: '첫 화면' },
  ch1_dungeon: { src: 'audio/ch1_dungeon.mp3', n: '1챕터 던전' },
  ch1_boss: { src: 'audio/ch1_boss.mp3', n: '1챕터 보스' },
  shop: { src: 'audio/shop.mp3', n: '상점' },
};
const SFX = {
  coin: { src: 'audio/coin.mp3', n: '골드' },
};
