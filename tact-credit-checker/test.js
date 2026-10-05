/**
 * TACT Credit Checker - Automated Logic & Parser Tests
 * 名古屋大学文学部公式要覧（Student's Guide 2023〜2026）準拠テスト
 */

import { DEFAULT_PRESETS, SUPPORTED_FACULTIES, LIT_DEPARTMENTS, buildLiteratureCategories } from "./core/presets.js";
import { parseCourseSite, calculateCredits, cleanCourseTitle, extractTermAndYear } from "./core/parser.js";
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

const healthSports = parsed.find(c => c.categoryId === "health_sports");
assert(healthSports !== undefined, "健康・スポーツ実習 categorized into health_sports");

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

console.log("\n=== 5. Literature Departments Customization Tests ===");
assert(LIT_DEPARTMENTS.length === 17, `LIT_DEPARTMENTS has all 17 Nagoya U Lit major tracks (got ${LIT_DEPARTMENTS.length})`);

// 哲学専修のテスト (専門系2 + 専門82 = 84)
const philCats = buildLiteratureCategories("philosophy");
const philMajorSum = philCats.filter(c => c.section === "専門科目" || c.section === "専門系科目").reduce((s, c) => s + c.requiredCredits, 0);
assert(philMajorSum === 84, `Philosophy track major sum is exactly 84 (got ${philMajorSum})`);
const philMajorCat = philCats.find(c => c.name.includes("哲学・倫理学"));
assert(philMajorCat !== undefined, "Philosophy-specific category created with専修名");

// 言語学専修のテスト (専門系2 + 専門82 = 84)
const lingCats = buildLiteratureCategories("linguistics");
const lingMajorSum = lingCats.filter(c => c.section === "専門科目" || c.section === "専門系科目").reduce((s, c) => s + c.requiredCredits, 0);
assert(lingMajorSum === 84, `Linguistics track major sum is exactly 84 (got ${lingMajorSum})`);
const lingMajorCat = lingCats.find(c => c.name.includes("言語学"));
assert(lingMajorCat !== undefined, "Linguistics-specific category created with専修名");

// 人間発達科学専修（心理学）のテスト
const psychCats = buildLiteratureCategories("human_dev");
const psychMajorSum = psychCats.filter(c => c.section === "専門科目" || c.section === "専門系科目").reduce((s, c) => s + c.requiredCredits, 0);
assert(psychMajorSum === 84, `Psychology track major sum is exactly 84 (got ${psychMajorSum})`);

console.log(`\n======================================`);
console.log(`Total: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("All Nagoya U Literature faculty tests passed successfully! 🎉");
}
