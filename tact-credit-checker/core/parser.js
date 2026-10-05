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
/**
 * TACTサイトが単位対象外（事務・連絡・研修・e-Learning・学生支援・検定試験手続き等）であるかを判定
 * @param {string} cleanTitle
 * @param {string} rawTitle
 * @param {Object} rawSite
 * @returns {boolean}
 */
export function isNonCreditCourse(cleanTitle, rawTitle = "", rawSite = {}) {
  const text = `${cleanTitle} ${rawTitle} ${rawSite.title || ""} ${rawSite.description || ""}`.toLowerCase();

  // 1. TACT/Sakai サイトタイプが講義(course)以外の場合（project など事務・プロジェクト用サイト）
  if (rawSite.type && rawSite.type !== "course") {
    return true;
  }

  // 2. お知らせ・掲示板・事務連絡
  if (/お知らせ|おしらせ|連絡事項|事務連絡|掲示板|公式連絡/i.test(text)) {
    return true;
  }

  // 3. e-Learning / ハラスメント / コンプライアンス / 安全教育研修
  if (/e-?learning|eラーニング|イーラーニング/i.test(text)) {
    return true;
  }
  if (/ハラスメント防止|安全衛生教育|情報セキュリティ研修|コンプライアンス|倫理教育|研究倫理/i.test(text)) {
    return true;
  }

  // 4. 学生支援・相談・本部・事務組織
  if (/学生支援本部|キャリア支援|就職支援|学生相談|保健管理センター|留学生センター/i.test(text)) {
    return true;
  }

  // 5. 検定試験・単位認定手続き・ガイダンス・オリエンテーション
  if (/検定試験.*単位認定|単位認定について|単位認定手続|単位認定申請/i.test(text)) {
    return true;
  }
  if (/オリエンテーション|プレイスメントテスト|履修ガイダンス|新入生ガイダンス/i.test(text)) {
    return true;
  }

  // 6. 特別コース・課外・プログラム
  if (/特別コース|課外プログラム|課外活動|オープンキャンパス/i.test(text)) {
    return true;
  }

  return false;
}

/**
 * TACTサイトIDや講義名から開講元（教養教育院 vs 文学部専門）を判定
 * @param {string} siteId
 * @param {string} title
 * @param {Object} rawSite
 * @returns {"ilas" | "faculty" | "unknown"}
 */
export function detectCourseOrigin(siteId = "", title = "", rawSite = {}) {
  const combined = `${siteId} ${title} ${rawSite.title || ""} ${(rawSite.props && rawSite.props.dept) || ""}`.toLowerCase();

  // 1. 全学教育科目固有の絶対的科目（組名に [文学部] 等が含まれていても全学教育科目）
  if (/基礎セミナー|大学での学び/i.test(combined)) {
    return "ilas";
  }

  // 2. 文学部専門科目固有の明確なキーワード
  if (/専門基礎|人文学入門|共通基盤|共通実践|日本文化事情|異文化理解|人間と倫理|ジェンダー学|セクシュアリティ学|国際移民論|ナショナリズム|特殊講義|特論|特殊研究|文学部.*専修|演習|講読|史料講読|原典講読|卒業論文|卒論|学士論文|巡検|実測|発掘調査|心理学実験|社会調査実習/i.test(combined)) {
    return "faculty";
  }

  // 3. 教養教育院（全学教育科目）固有の明確なキーワード
  if (/英語|english|academic english|ドイツ語|フランス語|中国語|ロシア語|スペイン語|朝鮮語|韓国語|初修外国語|スポーツ科学|身体運動|健康・スポーツ|データ科学|現代教養|超学部セミナー|国際理解|多文化共生|人文・社会系基礎|哲学入門|論理学|倫理学入門|歴史学入門|文学入門|社会学入門|心理学入門|地理学入門|法学入門|政治学入門|経済学入門/i.test(combined)) {
    return "ilas";
  }

  // 4. 明示的な部局プロパティによる判定
  if (rawSite.props && rawSite.props.dept) {
    const dept = rawSite.props.dept.toLowerCase();
    if (dept.includes("教養教育") || dept.includes("ilas")) return "ilas";
    if (dept.includes("文学部") || dept.includes("人文学")) return "faculty";
  }

  // 5. TACTサイトIDの部局コード判定（フォールバック）
  // 01: 教養教育院, 02: 文学部
  const matchCode = siteId.match(/20\d{2}_(\d{2})_/);
  if (matchCode) {
    const code = matchCode[1];
    if (code === "01") return "ilas";
    if (code === "02" || code === "03") return "faculty";
  }

  return "unknown";
}

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

  // 単位対象外サイトかどうかの判定
  const nonCredit = isNonCreditCourse(cleanTitle, rawTitle, rawSite);

  // 開講元の厳格判定（教養教育院 vs 文学部専門）
  const origin = nonCredit ? "unknown" : detectCourseOrigin(siteId, rawTitle, rawSite);

  // 単位数の推測（単位対象外サイトは 0 単位）
  const credits = nonCredit ? 0 : estimateCredits(cleanTitle, rawTitle);

  // カテゴリの推測（開講元スコープで絞り込み）
  let categoryId = "uncategorized";
  let isEstimated = false;

  if (nonCredit) {
    categoryId = "non_credit";
  } else if (customMappings[cleanTitle]) {
    categoryId = customMappings[cleanTitle];
    isEstimated = false;
  } else {
    const guessResult = guessCategoryWithMeta(cleanTitle, categories, origin);
    categoryId = guessResult.categoryId;
    isEstimated = guessResult.isEstimated;
  }

  // ステータスの推測 (非単位サイトは exempt、過去年度なら修得済、今年度なら履修中)
  const status = nonCredit ? "exempt" : guessStatus(termInfo.year);

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
    origin: origin, // "ilas" | "faculty" | "unknown"
    isEstimated: isEstimated,
    status: status, // "passed" | "enrolled" | "failed" | "exempt"
    isNonCredit: nonCredit,
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
 * 単位数の推測（デフォルト2単位、実験・実習・スポーツ・特定専門科目は1単位、卒論は10単位、卒論演習は2単位）
 */
export function estimateCredits(cleanTitle, rawTitle) {
  const combined = `${cleanTitle} ${rawTitle}`;

  // 1. 「大学での学び」基礎論は 1 単位
  if (/大学での学び/i.test(combined)) {
    return 1;
  }

  // 2. 卒業論文演習・卒論演習は 2 単位（※卒業論文単体より先に判定）
  if (/卒業論文演習|卒論演習/i.test(combined)) {
    return 2;
  }

  // 3. 卒業論文・学士論文は 10 単位
  if (/卒業論文|卒業研究|特別研究|学士論文/i.test(combined)) {
    return 10;
  }

  // 4. データ科学基礎科目は原則1単位
  if (/データ科学|データサイエンス/i.test(combined)) {
    return 1;
  }

  // 5. 英語（上級リーディング）は1単位
  if (/上級リーディング|advanced reading/i.test(combined)) {
    return 1;
  }

  // 6. 健康・スポーツ科学科目（講義と実習の厳格な峻別）
  // 実習科目（1単位）の明示的キーワード: 実習、実技、身体運動、または具体的な競技名
  const isSportsPractice = /実習|実技|身体運動|フィットネス|バドミントン|テニス|卓球|サッカー|バスケット|バレー|水泳|スキー|陸上|トレーニング/i.test(combined);
  if (/健康|スポーツ|身体科学/i.test(combined)) {
    if (isSportsPractice) {
      return 1; // 健康・スポーツ科学実習は 1 単位
    } else {
      return 2; // 健康・スポーツ科学講義は 2 単位（必修）
    }
  }

  // 7. その他の1単位指定科目（専門実習・共通実践・実験等）
  if (/日本文化事情|異文化理解|ジェンダー学概論|セクシュアリティ学概論|情報リテラシー|科学技術と人文学|デジタル人文学|コミュニケーションスキル|イノベーション創出|実験|チュートリアル/i.test(combined)) {
    return 1;
  }

  // 8. 通年・特論・総合演習
  if (/通年|特論|総合演習/i.test(combined)) {
    return 4;
  }

  return 2; // 大学講義の標準単位数（人文学入門Ⅰ〜Ⅳ、人間と倫理、国際移民論、応用倫理学演習等含む）
}

/**
 * 開講元スコープと高精度キーワードによるカテゴリ推定（メタデータ付き）
 * @param {string} cleanTitle
 * @param {Array} categories
 * @param {"ilas" | "faculty" | "unknown"} origin
 * @returns {{ categoryId: string, confidence: number, isEstimated: boolean }}
 */
export function guessCategoryWithMeta(cleanTitle, categories = [], origin = "unknown") {
  if (!categories || categories.length === 0) {
    return { categoryId: "uncategorized", confidence: 0, isEstimated: true };
  }

  const title = cleanTitle.toLowerCase();

  // 開講元（教養教育院 vs 文学部）による候補カテゴリプールの厳格分離
  let targetPool = categories;
  if (origin === "ilas") {
    // 全学教育科目専用プール（文学部専門科目への誤マッピングを完全に防止）
    targetPool = categories.filter(c => c.scope === "ilas" || c.section === "全学教育科目");
  } else if (origin === "faculty") {
    // 文学部専門科目専用プール（全学教育科目への誤マッピングを完全に防止）
    targetPool = categories.filter(c => c.scope === "faculty" || c.section !== "全学教育科目");
  }

  // 1. 文学部 専門基礎科目（人文学入門Ⅰ〜Ⅳ）
  if (title.includes("人文学入門") || title.includes("専門基礎")) {
    const cat = targetPool.find(c => c.id === "major_basics");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }

  // 2. 文学部 共通基盤科目
  if (/日本文化事情|異文化理解|人間と倫理|ジェンダー学概論|セクシュアリティ学概論|国際移民論|ナショナリズム/i.test(title)) {
    const cat = targetPool.find(c => c.id === "major_common_base");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }

  // 3. 文学部 共通実践科目
  if (/情報リテラシー|科学技術と人文学|応用倫理学演習|デジタル人文学|コミュニケーションスキル|人文科学イノベーション/i.test(title)) {
    const cat = targetPool.find(c => c.id === "major_common_practice");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }

  // 4. 卒業論文演習・卒論演習（専修必修演習区分へ、卒論本体と明確に区別）
  if (/卒業論文演習|卒論演習/i.test(title)) {
    const cat = targetPool.find(c => c.id === "dept_req_seminar" || c.id === "major_req");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }

  // 5. 文学部 卒業論文（10単位・論文審査科目）
  if (/卒業論文|卒業研究|卒論|学士論文/i.test(title)) {
    const cat = targetPool.find(c => c.id === "major_thesis");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }

  // 5. 文学部 専修実習科目（発掘調査、心理学実験、社会調査実習、野外実習巡検等）
  if (/発掘調査|実測|調査実習|野外実習|巡検|心理学実験|心理学実習|社会調査実習/i.test(title)) {
    const cat = targetPool.find(c => c.id === "dept_req_prac");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }

  // 6. 文学部 専修演習・講読科目
  if (/演習|講読|史料講読|原典講読|文献講読/i.test(title) && origin !== "ilas") {
    const cat = targetPool.find(c => c.id === "dept_req_seminar" || c.id === "major_req");
    if (cat) return { categoryId: cat.id, confidence: 0.9, isEstimated: false };
  }

  // 7. 文学部 特殊講義・専門講義
  if (/特殊講義|特論|特殊研究/i.test(title) && origin !== "ilas") {
    const cat = targetPool.find(c => c.id === "dept_elec_lecture" || c.id === "major_elec");
    if (cat) return { categoryId: cat.id, confidence: 0.9, isEstimated: false };
  }

  // 8. 全学教育科目固有の確実なキーワード判定
  if (title.includes("大学での学び")) {
    const cat = targetPool.find(c => c.id === "intro_study");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }
  if (title.includes("基礎セミナー")) {
    const cat = targetPool.find(c => c.id === "seminar");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }
  if (title.includes("英語") || title.includes("english") || title.includes("academic english")) {
    const cat = targetPool.find(c => c.id === "lang_en");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }
  if (/ドイツ語|フランス語|中国語|ロシア語|スペイン語|朝鮮語|韓国語|german|french|chinese|russian|spanish/i.test(title)) {
    const cat = targetPool.find(c => c.id === "lang_second");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }
  if (title.includes("データ科学") || title.includes("データサイエンス")) {
    const cat = targetPool.find(c => c.id === "data_sci");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }

  // 健康・スポーツ科学科目（講義と実習の厳格な峻別）
  const isPrac = /実習|実技|身体運動|フィットネス|バドミントン|テニス|卓球|サッカー|バスケット|バレー|水泳|スキー|陸上|トレーニング/i.test(title);
  if (/健康|スポーツ|身体科学/i.test(title)) {
    if (isPrac) {
      const catPrac = targetPool.find(c => c.id === "health_sports_prac" || c.id === "health_sports");
      if (catPrac) return { categoryId: catPrac.id, confidence: 1.0, isEstimated: false };
    } else {
      const catLec = targetPool.find(c => c.id === "health_sports_lec");
      if (catLec) return { categoryId: catLec.id, confidence: 1.0, isEstimated: false };
    }
  }

  if (title.includes("国際理解") || title.includes("多文化")) {
    const cat = targetPool.find(c => c.id === "intl_understanding");
    if (cat) return { categoryId: cat.id, confidence: 0.9, isEstimated: false };
  }
  if (title.includes("現代教養") || title.includes("超学部")) {
    const cat = targetPool.find(c => c.id === "modern_liberal");
    if (cat) return { categoryId: cat.id, confidence: 0.9, isEstimated: false };
  }

  // 全学教育科目：人文・社会系基礎科目の確実なキーワード判定
  if (origin === "ilas" || targetPool.some(c => c.id === "hum_soc")) {
    if (/哲学入門|論理学|倫理学入門|歴史学入門|日本史入門|東洋史入門|西洋史入門|文学入門|社会学入門|心理学入門|地理学入門|法学入門|政治学入門|経済学入門/i.test(title)) {
      const cat = targetPool.find(c => c.id === "hum_soc");
      if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
    }
  }

  // 9. 各カテゴリ定義のキーワード配列による判定（フォールバック）
  for (const cat of targetPool) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      if (title.includes(kw.toLowerCase())) {
        return { categoryId: cat.id, confidence: 0.7, isEstimated: true };
      }
    }
  }

  return { categoryId: "uncategorized", confidence: 0, isEstimated: true };
}

/**
 * 科目名からカテゴリを推測（後方互換性ラッパー）
 */
export function guessCategory(cleanTitle, categories = [], origin = "unknown") {
  return guessCategoryWithMeta(cleanTitle, categories, origin).categoryId;
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
    uncategorizedCourses: [],
    nonCreditCourses: []
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
    // 単位対象外（事務・連絡・e-Learning・学生支援等）のサイトは単位計算から完全に除外
    if (course.isNonCredit || course.categoryId === "non_credit") {
      summary.nonCreditCourses.push(course);
      return;
    }

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
      // 未分類科目（要確認）
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
