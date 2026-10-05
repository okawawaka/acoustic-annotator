/**
 * TACT Credit Checker - Automated Logic & Parser Tests
 * 名古屋大学文学部公式要覧（Student's Guide 2023〜2026）準拠テスト
 * 専攻専門32単位・選択35単位・超過振替エンジン対応
 */

import { DEFAULT_PRESETS, SUPPORTED_FACULTIES, LIT_DEPARTMENTS, buildLiteratureCategories } from "./core/presets.js";
import { parseCourseSite, calculateCredits, cleanCourseTitle, extractTermAndYear, isNonCreditCourse, detectCourseOrigin } from "./core/parser.js";
import { getMockCourseSites } from "./core/api.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  ✕ FAIL: ${message}`);
  }
}

console.log("=== 1. Presets Integrity Tests ===");
assert(SUPPORTED_FACULTIES.length === 2, "Supported faculties limited to Literature & General");
const litPreset = DEFAULT_PRESETS.find(p => p.id === "nu-humanities");
assert(litPreset !== undefined, "Nagoya U Literature faculty preset exists");
assert(litPreset.totalRequired === 124, "Literature faculty total required is exactly 124");
assert(litPreset.advancementRequired === 38, "Literature faculty 2nd-year advancement requirement is exactly 38");

// 全学教育科目 (40単位) の検証
const generalEdCredits = litPreset.categories
  .filter(c => c.section === "全学教育科目")
  .reduce((sum, c) => sum + c.requiredCredits, 0);
assert(generalEdCredits === 40, `General education credits sum to exactly 40 (got ${generalEdCredits})`);

// 専門系科目 (専門基礎科目 2単位) の検証
const basicsCredits = litPreset.categories
  .filter(c => c.section === "専門系科目")
  .reduce((sum, c) => sum + c.requiredCredits, 0);
assert(basicsCredits === 2, `Specialized basics section credits sum to exactly 2 (got ${basicsCredits})`);

// 専門科目 (82単位) の検証: 共通基盤(2) + 共通実践(3) + 専攻(32) + 卒論(10) + 選択(35) = 82
const majorCredits = litPreset.categories
  .filter(c => c.section === "専門科目")
  .reduce((sum, c) => sum + c.requiredCredits, 0);
assert(majorCredits === 82, `Major section credits sum to exactly 82 (got ${majorCredits})`);

console.log("\n=== 2. Course Parser & Title Cleaner Tests ===");
const clean1 = cleanCourseTitle("基礎セミナー [文学部1組] (2024前期)");
assert(clean1 === "基礎セミナー", `Cleaned title matches expected: '${clean1}' === '基礎セミナー'`);

const clean2 = cleanCourseTitle("2024_01_1234567: 専門基礎：人文学入門Ⅰ (月2)");
assert(clean2 === "専門基礎：人文学入門Ⅰ", `Cleaned title with code prefix: '${clean2}'`);

const termInfo = extractTermAndYear("ドイツ語基礎1 (2024前期)");
assert(termInfo.year === 2024, `Extracted year is 2024 (got ${termInfo.year})`);
assert(termInfo.season === "春/前期", `Extracted season is 春/前期 (got ${termInfo.season})`);

console.log("\n=== 3. Literature Faculty Course Categorization Tests ===");
const categories = buildLiteratureCategories("linguistics");
const mockSites = getMockCourseSites();
assert(mockSites.length >= 20, `Mock data has ${mockSites.length} courses`);

const parsed = mockSites.map(s => parseCourseSite(s, categories, {}));

// 各区分への自動マッピング検証
const intro = parsed.find(c => c.categoryId === "intro_study");
assert(intro !== undefined, "「大学での学び」基礎論 correctly categorized into intro_study");
assert(intro.credits === 1, `「大学での学び」基礎論は1単位 (got ${intro.credits})`);

const seminar = parsed.find(c => c.categoryId === "seminar");
assert(seminar !== undefined, "基礎セミナー correctly categorized into seminar");

const english = parsed.filter(c => c.categoryId === "lang_en");
assert(english.length >= 3, `English courses categorized into lang_en (found ${english.length})`);

const secondLang = parsed.filter(c => c.categoryId === "lang_second");
assert(secondLang.length >= 3, `Second language categorized into lang_second (found ${secondLang.length})`);

const dataSci = parsed.find(c => c.categoryId === "data_sci");
assert(dataSci !== undefined, "データ科学 correctly categorized into data_sci");
assert(dataSci.credits === 1, `データ科学基礎科目は原則1単位 (got ${dataSci.credits})`);

// 英語（上級リーディング）は1単位
const advReading = parsed.find(c => c.title.includes("上級リーディング"));
assert(advReading !== undefined, "英語（上級リーディング） exists in mock data");
assert(advReading.credits === 1, `英語（上級リーディング）は1単位 (got ${advReading.credits})`);

// 健康・スポーツ科学：講義（2単位）と実習（2単位: 各1単位×2）
const sportsLec = parsed.find(c => c.categoryId === "health_sports_lec");
assert(sportsLec !== undefined, "健康・スポーツ科学講義 correctly categorized into health_sports_lec");
assert(sportsLec.credits === 2, `スポーツ科学講義は2単位 (got ${sportsLec.credits})`);

const sportsPrac = parsed.find(c => c.categoryId === "health_sports_prac");
assert(sportsPrac !== undefined, "健康・スポーツ科学実習 correctly categorized into health_sports_prac");
assert(sportsPrac.credits === 1, `スポーツ科学実習は1単位 (got ${sportsPrac.credits})`);

// 専門系科目：専門基礎科目（人文学入門Ⅰ・Ⅱ のみ）
const majorBasics = parsed.filter(c => c.categoryId === "major_basics");
assert(majorBasics.length >= 2, `人文学入門Ⅰ・Ⅱ categorized into major_basics (found ${majorBasics.length})`);

// 「人文学入門」以外の「専門基礎」を含む科目が絶対に major_basics に誤分類されないことの検証
const nonBasicsCourses = [
  "専門基礎英語",
  "専門基礎物理学",
  "専門基礎数学",
  "哲学専門基礎演習",
  "社会学専門基礎研究"
];
nonBasicsCourses.forEach(title => {
  const p = parseCourseSite({ id: "mock_test_site", title }, categories);
  assert(p.categoryId !== "major_basics", `'${title}' must NOT be categorized into major_basics (got '${p.categoryId}')`);
});

// 専門科目：共通基盤科目（必要2単位: 日本文化事情, 人間と倫理, ジェンダー学概論）
const commonBaseCat = categories.find(c => c.id === "major_common_base");
assert(commonBaseCat && commonBaseCat.requiredCredits === 2, `共通基盤科目の必要単位は2 (got ${commonBaseCat?.requiredCredits})`);
const commonBase = parsed.filter(c => c.categoryId === "major_common_base");
assert(commonBase.length >= 3, `共通基盤科目 correctly categorized (found ${commonBase.length})`);
const jpCulture = parsed.find(c => c.title.includes("日本文化事情"));
assert(jpCulture !== undefined && jpCulture.credits === 1, "日本文化事情 correctly has 1 credit");
const genderIntro = parsed.find(c => c.title.includes("ジェンダー学概論"));
assert(genderIntro !== undefined && genderIntro.credits === 1, "ジェンダー学概論 correctly has 1 credit");

// 専門科目：共通実践科目（必要3単位: デジタル人文学, 科学技術と人文学）
const commonPracticeCat = categories.find(c => c.id === "major_common_practice");
assert(commonPracticeCat && commonPracticeCat.requiredCredits === 3, `共通実践科目の必要単位は3 (got ${commonPracticeCat?.requiredCredits})`);
const commonPractice = parsed.filter(c => c.categoryId === "major_common_practice");
assert(commonPractice.length >= 2, `共通実践科目 correctly categorized (found ${commonPractice.length})`);
const digitalHum = parsed.find(c => c.title.includes("デジタル人文学"));
assert(digitalHum !== undefined && digitalHum.credits === 1, "デジタル人文学 correctly has 1 credit");

console.log("\n=== 4. Credit Calculation & Advancement Check Tests ===");
const summary = calculateCredits(parsed, categories);
assert(summary.totalRequired === 124, `Total required is 124`);
assert(summary.sectionSummary["全学教育科目"].required === 40, "General Ed section required is 40");
assert(summary.sectionSummary["専門系科目"].required === 2, "Specialized basics section required is 2");
assert(summary.sectionSummary["専門科目"].required === 82, "Specialized section required is 82");
assert(summary.totalPassed > 0, `Total passed credits > 0 (got ${summary.totalPassed})`);
assert(summary.totalEnrolled > 0, `Total enrolled credits > 0 (got ${summary.totalEnrolled})`);

console.log("\n=== 5. Literature 22 Departments Customization Tests ===");
assert(LIT_DEPARTMENTS.length === 22, `LIT_DEPARTMENTS has all 22 Nagoya U Lit major tracks (got ${LIT_DEPARTMENTS.length})`);

// 5学繫の網羅テスト
const uniqueGroups = [...new Set(LIT_DEPARTMENTS.map(d => d.facultyGroup))];
assert(uniqueGroups.length === 5, `All 5 faculty groups exist (got ${uniqueGroups.join(', ')})`);

// 全22専攻の単位整合性ループテスト (全専攻で全学40 + 専門系2 + 専門82 = 124単位)
let allDeptsValid = true;
LIT_DEPARTMENTS.forEach(dept => {
  const cats = buildLiteratureCategories(dept.id);
  const genSum = cats.filter(c => c.section === "全学教育科目").reduce((s, c) => s + c.requiredCredits, 0);
  const specBasicsSum = cats.filter(c => c.section === "専門系科目").reduce((s, c) => s + c.requiredCredits, 0);
  const specMajorSum = cats.filter(c => c.section === "専門科目").reduce((s, c) => s + c.requiredCredits, 0);
  const total = genSum + specBasicsSum + specMajorSum;

  if (genSum !== 40 || specBasicsSum !== 2 || specMajorSum !== 82 || total !== 124) {
    allDeptsValid = false;
    console.error(`Invalid sum in dept ${dept.name}: gen=${genSum}, basics=${specBasicsSum}, major=${specMajorSum}, total=${total}`);
  }
});
assert(allDeptsValid, "All 22 departments satisfy exact credit rules: 40 General + 2 Basics + 82 Major = 124 Total");

console.log("\n=== 6. Linguistics Track Detailed Requirements & Mapping Tests ===");
const lingCats = buildLiteratureCategories("linguistics");
const lingMajorCats = lingCats.filter(c => c.group === "専攻に関係のある科目");
const lingMajorSum = lingMajorCats.reduce((s, c) => s + c.requiredCredits, 0);
assert(lingMajorSum === 32, `Linguistics major required credits sum to exactly 32 (got ${lingMajorSum})`);

// 区分詳細検証: 概論(4), 講義(12), 語学(2), 入門演習(4), 演習(8), 卒論演習(2)
const lingSurvey = lingCats.find(c => c.id === "dept_survey");
assert(lingSurvey && lingSurvey.requiredCredits === 4, "Linguistics survey credits = 4");
const lingLecture = lingCats.find(c => c.id === "dept_lecture");
assert(lingLecture && lingLecture.requiredCredits === 12, "Linguistics lecture credits = 12");
const lingLanguage = lingCats.find(c => c.id === "dept_language");
assert(lingLanguage && lingLanguage.requiredCredits === 2, "Linguistics language credits = 2");
const lingIntroSem = lingCats.find(c => c.id === "dept_intro_seminar");
assert(lingIntroSem && lingIntroSem.requiredCredits === 4, "Linguistics intro seminar credits = 4");
const lingSeminar = lingCats.find(c => c.id === "dept_seminar");
assert(lingSeminar && lingSeminar.requiredCredits === 8, "Linguistics seminar credits = 8");
const lingThesisSem = lingCats.find(c => c.id === "dept_thesis_seminar");
assert(lingThesisSem && lingThesisSem.requiredCredits === 2, "Linguistics thesis seminar credits = 2");

// 科目マッピング検証（半角およびTACT全角文字表記の双方を検証）
const testCourses = [
  { title: "言語学概論a", expectedCat: "dept_survey", expectedCredits: 2 },
  { title: "言語学概論ａ", expectedCat: "dept_survey", expectedCredits: 2 },
  { title: "言語学概論ｂ", expectedCat: "dept_survey", expectedCredits: 2 },
  { title: "音声学講義", expectedCat: "dept_lecture", expectedCredits: 2 },
  { title: "音韻論講義", expectedCat: "dept_lecture", expectedCredits: 2 },
  { title: "意味論講義", expectedCat: "dept_lecture", expectedCredits: 2 },
  { title: "言語学講義Ⅰ", expectedCat: "dept_lecture", expectedCredits: 2 },
  { title: "言語学講義１", expectedCat: "dept_lecture", expectedCredits: 2 },
  { title: "ギリシア語a", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "ギリシア語ａ", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "ラテン語b", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "ラテン語ｂ", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "サンスクリット語a", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "サンスクリット語ａ", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "イタリア語ａ", expectedCat: "dept_language", expectedCredits: 2 },
  { title: "言語学入門演習a", expectedCat: "dept_intro_seminar", expectedCredits: 2 },
  { title: "言語学入門演習ａ", expectedCat: "dept_intro_seminar", expectedCredits: 2 },
  { title: "言語学演習Ⅰａ", expectedCat: "dept_seminar", expectedCredits: 2 },
  { title: "言語学演習Ⅰa", expectedCat: "dept_seminar", expectedCredits: 2 },
  { title: "言語学演習Ⅱ", expectedCat: "dept_seminar", expectedCredits: 2 },
  { title: "言語学卒業論文演習a", expectedCat: "dept_thesis_seminar", expectedCredits: 2 },
  { title: "言語学卒業論文演習ａ", expectedCat: "dept_thesis_seminar", expectedCredits: 2 },
  { title: "言語学卒業論文演習ｂ", expectedCat: "dept_thesis_seminar", expectedCredits: 2 }
];

testCourses.forEach(tc => {
  const p = parseCourseSite({ id: "mock_ling_site", title: tc.title }, lingCats);
  assert(p.categoryId === tc.expectedCat, `'${tc.title}' maps to '${tc.expectedCat}' (got '${p.categoryId}')`);
  assert(p.credits === tc.expectedCredits, `'${tc.title}' has ${tc.expectedCredits} credits (got ${p.credits})`);
});

// 卒業論文演習は2単位、卒業論文本体は10単位
const lingThesis = parseCourseSite({ id: "manual_thesis", title: "卒業論文" }, lingCats);
assert(lingThesis.credits === 10, "卒業論文 credits = 10");
assert(lingThesis.categoryId === "major_thesis", "卒業論文 maps to 'major_thesis'");

// 他専修の文学部科目（例: 日本史学講義、哲学演習など）を受講した場合、自専攻区分には紛れ込まず、専攻外選択科目(dept_free: 35単位)に確実に算入されることの検証
const otherMajorCourses = [
  "日本史学講義（古代）",
  "哲学特殊講義",
  "宗教学演習Ⅰ",
  "中国哲学史史料講読",
  "心理学実験実習",
  "地理学野外実習巡検",
  "社会学演習"
];

otherMajorCourses.forEach(title => {
  const c = parseCourseSite({ id: "2024_02_other", title }, lingCats);
  assert(c.categoryId === "dept_free", `'${title}' must be isolated into 'dept_free' (got '${c.categoryId}')`);
});

// 他学部科目（法学部、経済学部、理学部等）が専攻専門32単位枠に絶対に紛れ込まないことの検証
const otherFacultyCourses = [
  "民法総則",
  "ミクロ経済学基礎",
  "アルゴリズム入門",
  "量子力学基礎"
];
otherFacultyCourses.forEach(title => {
  const c = parseCourseSite({ id: "2024_03_other_fac", title }, lingCats);
  assert(
    !c.categoryId.startsWith("dept_") || c.categoryId === "dept_free",
    `'${title}' must NOT be in major 32-credit track (got '${c.categoryId}')`
  );
});

console.log("\n=== 7. Overflow Absorption into 35 Free Credits Tests ===");
// 超過算入シミュレーション:
// - 人文学入門で4単位修得（必要2単位、超過2単位）
// - 共通基盤科目で4単位修得（必要2単位、超過2単位）
// - 共通実践科目で4単位修得（必要3単位、超過1単位）
// - 専攻概論系科目で6単位修得（必要4単位、超過2単位）
// - 全学教育（英語）で12単位修得（必要10単位、超過2単位） -> 【重要】選択科目には絶対に振替されないこと！
// - 専攻外選択科目(dept_free)を直接4単位履修
const overflowCourses = [
  // 人文学入門: 4単位 (超過2)
  { id: "c1", title: "人文学入門Ⅰ", credits: 2, categoryId: "major_basics", status: "passed" },
  { id: "c2", title: "人文学入門Ⅱ", credits: 2, categoryId: "major_basics", status: "passed" },
  // 共通基盤: 4単位 (必要2単位 -> 超過2)
  { id: "c3", title: "人間と倫理", credits: 2, categoryId: "major_common_base", status: "passed" },
  { id: "c4", title: "国際移民論", credits: 2, categoryId: "major_common_base", status: "passed" },
  // 共通実践: 4単位 (必要3単位 -> 超過1)
  { id: "c4_1", title: "デジタル人文学", credits: 2, categoryId: "major_common_practice", status: "passed" },
  { id: "c4_2", title: "科学技術と人文学", credits: 2, categoryId: "major_common_practice", status: "passed" },
  // 専攻概論: 6単位 (必要4単位 -> 超過2)
  { id: "c5", title: "言語学概論a", credits: 2, categoryId: "dept_survey", status: "passed" },
  { id: "c6", title: "言語学概論b", credits: 2, categoryId: "dept_survey", status: "passed" },
  { id: "c7", title: "言語学概論特論", credits: 2, categoryId: "dept_survey", status: "passed" },
  // 専攻外選択(dept_free): 直接4単位
  { id: "c8", title: "日本史学講義", credits: 2, categoryId: "dept_free", status: "passed" },
  { id: "c9", title: "哲学講義", credits: 2, categoryId: "dept_free", status: "passed" },
  // 全学教育（英語）: 12単位 (超過2単位だが振替対象外)
  { id: "c10", title: "英語基礎1", credits: 2, categoryId: "lang_en", status: "passed" },
  { id: "c11", title: "英語基礎2", credits: 2, categoryId: "lang_en", status: "passed" },
  { id: "c12", title: "英語サロン1", credits: 2, categoryId: "lang_en", status: "passed" },
  { id: "c13", title: "英語サロン2", credits: 2, categoryId: "lang_en", status: "passed" },
  { id: "c14", title: "上級英語1", credits: 2, categoryId: "lang_en", status: "passed" },
  { id: "c15", title: "上級英語2", credits: 2, categoryId: "lang_en", status: "passed" }
];

const overflowSummary = calculateCredits(overflowCourses, lingCats);
const freeCatResult = overflowSummary.categoryProgress["dept_free"];

assert(freeCatResult.directPassed === 4, `Direct passed credits in dept_free is 4 (got ${freeCatResult.directPassed})`);
// 超過振替分 = 人文学入門(2) + 共通基盤(2) + 共通実践(1) + 専攻概論(2) = 7単位（全学英語超過2単位は厳格に除外）
assert(freeCatResult.overflowCredits === 7, `Overflow credits transferred into dept_free is exactly 7 (got ${freeCatResult.overflowCredits})`);
assert(freeCatResult.passed === 11, `Total effective passed credits in dept_free is 11 (got ${freeCatResult.passed})`);

console.log("\n=== 8. Non-credit Sites Exclusion Tests ===");
const nonCreditExamples = [
  "2024年度秋学期検定試験による単位認定について",
  "【a】2025年度ハラスメント防止に係るe-Learning",
  "文学部お知らせ",
  "文学部特別コース",
  "（学部）学生支援本部_1A",
  "（学部）学生支援本部_2A",
  "（学部）学生支援本部_3A"
];

nonCreditExamples.forEach(title => {
  const isExcluded = isNonCreditCourse(cleanCourseTitle(title), title);
  assert(isExcluded === true, `Non-credit detected: '${title}'`);

  const parsed = parseCourseSite({ id: "mock_test_id", title: title });
  assert(parsed.isNonCredit === true, `Parsed flag isNonCredit === true for '${title}'`);
  assert(parsed.credits === 0, `Parsed credits === 0 for '${title}'`);
  assert(parsed.categoryId === "non_credit", `Parsed categoryId === 'non_credit' for '${title}'`);
});

// calculateCredits による完全除外の検証
const regularMockSites = getMockCourseSites();
const allParsedSites = regularMockSites.map(s => parseCourseSite(s, lingCats));
const calculatedSummary = calculateCredits(allParsedSites, lingCats);

assert(calculatedSummary.nonCreditCourses.length >= 7, `All mock non-credit sites collected in nonCreditCourses (got ${calculatedSummary.nonCreditCourses.length})`);
const nonCreditInUncategorized = calculatedSummary.uncategorizedCourses.some(c => c.isNonCredit);
assert(!nonCreditInUncategorized, "No non-credit site leaked into uncategorizedCourses");

const nonCreditInSections = Object.values(calculatedSummary.categoryProgress).some(cat =>
  cat.courses.some(c => c.isNonCredit)
);
assert(!nonCreditInSections, "No non-credit site leaked into any graduation categoryProgress");

console.log(`\n======================================`);
console.log(`Total: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("All Nagoya U Literature faculty, Linguistics track & 35-credit overflow tests passed successfully! 🎉");
}
