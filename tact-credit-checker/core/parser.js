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

// =============================================================================
// 名古屋大学教養教育院「全学教育科目授業時間割表（B表）」公式マスターデータ
// =============================================================================

// B表公式: 分野別・人文社会 (人文・社会系基礎科目)
export const B_TABLE_HUM_SOC = [
  "哲学", "歴史学", "文学", "心理学", "社会学", "地理学", "法学", "政治学",
  "経済学", "経営・会計", "宗教学・文化人類学", "宗教学", "文化人類学", "教育学",
  "比較文化論", "比較教育論", "統計学", "アーカイブズ学", "日本国憲法", "高等教育学"
];

// B表公式: 分野別・自然系 (自然科学系基礎科目)
export const B_TABLE_NAT_SCI = [
  "微分積分学Ⅰ", "微分積分学Ⅱ", "線形代数学Ⅰ", "線形代数学Ⅱ", "数学通論Ⅰ", "数学通論Ⅱ",
  "複素関数論", "力学Ⅰ", "力学Ⅱ", "電磁気学Ⅰ", "電磁気学Ⅱ", "物理学基礎Ⅰ", "物理学基礎Ⅱ",
  "物理学基礎Ⅰ［総合］", "物理学実験", "化学基礎Ⅰ", "化学基礎Ⅱ", "化学基礎Ⅰ［総合］",
  "化学実験", "生物学基礎Ⅰ", "生物学基礎Ⅱ", "生物学実験", "地球科学基礎Ⅰ", "地球科学基礎Ⅱ",
  "地球科学実験"
];

// B表公式: 教養・現代教養
export const B_TABLE_MODERN_LIBERAL = [
  "現代社会と教育", "歴史学入門", "言語学入門", "文化・芸術学入門", "社会学入門",
  "心理学入門", "法学入門", "政治学入門", "経済概論", "経営・会計入門", "環境学入門",
  "博物館概論", "芸術論b", "芸術論", "大学でどう生きるか", "青年期における心の健康",
  "社会安全学", "ジェンダー学", "学問の面白さを知る", "超学部セミナー"
];

// B表公式: 教養・国際理解
export const B_TABLE_INTL_UNDERSTANDING = [
  "国際関係論", "国際開発学", "国際学", "英語・プレゼンテーション", "グローバル化時代の国際社会",
  "グローバル化と国際教育交流", "留学生と日本", "日本語教育実践入門", "フランス語・アカデミック",
  "囲碁と日本文化", "海外言語文化演習", "短期海外研修", "海外留学準備セミナー",
  "studium generale", "biology in english", "immigration in japan", "sml"
];

// 文学部公式: 専門基礎科目（人文学入門Ⅰ〜Ⅳ）
export const LIT_MAJOR_BASICS = [
  "人文学入門ⅰ", "人文学入門ⅱ", "人文学入門ⅲ", "人文学入門ⅳ",
  "人文学入門1", "人文学入門2", "人文学入門3", "人文学入門4", "人文学入門"
];

// 文学部公式: 共通基盤科目
export const LIT_COMMON_BASE = [
  "日本文化事情", "異文化理解", "人間と倫理", "ジェンダー学概論", "セクシュアリティ学概論",
  "国際移民論", "ナショナリズム・トランスナショナリズム論", "ナショナリズム論"
];

// 文学部公式: 共通実践科目
export const LIT_COMMON_PRACTICE = [
  "人文学の学生のための情報リテラシー", "科学技術と人文学", "応用倫理学演習",
  "デジタル人文学", "人文学のためのコミュニケーションスキル", "人文科学イノベーション創出と課題解決"
];

/**
 * TACTサイトIDや講義名から開講元（教養教育院 vs 文学部専門）を判定
 * @param {string} siteId
 * @param {string} title
 * @param {Object} rawSite
 * @returns {"ilas" | "faculty" | "unknown"}
 */
export function detectCourseOrigin(siteId = "", title = "", rawSite = {}) {
  const combined = `${siteId} ${title} ${rawSite.title || ""} ${(rawSite.props && rawSite.props.dept) || ""}`.toLowerCase();

  // 1. 文学部専門科目固有の明確なキーワード（人文学入門、共通基盤、共通実践、専修、特殊講義等）
  if (/人文学入門|日本文化事情|異文化理解|人間と倫理|ジェンダー学概論|セクシュアリティ学概論|国際移民論|ナショナリズム|情報リテラシー|科学技術と人文学|応用倫理学演習|デジタル人文学|コミュニケーションスキル|イノベーション創出|特殊講義|特論|特殊研究|文学部.*専修|演習|講読|史料講読|原典講読|卒業論文|卒論|学士論文|巡検|実測|発掘調査|心理学実験|社会調査実習/i.test(combined)) {
    return "faculty";
  }

  // 2. 教養教育院（全学教育科目）固有のプレフィックス・キーワード（B表区分等）
  if (/共通・|分野別・|教養・|基礎セミナー|大学での学び|超学部セミナー|初修外国語|多言語修得基礎|スポーツ科学|身体運動|健康・スポーツ|健康スポーツ|データ科学|現代教養|国際理解|多文化共生|留学生と日本|英語|english|ドイツ語|フランス語|中国語|ロシア語|スペイン語|朝鮮語|韓国語/i.test(combined)) {
    return "ilas";
  }

  // 3. 明示的な部局プロパティによる判定
  if (rawSite.props && rawSite.props.dept) {
    const dept = rawSite.props.dept.toLowerCase();
    if (dept.includes("教養教育") || dept.includes("ilas")) return "ilas";
    if (dept.includes("文学部") || dept.includes("人文学") || dept.includes("letters")) return "faculty";
  }

  // 4. 時間割コード / TACTサイトIDの部局コード判定
  // 名大の時間割コード: 00 は教養教育院（全学教育科目）
  if (/\b00\s*\d{5}\b/.test(combined)) {
    return "ilas";
  }
  const matchCode = siteId.match(/20\d{2}_(\d{2})_/);
  if (matchCode) {
    const code = matchCode[1];
    if (code === "00") return "ilas";
    if (code === "01") {
      if (combined.includes("文学部") || combined.includes("人文学") || combined.includes("letters")) return "faculty";
      return "ilas";
    }
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
 * 講義タイトルのUnicode NFKC正規化（全角半角・ローマ数字・空白・記号の統一）
 * @param {string} text
 * @returns {string}
 */
export function normalizeTitle(text = "") {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_・:：]/g, "");
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
  const normTitle = normalizeTitle(cleanTitle);
  // 区分名プレフィックス（専門基礎、共通基盤、共通実践、教養、分野別等）を除去したコアタイトル
  const coreNormTitle = normTitle.replace(/^(専門基礎|共通基盤|共通実践|教養|分野別|人文社会系基礎|国際理解科目|現代教養科目)/, "");

  const matchesExact = (targetItem) => {
    if (!targetItem) return false;
    const normTarget = normalizeTitle(targetItem);
    return normTitle === normTarget || (coreNormTitle && coreNormTitle === normTarget);
  };

  // 開講元（教養教育院 vs 文学部）による候補カテゴリプールの厳格分離
  let targetPool = categories;
  if (origin === "ilas") {
    // 全学教育科目専用プール（文学部専門科目への誤マッピングを完全に防止）
    targetPool = categories.filter(c => c.scope === "ilas" || c.section === "全学教育科目");
  } else if (origin === "faculty") {
    // 文学部専門科目専用プール（全学教育科目への誤マッピングを完全に防止）
    targetPool = categories.filter(c => c.scope === "faculty" || c.section !== "全学教育科目");
  }

  // =========================================================================
  // 【フェーズ1】文学部専門科目の厳格ホワイトリスト完全一致照合（Exact Match Only）
  // ユーザー提示の指定リストに基づき、100%完全一致するもののみ各専門区分へ分類。
  // 推測・部分一致・あいまい判定は一切排除する。
  // =========================================================================
  if (origin !== "ilas") {
    // 1. 文学部 専門基礎科目（人文学入門Ⅰ〜Ⅳ のみ厳格完全一致）
    const basicsCat = targetPool.find(c => c.id === "major_basics");
    if (basicsCat) {
      const isBasicsMatch = (basicsCat.courseList && basicsCat.courseList.some(item => matchesExact(item)))
        || LIT_MAJOR_BASICS.some(item => matchesExact(item));
      if (isBasicsMatch) {
        return { categoryId: basicsCat.id, confidence: 1.0, isEstimated: false };
      }
    }

    // 2. 文学部 共通基盤科目（公式マスター完全一致）
    const commonBaseCat = targetPool.find(c => c.id === "major_common_base");
    if (commonBaseCat) {
      const isBaseMatch = (commonBaseCat.courseList && commonBaseCat.courseList.some(item => matchesExact(item)))
        || LIT_COMMON_BASE.some(item => matchesExact(item));
      if (isBaseMatch) {
        return { categoryId: commonBaseCat.id, confidence: 1.0, isEstimated: false };
      }
    }

    // 3. 文学部 共通実践科目（公式マスター完全一致）
    const commonPracticeCat = targetPool.find(c => c.id === "major_common_practice");
    if (commonPracticeCat) {
      const isPracticeMatch = (commonPracticeCat.courseList && commonPracticeCat.courseList.some(item => matchesExact(item)))
        || LIT_COMMON_PRACTICE.some(item => matchesExact(item));
      if (isPracticeMatch) {
        return { categoryId: commonPracticeCat.id, confidence: 1.0, isEstimated: false };
      }
    }

    // 4. 文学部 卒業論文（10単位・論文審査科目：完全一致かつ演習除外）
    const thesisCat = targetPool.find(c => c.id === "major_thesis");
    if (thesisCat && !/演習/i.test(title)) {
      const isThesisMatch = (thesisCat.courseList && thesisCat.courseList.some(item => matchesExact(item)))
        || ["卒業論文", "卒業研究", "学士論文"].some(item => matchesExact(item));
      if (isThesisMatch) {
        return { categoryId: thesisCat.id, confidence: 1.0, isEstimated: false };
      }
    }

    // 5. 専攻に関係のある科目（32単位：概論・講義・語学・入門演習・実習・演習・卒論演習）
    // ★厳格ホワイトリスト完全一致 (Exact Match Only)
    // ユーザー提示の courseList に含まれる科目名と Unicode NFKC 正規化後が完全一致（===）する場合のみ割り当て。
    for (const cat of targetPool) {
      if (cat.id && (cat.id.startsWith("dept_") || cat.id.startsWith("major_")) && cat.id !== "dept_free") {
        if (cat.courseList && Array.isArray(cat.courseList) && cat.courseList.length > 0) {
          for (const item of cat.courseList) {
            if (matchesExact(item)) {
              return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // 【フェーズ2】教養教育院（全学教育科目）公式マスター判定
  // =========================================================================
  // 1. B表プレフィックスの明示的一致
  if (title.includes("教養・現代教養") || title.startsWith("現代教養")) {
    const cat = targetPool.find(c => c.id === "modern_liberal");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }
  if (title.includes("教養・国際理解") || title.startsWith("国際理解")) {
    const cat = targetPool.find(c => c.id === "intl_understanding");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }
  if (title.includes("教養・超学部") || title.includes("超学部セミナー")) {
    const cat = targetPool.find(c => c.id === "modern_liberal");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }
  if (title.includes("分野別・人文社会")) {
    const cat = targetPool.find(c => c.id === "hum_soc");
    if (cat) return { categoryId: cat.id, confidence: 1.0, isEstimated: false };
  }

  // 2. 全学教育科目固有の確実なキーワード判定
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

  // 教養・国際理解
  if (B_TABLE_INTL_UNDERSTANDING.some(kw => title.includes(kw)) || title.includes("国際理解") || title.includes("多文化")) {
    const cat = targetPool.find(c => c.id === "intl_understanding");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }

  // 教養・現代教養
  if (B_TABLE_MODERN_LIBERAL.some(kw => title.includes(kw)) || title.includes("現代教養") || title.includes("超学部")) {
    const cat = targetPool.find(c => c.id === "modern_liberal");
    if (cat) return { categoryId: cat.id, confidence: 0.95, isEstimated: false };
  }

  // 分野別・人文社会
  if (B_TABLE_HUM_SOC.some(kw => title.includes(kw))) {
    const cat = targetPool.find(c => c.id === "hum_soc");
    if (cat) return { categoryId: cat.id, confidence: 0.9, isEstimated: false };
  }

  // =========================================================================
  // 【フェーズ3】文学部専門科目の残余振替：専攻外選択科目（35単位枠）へ隔離
  // 自専攻の指定リスト（32単位）および共通・基礎・卒論のホワイトリストに
  // 一致しなかった文学部科目は、自専修区分には絶対に紛れ込ませず、
  // すべて「専攻外選択科目（dept_free）」へと安全に分類する。
  // =========================================================================
  if (origin === "faculty") {
    const freeCat = targetPool.find(c => c.id === "dept_free" || c.id === "free_elec");
    if (freeCat) {
      return { categoryId: freeCat.id, confidence: 0.9, isEstimated: false };
    }
  }

  // =========================================================================
  // 【フェーズ4】汎用モデル用フォールバック（文学部モデル以外の場合のみ）
  // =========================================================================
  for (const cat of targetPool) {
    // 文学部モデルの専門区分（dept_ または major_basics, major_common_*）へはフォールバックさせない
    if (cat.id.startsWith("dept_") || cat.id.startsWith("major_")) continue;

    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      const normKw = normalizeTitle(kw);
      if (title.includes(kw.toLowerCase()) || (normKw && normTitle.includes(normKw))) {
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

  // 1. 各カテゴリの基本充足・不足・超過計算（第1パス）
  Object.values(catMap).forEach(cat => {
    cat.potential = cat.passed + cat.enrolled;
    cat.isFulfilled = cat.passed >= cat.required;
    cat.shortfall = Math.max(0, cat.required - cat.passed);
    cat.excess = Math.max(0, cat.passed - cat.required);
  });

  // 2. 専攻外選択科目（dept_free: 35単位）への専門系・専攻科目超過分の自動振替算入（第2パス）
  // 名古屋大学文学部履修要覧要件:
  // ①人文学入門（専門基礎）超過分、②共通基盤・共通実践超過分、③専攻専門超過分が選択科目に算入。
  // ※全学教育科目の超過分はこの35単位に含めてはならない！
  const freeCat = catMap["dept_free"] || catMap["free_elec"];
  if (freeCat) {
    let overflowCredits = 0;
    Object.values(catMap).forEach(cat => {
      if (cat.id === freeCat.id || cat.id === "major_thesis") return;
      // 全学教育科目（教養教育院科目）は厳格に対象外
      if (cat.section === "全学教育科目" || cat.scope === "ilas") return;
      // 専門基礎、共通基盤、共通実践、専攻専門各区分の超過分を加算
      if (cat.excess > 0) {
        overflowCredits += cat.excess;
      }
    });

    freeCat.directPassed = freeCat.passed;
    freeCat.overflowCredits = overflowCredits;
    freeCat.passed = freeCat.directPassed + overflowCredits;
    freeCat.potential = freeCat.passed + freeCat.enrolled;
    freeCat.isFulfilled = freeCat.passed >= freeCat.required;
    freeCat.shortfall = Math.max(0, freeCat.required - freeCat.passed);
    freeCat.excess = Math.max(0, freeCat.passed - freeCat.required);
  }

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
