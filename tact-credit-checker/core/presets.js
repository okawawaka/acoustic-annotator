/**
 * TACT Credit Checker - Faculty Presets & Graduation Requirements
 * 名古屋大学全9学部・専攻別の学修要覧（履修の手引・学生便覧）単位配当モデル
 *
 * ※ 名古屋大学の卒業要件単位は入学年度・専攻・系ごとにそれぞれ設定されています。
 * 　 本テンプレートは各学部の標準的な単位配当枠組みを提供します。
 * 　 必ずご自身の入学年度の「全学教育科目履修の手引」および各学部の「学生便覧」の
 * 　 単位配当表を確認し、必要単位数を手動で照合・調整してください。
 */

export const NU_FACULTIES = [
  { id: "humanities", name: "文学部" },
  { id: "education", name: "教育学部" },
  { id: "law", name: "法学部" },
  { id: "economics", name: "経済学部" },
  { id: "informatics", name: "情報学部" },
  { id: "science", name: "理学部" },
  { id: "medicine", name: "医学部" },
  { id: "engineering", name: "工学部" },
  { id: "agriculture", name: "農学部" },
  { id: "other", name: "その他・他大学" }
];

export const DEFAULT_PRESETS = [
  // 1. 文学部
  {
    id: "nu-humanities",
    name: "名古屋大学 文学部（人文学科 各専修）",
    faculty: "文学部",
    totalRequired: 124,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度の学生便覧（文学部履修要覧）の単位配当表を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English等", keywords: ["英語", "English", "Academic English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "同一言語4単位（独・仏・中・露・西・朝など）", keywords: ["ドイツ語", "フランス語", "中国語", "ロシア語", "スペイン語", "コリア語", "朝鮮語"] },
      { id: "gen_hum", section: "全学教育科目", name: "文系基礎・教養科目", requiredCredits: 12, note: "哲学・歴史・文学・社会・法・経済等", keywords: ["哲学", "歴史", "心理", "社会学", "地理", "法学", "政治学", "経済学", "倫理", "宗教学", "芸術"] },
      { id: "gen_sci", section: "全学教育科目", name: "理系基礎・自然情報科目", requiredCredits: 4, note: "数学・自然科学・情報基礎", keywords: ["数学", "物理", "化学", "生物", "地学", "情報", "統計", "データサイエンス"] },
      { id: "sports", section: "全学教育科目", name: "健康・スポーツ科学", requiredCredits: 2, note: "実技1単位または健康科学講義", keywords: ["スポーツ", "健康科学", "体育", "身体運動"] },
      { id: "major_basics", section: "専門教育科目", name: "専門基礎科目", requiredCredits: 12, note: "専修導入・概論科目", keywords: ["概論", "基礎", "入門"] },
      { id: "major_req", section: "専門教育科目", name: "専攻必修科目（演習・卒論）", requiredCredits: 28, note: "演習・講読・卒業論文（8単位）等", keywords: ["演習", "講読", "卒業論文", "卒論", "特論"] },
      { id: "major_elec", section: "専門教育科目", name: "専攻選択科目", requiredCredits: 36, note: "専修内外の専門講義", keywords: ["特殊研究", "講義", "史学", "文学", "言語学"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択・他学部履修", requiredCredits: 20, note: "他専修・他学部科目、全学超過分", keywords: [] }
    ]
  },

  // 2. 情報学部 自然情報学科
  {
    id: "nu-info-natural",
    name: "名古屋大学 情報学部 自然情報学科",
    faculty: "情報学部",
    totalRequired: 128,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度の学生便覧（情報学部）の単位配当表を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English等", keywords: ["英語", "English", "Academic English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "独・仏・中など", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "sci_math", section: "全学教育科目", name: "数理・情報・自然科学基礎", requiredCredits: 16, note: "微積分・線形代数・物理・情報基礎等", keywords: ["微分積分", "線形代数", "情報基礎", "コンピュータ", "物理学"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・健康スポーツ", requiredCredits: 8, note: "文系基礎、スポーツ科学等", keywords: ["社会", "法", "経済", "哲学", "スポーツ", "健康"] },
      { id: "major_req", section: "専門教育科目", name: "学科必修科目（実験・研究）", requiredCredits: 46, note: "数理・プログラミング・実験・卒業研究", keywords: ["実験", "プログラミング", "情報数理", "卒業研究", "特別研究"] },
      { id: "major_elec", section: "専門教育科目", name: "学科選択科目", requiredCredits: 34, note: "情報学展開科目", keywords: ["機械学習", "知能情報", "複雑系", "データ構造", "認知科学"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択・他学部等", requiredCredits: 14, note: "他学科・他学部履修等", keywords: [] }
    ]
  },

  // 3. 情報学部 コンピュータ科学科
  {
    id: "nu-info-cs",
    name: "名古屋大学 情報学部 コンピュータ科学科",
    faculty: "情報学部",
    totalRequired: 128,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度の学生便覧（情報学部）の単位配当表を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English", "Academic English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "sci_math", section: "全学教育科目", name: "数理・自然科学基礎", requiredCredits: 16, note: "微積分、線形代数、物理学等", keywords: ["微分積分", "線形代数", "情報基礎", "離散数学"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・健康スポーツ", requiredCredits: 8, note: "教養・スポーツ", keywords: ["社会", "法", "経済", "スポーツ", "健康"] },
      { id: "major_req", section: "専門教育科目", name: "専攻必修科目（実験・卒研）", requiredCredits: 48, note: "計算機アーキテクチャ、実験、卒業研究", keywords: ["実験", "計算機", "ソフトウェア", "アルゴリズム", "卒業研究"] },
      { id: "major_elec", section: "専門教育科目", name: "専攻選択科目", requiredCredits: 32, note: "計算機科学展開科目", keywords: ["ネットワーク", "OS", "セキュリティ", "言語処理"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 14, note: "他学科・他学部科目", keywords: [] }
    ]
  },

  // 4. 工学部
  {
    id: "nu-engineering",
    name: "名古屋大学 工学部（各学科共通モデル）",
    faculty: "工学部",
    totalRequired: 132,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度・学科（化学生命/物理/マテリアル/電気電子情報/機械航空/社会環境）の学生便覧を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語4単位", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "sci_math", section: "全学教育科目", name: "数学・自然科学基礎科目", requiredCredits: 22, note: "微積分、線形代数、物理学・化学及び実験", keywords: ["微分積分", "線形代数", "物理学", "物理学実験", "化学", "化学実験"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・健康スポーツ", requiredCredits: 8, note: "文系基礎・スポーツ", keywords: ["歴史", "哲学", "法", "経済", "社会", "スポーツ"] },
      { id: "major_req", section: "専門教育科目", name: "学科必修科目（実験・創成・卒論）", requiredCredits: 52, note: "学科基盤、学生実験、卒業研究", keywords: ["工学", "力学", "実験", "製図", "演習", "設計", "卒業研究"] },
      { id: "major_elec", section: "専門教育科目", name: "学科選択科目", requiredCredits: 30, note: "専門展開科目", keywords: ["応用", "材料", "熱力学", "制御", "電磁気", "システム"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 10, note: "他学科・超過分", keywords: [] }
    ]
  },

  // 5. 経済学部
  {
    id: "nu-economics",
    name: "名古屋大学 経済学部（経済学科・経営学科）",
    faculty: "経済学部",
    totalRequired: 124,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度の学生便覧（経済学部）の単位配当表を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・文系基礎", requiredCredits: 10, note: "社会・人文学分野", keywords: ["歴史", "哲学", "社会", "法学", "政治"] },
      { id: "gen_sci", section: "全学教育科目", name: "数理・自然・情報基礎", requiredCredits: 6, note: "微積分・線形代数・情報", keywords: ["数学", "微分積分", "線形代数", "情報", "統計"] },
      { id: "sports", section: "全学教育科目", name: "健康・スポーツ科学", requiredCredits: 2, note: "実技または講義", keywords: ["スポーツ", "健康"] },
      { id: "major_basics", section: "専門教育科目", name: "専門基礎科目（入門・概論）", requiredCredits: 16, note: "ミクロ・マクロ経済学入門、経営学入門等", keywords: ["ミクロ", "マクロ", "経済学入門", "経営学入門", "会計"] },
      { id: "major_req", section: "専門教育科目", name: "学科必修・ゼミナール", requiredCredits: 12, note: "演習（ゼミ）、卒業論文等", keywords: ["演習", "ゼミ", "卒業論文"] },
      { id: "major_elec", section: "専門教育科目", name: "専門選択科目", requiredCredits: 48, note: "経済学・経営学専門講義", keywords: ["金融", "財政", "マーケティング", "組織", "計量"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 20, note: "他学部・全学超過分", keywords: [] }
    ]
  },

  // 6. 法学部
  {
    id: "nu-law",
    name: "名古屋大学 法学部（法律・政治学科）",
    faculty: "法学部",
    totalRequired: 124,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度の学生便覧（法学部）の単位配当表を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "gen_hum", section: "全学教育科目", name: "文系基礎・教養科目", requiredCredits: 12, note: "人文学・社会科学分野", keywords: ["歴史", "哲学", "社会学", "経済学"] },
      { id: "gen_sci", section: "全学教育科目", name: "自然情報・数理科目", requiredCredits: 4, note: "自然科学・情報", keywords: ["数学", "情報", "自然科学"] },
      { id: "sports", section: "全学教育科目", name: "健康・スポーツ科学", requiredCredits: 2, note: "実技または講義", keywords: ["スポーツ", "健康"] },
      { id: "major_basics", section: "専門教育科目", name: "専門基礎科目（法学・政治学入門）", requiredCredits: 16, note: "憲法・民法・刑法・政治学基礎", keywords: ["憲法", "民法", "刑法", "法学入門", "政治学"] },
      { id: "major_req", section: "専門教育科目", name: "専門必修・演習", requiredCredits: 8, note: "専門演習（ゼミ）", keywords: ["演習", "ゼミ"] },
      { id: "major_elec", section: "専門教育科目", name: "専門選択科目（基幹・展開）", requiredCredits: 52, note: "商法・行政法・訴訟法・国際法・政治理論等", keywords: ["商法", "行政法", "訴訟", "労働法", "国際法"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 20, note: "他学部・超過分", keywords: [] }
    ]
  },

  // 7. 理学部
  {
    id: "nu-science",
    name: "名古屋大学 理学部（各学科モデル）",
    faculty: "理学部",
    totalRequired: 128,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度・系（数理/物理/化学/生物地球）の学生便覧を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "sci_math", section: "全学教育科目", name: "数学・自然科学基礎", requiredCredits: 22, note: "微積分、線形代数、物理学・化学・生物実験", keywords: ["微分積分", "線形代数", "物理学", "化学", "生物学", "実験"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・健康スポーツ", requiredCredits: 8, note: "教養・スポーツ", keywords: ["歴史", "哲学", "社会", "スポーツ"] },
      { id: "major_req", section: "専門教育科目", name: "学科必修科目（実験・研究）", requiredCredits: 46, note: "専門基礎、実験・演習、卒業研究", keywords: ["実験", "演習", "解析", "特別研究", "卒業研究"] },
      { id: "major_elec", section: "専門教育科目", name: "学科選択科目", requiredCredits: 30, note: "専門講義", keywords: ["代数", "幾何", "量子", "有機", "無機", "細胞"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 12, note: "他学科・他学部履修", keywords: [] }
    ]
  },

  // 8. 農学部
  {
    id: "nu-agriculture",
    name: "名古屋大学 農学部（生物環境/資源生物/応用生命）",
    faculty: "農学部",
    totalRequired: 128,
    guideUrl: "https://www.ilas.nagoya-u.ac.jp/",
    note: "※ 入学年度・学科の学生便覧を必ず確認してください。",
    categories: [
      { id: "seminar", section: "全学教育科目", name: "基礎セミナー", requiredCredits: 2, note: "1年次必修", keywords: ["基礎セミナー"] },
      { id: "lang_en", section: "全学教育科目", name: "言語文化：英語", requiredCredits: 4, note: "Academic English", keywords: ["英語", "English"] },
      { id: "lang_second", section: "全学教育科目", name: "言語文化：初修外国語", requiredCredits: 4, note: "初修外国語", keywords: ["ドイツ語", "フランス語", "中国語"] },
      { id: "sci_math", section: "全学教育科目", name: "数学・自然科学基礎", requiredCredits: 20, note: "化学・生物学・物理・微積分及び実験", keywords: ["化学", "生物学", "物理学", "微分積分", "実験"] },
      { id: "gen_hum", section: "全学教育科目", name: "人文社会・スポーツ", requiredCredits: 8, note: "教養・健康スポーツ", keywords: ["哲学", "歴史", "社会", "スポーツ"] },
      { id: "major_req", section: "専門教育科目", name: "専攻必修科目（実験・卒論）", requiredCredits: 48, note: "農学基礎、学生実習・実験、卒業論文", keywords: ["実験", "実習", "農学", "卒業論文", "卒業研究"] },
      { id: "major_elec", section: "専門教育科目", name: "専攻選択科目", requiredCredits: 30, note: "専攻展開講義", keywords: ["生化学", "遺伝", "生態", "資源", "森林"] },
      { id: "free_elec", section: "専門教育科目", name: "自由選択科目", requiredCredits: 12, note: "他学科・他学部科目", keywords: [] }
    ]
  },

  // 9. 汎用・自由カスタムモデル
  {
    id: "custom-template",
    name: "【手引き照合用】自由カスタムモデル（0から作成）",
    faculty: "その他・他大学",
    totalRequired: 124,
    guideUrl: "",
    note: "※ 学修要覧の単位配当表に合わせて区分・必要単位数を自由に設定できます。",
    categories: [
      { id: "gen_seminar", section: "全学教育科目", name: "基礎セミナー / 初年次ゼミ", requiredCredits: 2, note: "", keywords: ["基礎セミナー"] },
      { id: "gen_lang", section: "全学教育科目", name: "外国語科目", requiredCredits: 8, note: "英語＋第2外国語", keywords: ["英語", "English", "外国語"] },
      { id: "gen_liberal", section: "全学教育科目", name: "教養・共通教育科目", requiredCredits: 14, note: "人文・社会・自然科学", keywords: ["教養", "基礎", "総合"] },
      { id: "gen_info_pe", section: "全学教育科目", name: "情報・保健体育科目", requiredCredits: 4, note: "情報、スポーツ実技", keywords: ["情報", "スポーツ", "健康"] },
      { id: "major_required", section: "専門教育科目", name: "専門必修科目", requiredCredits: 44, note: "演習・実験・卒業研究", keywords: ["必修", "演習", "実験", "卒業論文", "卒業研究"] },
      { id: "major_elective", section: "専門教育科目", name: "専門選択科目", requiredCredits: 36, note: "専門講義", keywords: ["論", "特論", "研究"] },
      { id: "major_free", section: "専門教育科目", name: "自由選択科目", requiredCredits: 16, note: "他学部・超過分", keywords: [] }
    ]
  }
];
