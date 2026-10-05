/**
 * TACT Credit Checker - Faculty Presets & Graduation Requirements
 * 名古屋大学各学部および汎用大学の卒業要件テンプレート定義
 */

export const DEFAULT_PRESETS = [
  {
    id: "nu-humanities",
    name: "名古屋大学 文学部 (標準モデル)",
    totalRequired: 124,
    description: "全学教育科目と専門教育科目の標準的な卒業要件（124単位）",
    categories: [
      {
        id: "seminar",
        name: "基礎セミナー",
        requiredCredits: 2,
        color: "#6366f1",
        description: "1年次履修の少人数ゼミ（2単位必修）",
        keywords: ["基礎セミナー"]
      },
      {
        id: "language",
        name: "言語文化 (外国語)",
        requiredCredits: 8,
        color: "#3b82f6",
        description: "英語（4単位）＋初修外国語（ドイツ語/フランス語/中国語等 4単位）",
        keywords: ["英語", "English", "Academic English", "ドイツ語", "フランス語", "中国語", "ロシア語", "スペイン語", "コリア語", "朝鮮語"]
      },
      {
        id: "gen_humanities",
        name: "文系基礎・教養科目",
        requiredCredits: 12,
        color: "#0ea5e9",
        description: "人文学、社会科学分野の全学教育科目",
        keywords: ["文学", "哲学", "歴史", "心理", "社会学", "地理", "法学", "政治学", "経済学", "倫理", "宗教学", "芸術"]
      },
      {
        id: "gen_science",
        name: "理系基礎・自然情報科目",
        requiredCredits: 4,
        color: "#10b981",
        description: "数学、自然科学、情報科学等の全学教育科目",
        keywords: ["数学", "物理", "化学", "生物", "地学", "情報", "統計", "データサイエンス"]
      },
      {
        id: "sports_health",
        name: "健康・スポーツ科学",
        requiredCredits: 2,
        color: "#f59e0b",
        description: "スポーツ実技（1単位）または健康科学講義",
        keywords: ["スポーツ", "健康科学", "体育", "身体運動"]
      },
      {
        id: "major_required",
        name: "専門必修科目",
        requiredCredits: 36,
        color: "#ec4899",
        description: "学科・専修の必修科目・講読・演習",
        keywords: ["概論", "演習", "特論", "講読", "卒業論文", "卒論", "専門基礎"]
      },
      {
        id: "major_elective",
        name: "専門選択科目",
        requiredCredits: 40,
        color: "#8b5cf6",
        description: "文学部専修内外の専門講義・演習科目",
        keywords: ["史学", "文学", "言語学", "哲学", "人類学", "講義", "特殊研究"]
      },
      {
        id: "free_elective",
        name: "自由選択・他学部履修",
        requiredCredits: 20,
        color: "#64748b",
        description: "他学部科目、全学教育科目の超過分など",
        keywords: []
      }
    ]
  },
  {
    id: "nu-informatics",
    name: "名古屋大学 情報学部 (自然情報・コンピュータ)",
    totalRequired: 128,
    description: "情報科学・数理・工学基礎を含む要件モデル（128単位）",
    categories: [
      {
        id: "seminar",
        name: "基礎セミナー",
        requiredCredits: 2,
        color: "#6366f1",
        description: "1年次少人数ゼミ（2単位）",
        keywords: ["基礎セミナー"]
      },
      {
        id: "language",
        name: "言語文化 (外国語)",
        requiredCredits: 8,
        color: "#3b82f6",
        description: "英語（4単位以上）＋初修外国語",
        keywords: ["英語", "English", "Academic English", "ドイツ語", "フランス語", "中国語"]
      },
      {
        id: "info_math_basics",
        name: "全学数理・情報基礎",
        requiredCredits: 16,
        color: "#06b6d4",
        description: "微積分、線形代数、情報リテラシー、物理/化学基礎",
        keywords: ["微分積分", "線形代数", "情報基礎", "コンピュータ", "物理学", "離散数学", "アルゴリズム"]
      },
      {
        id: "gen_ed",
        name: "教養・人文社会・スポーツ",
        requiredCredits: 8,
        color: "#10b981",
        description: "文系基礎、スポーツ科学、学問の現代的展開など",
        keywords: ["社会", "法", "経済", "哲学", "スポーツ", "健康", "心理"]
      },
      {
        id: "major_required",
        name: "専門必修科目",
        requiredCredits: 44,
        color: "#ec4899",
        description: "プログラミング、計算機アーキテクチャ、実験、卒業研究",
        keywords: ["実験", "プログラミング", "情報数理", "ソフトウェア", "計算機", "データ構造", "卒業研究", "特別研究"]
      },
      {
        id: "major_elective",
        name: "専門選択科目",
        requiredCredits: 36,
        color: "#8b5cf6",
        description: "学部展開科目、専門関連科目",
        keywords: ["機械学習", "知能情報", "ネットワーク", "認知科学", "自然言語処理", "メディア"]
      },
      {
        id: "free_elective",
        name: "自由選択科目",
        requiredCredits: 14,
        color: "#64748b",
        description: "他学科・他学部科目、超過単位",
        keywords: []
      }
    ]
  },
  {
    id: "nu-engineering",
    name: "名古屋大学 工学部 (標準モデル)",
    totalRequired: 132,
    description: "工学系各学科の標準モデル（132単位）",
    categories: [
      {
        id: "seminar",
        name: "基礎セミナー",
        requiredCredits: 2,
        color: "#6366f1",
        description: "基礎セミナー",
        keywords: ["基礎セミナー"]
      },
      {
        id: "language",
        name: "言語文化 (外国語)",
        requiredCredits: 8,
        color: "#3b82f6",
        description: "英語および第2外国語",
        keywords: ["英語", "English", "ドイツ語", "フランス語", "中国語"]
      },
      {
        id: "sci_math_basics",
        name: "自然科学・数理基礎",
        requiredCredits: 20,
        color: "#0ea5e9",
        description: "微分積分学、線形代数学、物理学、化学、基礎実験",
        keywords: ["微分積分", "線形代数", "物理学", "物理学実験", "化学", "化学実験", "解析学"]
      },
      {
        id: "gen_liberal",
        name: "人文社会・健康スポーツ",
        requiredCredits: 8,
        color: "#10b981",
        description: "文系基礎、スポーツ科学",
        keywords: ["歴史", "哲学", "法", "経済", "社会", "スポーツ", "健康"]
      },
      {
        id: "major_required",
        name: "専門必修科目 (実験・卒論含む)",
        requiredCredits: 50,
        color: "#ec4899",
        description: "専門基礎、学科必修、創成科目、卒業研究",
        keywords: ["工学", "力学", "電磁気", "回路", "実験", "製図", "演習", "設計", "卒業研究", "学士論文"]
      },
      {
        id: "major_elective",
        name: "専門選択科目",
        requiredCredits: 34,
        color: "#8b5cf6",
        description: "学科専門選択科目",
        keywords: ["材料", "熱力学", "流体", "制御", "応用", "システム"]
      },
      {
        id: "free_elective",
        name: "自由選択科目",
        requiredCredits: 10,
        color: "#64748b",
        description: "関連科目・自由履修",
        keywords: []
      }
    ]
  },
  {
    id: "general-university",
    name: "汎用大学・学部モデル (124単位)",
    totalRequired: 124,
    description: "多くの4年制大学で採用されている標準的な卒業要件モデル",
    categories: [
      {
        id: "general_ed",
        name: "教養・共通教育科目",
        requiredCredits: 12,
        color: "#3b82f6",
        description: "人文・社会・自然科学の総合教養",
        keywords: ["教養", "基礎", "総合", "人文", "社会", "自然"]
      },
      {
        id: "foreign_lang",
        name: "外国語科目",
        requiredCredits: 8,
        color: "#06b6d4",
        description: "英語および第2外国語",
        keywords: ["英語", "English", "外国語", "ドイツ語", "フランス語", "中国語"]
      },
      {
        id: "info_pe",
        name: "情報・保健体育",
        requiredCredits: 4,
        color: "#10b981",
        description: "情報処理演習、スポーツ実技・健康科学",
        keywords: ["情報", "コンピュータ", "リテラシー", "体育", "スポーツ", "健康"]
      },
      {
        id: "major_required",
        name: "専門必修科目",
        requiredCredits: 40,
        color: "#ec4899",
        description: "学部・学科の必修科目・ゼミ・卒業研究",
        keywords: ["概論", "基礎", "演習", "ゼミ", "実習", "実験", "卒業論文", "卒業研究"]
      },
      {
        id: "major_elective",
        name: "専門選択科目",
        requiredCredits: 44,
        color: "#8b5cf6",
        description: "専門分野の選択講義・演習",
        keywords: ["論", "研究", "特論", "演習", "応用"]
      },
      {
        id: "free_elective",
        name: "自由選択科目",
        requiredCredits: 16,
        color: "#64748b",
        description: "他学部科目、教職科目、超過単位など",
        keywords: []
      }
    ]
  }
];
