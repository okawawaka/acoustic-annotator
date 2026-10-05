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
 * TACTからユーザーが所属する講義サイト一覧を取得
 * @param {string} baseUrl
 * @param {number} [tabId] 開いているTACTタブIDがあれば同一オリジン内で実行
 * @returns {Promise<Array>} 講義サイト配列
 */
export async function fetchUserCourseSites(baseUrl = "https://tact.ac.thers.ac.jp", tabId = null) {
  // タブID指定または開いているTACTタブがある場合は、タブ内で実行してCookieを確実に利用
  let targetTabId = tabId;
  if (!targetTabId) {
    const tab = await findOpenTactTab();
    if (tab) targetTabId = tab.id;
  }

  if (targetTabId && typeof chrome !== "undefined" && chrome.scripting) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: async () => {
          const res = await fetch("/direct/site.json", {
            credentials: "include",
            headers: { "Accept": "application/json" }
          });
          if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
          return await res.json();
        }
      });

      if (results && results[0] && results[0].result) {
        const data = results[0].result;
        return filterCourseSites(data.site_collection || []);
      }
    } catch (e) {
      console.warn("Tab execution failed, falling back to fetch:", e);
    }
  }

  // 直接fetchフォールバック
  const url = `${baseUrl}/direct/site.json`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`TACTからの講義情報取得に失敗しました (Status: ${res.status})`);
  }

  const data = await res.json();
  return filterCourseSites(data.site_collection || []);
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
