/**
 * TACT Credit Checker - Automated Logic & Parser Tests
 * 名古屋大学文学部公式要覧（Student's Guide 2023〜2026）準拠テスト
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

// 専門科目 (82単位) の検証
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
const categories = litPreset.categories;
const mockSites = getMockCourseSites();
assert(mockSites.length >= 20, `Mock data has ${mockSites.length} courses`);

const parsed = mockSites.map(s => parseCourseSite(s, categories, {}));

// 各区分への自動マッピング検証
const intro = parsed.find(c => c.categoryId === "intro_study");
assert(intro !== undefined, "「大学での学び」基礎論 correctly categorized into intro_study");

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

// 専門系科目：専門基礎科目（人文学入門Ⅰ・Ⅱ）
const majorBasics = parsed.filter(c => c.categoryId === "major_basics");
assert(majorBasics.length >= 2, `人文学入門Ⅰ・Ⅱ categorized into major_basics (found ${majorBasics.length})`);

// 専門科目：共通基盤科目（日本文化事情, 人間と倫理, ジェンダー学概論）
const commonBase = parsed.filter(c => c.categoryId === "major_common_base");
assert(commonBase.length >= 3, `共通基盤科目 correctly categorized (found ${commonBase.length})`);
const jpCulture = parsed.find(c => c.title.includes("日本文化事情"));
assert(jpCulture !== undefined && jpCulture.credits === 1, "日本文化事情 correctly has 1 credit");
const genderIntro = parsed.find(c => c.title.includes("ジェンダー学概論"));
assert(genderIntro !== undefined && genderIntro.credits === 1, "ジェンダー学概論 correctly has 1 credit");

// 専門科目：共通実践科目（デジタル人文学, 科学技術と人文学）
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

// 心理学専修の固有区分テスト（実験実習8単位・卒論10単位）
const psychCats = buildLiteratureCategories("psychology");
const psychPrac = psychCats.find(c => c.name.includes("実験実習"));
assert(psychPrac !== undefined && psychPrac.requiredCredits === 8, "Psychology track has dedicated experimental practice (8 credits)");
const psychThesis = psychCats.find(c => c.id === "major_thesis");
assert(psychThesis !== undefined && psychThesis.requiredCredits === 10, "Psychology track has 10 credits thesis");

// 地理学専修の固有区分テスト（野外実習巡検6単位・卒論10単位）
const geoCats = buildLiteratureCategories("geography");
const geoField = geoCats.find(c => c.name.includes("野外実習"));
assert(geoField !== undefined && geoField.requiredCredits === 6, "Geography track has dedicated fieldwork practice (6 credits)");

// 考古学専修の固有区分テスト（発掘調査実習8単位）
const archCats = buildLiteratureCategories("archaeology");
const archExcav = archCats.find(c => c.name.includes("発掘調査"));
assert(archExcav !== undefined && archExcav.requiredCredits === 8, "Archaeology track has excavation practicum (8 credits)");

// 日本史学専修の固有区分テスト（古文書史料講読演習）
const jHistCats = buildLiteratureCategories("japanese_history");
const jHistSem = jHistCats.find(c => c.name.includes("古文書史料講読"));
assert(jHistSem !== undefined && jHistSem.requiredCredits === 24, "Japanese history track has ancient archives & seminar (24 credits)");

// 哲学専修の固有区分テスト（原典講読演習）
const philCats = buildLiteratureCategories("philosophy");
const philSem = philCats.find(c => c.name.includes("原典講読"));
assert(philSem !== undefined && philSem.requiredCredits === 24, "Philosophy track has original texts & seminar (24 credits)");

console.log("\n=== 6. Non-credit Sites Exclusion Tests ===");
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
const allParsedSites = regularMockSites.map(s => parseCourseSite(s, litPreset.categories));
const calculatedSummary = calculateCredits(allParsedSites, litPreset.categories);

// 非単位サイトが summary.nonCreditCourses に収集され、要件や未分類に混入していないこと
assert(calculatedSummary.nonCreditCourses.length >= 7, `All 7 mock non-credit sites collected in nonCreditCourses (got ${calculatedSummary.nonCreditCourses.length})`);
const nonCreditInUncategorized = calculatedSummary.uncategorizedCourses.some(c => c.isNonCredit);
assert(!nonCreditInUncategorized, "No non-credit site leaked into uncategorizedCourses");

const nonCreditInSections = Object.values(calculatedSummary.categoryProgress).some(cat =>
  cat.courses.some(c => c.isNonCredit)
);
assert(!nonCreditInSections, "No non-credit site leaked into any graduation categoryProgress");

console.log("\n=== 7. Hierarchy & Course Origin Separation Tests (Proposal A & B) ===");
// 提案A: 階層構造（基礎科目群36単位・総合科目群4単位・専門基礎2単位・専門科目82単位）
const litCats = buildLiteratureCategories("philosophy");

const basicGeneralCredits = litCats
  .filter(c => c.section === "全学教育科目" && c.group === "基礎科目")
  .reduce((s, c) => s + c.requiredCredits, 0);
assert(basicGeneralCredits === 36, `General Ed Basic group credits sum to exactly 36 (got ${basicGeneralCredits})`);

const integratedGeneralCredits = litCats
  .filter(c => c.section === "全学教育科目" && c.group === "総合科目")
  .reduce((s, c) => s + c.requiredCredits, 0);
assert(integratedGeneralCredits === 4, `General Ed Integrated group credits sum to exactly 4 (got ${integratedGeneralCredits})`);

const specBasicsGroupCredits = litCats
  .filter(c => c.section === "専門系科目" && c.group === "専門基礎科目")
  .reduce((s, c) => s + c.requiredCredits, 0);
assert(specBasicsGroupCredits === 2, `Specialized Basics group credits sum to exactly 2 (got ${specBasicsGroupCredits})`);

// 全カテゴリに scope ("ilas" または "faculty") が付与されていること
const allHaveScope = litCats.every(c => c.scope === "ilas" || c.scope === "faculty");
assert(allHaveScope, "All literature categories have well-defined origin scope ('ilas' or 'faculty')");

// 提案B: 開講元判定 (教養教育院 01 vs 文学部 02) による厳格なマッチング分離
const ilasOrigin = detectCourseOrigin("2024_01_0001234", "哲学入門 (2024前期)");
assert(ilasOrigin === "ilas", `Detected origin for 2024_01 is 'ilas' (got ${ilasOrigin})`);

const facultyOrigin = detectCourseOrigin("2024_02_0005678", "哲学特殊講義：現代実存思想");
assert(facultyOrigin === "faculty", `Detected origin for 2024_02 is 'faculty' (got ${facultyOrigin})`);

// 開講元が教養(ilas)の科目は、決して文学部専門科目（哲学特殊講義・演習）にはマッピングされない
const parsedIlasPhilosophy = parseCourseSite({ id: "2024_01_0001234", title: "哲学入門 (2024前期)" }, litCats);
assert(parsedIlasPhilosophy.origin === "ilas", "Parsed origin is 'ilas'");
assert(parsedIlasPhilosophy.categoryId === "hum_soc", `教養開講の哲学入門 maps to 'hum_soc' (got ${parsedIlasPhilosophy.categoryId})`);

// 開講元が文学部(faculty)の科目は、全学の哲学入門ではなく文学部専門科目（特殊講義）にマッピングされる
const parsedFacultyPhilosophy = parseCourseSite({ id: "2024_02_0005678", title: "哲学特殊講義：現代実存思想" }, litCats);
assert(parsedFacultyPhilosophy.origin === "faculty", "Parsed origin is 'faculty'");
assert(parsedFacultyPhilosophy.categoryId === "dept_elec_lecture", `文学部開講の哲学特殊講義 maps to 'dept_elec_lecture' (got ${parsedFacultyPhilosophy.categoryId})`);

// 文学部開講の「人文学入門Ⅰ」は専門基礎科目へマッピング
const parsedFacultyIntro = parseCourseSite({ id: "2024_02_0009999", title: "専門基礎：人文学入門Ⅰ" }, litCats);
assert(parsedFacultyIntro.categoryId === "major_basics", `人文学入門 maps to 'major_basics' (got ${parsedFacultyIntro.categoryId})`);

console.log(`\n======================================`);
console.log(`Total: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("All Nagoya U Literature faculty & Non-credit exclusion tests passed successfully! 🎉");
}
