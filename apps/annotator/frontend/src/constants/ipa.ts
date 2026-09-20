/**
 * IPA (International Phonetic Alphabet) Symbol Definitions and Categories
 */

export interface IpaSymbol {
  sym: string;
  name: string;
}

export interface IpaCategory {
  category: string;
  symbols: IpaSymbol[];
}

export const QUICK_IPA_SYMBOLS: IpaSymbol[] = [
  { sym: 'ɯ', name: '非円唇後舌狭母音 (日本語「う」)' },
  { sym: 'ə', name: '曖昧母音 (シュワー)' },
  { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
  { sym: '̥', name: '無声音化記号' },
  { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音 (「し」子音)' },
  { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音 (「じ」子音)' },
  { sym: 'ç', name: '無声硬口蓋摩擦音 (「ひ」子音)' },
  { sym: 'ɸ', name: '無声両唇摩擦音 (「ふ」子音)' },
  { sym: 'ɾ', name: '歯茎はじき音 (「ら行」子音)' },
  { sym: 'ɴ', name: '口蓋垂鼻音 (語末「ん」)' },
  { sym: 'ŋ', name: '軟口蓋鼻音 (鼻濁音/ン)' },
  { sym: 'ɲ', name: '硬口蓋鼻音 (「に」子音)' },
  { sym: 'ʔ', name: '声門破裂音 (促音/語頭)' },
  { sym: 't͡ɕ', name: '無声歯茎硬口蓋破擦音 (「ち」)' },
  { sym: 'd͡ʑ', name: '有声歯茎硬口蓋破擦音 (「じ」)' },
  { sym: 't͡s', name: '無声歯茎破擦音 (「つ」)' },
];

export const IPA_CATEGORIES: IpaCategory[] = [
  {
    category: '日本語・高頻度',
    symbols: [
      { sym: 'ɯ', name: '非円唇後舌狭母音 (う)' },
      { sym: 'ə', name: '曖昧母音 (シュワー)' },
      { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
      { sym: '̥', name: '無声音化記号' },
      { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音 (シ)' },
      { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音 (ジ)' },
      { sym: 'ç', name: '無声硬口蓋摩擦音 (ヒ)' },
      { sym: 'ɸ', name: '無声両唇摩擦音 (フ)' },
      { sym: 'ɾ', name: '歯茎はじき音 (ラ行)' },
      { sym: 'ɴ', name: '口蓋垂鼻音 (語末ン)' },
      { sym: 'ŋ', name: '軟口蓋鼻音 (鼻濁音)' },
      { sym: 'ɲ', name: '硬口蓋鼻音 (ニ)' },
      { sym: 'ʔ', name: '声門破裂音 (促音)' },
      { sym: 't͡ɕ', name: '無声歯茎硬口蓋破擦音 (チ)' },
      { sym: 'd͡ʑ', name: '有声歯茎硬口蓋破擦音 (ジ)' },
      { sym: 't͡s', name: '無声歯茎破擦音 (ツ)' },
      { sym: 'd͡z', name: '有声歯茎破擦音 (ズ)' },
      { sym: 'β', name: '有声両唇摩擦音' },
      { sym: 'ɣ', name: '有声軟口蓋摩擦音' },
    ],
  },
  {
    category: '母音',
    symbols: [
      { sym: 'ɯ', name: '非円唇後舌狭母音' },
      { sym: 'ə', name: '曖昧母音 (シュワー)' },
      { sym: 'ɪ', name: '準狭準前舌母音' },
      { sym: 'ʊ', name: '準狭準後舌母音' },
      { sym: 'ɛ', name: '半広前舌母音 (開いたエ)' },
      { sym: 'ɔ', name: '半広後舌母音 (開いたオ)' },
      { sym: 'æ', name: '準広前舌母音' },
      { sym: 'ɑ', name: '非円唇後舌広母音' },
      { sym: 'ʌ', name: '非円唇後舌半広母音' },
      { sym: 'ɤ', name: '非円唇後舌半狭母音' },
      { sym: 'ɨ', name: '非円唇中舌狭母音' },
      { sym: 'ʉ', name: '円唇中舌狭母音' },
      { sym: 'y', name: '円唇前舌狭母音' },
      { sym: 'ø', name: '円唇前舌半狭母音' },
      { sym: 'œ', name: '円唇前舌半広母音' },
      { sym: 'ɒ', name: '円唇後舌広母音' },
    ],
  },
  {
    category: '子音',
    symbols: [
      { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音' },
      { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音' },
      { sym: 'ç', name: '無声硬口蓋摩擦音' },
      { sym: 'ɸ', name: '無声両唇摩擦音' },
      { sym: 'β', name: '有声両唇摩擦音' },
      { sym: 'ɾ', name: '歯茎はじき音' },
      { sym: 'ɹ', name: '歯茎接近音' },
      { sym: 'ɴ', name: '口蓋垂鼻音' },
      { sym: 'ŋ', name: '軟口蓋鼻音' },
      { sym: 'ɲ', name: '硬口蓋鼻音' },
      { sym: 'ɱ', name: '唇歯鼻音' },
      { sym: 'ʔ', name: '声門破裂音' },
      { sym: 'θ', name: '無声歯摩擦音' },
      { sym: 'ð', name: '有声歯摩擦音' },
      { sym: 'ʃ', name: '無声後部歯茎摩擦音' },
      { sym: 'ʒ', name: '有声後部歯茎摩擦音' },
      { sym: 'χ', name: '無声口蓋垂摩擦音' },
      { sym: 'ʁ', name: '有声口蓋垂摩擦音' },
      { sym: 'ɣ', name: '有声軟口蓋摩擦音' },
    ],
  },
  {
    category: '補助・記号',
    symbols: [
      { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
      { sym: 'ˑ', name: '半長音' },
      { sym: '̥', name: '無声音化記号' },
      { sym: '̬', name: '有声音化記号' },
      { sym: 'ʰ', name: '帯気音記号' },
      { sym: 'ʲ', name: '口蓋化記号' },
      { sym: 'ʷ', name: '円唇化記号' },
      { sym: 'ˠ', name: '軟口蓋化記号' },
      { sym: 'ˤ', name: '咽頭化記号' },
      { sym: '̃', name: '鼻音化記号' },
      { sym: '̩', name: '音節主音記号' },
      { sym: '̯', name: '音節副音記号' },
      { sym: 'ˈ', name: '第一強勢 (主強勢)' },
      { sym: 'ˌ', name: '第二強勢 (副強勢)' },
      { sym: '˥', name: '超高調声調記号' },
      { sym: '˦', name: '高調声調記号' },
      { sym: '˧', name: '中調声調記号' },
      { sym: '˨', name: '低調声調記号' },
      { sym: '˩', name: '超低調声調記号' },
    ],
  },
];
