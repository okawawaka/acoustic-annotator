/**
 * TACT Credit Checker - Faculty Presets & Graduation Requirements
 *
 * 名古屋大学文学部（2023・2024・2025・2026年度生公式要覧対応）および汎用モデル
 * 参考資料: 名古屋大学教養教育院「全学教育科目履修の手引（Student's Guide 2023〜2026）」
 */

export const PRESET_VERSION = "2026.10.literature_v3";

export const SUPPORTED_FACULTIES = [
  { id: "nu-humanities", name: "名古屋大学 文学部（人文学科）" },
  { id: "general-model", name: "【自由設定】汎用大学・学部モデル" }
];

// 名古屋大学文学部（人文学科）の全16専修
export const LIT_DEPARTMENTS = [
  { id: "philosophy", name: "哲学・倫理学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "eastern_phil", name: "インド哲学仏教学・宗教学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "japanese_history", name: "日本史学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "oriental_history", name: "東洋史学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "western_history", name: "西洋史学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "archaeology", name: "考古学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "japanese_lit", name: "日本語学・日本文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "linguistics", name: "言語学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "english_lit", name: "英語学・英米文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "french_lit", name: "フランス語学・フランス文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "german_lit", name: "ドイツ語学・ドイツ文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "russian_lit", name: "ロシア語学・ロシア文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "chinese_lit", name: "中国語学・中国文学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "human_dev", name: "人間発達科学専修（心理学等）", reqCredits: 34, elecCredits: 34, freeCredits: 14 },
  { id: "sociology", name: "社会学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "geography", name: "地理学専修", reqCredits: 32, elecCredits: 36, freeCredits: 14 },
  { id: "custom", name: "その他の専修・独自設定", reqCredits: 32, elecCredits: 36, freeCredits: 14 }
];

/**
 * 文学部の専修に合わせたカテゴリ配列を動的生成
 */
export function buildLiteratureCategories(deptId = "philosophy") {
  const dept = LIT_DEPARTMENTS.find(d => d.id === deptId) || LIT_DEPARTMENTS[0];
  const deptName = dept.name.replace("専修", "");

  return [
    // --- 全学教育科目（計40単位 / 進級要件36単位） ---
    {
      id: "intro_study",
      section: "全学教育科目",
      name: "「大学での学び」基礎論",
      requiredCredits: 1,
      advancementRequired: 1,
      note: "1年次Ⅰ期必修（1単位）",
      keywords: ["大学での学び", "大学での学び基礎論", "学び基礎論"]
    },
    {
      id: "seminar",
      section: "全学教育科目",
      name: "基礎セミナー",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "1年次Ⅰ期必修（2単位）",
      keywords: ["基礎セミナー"]
    },
    {
      id: "lang_en",
      section: "全学教育科目",
      name: "言語文化科目：英語",
      requiredCredits: 10,
      advancementRequired: 10,
      note: "必修10単位（英語基礎2, 中級2, コミュニケーション2, 上級2, 上級リーディング2）",
      keywords: ["英語", "English", "Academic English", "リーディング"]
    },
    {
      id: "lang_second",
      section: "全学教育科目",
      name: "言語文化科目：初修外国語",
      requiredCredits: 10,
      advancementRequired: 10,
      note: "1つの言語で10単位修得: 独・仏・露・中・西・朝（外国人留学生は日本語可）",
      keywords: ["ドイツ語", "フランス語", "ロシア語", "中国語", "スペイン語", "朝鮮語", "韓国語", "日本語", "German", "French", "Chinese"]
    },
    {
      id: "hum_soc",
      section: "全学教育科目",
      name: "人文・社会系基礎科目",
      requiredCredits: 8,
      advancementRequired: 6,
      note: "人文学・社会科学分野の基礎講義から8単位（進級判定には6単位以上）",
      keywords: ["哲学", "歴史", "心理", "地理", "法学", "経済学", "政治学", "社会学", "宗教学", "論理学", "倫理学", "芸術", "日本史", "東洋史", "西洋史"]
    },
    {
      id: "health_sports",
      section: "全学教育科目",
      name: "健康・スポーツ科学科目",
      requiredCredits: 2,
      advancementRequired: 1,
      note: "講義または実習から2単位（進級判定には1単位以上）",
      keywords: ["健康", "スポーツ", "健康・スポーツ", "身体運動", "体育", "実習"]
    },
    {
      id: "data_sci",
      section: "全学教育科目",
      name: "データ科学科目",
      requiredCredits: 1,
      advancementRequired: 1,
      note: "講義1単位（随意科目としてデータ科学基礎演習Aを履修可能）",
      keywords: ["データ科学", "データサイエンス", "情報", "データ科学の基礎", "データ科学基礎演習"]
    },
    {
      id: "intl_understanding",
      section: "全学教育科目",
      name: "国際理解科目",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "国際理解・多文化共生等の科目から2単位",
      keywords: ["国際理解", "国際", "グローバル", "多文化", "共生"]
    },
    {
      id: "modern_liberal",
      section: "全学教育科目",
      name: "現代教養科目／超学部セミナー",
      requiredCredits: 4,
      advancementRequired: 2,
      note: "「現代教養科目（自然系）」又は「現代教養科目（学際・融合系）」2単位を含む4単位",
      keywords: ["現代教養", "超学部セミナー", "自然系", "学際", "環境", "生命倫理"]
    },

    // --- 学部専門科目（計84単位 / 進級要件2単位） ---
    {
      id: "major_basics",
      section: "学部専門科目",
      name: "専門基礎科目",
      requiredCredits: 2,
      advancementRequired: 2,
      note: "文学部専門基礎科目（人文学入門等）2単位必修",
      keywords: ["専門基礎", "人文学入門", "人文学基礎", "概論"]
    },
    {
      id: "major_req",
      section: "学部専門科目",
      name: `【${deptName}】専修必修科目`,
      requiredCredits: dept.reqCredits,
      advancementRequired: 0,
      note: `専修必修の基礎講読・演習・卒業論文（8単位）等 計${dept.reqCredits}単位`,
      keywords: ["演習", "講読", "卒業論文", "卒論", "必修"]
    },
    {
      id: "major_elec",
      section: "学部専門科目",
      name: `【${deptName}】専修選択科目`,
      requiredCredits: dept.elecCredits,
      advancementRequired: 0,
      note: `専修専門講義・特殊講義 計${dept.elecCredits}単位`,
      keywords: ["特論", "特殊研究", "特殊講義", "講義", "研究"]
    },
    {
      id: "major_free",
      section: "学部専門科目",
      name: "関連専門科目・自由選択",
      requiredCredits: dept.freeCredits,
      advancementRequired: 0,
      note: `他専修科目、他学部科目、全学教育超過分 計${dept.freeCredits}単位`,
      keywords: []
    }
  ];
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
