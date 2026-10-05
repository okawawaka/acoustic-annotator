/**
 * TACT Credit Checker - TACT Direct API Client
 * 東海国立大学機構 TACT (Sakai LMS) の Direct REST API との通信モジュール
 */

export const TACT_DOMAINS = [
  "https://tact.ac.thers.ac.jp",
  "https://tact.thers.ac.jp",
  "https://tact.ac.jp"
];

/**
 * 開いているTACTタブを検索
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
export async function findOpenTactTab() {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
    return null;
  }
  const urlPatterns = [
    "https://tact.ac.thers.ac.jp/*",
    "https://*.thers.ac.jp/*",
    "https://tact.ac.jp/*"
  ];
  try {
    const tabs = await chrome.tabs.query({ url: urlPatterns });
    return tabs && tabs.length > 0 ? tabs[0] : null;
  } catch (e) {
    console.warn("Error querying TACT tabs:", e);
    return null;
  }
}

/**
 * TACTに現在ログイン中かチェック
 * 1. 開いているTACTタブがあればそのタブ内で実行 (同一オリジン・Cookie 100%適用)
 * 2. なければ直接fetchを各ドメインに試行
 * @returns {Promise<{isLoggedIn: boolean, user: Object|null, baseUrl: string, tabId?: number}>}
 */
export async function checkTactSession() {
  // 1. 開いているTACTタブの探索
  const tactTab = await findOpenTactTab();
  if (tactTab && tactTab.id && chrome.scripting) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tactTab.id },
        func: async () => {
          try {
            const res = await fetch("/direct/session/current.json", {
              credentials: "include",
              headers: { "Accept": "application/json" }
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.userId && data.userId !== "anon") {
                return { isLoggedIn: true, user: data, baseUrl: window.location.origin };
              }
            }
          } catch (err) {
            return { isLoggedIn: false, error: err.message };
          }
          return { isLoggedIn: false };
        }
      });

      if (results && results[0] && results[0].result && results[0].result.isLoggedIn) {
        return {
          isLoggedIn: true,
          user: results[0].result.user,
          baseUrl: results[0].result.baseUrl || "https://tact.ac.thers.ac.jp",
          tabId: tactTab.id
        };
      }
    } catch (e) {
      console.warn("Script injection check failed, falling back to direct fetch:", e);
    }
  }

  // 2. 直接fetchフォールバック
  for (const domain of TACT_DOMAINS) {
    try {
      const res = await fetch(`${domain}/direct/session/current.json`, {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.userId && data.userId !== "anon") {
          return { isLoggedIn: true, user: data, baseUrl: domain };
        }
      }
    } catch (e) {
      // ドメイン不達時は次を試行
    }
  }

  return { isLoggedIn: false, user: null, baseUrl: TACT_DOMAINS[0] };
}

/**
 * TACTからユーザーが所属する講義サイト一覧を全件取得（ページネーション対応）
 * @param {string} baseUrl
 * @param {number} [tabId] 開いているTACTタブIDがあれば同一オリジン内で実行
 * @returns {Promise<Array>} 講義サイト配列
 */
export async function fetchUserCourseSites(baseUrl = "https://tact.ac.thers.ac.jp", tabId = null) {
  let targetTabId = tabId;
  if (!targetTabId) {
    const tab = await findOpenTactTab();
    if (tab) targetTabId = tab.id;
  }

  // 1. タブ内実行（同一オリジン・セッション確実）
  if (targetTabId && typeof chrome !== "undefined" && chrome.scripting) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: async () => {
          let allSites = [];
          const pageSize = 100;
          let start = 0;
          let keepFetching = true;
          let loopGuard = 25; // 最大2500件

          while (keepFetching && loopGuard > 0) {
            loopGuard--;
            const res = await fetch(`/direct/site.json?_limit=${pageSize}&_start=${start}`, {
              credentials: "include",
              headers: { "Accept": "application/json" }
            });
            if (!res.ok) {
              // パラメータ付きが失敗した場合は素のsite.jsonを試行
              if (start === 0) {
                const fallbackRes = await fetch("/direct/site.json", {
                  credentials: "include",
                  headers: { "Accept": "application/json" }
                });
                if (fallbackRes.ok) {
                  const fallbackData = await fallbackRes.json();
                  return fallbackData.site_collection || [];
                }
              }
              break;
            }

            const data = await res.json();
            const collection = data.site_collection || [];
            if (collection.length === 0) break;

            allSites = allSites.concat(collection);
            if (collection.length < pageSize) {
              keepFetching = false;
            } else {
              start += pageSize;
            }
          }
          return allSites;
        }
      });

      if (results && results[0] && Array.isArray(results[0].result)) {
        return filterCourseSites(results[0].result);
      }
    } catch (e) {
      console.warn("Tab execution failed, falling back to direct fetch:", e);
    }
  }

  // 2. 直接fetchフォールバック（ページネーション対応）
  let allSites = [];
  const pageSize = 100;
  let start = 0;
  let keepFetching = true;
  let loopGuard = 25;

  while (keepFetching && loopGuard > 0) {
    loopGuard--;
    try {
      const url = `${baseUrl}/direct/site.json?_limit=${pageSize}&_start=${start}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        if (start === 0) {
          const fallbackRes = await fetch(`${baseUrl}/direct/site.json`, {
            credentials: "include",
            headers: { "Accept": "application/json" }
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            return filterCourseSites(data.site_collection || []);
          }
        }
        break;
      }

      const data = await res.json();
      const collection = data.site_collection || [];
      if (collection.length === 0) break;

      allSites = allSites.concat(collection);
      if (collection.length < pageSize) {
        keepFetching = false;
      } else {
        start += pageSize;
      }
    } catch (err) {
      console.warn("Direct fetch iteration failed:", err);
      break;
    }
  }

  return filterCourseSites(allSites);
}

/**
 * 講義サイトのフィルタリング
 */
function filterCourseSites(sites) {
  return sites.filter(site => {
    if (!site.id) return false;
    // ワークスペース除外
    if (site.id.startsWith("~")) return false;
    // タイトルが無い、またはマイワークスペース等
    if (!site.title || site.title.includes("マイワークスペース")) return false;
    return true;
  });
}

/**
 * 開発・オフライン・体験用のモック講義データを取得
 */
export function getMockCourseSites() {
  return [
    {
      id: "2024_01_0000001",
      title: "「大学での学び」基礎論 [1組] (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0001001",
      title: "基礎セミナー [文学部1組] (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0002002",
      title: "英語（基礎） [3組] (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0002003",
      title: "ドイツ語基礎1 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0002004",
      title: "ドイツ語基礎2 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0003001",
      title: "人文・社会系基礎：哲学入門 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0003002",
      title: "人文・社会系基礎：日本史学基礎 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0004000",
      title: "健康・スポーツ科学講義 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0004001",
      title: "健康・スポーツ科学実習 (バドミントン)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0005001",
      title: "データ科学の基礎 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_02_0002005",
      title: "英語（中級） (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0002006",
      title: "英語（コミュニケーション） (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0002007",
      title: "ドイツ語初級完成 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0003003",
      title: "国際理解科目：多文化共生論 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0003004",
      title: "現代教養科目：生命倫理と環境 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2025_01_0003005",
      title: "専門基礎：人文学入門Ⅰ (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003009",
      title: "専門基礎：人文学入門Ⅱ (2025後期)",
      props: { term: "2025年度 後期" }
    },
    {
      id: "2025_01_0003010",
      title: "共通基盤：日本文化事情 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003011",
      title: "共通基盤：人間と倫理 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003012",
      title: "共通基盤：ジェンダー学概論 (2025後期)",
      props: { term: "2025年度 後期" }
    },
    {
      id: "2025_01_0003013",
      title: "共通実践：デジタル人文学 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003014",
      title: "共通実践：科学技術と人文学 (2025後期)",
      props: { term: "2025年度 後期" }
    },
    {
      id: "2025_01_0003006",
      title: "英語（上級リーディング） (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003007",
      title: "ドイツ語中級1 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003008",
      title: "ドイツ語中級2 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0004001",
      title: "言語学特殊講義：音声学・音韻論",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2026_01_0009999",
      title: "卒業論文・演習 (2026通年)",
      props: { term: "2026年度 通年" }
    }
  ];
}
