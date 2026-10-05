/**
 * TACT Credit Checker - Automated Logic & Parser Tests
 */

import { DEFAULT_PRESETS } from "./core/presets.js";
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
assert(DEFAULT_PRESETS.length >= 4, "At least 4 presets defined");
DEFAULT_PRESETS.forEach(p => {
  assert(p.totalRequired > 100, `Preset ${p.name} has reasonable totalRequired (${p.totalRequired})`);
  assert(p.categories.length > 0, `Preset ${p.name} has categories (${p.categories.length})`);
});

console.log("\n=== 2. Course Parser & Title Cleaner Tests ===");
const clean1 = cleanCourseTitle("基礎セミナー [1組] (2024前期)");
assert(clean1 === "基礎セミナー", `Cleaned title matches expected: '${clean1}' === '基礎セミナー'`);

const clean2 = cleanCourseTitle("2024_01_1234567: 言語学概論 (月2)");
assert(clean2 === "言語学概論", `Cleaned title with code prefix: '${clean2}' === '言語学概論'`);

const termInfo = extractTermAndYear("ドイツ語基礎I (2024春学期)");
assert(termInfo.year === 2024, `Extracted year is 2024 (got ${termInfo.year})`);
assert(termInfo.season === "春/前期", `Extracted season is 春/前期 (got ${termInfo.season})`);

console.log("\n=== 3. Auto Categorization & Credits Estimation Tests ===");
const preset = DEFAULT_PRESETS[0]; // 文学部
const categories = preset.categories;

const mockSites = getMockCourseSites();
assert(mockSites.length === 16, "Mock data has 16 courses");

const parsed = mockSites.map(s => parseCourseSite(s, categories, {}));

// 言語文化のチェック (Academic English, ドイツ語)
const langCourses = parsed.filter(c => c.categoryId === "language");
assert(langCourses.length >= 4, `Language courses correctly auto-categorized: found ${langCourses.length}`);

// 基礎セミナーのチェック
const seminar = parsed.find(c => c.title === "基礎セミナー");
assert(seminar && seminar.categoryId === "seminar", "基礎セミナー categorized into seminar");

// 卒業研究の単位数チェック
const thesis = parsed.find(c => c.title.includes("卒業研究"));
assert(thesis && thesis.credits === 6, `Thesis assigned 6 credits (got ${thesis ? thesis.credits : 0})`);

// 実技の単位数チェック
const sports = parsed.find(c => c.title.includes("スポーツ実技"));
assert(sports && sports.credits === 1, `Sports assigned 1 credit (got ${sports ? sports.credits : 0})`);

console.log("\n=== 4. Credit Calculation & Progress Summary Tests ===");
const summary = calculateCredits(parsed, categories);
assert(summary.totalRequired === 124, `Total required matches preset: ${summary.totalRequired} === 124`);
assert(summary.totalPassed > 0, `Total passed credits > 0 (got ${summary.totalPassed})`);
assert(summary.totalEnrolled > 0, `Total enrolled credits > 0 (got ${summary.totalEnrolled})`);
assert(summary.categoryProgress["seminar"].passed === 2, "Seminar credits completed");

console.log(`\n======================================`);
console.log(`Total: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("All automated tests passed successfully! 🎉");
}
