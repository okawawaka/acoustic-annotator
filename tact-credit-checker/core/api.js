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
      id: "2024_01_0001001",
      title: "基礎セミナー [1組] (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0002002",
      title: "Academic English (Reading & Writing) [3組]",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0002003",
      title: "ドイツ語基礎I (2024春学期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0003001",
      title: "言語学概論 (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0003002",
      title: "現代倫理学の基礎",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0004001",
      title: "健康科学・スポーツ実技 (バドミントン)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_01_0005001",
      title: "線形代数学I (2024前期)",
      props: { term: "2024年度 前期" }
    },
    {
      id: "2024_02_0002004",
      title: "Academic English (Speaking) (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0002005",
      title: "ドイツ語基礎II (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0003003",
      title: "音韻論・形態論演習 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0003004",
      title: "日本史学概説 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2024_02_0005002",
      title: "データサイエンス入門 (2024後期)",
      props: { term: "2024年度 後期" }
    },
    {
      id: "2025_01_0003005",
      title: "統語論・意味論研究 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003006",
      title: "言語文化特殊講義A",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2025_01_0003007",
      title: "社会言語学特論 (2025前期)",
      props: { term: "2025年度 前期" }
    },
    {
      id: "2026_01_0003099",
      title: "卒業研究・論文演習 (2026通年)",
      props: { term: "2026年度 通年" }
    }
  ];
}
