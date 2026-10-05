/**
 * TACT Credit Checker - Faculty Presets & Graduation Requirements
 *
 * 名古屋大学文学部（2023・2024・2025・2026年度生公式要覧対応）および汎用モデル
 * 参考資料: 名古屋大学教養教育院「全学教育科目履修の手引（Student's Guide 2023〜2026）」
 *           名古屋大学文学部履修要覧（卒業要件124単位・専攻専門32単位・選択35単位モデル）
 */

export const PRESET_VERSION = "2026.10.literature_v10";

export const SUPPORTED_FACULTIES = [
  { id: "nu-humanities", name: "名古屋大学 文学部（人文学科・22専攻対応）" },
  { id: "general-model", name: "【自由設定】汎用大学・学部モデル" }
];

/**
 * 講義名の全角・半角英数バリエーションを展開
 * TACT上の「言語学概論ａ」のような全角アルファベット表記に100%完全対応
 * @param {Array<string>} list
 * @returns {Array<string>}
 */
export function expandCourseVariants(list = []) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const result = new Set();

  list.forEach(name => {
    if (!name) return;
    result.add(name);

    // 半角 -> 全角変換 (a -> ａ, A -> Ａ, 1 -> １)
    const toFull = name.replace(/[a-zA-Z0-9]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)
    );
    result.add(toFull);

    // 全角 -> 半角変換 (ａ -> a, Ａ -> A, １ -> 1)
    const toHalf = name.replace(/[ａ-ｚＡ-Ｚ０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
    result.add(toHalf);

    // NFKC正規化版
    result.add(name.normalize("NFKC"));
  });

  return Array.from(result);
}

/**
 * 文学部専攻プリセット生成ヘルパー関数
 * 今後、各分野ごとの詳細リストや単位配分が渡された際に即座に対応できるようモジュール化
 */
export function createDepartmentPreset({
  id,
  name,
  facultyGroup,
  thesisCredits = 10,
  thesisSeminarCredits = 2,
  surveyCredits = 4,
  lectureCredits = 12,
  languageCredits = 2,
  introSeminarCredits = 4,
  seminarCredits = 8,
  practiceCredits = 0,
  courses = {},
  categories = null
}) {
  if (categories && Array.isArray(categories)) {
    return {
      id,
      name,
      facultyGroup,
      thesisCredits,
      categories
    };
  }

  const generatedCats = [];

  // 1. 概論系科目
  if (surveyCredits > 0) {
    generatedCats.push({
      id: "dept_survey",
      name: `【${name.replace("専修", "")}】概論系科目`,
      requiredCredits: surveyCredits,
      note: `${name}の基礎理論・概論科目（必修/選択必修）`,
      courseList: expandCourseVariants(courses.survey || []),
      keywords: courses.surveyKeywords || [name.replace("専修", "") + "概論"]
    });
  }

  // 2. 講義系科目
  if (lectureCredits > 0) {
    generatedCats.push({
      id: "dept_lecture",
      name: `【${name.replace("専修", "")}】講義系科目`,
      requiredCredits: lectureCredits,
      note: `${name}の講義・特殊講義科目`,
      courseList: expandCourseVariants(courses.lecture || []),
      keywords: courses.lectureKeywords || [name.replace("専修", "") + "講義", name.replace("専修", "") + "特殊講義"]
    });
  }

  // 3. 語学系科目（専修で必要な場合）
  if (languageCredits > 0) {
    generatedCats.push({
      id: "dept_language",
      name: `【${name.replace("専修", "")}】語学系科目`,
      requiredCredits: languageCredits,
      note: `${name}に関連する古典語・専門語外科目`,
      courseList: expandCourseVariants(courses.language || []),
      keywords: courses.languageKeywords || ["ギリシア語", "ラテン語", "サンスクリット語", "イタリア語"]
    });
  }

  // 4. 入門演習系科目
  if (introSeminarCredits > 0) {
    generatedCats.push({
      id: "dept_intro_seminar",
      name: `【${name.replace("専修", "")}】入門演習系科目`,
      requiredCredits: introSeminarCredits,
      note: `${name}の入門演習・基礎演習科目`,
      courseList: expandCourseVariants(courses.introSeminar || []),
      keywords: courses.introSeminarKeywords || [name.replace("専修", "") + "入門演習", name.replace("専修", "") + "基礎演習"]
    });
  }

  // 5. 調査・実習系科目（考古・地理・社会・心理など実習がある場合）
  if (practiceCredits > 0) {
    generatedCats.push({
      id: "dept_practice",
      name: `【${name.replace("専修", "")}】調査・実習系科目`,
      requiredCredits: practiceCredits,
      note: `${name}の実習・調査・実験・フィールドワーク科目`,
      courseList: expandCourseVariants(courses.practice || []),
      keywords: courses.practiceKeywords || [name.replace("専修", "") + "実習", "調査実習", "実験実習"]
    });
  }

  // 6. 演習系科目
  if (seminarCredits > 0) {
    generatedCats.push({
      id: "dept_seminar",
      name: `【${name.replace("専修", "")}】演習系科目`,
      requiredCredits: seminarCredits,
      note: `${name}の演習・文献講読科目`,
      courseList: expandCourseVariants(courses.seminar || []),
      keywords: courses.seminarKeywords || [name.replace("専修", "") + "演習", name.replace("専修", "") + "講読"]
    });
  }

  // 7. 卒業論文演習
  if (thesisSeminarCredits > 0) {
    generatedCats.push({
      id: "dept_thesis_seminar",
      name: `【${name.replace("専修", "")}】卒業論文演習`,
      requiredCredits: thesisSeminarCredits,
      note: `${name}の卒業論文作成に向けた演習`,
      courseList: expandCourseVariants(courses.thesisSeminar || []),
      keywords: courses.thesisSeminarKeywords || [name.replace("専修", "") + "卒業論文演習", name.replace("専修", "") + "卒論演習"]
    });
  }

  return {
    id,
    name,
    facultyGroup,
    thesisCredits,
    categories: generatedCats
  };
}

// 名古屋大学文学部（人文学科）の全22専修（5学繫・22研究室）
// 専攻に関係のある科目（32単位）＋卒業論文（10単位）
export const LIT_DEPARTMENTS = [
  // 1. 言語文化学繫
  createDepartmentPreset({
    id: "linguistics",
    name: "言語学専修",
    facultyGroup: "言語文化学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 2,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      survey: [
        "言語学概論ａ", "言語学概論ｂ", "言語学概論a", "言語学概論b", "言語学概論Ａ", "言語学概論Ｂ", "言語学概論A", "言語学概論B"
      ],
      surveyKeywords: ["言語学概論"],
      lecture: [
        "音声学講義", "音韻論講義", "意味論講義",
        "言語学講義Ⅰ", "言語学講義Ⅱ", "言語学講義Ⅲ", "言語学講義Ⅳ",
        "言語学講義I", "言語学講義II", "言語学講義III", "言語学講義IV",
        "言語学講義1", "言語学講義2", "言語学講義3", "言語学講義4"
      ],
      lectureKeywords: ["音声学講義", "音韻論講義", "意味論講義", "言語学講義"],
      language: [
        "ギリシア語ａ", "ギリシア語ｂ", "ギリシア語a", "ギリシア語b", "ギリシア語Ａ", "ギリシア語Ｂ", "ギリシア語A", "ギリシア語B",
        "ラテン語ａ", "ラテン語ｂ", "ラテン語a", "ラテン語b", "ラテン語Ａ", "ラテン語Ｂ", "ラテン語A", "ラテン語B",
        "サンスクリット語ａ", "サンスクリット語ｂ", "サンスクリット語a", "サンスクリット語b", "サンスクリット語Ａ", "サンスクリット語Ｂ", "サンスクリット語A", "サンスクリット語B",
        "イタリア語ａ", "イタリア語ｂ", "イタリア語a", "イタリア語b", "イタリア語Ａ", "イタリア語Ｂ", "イタリア語A", "イタリア語B"
      ],
      languageKeywords: ["ギリシア語", "ラテン語", "サンスクリット語", "イタリア語"],
      introSeminar: [
        "言語学入門演習ａ", "言語学入門演習ｂ", "言語学入門演習a", "言語学入門演習b", "言語学入門演習Ａ", "言語学入門演習Ｂ", "言語学入門演習A", "言語学入門演習B"
      ],
      introSeminarKeywords: ["言語学入門演習"],
      seminar: [
        "言語学演習Ⅰａ", "言語学演習Ⅰｂ", "言語学演習Ⅱ", "言語学演習Ⅲ", "言語学演習Ⅳ", "言語学演習Ⅴ", "言語学演習Ⅵ",
        "言語学演習Ⅰa", "言語学演習Ⅰb", "言語学演習Ia", "言語学演習Ib", "言語学演習II", "言語学演習III", "言語学演習IV", "言語学演習V", "言語学演習VI",
        "言語学演習1a", "言語学演習1b", "言語学演習2", "言語学演習3", "言語学演習4", "言語学演習5", "言語学演習6"
      ],
      seminarKeywords: ["言語学演習"],
      thesisSeminar: [
        "言語学卒業論文演習ａ", "言語学卒業論文演習ｂ", "言語学卒業論文演習a", "言語学卒業論文演習b",
        "言語学卒業論文演習Ａ", "言語学卒業論文演習Ｂ", "言語学卒業論文演習A", "言語学卒業論文演習B",
        "言語学卒論演習ａ", "言語学卒論演習ｂ", "言語学卒論演習a", "言語学卒論演習b"
      ],
      thesisSeminarKeywords: ["言語学卒業論文演習", "言語学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "japanese_ling",
    name: "日本語学専修",
    facultyGroup: "言語文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["日本語学概論", "国語学概論"],
      lectureKeywords: ["日本語学講義", "国語学講義", "日本語文法", "日本語音韻", "日本語語彙", "日本語史"],
      introSeminarKeywords: ["日本語学入門演習"],
      seminarKeywords: ["日本語学演習", "国語学演習", "日本語史演習", "日本語講読"],
      thesisSeminarKeywords: ["日本語学卒業論文演習", "日本語学卒論演習"]
    }
  }),

  // 2. 英語文化学繫
  createDepartmentPreset({
    id: "english_ling",
    name: "英語学専修",
    facultyGroup: "英語文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["英語学概論"],
      lectureKeywords: ["英語学講義", "英語史", "生成文法", "英語音声学", "認知言語学"],
      introSeminarKeywords: ["英語学入門演習"],
      seminarKeywords: ["英語学演習", "英語史演習", "英語学講読", "統語論演習"],
      thesisSeminarKeywords: ["英語学卒業論文演習", "英語学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "english_lit",
    name: "英米文学専修",
    facultyGroup: "英語文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["英米文学概論", "英文学概論", "米文学概論"],
      lectureKeywords: ["英米文学講義", "イギリス文学", "アメリカ文学", "英米演劇", "シェイクスピア"],
      introSeminarKeywords: ["英米文学入門演習"],
      seminarKeywords: ["英米文学演習", "イギリス文学演習", "アメリカ文学演習", "英文学講読"],
      thesisSeminarKeywords: ["英米文学卒業論文演習", "英米文学卒論演習"]
    }
  }),

  // 3. 文献思想学繫
  createDepartmentPreset({
    id: "german_lit",
    name: "ドイツ語ドイツ文学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["ドイツ語学概論", "ドイツ文学概論"],
      lectureKeywords: ["ドイツ文学講義", "ドイツ語学講義", "ドイツ文学史", "ゲーテ"],
      introSeminarKeywords: ["ドイツ文学入門演習"],
      seminarKeywords: ["ドイツ語演習", "ドイツ文学演習", "ドイツ語講読", "原典講読"],
      thesisSeminarKeywords: ["ドイツ文学卒業論文演習", "ドイツ文学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "german_cult",
    name: "ドイツ語圏文化学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["ドイツ文化学概論", "ドイツ語圏文化概論"],
      lectureKeywords: ["ドイツ文化論", "ドイツ思想", "比較文化論"],
      introSeminarKeywords: ["ドイツ語圏文化学入門演習"],
      seminarKeywords: ["ドイツ語圏文化学演習", "ドイツ思想講読"],
      thesisSeminarKeywords: ["ドイツ語圏文化学卒業論文演習", "ドイツ語圏文化学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "french_lit",
    name: "フランス語フランス文学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["フランス語学概論", "フランス文学概論"],
      lectureKeywords: ["フランス文学講義", "フランス文化論", "フランス思想"],
      introSeminarKeywords: ["フランス文学入門演習"],
      seminarKeywords: ["フランス語演習", "フランス文学演習", "フランス語講読"],
      thesisSeminarKeywords: ["フランス文学卒業論文演習", "フランス文学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "japanese_lit",
    name: "日本文学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["日本文学概論", "国文学概論"],
      lectureKeywords: ["日本文学講義", "上代文学", "中古文学", "中世文学", "近世文学", "近代文学"],
      introSeminarKeywords: ["日本文学入門演習"],
      seminarKeywords: ["日本文学演習", "国文学演習", "日本古典文学演習", "日本近代文学演習"],
      thesisSeminarKeywords: ["日本文学卒業論文演習", "日本文学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "chinese_lit",
    name: "中国語中国文学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["中国文学概論", "中国語学概論"],
      lectureKeywords: ["中国文学講義", "中国古典文学", "中国現代文学", "白話小説"],
      introSeminarKeywords: ["中国文学入門演習"],
      seminarKeywords: ["中国語演習", "中国文学演習", "中国語講読", "漢詩演習"],
      thesisSeminarKeywords: ["中国文学卒業論文演習", "中国文学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "philosophy",
    name: "哲学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["哲学概論", "倫理学概論"],
      lectureKeywords: ["哲学講義", "倫理学講義", "西洋哲学史", "現代哲学", "認識論"],
      introSeminarKeywords: ["哲学入門演習"],
      seminarKeywords: ["哲学演習", "倫理学演習", "哲学文献講読", "原典講読"],
      thesisSeminarKeywords: ["哲学卒業論文演習", "哲学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "classics",
    name: "西洋古典学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 2,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["西洋古典学概論"],
      lectureKeywords: ["西洋古典学講義", "ギリシャ神話", "ホメロス", "ローマ文学"],
      languageKeywords: ["ギリシャ語", "ギリシア語", "ラテン語"],
      introSeminarKeywords: ["西洋古典学入門演習"],
      seminarKeywords: ["西洋古典学演習", "古典語講読", "ギリシャ語演習", "ラテン語演習"],
      thesisSeminarKeywords: ["西洋古典学卒業論文演習", "西洋古典学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "chinese_phil",
    name: "中国哲学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["中国哲学概論", "中国思想史概論"],
      lectureKeywords: ["中国哲学講義", "中国思想史", "諸子百家", "朱子学", "陽明学"],
      introSeminarKeywords: ["中国哲学入門演習"],
      seminarKeywords: ["中国哲学演習", "中国思想演習", "漢籍講読", "儒教演習"],
      thesisSeminarKeywords: ["中国哲学卒業論文演習", "中国哲学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "indian_phil",
    name: "インド哲学専修",
    facultyGroup: "文献思想学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 2,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["インド哲学概論", "仏教学概論"],
      lectureKeywords: ["インド哲学講義", "仏教学講義", "インド思想史", "大乗仏教"],
      languageKeywords: ["サンスクリット語", "チベット語", "パーリ語"],
      introSeminarKeywords: ["インド哲学入門演習"],
      seminarKeywords: ["インド哲学演習", "仏教学演習", "仏典講読"],
      thesisSeminarKeywords: ["インド哲学卒業論文演習", "インド哲学卒論演習"]
    }
  }),

  // 4. 歴史文化学繫
  createDepartmentPreset({
    id: "japanese_history",
    name: "日本史学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["日本史概論"],
      lectureKeywords: ["日本史講義", "日本古代史", "日本中世史", "日本近世史", "日本近現代史"],
      introSeminarKeywords: ["日本史学入門演習"],
      seminarKeywords: ["日本史学演習", "日本史演習", "古文書学", "日本史史料講読"],
      thesisSeminarKeywords: ["日本史学卒業論文演習", "日本史学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "oriental_history",
    name: "東洋史学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["東洋史概論", "アジア史概論"],
      lectureKeywords: ["東洋史講義", "中国古代史", "明清史", "中央ユーラシア史"],
      introSeminarKeywords: ["東洋史学入門演習"],
      seminarKeywords: ["東洋史学演習", "東洋史演習", "中国史演習", "漢文史料講読"],
      thesisSeminarKeywords: ["東洋史学卒業論文演習", "東洋史学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "western_history",
    name: "西洋史学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["西洋史概論"],
      lectureKeywords: ["西洋史講義", "古代地中海史", "ヨーロッパ中世史", "近代ヨーロッパ史"],
      introSeminarKeywords: ["西洋史学入門演習"],
      seminarKeywords: ["西洋史学演習", "西洋史演習", "欧文史料講読"],
      thesisSeminarKeywords: ["西洋史学卒業論文演習", "西洋史学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "art_history",
    name: "美学美術史学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 14,
    languageCredits: 0,
    introSeminarCredits: 4,
    seminarCredits: 8,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["美学概論", "美術史概論"],
      lectureKeywords: ["美術史講義", "日本美術史", "東洋美術史", "西洋美術史", "美学理論"],
      introSeminarKeywords: ["美学美術史学入門演習"],
      seminarKeywords: ["美術史学演習", "美学演習", "作品研究", "美術史講読"],
      thesisSeminarKeywords: ["美学美術史学卒業論文演習", "美術史学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "archaeology",
    name: "考古学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 0,
    introSeminarCredits: 2,
    practiceCredits: 6,
    seminarCredits: 6,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["考古学概論"],
      lectureKeywords: ["考古学講義", "日本考古学", "先史考古学", "東アジア考古学"],
      practiceKeywords: ["考古学実習", "発掘調査", "実測実習", "出土遺物実習"],
      introSeminarKeywords: ["考古学入門演習"],
      seminarKeywords: ["考古学演習", "物質文化演習"],
      thesisSeminarKeywords: ["考古学卒業論文演習", "考古学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "cultural_anthro",
    name: "文化人類学専修",
    facultyGroup: "歴史文化学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 0,
    introSeminarCredits: 2,
    practiceCredits: 6,
    seminarCredits: 6,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["文化人類学概論"],
      lectureKeywords: ["文化人類学講義", "医療人類学", "宗教人類学", "地域研究"],
      practiceKeywords: ["フィールドワーク実習", "現地調査実習", "民族誌実習"],
      introSeminarKeywords: ["文化人類学入門演習"],
      seminarKeywords: ["文化人類学演習", "民族誌演習"],
      thesisSeminarKeywords: ["文化人類学卒業論文演習", "文化人類学卒論演習"]
    }
  }),

  // 5. 環境行動学繫
  createDepartmentPreset({
    id: "sociology",
    name: "社会学専修",
    facultyGroup: "環境行動学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 0,
    introSeminarCredits: 2,
    practiceCredits: 6,
    seminarCredits: 6,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["社会学概論"],
      lectureKeywords: ["社会学講義", "地域社会論", "産業社会学", "家族社会学"],
      practiceKeywords: ["社会調査実習", "計量社会学実習"],
      introSeminarKeywords: ["社会学入門演習"],
      seminarKeywords: ["社会学演習", "社会学理論演習", "地域社会学演習"],
      thesisSeminarKeywords: ["社会学卒業論文演習", "社会学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "psychology",
    name: "心理学専修",
    facultyGroup: "環境行動学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 0,
    introSeminarCredits: 2,
    practiceCredits: 6,
    seminarCredits: 6,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["心理学概論"],
      lectureKeywords: ["心理学講義", "認知心理学", "発達心理学", "生理心理学", "知覚心理学"],
      practiceKeywords: ["心理学実験", "心理統計", "実験実習", "心理学実験実習"],
      introSeminarKeywords: ["心理学入門演習"],
      seminarKeywords: ["心理学演習", "認知心理学演習", "心理学研究法"],
      thesisSeminarKeywords: ["心理学卒業論文演習", "心理学卒論演習"]
    }
  }),
  createDepartmentPreset({
    id: "geography",
    name: "地理学専修",
    facultyGroup: "環境行動学繫",
    surveyCredits: 4,
    lectureCredits: 12,
    languageCredits: 0,
    introSeminarCredits: 2,
    practiceCredits: 6,
    seminarCredits: 6,
    thesisSeminarCredits: 2,
    courses: {
      surveyKeywords: ["地理学概論"],
      lectureKeywords: ["地理学講義", "自然地理学", "人文地理学", "気候学", "GIS"],
      practiceKeywords: ["地理学野外実習", "巡検", "地域調査実習", "GIS実習"],
      introSeminarKeywords: ["地理学入門演習"],
      seminarKeywords: ["地理学演習", "地理学講読"],
      thesisSeminarKeywords: ["地理学卒業論文演習", "地理学卒論演習"]
    }
  })
];

/**
 * 文学部の専修に合わせたカテゴリ配列を動的生成
 * 全学教育科目(40) + 専門基礎科目(2) + 共通基盤(3) + 共通実践(2) + 専攻科目(32) + 卒業論文(10) + 選択科目(35) = 124単位
 */
export function buildLiteratureCategories(deptId = "linguistics") {
  const dept = LIT_DEPARTMENTS.find(d => d.id === deptId) || LIT_DEPARTMENTS[0];

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
      note: "人文学入門Ⅰ・人文学入門Ⅱ・人文学入門Ⅲ・人文学入門Ⅳから2単位必修（2年次進級要件。2単位を超える分は選択科目へ算入）",
      keywords: ["人文学入門Ⅰ", "人文学入門Ⅱ", "人文学入門Ⅲ", "人文学入門Ⅳ", "人文学入門1", "人文学入門2", "人文学入門3", "人文学入門4", "人文学入門", "専門基礎"]
    },

    // --- 専門科目（計82単位） ---
    // [中区分: 全専修共通科目 (5単位)]
    {
      id: "major_common_base",
      section: "専門科目",
      group: "全専修共通科目",
      scope: "faculty",
      name: "共通基盤科目",
      requiredCredits: 2,
      advancementRequired: 0,
      note: "日本文化事情(1), 異文化理解(1), 人間と倫理, ジェンダー学概論(1), セクシュアリティ学概論(1), 国際移民論, ナショナリズム・トランスナショナリズム論（2単位超過分は選択科目へ算入）",
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
      requiredCredits: 3,
      advancementRequired: 0,
      note: "人文学の学生のための情報リテラシー(1), 科学技術と人文学(1), 応用倫理学演習, デジタル人文学(1), 人文学のためのコミュニケーションスキル(1), 人文科学イノベーション創出と課題解決(1)（3単位超過分は選択科目へ算入）",
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
    }
  ];

  // 各専修固有の専門科目区分（計32単位）を展開
  const deptSpecificCats = (dept.categories || []).map(cat => ({
    ...cat,
    section: "専門科目",
    group: "専攻に関係のある科目",
    scope: "faculty",
    advancementRequired: 0
  }));

  // 卒業論文（10単位・論文審査合格要件・孤立トグル）
  const thesisCat = {
    id: "major_thesis",
    section: "専門科目",
    group: "卒業論文",
    scope: "faculty",
    name: `【${dept.name}】卒業論文`,
    requiredCredits: dept.thesisCredits || 10,
    advancementRequired: 0,
    note: "4年次卒業論文（10単位必修・卒業論文審査合格要件）",
    keywords: ["卒業論文", "卒業研究", "卒論", "学士論文"]
  };

  // 選択科目（専攻に関係のある科目以外の科目：35単位）
  const freeCat = {
    id: "dept_free",
    section: "専門科目",
    group: "専攻外選択科目",
    scope: "faculty",
    name: "専攻外選択科目（関連専門・他専修・他学部科目）",
    requiredCredits: 35,
    advancementRequired: 0,
    note: "①人文学入門超過分、②共通基盤・共通実践超過分、③専攻専門超過分、④文学部他専修科目、⑤他学部履修科目（※全学教育科目の超過分は算入不可）",
    keywords: []
  };

  return [...generalCats, ...deptSpecificCats, thesisCat, freeCat];
}

export const DEFAULT_PRESETS = [
  {
    id: "nu-humanities",
    name: "名古屋大学 文学部（2023〜2026年度生公式要覧対応）",
    faculty: "文学部",
    totalRequired: 124,
    guideUrl: "https://office.ilas.nagoya-u.ac.jp/",
    note: "名古屋大学 教養教育院「全学教育科目履修の手引」および文学部履修要覧に完全準拠（全学40+専門基礎2+共通基盤・実践5+専攻32+卒論10+選択35＝124単位）。",
    advancementRequired: 38, // 2年次終了時進級判定（全学36単位＋専門基礎2単位＝38単位）
    categories: buildLiteratureCategories("linguistics")
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
