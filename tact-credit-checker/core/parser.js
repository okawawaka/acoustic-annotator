/**
 * TACT Credit Checker - Course Parser & Categorizer Engine
 * 講義名・サイトIDの解析およびカテゴリ・単位数の自動推定エンジン
 */

/**
 * TACTサイトオブジェクトから履修科目データを正規化・抽出
 * @param {Object} rawSite - TACT Direct API のサイトオブジェクト
 * @param {Array} categories - 現在適用中のカテゴリ定義
 * @param {Object} customMappings - ユーザーが過去に設定した科目名→カテゴリIDのマッピング
 * @returns {Object} CourseItem
 */
export function parseCourseSite(rawSite, categories = [], customMappings = {}) {
  const siteId = rawSite.id || "";
  const rawTitle = (rawSite.title || "").trim();

  // 年度・学期のパース
  const termInfo = extractTermAndYear(rawTitle, rawSite.props);
  const cleanTitle = cleanCourseTitle(rawTitle);

  // 単位数の推測
  const credits = estimateCredits(cleanTitle, rawTitle);

  // カテゴリの推測
  let categoryId = "uncategorized";
  if (customMappings[cleanTitle]) {
    categoryId = customMappings[cleanTitle];
  } else {
    categoryId = guessCategory(cleanTitle, categories);
  }

  // ステータスの推測 (過去年度なら修得済、今年度なら履修中)
  const status = guessStatus(termInfo.year);

  return {
    id: siteId || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    rawTitle: rawTitle,
    title: cleanTitle,
    courseCode: extractCourseCode(siteId, rawTitle),
    term: termInfo.termString,
    year: termInfo.year,
    season: termInfo.season,
    credits: credits,
    categoryId: categoryId,
    status: status, // "passed" | "enrolled" | "failed" | "exempt"
    isManual: false,
    updatedAt: Date.now()
  };
}

/**
 * 講義名から年度と学期を抽出
 */
export function extractTermAndYear(title, props = {}) {
  const currentYear = new Date().getFullYear();
  let year = currentYear;
  let season = "前期/春";
  let termString = "";

  if (props && props.term) {
    termString = props.term;
  }

  // タイトルまたはTerm文字列から年度 (202x, R0xなど) を検索
  const text = `${title} ${termString}`;
  const yearMatch = text.match(/(20\d{2})/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  } else {
    const rMatch = text.match(/R(\d{1,2})/i);
    if (rMatch) {
      year = 2018 + parseInt(rMatch[1], 10);
    }
  }

  if (/秋|後期|3Q|4Q|fall|winter|2学期/i.test(text)) {
    season = "秋/後期";
  } else if (/春|前期|1Q|2Q|spring|summer|1学期/i.test(text)) {
    season = "春/前期";
  } else if (/通年|full year/i.test(text)) {
    season = "通年";
  } else if (/集中|intensive/i.test(text)) {
    season = "集中講義";
  }

  if (!termString) {
    termString = `${year}年度 ${season}`;
  }

  return { year, season, termString };
}

/**
 * 講義名から余分な年度・組・記号をクリーニング
 */
export function cleanCourseTitle(rawTitle) {
  let title = rawTitle;
  // 年度・学期表記の削除: (2024前期), [2023春], 【2024年度】
  title = title.replace(/[\(（\[【]\s*20\d{2}.*?[\)）\]】]/g, "");
  // 組・クラス・曜日時限表記の削除: [1組], [文学部1組], (月2), [木曜3限]
  title = title.replace(/[\(（\[【]\s*([^()\[\]【】]*組|[月火水木金土日]\s*\d+.*?)[\)）\]】]/g, "");
  // 先頭の講義コード削除 (例: "01_ABC1234 講義名")
  title = title.replace(/^[\w\d_\-]+[:\s]+/, "");
  // 余分な空白のトリム
  return title.trim() || rawTitle;
}

/**
 * 講義コードの抽出
 */
export function extractCourseCode(siteId, title) {
  // siteIdが "2024_01_1234567" 形式の場合
  if (siteId && /^[0-9A-Z_]+$/.test(siteId)) {
    const parts = siteId.split("_");
    if (parts.length >= 3) {
      return parts.slice(1).join("-");
    }
    return siteId;
  }
  const match = title.match(/([A-Z]{2,}\d{4,}|\d{7,})/i);
  return match ? match[1] : "";
}

/**
 * 単位数の推測（デフォルト2単位、実験・実習・スポーツ・特定専門科目は1単位、卒論は4〜8単位）
 */
export function estimateCredits(cleanTitle, rawTitle) {
  const combined = `${cleanTitle} ${rawTitle}`;

  // 1. 卒論・研究科目
  if (/卒業論文|卒業研究|特別研究|学士論文/i.test(combined)) {
    return 6;
  }

  // 2. データ科学基礎科目は原則1単位
  if (/データ科学|データサイエンス/i.test(combined)) {
    return 1;
  }

  // 3. 英語（上級リーディング）は1単位
  if (/上級リーディング|advanced reading/i.test(combined)) {
    return 1;
  }

  // 4. スポーツ科学の講義は2単位（※実習より先に判定）
  if (/健康.*講義|スポーツ.*講義|健康・スポーツ科学講義/i.test(combined)) {
    return 2;
  }

  // 5. スポーツ科学の実習・演習、実験、実習、1単位指定科目
  if (/日本文化事情|異文化理解|ジェンダー学概論|セクシュアリティ学概論|情報リテラシー|科学技術と人文学|デジタル人文学|コミュニケーションスキル|イノベーション創出|実験|実習|スポーツ|体育|身体運動|演習[I1]|チュートリアル/i.test(combined)) {
    return 1;
  }

  // 6. 通年・特論・総合演習
  if (/通年|特論|総合演習/i.test(combined)) {
    return 4;
  }

  return 2; // 大学講義の標準単位数（人文学入門Ⅰ〜Ⅳ、人間と倫理、国際移民論、応用倫理学演習等含む）
}

/**
 * 科目名からカテゴリを推測
 */
export function guessCategory(cleanTitle, categories = []) {
  if (!categories || categories.length === 0) return "uncategorized";
  const title = cleanTitle.toLowerCase();

  // 1. 文学部 専門基礎科目（人文学入門Ⅰ〜Ⅳ）
  if (title.includes("人文学入門") || title.includes("専門基礎")) {
    const cat = categories.find(c => c.id === "major_basics");
    if (cat) return cat.id;
  }

  // 2. 文学部 共通基盤科目
  if (/日本文化事情|異文化理解|人間と倫理|ジェンダー学概論|セクシュアリティ学概論|国際移民論|ナショナリズム/i.test(title)) {
    const cat = categories.find(c => c.id === "major_common_base");
    if (cat) return cat.id;
  }

  // 3. 文学部 共通実践科目
  if (/情報リテラシー|科学技術と人文学|応用倫理学演習|デジタル人文学|コミュニケーションスキル|人文科学イノベーション/i.test(title)) {
    const cat = categories.find(c => c.id === "major_common_practice");
    if (cat) return cat.id;
  }

  // 4. 全学教育科目固有の確実なキーワード判定
  if (title.includes("大学での学び")) {
    const cat = categories.find(c => c.id === "intro_study");
    if (cat) return cat.id;
  }
  if (title.includes("基礎セミナー")) {
    const cat = categories.find(c => c.id === "seminar");
    if (cat) return cat.id;
  }
  if (title.includes("英語") || title.includes("english") || title.includes("academic english")) {
    const cat = categories.find(c => c.id === "lang_en");
    if (cat) return cat.id;
  }
  if (/ドイツ語|フランス語|中国語|ロシア語|スペイン語|朝鮮語|韓国語|german|french|chinese|russian|spanish/i.test(title)) {
    const cat = categories.find(c => c.id === "lang_second");
    if (cat) return cat.id;
  }
  if (title.includes("データ科学") || title.includes("データサイエンス")) {
    const cat = categories.find(c => c.id === "data_sci");
    if (cat) return cat.id;
  }

  // 健康・スポーツ科学科目（講義と実習の識別）
  if ((title.includes("講義") || title.includes("概論")) && (title.includes("健康") || title.includes("スポーツ"))) {
    const catLec = categories.find(c => c.id === "health_sports_lec");
    if (catLec) return catLec.id;
  }
  if (/健康|スポーツ|身体運動|体育|バドミントン|テニス|サッカー|バレー|卓球|水泳|スキー/i.test(title)) {
    const catPrac = categories.find(c => c.id === "health_sports_prac" || c.id === "health_sports");
    if (catPrac) return catPrac.id;
  }

  if (title.includes("国際理解") || title.includes("多文化")) {
    const cat = categories.find(c => c.id === "intl_understanding");
    if (cat) return cat.id;
  }
  if (title.includes("現代教養") || title.includes("超学部")) {
    const cat = categories.find(c => c.id === "modern_liberal");
    if (cat) return cat.id;
  }

  // 5. 専修専門科目（演習、講読、卒業論文、特論）の判定
  if (/卒業論文|卒業研究|卒論|学士論文/i.test(title) || /演習|講読|特論|特殊研究|特殊講義/i.test(title)) {
    const majorReq = categories.find(c => c.id === "major_req" || c.id === "major_specialized");
    if (majorReq) return majorReq.id;
  }

  // 6. カテゴリ定義のキーワード配列による判定
  for (const cat of categories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      if (title.includes(kw.toLowerCase())) {
        return cat.id;
      }
    }
  }

  return "uncategorized";
}

/**
 * ステータスの初期推測
 */
export function guessStatus(courseYear) {
  const currentYear = new Date().getFullYear();
  if (courseYear < currentYear) {
    return "passed"; // 過去の講義はデフォルトで修得済
  }
  return "enrolled"; // 今年度は履修中
}

/**
 * 単位集計ロジック
 */
export function calculateCredits(courses = [], categories = []) {
  const summary = {
    totalRequired: 0,
    totalPassed: 0,
    totalEnrolled: 0,
    totalPotential: 0, // passed + enrolled
    categoryProgress: {},
    uncategorizedCourses: []
  };

  // カテゴリ初期化
  const catMap = {};
  const sectionSummary = {};

  categories.forEach(cat => {
    const sec = cat.section || "全学教育科目";
    if (!sectionSummary[sec]) {
      sectionSummary[sec] = { required: 0, passed: 0, enrolled: 0, potential: 0 };
    }
    sectionSummary[sec].required += (cat.requiredCredits || 0);

    catMap[cat.id] = {
      id: cat.id,
      section: sec,
      name: cat.name,
      note: cat.note || "",
      required: cat.requiredCredits || 0,
      color: cat.color || "#19365c",
      passed: 0,
      enrolled: 0,
      potential: 0,
      shortfall: 0,
      excess: 0,
      isFulfilled: false,
      courses: []
    };
    summary.totalRequired += cat.requiredCredits || 0;
  });

  courses.forEach(course => {
    const credits = Number(course.credits) || 0;
    const isPassed = course.status === "passed" || course.status === "exempt";
    const isEnrolled = course.status === "enrolled";

    if (course.categoryId && catMap[course.categoryId]) {
      const cat = catMap[course.categoryId];
      cat.courses.push(course);
      if (isPassed) {
        cat.passed += credits;
        summary.totalPassed += credits;
        if (sectionSummary[cat.section]) sectionSummary[cat.section].passed += credits;
      } else if (isEnrolled) {
        cat.enrolled += credits;
        summary.totalEnrolled += credits;
        if (sectionSummary[cat.section]) sectionSummary[cat.section].enrolled += credits;
      }
    } else {
      // 未分類
      summary.uncategorizedCourses.push(course);
      if (isPassed) summary.totalPassed += credits;
      if (isEnrolled) summary.totalEnrolled += credits;
    }
  });

  // 各カテゴリの充足・不足・超過計算
  Object.values(catMap).forEach(cat => {
    cat.potential = cat.passed + cat.enrolled;
    cat.isFulfilled = cat.passed >= cat.required;
    cat.shortfall = Math.max(0, cat.required - cat.passed);
    cat.excess = Math.max(0, cat.passed - cat.required);
  });

  Object.values(sectionSummary).forEach(s => {
    s.potential = s.passed + s.enrolled;
  });

  summary.totalPotential = summary.totalPassed + summary.totalEnrolled;
  summary.categoryProgress = catMap;
  summary.sectionSummary = sectionSummary;
  summary.isAllFulfilled = summary.totalPassed >= summary.totalRequired &&
    Object.values(catMap).every(c => c.isFulfilled);

  return summary;
}
