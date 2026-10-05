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
  // 組・クラス・曜日時限表記の削除: [1組], (月2), [木曜3限]
  title = title.replace(/[\(（\[【]\s*(\d+組|[月火水木金土日]\s*\d+.*?)[\)）\]】]/g, "");
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
 * 単位数の推測（デフォルト2単位、実験・実習・スポーツは1単位、卒論は4〜8単位）
 */
export function estimateCredits(cleanTitle, rawTitle) {
  const combined = `${cleanTitle} ${rawTitle}`;

  if (/卒業論文|卒業研究|特別研究|学士論文/i.test(combined)) {
    return 6;
  }
  if (/実験|実習|スポーツ|体育|身体運動|演習[I1]|チュートリアル/i.test(combined)) {
    return 1;
  }
  if (/通年|特論|総合演習/i.test(combined)) {
    return 4;
  }

  return 2; // 大学講義の標準単位数
}

/**
 * 科目名からカテゴリを推測
 */
export function guessCategory(cleanTitle, categories = []) {
  if (!categories || categories.length === 0) return "uncategorized";

  // 1. 各カテゴリのキーワードにヒットするか探索
  for (const cat of categories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      if (cleanTitle.toLowerCase().includes(kw.toLowerCase())) {
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
  categories.forEach(cat => {
    catMap[cat.id] = {
      id: cat.id,
      name: cat.name,
      required: cat.requiredCredits || 0,
      color: cat.color || "#3b82f6",
      passed: 0,
      enrolled: 0,
      potential: 0,
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
      } else if (isEnrolled) {
        cat.enrolled += credits;
        summary.totalEnrolled += credits;
      }
      cat.potential = cat.passed + cat.enrolled;
      cat.isFulfilled = cat.passed >= cat.required;
    } else {
      // 未分類
      summary.uncategorizedCourses.push(course);
      if (isPassed) summary.totalPassed += credits;
      if (isEnrolled) summary.totalEnrolled += credits;
    }
  });

  summary.totalPotential = summary.totalPassed + summary.totalEnrolled;
  summary.categoryProgress = catMap;
  summary.isAllFulfilled = summary.totalPassed >= summary.totalRequired &&
    Object.values(catMap).every(c => c.isFulfilled);

  return summary;
}
