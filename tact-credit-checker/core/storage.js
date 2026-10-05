/**
 * TACT Credit Checker - Storage Management Layer
 * chrome.storage.local と localStorage のフォールバック対応ストレージ管理
 */

import { DEFAULT_PRESETS } from "./presets.js";

const STORAGE_KEYS = {
  PRESET_ID: "tcc_selected_preset_id",
  CATEGORIES: "tcc_categories",
  COURSES: "tcc_courses",
  MAPPINGS: "tcc_custom_mappings",
  LAST_SYNC: "tcc_last_sync_time",
  USER: "tcc_user_profile"
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
 * アプリの初期状態のロード
 */
export async function loadAppState() {
  let presetId = await getStorageData(STORAGE_KEYS.PRESET_ID, DEFAULT_PRESETS[0].id);
  let categories = await getStorageData(STORAGE_KEYS.CATEGORIES, null);
  const courses = await getStorageData(STORAGE_KEYS.COURSES, []);
  const mappings = await getStorageData(STORAGE_KEYS.MAPPINGS, {});
  const lastSync = await getStorageData(STORAGE_KEYS.LAST_SYNC, null);
  const user = await getStorageData(STORAGE_KEYS.USER, null);

  // カテゴリ未初期化時は選択プリセットから初期化
  if (!categories || categories.length === 0) {
    const preset = DEFAULT_PRESETS.find(p => p.id === presetId) || DEFAULT_PRESETS[0];
    categories = JSON.parse(JSON.stringify(preset.categories));
    await setStorageData(STORAGE_KEYS.CATEGORIES, categories);
  }

  return {
    presetId,
    categories,
    courses,
    mappings,
    lastSync,
    user
  };
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
