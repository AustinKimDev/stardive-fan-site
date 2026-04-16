export const REGION_LABELS = {
  ellendor: '엘렌도르',
  barein: '바레인',
  serenia: '세레니아',
  sura: '수라',
  namryeong: '남령',
} as const;

export const ELEMENT_LABELS = {
  fire: '불',
  ice: '얼음',
  earth: '땅',
  wind: '바람',
  thunder: '번개',
} as const;

export const STYLE_LABELS = {
  brawler: '난투',
  destroyer: '파괴',
  assassin: '암살',
  support: '지원',
} as const;

export const RARITY_LABELS = {
  '5seong': '5성',
  '4seong': '4성',
  '3seong': '3성',
  unknown: '?성',
} as const;

export type Region = keyof typeof REGION_LABELS;
export type Element = keyof typeof ELEMENT_LABELS;
export type Style = keyof typeof STYLE_LABELS;
export type Rarity = keyof typeof RARITY_LABELS;
