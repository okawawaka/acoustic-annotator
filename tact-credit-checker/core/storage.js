/**
 * TACT Credit Checker - Storage Management Layer
 * chrome.storage.local と localStorage のフォールバック対応ストレージ管理
 */

import { DEFAULT_PRESETS, PRESET_VERSION, buildLiteratureCategories } from "./presets.js";

const STORAGE_KEYS = {
  PRESET_ID: "tcc_selected_preset_id",
  CATEGORIES: "tcc_categories",
  COURSES: "tcc_courses",
  MAPPINGS: "tcc_custom_mappings",
  LAST_SYNC: "tcc_last_sync_time",
  USER: "tcc_user_profile",
  STUDENT_PROFILE: "tcc_student_profile",
  VERSION: "tcc_preset_version"
};

const isExtensionEnv = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

/**
 * データの取得
 */
export async function getStorageData(key, defaultValue = null) {
  if (isExtensionEnv) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  } else {
    // ローカルストレージフォールバック
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
}

/**
 * データの保存
 */
export async function setStorageData(key, value) {
  if (isExtensionEnv) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * アプリの初期状態のロード（自動マイグレーション対応）
 */
export async function loadAppState() {
  let presetId = await getStorageData(STORAGE_KEYS.PRESET_ID, DEFAULT_PRESETS[0].id);
  let categories = await getStorageData(STORAGE_KEYS.CATEGORIES, null);
  const courses = await getStorageData(STORAGE_KEYS.COURSES, []);
  const mappings = await getStorageData(STORAGE_KEYS.MAPPINGS, {});
  const lastSync = await getStorageData(STORAGE_KEYS.LAST_SYNC, null);
  const user = await getStorageData(STORAGE_KEYS.USER, null);
  const storedVersion = await getStorageData(STORAGE_KEYS.VERSION, "");

  const studentProfile = await getStorageData(STORAGE_KEYS.STUDENT_PROFILE, {
    entranceYear: new Date().getFullYear(),
    faculty: "文学部",
    departmentId: "philosophy",
    department: "哲学・倫理学専修"
  });

  // バージョン更新または旧カテゴリキャッシュの検出時は自動マイグレーション
  const isOutdated = storedVersion !== PRESET_VERSION ||
    !categories ||
    categories.length === 0 ||
    !categories.some(c => c.id === "lang_en");

  if (isOutdated) {
    presetId = DEFAULT_PRESETS[0].id;
    const deptId = studentProfile.departmentId || "philosophy";
    categories = buildLiteratureCategories(deptId);
    await setStorageData(STORAGE_KEYS.PRESET_ID, presetId);
    await setStorageData(STORAGE_KEYS.CATEGORIES, categories);
    await setStorageData(STORAGE_KEYS.VERSION, PRESET_VERSION);
  }

  return {
    presetId,
    categories,
    courses,
    mappings,
    lastSync,
    user,
    studentProfile
  };
}

/**
 * 学生プロファイル（入学年度・学部・専攻）の保存
 */
export async function saveStudentProfile(profile) {
  await setStorageData(STORAGE_KEYS.STUDENT_PROFILE, profile);
}

/**
 * 履修科目リストの保存
 */
export async function saveCourses(courses) {
  await setStorageData(STORAGE_KEYS.COURSES, courses);
}

/**
 * カテゴリ定義の保存
 */
export async function saveCategories(categories) {
  await setStorageData(STORAGE_KEYS.CATEGORIES, categories);
}

/**
 * プリセットの切り替えとカテゴリのリセット
 */
export async function switchPreset(newPresetId) {
  const preset = DEFAULT_PRESETS.find(p => p.id === newPresetId);
  if (!preset) return null;

  const newCategories = JSON.parse(JSON.stringify(preset.categories));
  await setStorageData(STORAGE_KEYS.PRESET_ID, newPresetId);
  await setStorageData(STORAGE_KEYS.CATEGORIES, newCategories);
  return newCategories;
}

/**
 * 手動マッピング（科目名 -> カテゴリID）の保存
 */
export async function saveMapping(courseTitle, categoryId) {
  const mappings = await getStorageData(STORAGE_KEYS.MAPPINGS, {});
  mappings[courseTitle] = categoryId;
  await setStorageData(STORAGE_KEYS.MAPPINGS, mappings);
}

/**
 * 最終同期日時の記録
 */
export async function updateLastSync(user = null) {
  const now = Date.now();
  await setStorageData(STORAGE_KEYS.LAST_SYNC, now);
  if (user) {
    await setStorageData(STORAGE_KEYS.USER, user);
  }
}

/**
 * 全データのクリア
 */
export async function resetAllData() {
  if (isExtensionEnv) {
    await new Promise((resolve) => chrome.storage.local.clear(resolve));
  } else {
    localStorage.clear();
  }
}
