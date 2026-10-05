/**
 * TACT Credit Checker - TACT Direct API Client
 * 東海国立大学機構 TACT (Sakai LMS) の Direct REST API との通信モジュール
 */

const TACT_DOMAINS = [
  "https://tact.ac.jp",
  "https://tact.thers.ac.jp"
];

/**
 * TACTに現在ログイン中かチェック
 * @returns {Promise<{isLoggedIn: boolean, user: Object|null, baseUrl: string}>}
 */
export async function checkTactSession() {
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
 * @returns {Promise<Array>} 講義サイト配列
 */
export async function fetchUserCourseSites(baseUrl = "https://tact.ac.jp") {
  const url = `${baseUrl}/direct/site.json`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`TACTからの講義情報取得に失敗しました (Status: ${res.status})`);
  }

  const data = await res.json();
  const sites = data.site_collection || [];

  // 個人ワークスペース (~userid) や管理サイトを除外し、通常の講義サイトのみを抽出
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
 * （文学部・情報学部等の履修生を模したリアルなサンプルデータ）
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
