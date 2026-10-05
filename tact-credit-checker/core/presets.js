/**
 * TACT Credit Checker - Faculty Presets & Graduation Requirements
 *
 * 名古屋大学文学部（2023・2024・2025・2026年度生公式要覧対応）および汎用モデル
 * 参考資料: 名古屋大学教養教育院「全学教育科目履修の手引（Student's Guide 2023〜2026）」
 */

export const PRESET_VERSION = "2026.10.literature_v6";

export const SUPPORTED_FACULTIES = [
  { id: "nu-humanities", name: "名古屋大学 文学部（人文学科・22専攻対応）" },
  { id: "general-model", name: "【自由設定】汎用大学・学部モデル" }
];

// 名古屋大学文学部（人文学科）の全22専修（5学繫・22研究室）
// 卒業要件: 全学教育科目40単位＋専門系科目2単位＋専門科目82単位（卒論10単位含む）＝計124単位
export const LIT_DEPARTMENTS = [
  // 1. 言語文化学繫
  {
    id: "linguistics",
    name: "言語学専修",
    facultyGroup: "言語文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【言語学】演習・調査実習", requiredCredits: 24, note: "言語学演習、音声・音韻・統語演習、言語調査実習", keywords: ["言語学演習", "言語調査", "音声学演習", "音韻論演習", "統語論演習", "形態論演習", "言語学研究法"] },
      { id: "dept_elec_lecture", name: "【言語学】特殊講義・専門講義", requiredCredits: 34, note: "言語学特殊講義、音声学、音韻論、意味論、対照言語学", keywords: ["言語学特殊講義", "言語学特論", "音声学", "音韻論", "統語論", "意味論", "対照言語学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "japanese_ling",
    name: "日本語学専修",
    facultyGroup: "言語文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【日本語学】演習・史料講読", requiredCredits: 24, note: "日本語学演習、国語学演習、日本語史演習、方言学演習", keywords: ["日本語学演習", "国語学演習", "日本語史演習", "日本語講読", "方言学演習", "日本語学研究法"] },
      { id: "dept_elec_lecture", name: "【日本語学】特殊講義・専門講義", requiredCredits: 34, note: "日本語学特殊講義、日本語文法論、日本語音韻論、日本語語彙論", keywords: ["日本語学特殊講義", "国語学特殊講義", "日本語文法", "日本語音韻", "日本語語彙", "日本語史"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },

  // 2. 英語文化学繫
  {
    id: "english_ling",
    name: "英語学専修",
    facultyGroup: "英語文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【英語学】演習・文献講読", requiredCredits: 24, note: "英語学演習、英語史演習、英語学講読、統語論演習", keywords: ["英語学演習", "英語学講読", "英語史演習", "英語学文献講読", "統語論演習"] },
      { id: "dept_elec_lecture", name: "【英語学】特殊講義・専門講義", requiredCredits: 34, note: "英語学特殊講義、生成文法論、英語史、英語音声学", keywords: ["英語学特殊講義", "英語学特論", "英語史", "生成文法", "英語音声学", "認知言語学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "english_lit",
    name: "英米文学専修",
    facultyGroup: "英語文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【英米文学】演習・原典講読", requiredCredits: 24, note: "イギリス文学演習、アメリカ文学演習、英米文学講読", keywords: ["英米文学演習", "イギリス文学演習", "アメリカ文学演習", "英文学講読", "米文学講読"] },
      { id: "dept_elec_lecture", name: "【英米文学】特殊講義・専門講義", requiredCredits: 34, note: "英米文学特殊講義、イギリス文学史、アメリカ文学史、英米演劇論", keywords: ["英米文学特殊講義", "イギリス文学", "アメリカ文学", "英米演劇", "英米詩", "シェイクスピア"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },

  // 3. 文献思想学繫
  {
    id: "german_lit",
    name: "ドイツ語ドイツ文学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【ドイツ語ドイツ文学】演習・原典講読", requiredCredits: 24, note: "ドイツ語演習、ドイツ文学演習、ドイツ語原典講読", keywords: ["ドイツ語演習", "ドイツ文学演習", "ドイツ語講読", "ドイツ語学演習", "ドイツ語原典講読"] },
      { id: "dept_elec_lecture", name: "【ドイツ語ドイツ文学】特殊講義・専門講義", requiredCredits: 34, note: "ドイツ文学特殊講義、ドイツ語学特殊講義、ドイツ文学史", keywords: ["ドイツ文学特殊講義", "ドイツ語特殊講義", "ドイツ文学史", "ドイツ現代文学", "ゲーテ"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "german_cult",
    name: "ドイツ語圏文化学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【ドイツ語圏文化学】演習・文献講読", requiredCredits: 24, note: "ドイツ語圏文化学演習、ドイツ思想演習、オーストリア文化演習", keywords: ["ドイツ語圏文化学演習", "ドイツ文化演習", "ドイツ思想講読", "ドイツ文化論演習"] },
      { id: "dept_elec_lecture", name: "【ドイツ語圏文化学】特殊講義・専門講義", requiredCredits: 34, note: "ドイツ語圏文化学特殊講義、ドイツ思想史、ドイツ現代文化論", keywords: ["ドイツ語圏文化学特殊講義", "ドイツ文化論", "ドイツ思想", "比較文化論"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "french_lit",
    name: "フランス語フランス文学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【フランス語フランス文学】演習・原典講読", requiredCredits: 24, note: "フランス語演習、フランス文学演習、フランス語原典講読", keywords: ["フランス語演習", "フランス文学演習", "フランス語講読", "フランス文学講読"] },
      { id: "dept_elec_lecture", name: "【フランス語フランス文学】特殊講義・専門講義", requiredCredits: 34, note: "フランス文学特殊講義、フランス思想特殊講義、フランス文化論", keywords: ["フランス文学特殊講義", "フランス文化論", "フランス思想", "フランス演劇", "フランス詩"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "japanese_lit",
    name: "日本文学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【日本文学】演習・古典原典講読", requiredCredits: 24, note: "日本文学演習、古典文学演習、近代文学演習、古典原典講読", keywords: ["日本文学演習", "国文学演習", "日本古典文学演習", "日本近代文学演習", "国文学講読"] },
      { id: "dept_elec_lecture", name: "【日本文学】特殊講義・専門講義", requiredCredits: 34, note: "日本文学特殊講義（上代・中古・中世・近世・近代）", keywords: ["日本文学特殊講義", "上代文学", "中古文学", "中世文学", "近世文学", "近代文学", "現代文学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "chinese_lit",
    name: "中国語中国文学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【中国語中国文学】演習・原典講読", requiredCredits: 24, note: "中国語演習、中国文学演習、中国語学演習、漢詩文講読", keywords: ["中国語演習", "中国文学演習", "中国語講読", "漢詩演習", "中国語学演習"] },
      { id: "dept_elec_lecture", name: "【中国語中国文学】特殊講義・専門講義", requiredCredits: 34, note: "中国文学特殊講義、中国古典文学論、中国近現代文学論", keywords: ["中国文学特殊講義", "中国古典文学", "中国現代文学", "中国語史", "白話小説"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "philosophy",
    name: "哲学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【哲学】演習・原典講読", requiredCredits: 24, note: "哲学演習、倫理学演習、哲学文献講読、原典講読", keywords: ["哲学演習", "哲学講読", "倫理学演習", "哲学基本演習", "原典講読"] },
      { id: "dept_elec_lecture", name: "【哲学】特殊講義・専門講義", requiredCredits: 34, note: "哲学特殊講義、倫理学特殊講義、西洋哲学史、現代哲学", keywords: ["哲学特殊講義", "倫理学特殊講義", "西洋哲学史", "現代哲学", "認識論", "存在論"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "classics",
    name: "西洋古典学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【西洋古典学】演習・原典講読", requiredCredits: 24, note: "西洋古典学演習、ギリシャ語原典講読、ラテン語原典講読", keywords: ["西洋古典学演習", "古典語講読", "ギリシャ語演習", "ラテン語演習", "古典講読"] },
      { id: "dept_elec_lecture", name: "【西洋古典学】特殊講義・専門講義", requiredCredits: 34, note: "西洋古典学特殊講義、ギリシャ古典文学論、ローマ文学論", keywords: ["西洋古典学特殊講義", "ギリシャ神話", "ホメロス", "ローマ文学", "古典文学史"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "chinese_phil",
    name: "中国哲学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【中国哲学】演習・原典講読", requiredCredits: 24, note: "中国哲学演習、中国思想演習、漢籍原典講読", keywords: ["中国哲学演習", "中国思想演習", "漢籍講読", "儒教演習", "道教演習"] },
      { id: "dept_elec_lecture", name: "【中国哲学】特殊講義・専門講義", requiredCredits: 34, note: "中国哲学特殊講義、中国思想史、諸子百家論、宋明理学", keywords: ["中国哲学特殊講義", "中国思想史", "諸子百家", "朱子学", "陽明学", "儒教思想"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "indian_phil",
    name: "インド哲学専修",
    facultyGroup: "文献思想学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【インド哲学】演習・原典講読", requiredCredits: 24, note: "インド哲学演習、仏教学演習、サンスクリット原典講読", keywords: ["インド哲学演習", "仏教学演習", "サンスクリット語", "チベット語", "パーリ語", "仏典講読"] },
      { id: "dept_elec_lecture", name: "【インド哲学】特殊講義・専門講義", requiredCredits: 34, note: "インド哲学特殊講義、仏教学特殊講義、大乗仏教思想論", keywords: ["インド哲学特殊講義", "仏教学特殊講義", "インド思想史", "大乗仏教", "ウパニシャッド"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },

  // 4. 歴史文化学繫
  {
    id: "japanese_history",
    name: "日本史学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【日本史学】演習・古文書史料講読", requiredCredits: 24, note: "日本史学演習（古代・中世・近世・近現代）、古文書史料講読", keywords: ["日本史学演習", "日本史演習", "古文書学", "日本史史料講読", "日本古代史演習", "日本中世史演習", "日本近世史演習", "日本近現代史演習"] },
      { id: "dept_elec_lecture", name: "【日本史学】特殊講義・専門講義", requiredCredits: 34, note: "日本史学特殊講義（古代史・中世史・近世史・近現代史）", keywords: ["日本史学特殊講義", "日本古代史", "日本中世史", "日本近世史", "日本近現代史", "日本文化史"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "oriental_history",
    name: "東洋史学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【東洋史学】演習・漢文史料講読", requiredCredits: 24, note: "東洋史学演習、漢文史料講読、アジア史演習", keywords: ["東洋史学演習", "東洋史演習", "中国史演習", "漢文史料講読", "アジア史演習"] },
      { id: "dept_elec_lecture", name: "【東洋史学】特殊講義・専門講義", requiredCredits: 34, note: "東洋史学特殊講義、中国古代史、明清史、中央ユーラシア史", keywords: ["東洋史学特殊講義", "中国古代史", "明清史", "中央ユーラシア史", "東南アジア史"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "western_history",
    name: "西洋史学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【西洋史学】演習・外国語史料講読", requiredCredits: 24, note: "西洋史学演習、欧文史料講読、西洋史各時代演習", keywords: ["西洋史学演習", "西洋史演習", "ヨーロッパ中世史演習", "西洋近現代史演習", "欧文史料講読"] },
      { id: "dept_elec_lecture", name: "【西洋史学】特殊講義・専門講義", requiredCredits: 34, note: "西洋史学特殊講義、古代地中海史、ヨーロッパ中世史、西洋近現代史", keywords: ["西洋史学特殊講義", "古代地中海史", "ヨーロッパ中世史", "近代ヨーロッパ史", "アメリカ現代史"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "art_history",
    name: "美学美術史学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_seminar", name: "【美学美術史学】演習・作品調査・文献講読", requiredCredits: 24, note: "美術史学演習、美学演習、作品研究、美術史文献講読", keywords: ["美術史学演習", "美術史演習", "美学演習", "作品研究", "美術史講読"] },
      { id: "dept_elec_lecture", name: "【美学美術史学】特殊講義・専門講義", requiredCredits: 34, note: "美学美術史学特殊講義、日本・東洋・西洋美術史論", keywords: ["美術史学特殊講義", "日本美術史", "東洋美術史", "西洋美術史", "美学理論", "芸術学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "archaeology",
    name: "考古学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_prac", name: "【考古学】発掘調査実習・実測実習", requiredCredits: 8, note: "考古学発掘調査実習、実測・遺物整理実習（必修8単位）", keywords: ["考古学実習", "発掘調査", "実測実習", "考古学調査", "出土遺物実習"] },
      { id: "dept_req_seminar", name: "【考古学】演習・文献講読", requiredCredits: 16, note: "考古学演習、考古学文献講読、物質文化演習", keywords: ["考古学演習", "考古学研究法", "物質文化演習"] },
      { id: "dept_elec_lecture", name: "【考古学】特殊講義・専門講義", requiredCredits: 34, note: "考古学特殊講義、日本考古学、先史考古学、東アジア考古学", keywords: ["考古学特殊講義", "日本考古学", "先史考古学", "歴史考古学", "東アジア考古学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "cultural_anthro",
    name: "文化人類学専修",
    facultyGroup: "歴史文化学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_prac", name: "【文化人類学】フィールドワーク・調査実習", requiredCredits: 6, note: "文化人類学現地調査実習、民族誌調査実習（必修6単位）", keywords: ["フィールドワーク実習", "現地調査実習", "民族誌実習", "人類学調査"] },
      { id: "dept_req_seminar", name: "【文化人類学】演習・文献講読", requiredCredits: 18, note: "文化人類学演習、民族誌演習、人類学理論演習", keywords: ["文化人類学演習", "人類学演習", "民族誌演習", "民族学演習"] },
      { id: "dept_elec_lecture", name: "【文化人類学】特殊講義・専門講義", requiredCredits: 34, note: "文化人類学特殊講義、宗教人類学、医療人類学、地域研究", keywords: ["文化人類学特殊講義", "医療人類学", "宗教人類学", "生態人類学", "地域研究"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },

  // 5. 環境行動学繫
  {
    id: "sociology",
    name: "社会学専修",
    facultyGroup: "環境行動学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_prac", name: "【社会学】社会調査実習（社会調査士対応）", requiredCredits: 6, note: "社会調査実習、計量・質的調査実習（必修6単位）", keywords: ["社会調査実習", "社会調査法", "社会調査演習", "計量社会学実習"] },
      { id: "dept_req_seminar", name: "【社会学】演習・文献講読", requiredCredits: 18, note: "社会学演習、社会学理論演習、地域社会学演習", keywords: ["社会学演習", "社会学理論演習", "地域社会学演習", "家族社会学演習"] },
      { id: "dept_elec_lecture", name: "【社会学】特殊講義・専門講義", requiredCredits: 34, note: "社会学特殊講義、社会学理論、地域社会論、産業社会学", keywords: ["社会学特殊講義", "社会学理論", "地域社会論", "産業社会学", "文化社会学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "psychology",
    name: "心理学専修",
    facultyGroup: "環境行動学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_prac", name: "【心理学】実験実習・心理統計実習", requiredCredits: 8, note: "心理学実験実習Ⅰ・Ⅱ、心理統計法実習（必修8単位）", keywords: ["心理学実験", "心理学実習", "心理統計", "実験実習", "心理学実験実習"] },
      { id: "dept_req_seminar", name: "【心理学】演習・研究法", requiredCredits: 16, note: "心理学演習、認知心理学演習、発達心理学演習", keywords: ["心理学演習", "認知心理学演習", "発達心理学演習", "社会心理学演習", "心理学研究法"] },
      { id: "dept_elec_lecture", name: "【心理学】特殊講義・専門講義", requiredCredits: 34, note: "心理学特殊講義、認知心理学、発達心理学、生理心理学、社会心理学", keywords: ["心理学特殊講義", "認知心理学", "発達心理学", "生理心理学", "社会心理学", "知覚心理学"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  },
  {
    id: "geography",
    name: "地理学専修",
    facultyGroup: "環境行動学繫",
    thesisCredits: 10,
    categories: [
      { id: "dept_req_prac", name: "【地理学】野外実習（巡検）・地域調査法", requiredCredits: 6, note: "地理学野外実習（巡検）、GIS実習、地域調査実習（必修6単位）", keywords: ["地理学野外実習", "野外実習", "巡検", "地域調査実習", "地理情報実習", "GIS実習"] },
      { id: "dept_req_seminar", name: "【地理学】演習・文献講読", requiredCredits: 18, note: "地理学演習、自然地理学演習、人文地理学演習", keywords: ["地理学演習", "自然地理学演習", "人文地理学演習", "地理学講読"] },
      { id: "dept_elec_lecture", name: "【地理学】特殊講義・専門講義", requiredCredits: 34, note: "地理学特殊講義、自然地理学、人文地理学、気候学、地形学、GIS", keywords: ["地理学特殊講義", "自然地理学", "人文地理学", "気候学", "地形学", "都市地理学", "GIS"] },
      { id: "dept_free", name: "関連専門科目・自由選択", requiredCredits: 10, note: "他専修専門科目、他学部科目、全学超過分", keywords: [] }
    ]
  }
];

/**
 * 文学部の専修に合わせたカテゴリ配列を動的生成
 */
export function buildLiteratureCategories(deptId = "philosophy") {
  const dept = LIT_DEPARTMENTS.find(d => d.id === deptId) || LIT_DEPARTMENTS[0];
  const deptName = dept.name.replace("専修", "");

  const generalCats = [
    // --- 全学教育科目（計40単位 / 進級要件36単位） ---
    // [中区分: 基礎科目群 (36単位)]
    {
      id: "intro_study",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "「大学での学び」基礎論",
      requiredCredits: 1,
      advancementRequired: 1,
      note: "1年次Ⅰ期必修（1単位）",
      keywords: ["大学での学び", "大学での学び基礎論", "学び基礎論"]
    },
    {
      id: "seminar",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "基礎セミナー",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "1年次Ⅰ期必修（2単位）",
      keywords: ["基礎セミナー"]
    },
    {
      id: "lang_en",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "言語文化科目：英語",
      requiredCredits: 10,
      advancementRequired: 10,
      note: "必修10単位（英語基礎2, 中級2, コミュニケーション2, 上級2, 上級リーディング2）",
      keywords: ["英語", "English", "Academic English", "リーディング"]
    },
    {
      id: "lang_second",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "言語文化科目：初修外国語",
      requiredCredits: 10,
      advancementRequired: 10,
      note: "1つの言語で10単位修得: 独・仏・露・中・西・朝（外国人留学生は日本語可）",
      keywords: ["ドイツ語", "フランス語", "ロシア語", "中国語", "スペイン語", "朝鮮語", "韓国語", "日本語", "German", "French", "Chinese"]
    },
    {
      id: "hum_soc",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "人文・社会系基礎科目",
      requiredCredits: 8,
      advancementRequired: 6,
      note: "人文学・社会科学分野の基礎講義から8単位（進級判定には6単位以上）",
      keywords: [
        "哲学", "歴史学", "文学", "心理学", "社会学", "地理学", "法学", "政治学", "経済学",
        "経営・会計", "宗教学・文化人類学", "宗教学", "文化人類学", "教育学", "比較文化論",
        "比較教育論", "統計学", "アーカイブズ学", "日本国憲法", "高等教育学", "人文社会", "人文・社会"
      ]
    },
    {
      id: "health_sports_lec",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "健康・スポーツ科学講義",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "健康・スポーツ科学講義（2単位必修 ※工学部・法学部以外は講義・実習ともに必修）",
      keywords: ["健康・スポーツ科学講義", "健康スポーツ科学講義", "スポーツ科学講義", "健康科学講義", "健康・スポーツ科学(講義)"]
    },
    {
      id: "health_sports_prac",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "健康・スポーツ科学実習",
      requiredCredits: 2,
      advancementRequired: 1,
      note: "健康・スポーツ科学実習（各1単位×2科目＝計2単位必修）",
      keywords: ["健康・スポーツ科学実習", "健康スポーツ科学実習", "スポーツ科学実習", "身体運動", "健康科学実習", "バドミントン", "テニス", "卓球", "サッカー", "バスケット", "バレー", "水泳", "フィットネス", "スキー", "スポーツ実習"]
    },
    {
      id: "data_sci",
      section: "全学教育科目",
      group: "基礎科目",
      scope: "ilas",
      name: "データ科学科目",
      requiredCredits: 1,
      advancementRequired: 1,
      note: "データ科学基礎科目（原則1単位）",
      keywords: ["データ科学", "データサイエンス", "データ科学の基礎", "データ科学基礎"]
    },

    // [中区分: 総合科目群 (4単位)]
    {
      id: "intl_understanding",
      section: "全学教育科目",
      group: "総合科目",
      scope: "ilas",
      name: "国際理解科目",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "国際理解・多文化共生等の科目から2単位",
      keywords: [
        "国際理解", "多文化共生", "国際関係論", "国際開発学", "国際学", "英語・プレゼンテーション",
        "グローバル化時代の国際社会", "グローバル化と国際教育交流", "留学生と日本", "日本語教育実践入門",
        "フランス語・アカデミック", "囲碁と日本文化", "海外言語文化演習", "短期海外研修", "海外留学準備セミナー"
      ]
    },
    {
      id: "modern_liberal",
      section: "全学教育科目",
      group: "総合科目",
      scope: "ilas",
      name: "現代教養科目／超学部セミナー",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "「現代教養科目（自然系）」又は「現代教養科目（学際・融合系）」から2単位",
      keywords: [
        "現代教養", "超学部セミナー", "現代社会と教育", "歴史学入門", "言語学入門", "文化・芸術学入門",
        "社会学入門", "心理学入門", "法学入門", "政治学入門", "経済概論", "経営・会計入門",
        "環境学入門", "博物館概論", "芸術論", "大学でどう生きるか", "青年期における心の健康",
        "社会安全学", "ジェンダー学", "学問の面白さを知る"
      ]
    },

    // --- 専門系科目（計2単位 / 進級要件2単位） ---
    {
      id: "major_basics",
      section: "専門系科目",
      group: "専門基礎科目",
      scope: "faculty",
      name: "専門基礎科目（人文学入門）",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "人文学入門Ⅰ・人文学入門Ⅱ・人文学入門Ⅲ・人文学入門Ⅳから2単位必修（2年次進級要件）",
      keywords: ["人文学入門Ⅰ", "人文学入門Ⅱ", "人文学入門Ⅲ", "人文学入門Ⅳ", "人文学入門1", "人文学入門2", "人文学入門3", "人文学入門4", "人文学入門", "専門基礎"]
    },

    // --- 専門科目（計82単位） ---
    // [中区分: 全専修共通科目 (4単位)]
    {
      id: "major_common_base",
      section: "専門科目",
      group: "全専修共通科目",
      scope: "faculty",
      name: "共通基盤科目",
      requiredCredits: dept.commonBaseCredits || 2,
      advancementRequired: 0,
      note: "日本文化事情(1), 異文化理解(1), 人間と倫理, ジェンダー学概論(1), セクシュアリティ学概論(1), 国際移民論, ナショナリズム・トランスナショナリズム論",
      keywords: [
        "日本文化事情",
        "異文化理解",
        "人間と倫理",
        "ジェンダー学概論",
        "セクシュアリティ学概論",
        "国際移民論",
        "ナショナリズム・トランスナショナリズム論",
        "ナショナリズム論",
        "共通基盤"
      ]
    },
    {
      id: "major_common_practice",
      section: "専門科目",
      group: "全専修共通科目",
      scope: "faculty",
      name: "共通実践科目",
      requiredCredits: dept.commonPracticeCredits || 2,
      advancementRequired: 0,
      note: "人文学の学生のための情報リテラシー(1), 科学技術と人文学(1), 応用倫理学演習, デジタル人文学(1), 人文学のためのコミュニケーションスキル(1), 人文科学イノベーション創出と課題解決(1)",
      keywords: [
        "人文学の学生のための情報リテラシー",
        "情報リテラシー",
        "科学技術と人文学",
        "応用倫理学演習",
        "応用倫理学",
        "デジタル人文学",
        "人文学のためのコミュニケーションスキル",
        "コミュニケーションスキル",
        "人文科学イノベーション創出と課題解決",
        "人文科学イノベーション",
        "共通実践"
      ]
    },
    // [中区分: 専修必修科目 (卒業論文 10単位)]
    {
      id: "major_thesis",
      section: "専門科目",
      group: "専修必修科目",
      scope: "faculty",
      name: `【${dept.name}】卒業論文`,
      requiredCredits: dept.thesisCredits || 10,
      advancementRequired: 0,
      note: "4年次卒業論文（10単位必修・卒業論文審査合格要件）",
      keywords: ["卒業論文", "卒業研究", "卒論", "学士論文"]
    }
  ];

  // 各専修固有の専門科目区分（実習・演習・特殊講義・自由選択）を展開
  const deptSpecificCats = (dept.categories || []).map(cat => {
    let group = "専修選択科目";
    if (cat.id.includes("req_prac") || cat.id.includes("req_seminar")) {
      group = "専修必修科目";
    } else if (cat.id.includes("free")) {
      group = "自由選択・関連科目";
    }
    return {
      ...cat,
      section: "専門科目",
      group: group,
      scope: "faculty",
      advancementRequired: 0
    };
  });

  return [...generalCats, ...deptSpecificCats];
}

export const DEFAULT_PRESETS = [
  {
    id: "nu-humanities",
    name: "名古屋大学 文学部（2023〜2026年度生公式要覧対応）",
    faculty: "文学部",
    totalRequired: 124,
    guideUrl: "https://office.ilas.nagoya-u.ac.jp/",
    note: "名古屋大学 教養教育院「全学教育科目履修の手引（Student's Guide 2023〜2026）」および文学部履修要覧に完全準拠。",
    advancementRequired: 38, // 2年次終了時進級判定（全学36単位＋専門基礎2単位＝38単位）
    categories: buildLiteratureCategories("philosophy")
  },
  {
    id: "general-model",
    name: "【自由設定】汎用大学・学部モデル",
    faculty: "汎用モデル",
    totalRequired: 124,
    guideUrl: "",
    note: "各区分の必要単位数や名称を学修要覧に合わせて自由に設定できる汎用モデル。",
    advancementRequired: 0,
    categories: [
      { id: "gen_common", section: "全学教育科目", name: "教養・共通教育科目", requiredCredits: 30, note: "初年次ゼミ、外国語、人文社会、自然情報等", keywords: ["教養", "共通", "英語", "外国語"] },
      { id: "major_req", section: "学部専門科目", name: "専門必修科目", requiredCredits: 40, note: "学科・専攻必修、卒業研究等", keywords: ["必修", "演習", "卒業論文", "卒業研究"] },
      { id: "major_elec", section: "学部専門科目", name: "専門選択科目", requiredCredits: 40, note: "専門選択講義", keywords: ["選択", "論", "特論"] },
      { id: "free_elec", section: "学部専門科目", name: "自由選択・他学部履修", requiredCredits: 14, note: "関連科目・他学部科目", keywords: [] }
    ]
  }
];
