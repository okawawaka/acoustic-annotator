/**
 * TACT Credit Checker - Content Script
 * TACT画面へのクイック操作バッジ・インジェクション
 */

(function () {
  // 多重注入防止
  if (document.getElementById("tact-credit-checker-widget")) return;

  const container = document.createElement("div");
  container.id = "tact-credit-checker-widget";
  container.innerHTML = `
    <button class="tcc-floating-btn" id="tcc-toggle-btn" title="TACT 単位チェッカーを開く">
      <span>🎓</span>
      <span>単位チェッカー</span>
    </button>
    <div class="tcc-panel" id="tcc-panel">
      <div class="tcc-panel-header">
        <div class="tcc-panel-title">
          <span>🎓</span>
          <span>単位取得・履修状況</span>
        </div>
        <button class="tcc-close-btn" id="tcc-close-btn">✕</button>
      </div>
      <div class="tcc-panel-body">
        <div class="tcc-stat-box">
          <span class="tcc-stat-label">修得済 / 必要単位</span>
          <span class="tcc-stat-val" id="tcc-credit-summary">-- <span>/ -- 単位</span></span>
        </div>
        <div class="tcc-progress-bar-bg">
          <div class="tcc-progress-bar-fill" id="tcc-progress-fill" style="width: 0%"></div>
        </div>
        <div id="tcc-detail-info" style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
          TACTの受講講義から自動判定します
        </div>
      </div>
      <div class="tcc-panel-footer">
        <button class="tcc-action-btn tcc-btn-secondary" id="tcc-sync-btn">🔄 TACTと同期</button>
        <button class="tcc-action-btn tcc-btn-primary" id="tcc-open-dash-btn">ダッシュボード</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const toggleBtn = document.getElementById("tcc-toggle-btn");
  const panel = document.getElementById("tcc-panel");
  const closeBtn = document.getElementById("tcc-close-btn");
  const syncBtn = document.getElementById("tcc-sync-btn");
  const openDashBtn = document.getElementById("tcc-open-dash-btn");
  const summaryEl = document.getElementById("tcc-credit-summary");
  const progressFill = document.getElementById("tcc-progress-fill");
  const detailEl = document.getElementById("tcc-detail-info");

  // パネル開閉
  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("active");
    if (panel.classList.contains("active")) {
      refreshQuickView();
    }
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("active");
  });

  // ダッシュボードを開く
  openDashBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "OPEN_DASHBOARD" });
  });

  // クイックビューの更新
  function refreshQuickView() {
    chrome.storage.local.get(["tcc_courses", "tcc_categories", "tcc_selected_preset_id"], (res) => {
      const courses = res.tcc_courses || [];
      const categories = res.tcc_categories || [];

      if (courses.length === 0) {
        summaryEl.innerHTML = `0 <span>/ 124 単位</span>`;
        detailEl.textContent = "「TACTと同期」ボタンを押して講義を取得してください。";
        progressFill.style.width = "0%";
        return;
      }

      let passed = 0;
      let enrolled = 0;
      let totalReq = 0;

      categories.forEach(c => totalReq += (c.requiredCredits || 0));
      if (totalReq === 0) totalReq = 124;

      courses.forEach(c => {
        const cred = Number(c.credits) || 0;
        if (c.status === "passed" || c.status === "exempt") passed += cred;
        if (c.status === "enrolled") enrolled += cred;
      });

      const pct = Math.min(100, Math.round((passed / totalReq) * 100));
      summaryEl.innerHTML = `${passed} <span>/ ${totalReq} 単位 (${pct}%)</span>`;
      progressFill.style.width = `${pct}%`;
      detailEl.innerHTML = `履修中: <strong>+${enrolled}単位</strong> (計${passed + enrolled}単位見込)<br>登録科目数: ${courses.length}件`;
    });
  }

  // TACTと同期
  syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = "同期中...";

    try {
      let allSites = [];
      const pageSize = 100;
      let start = 0;
      let keepFetching = true;
      let loopGuard = 25;

      while (keepFetching && loopGuard > 0) {
        loopGuard--;
        const res = await fetch(`/direct/site.json?_limit=${pageSize}&_start=${start}`, {
          credentials: "include",
          headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
          if (start === 0) {
            const fallbackRes = await fetch("/direct/site.json", {
              credentials: "include",
              headers: { "Accept": "application/json" }
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              allSites = fallbackData.site_collection || [];
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

      const sites = allSites.filter(s => s.id && !s.id.startsWith("~") && s.title && !s.title.includes("マイワークスペース"));

      chrome.storage.local.get(["tcc_categories", "tcc_courses", "tcc_custom_mappings"], (storage) => {
        const categories = storage.tcc_categories || [];
        const existingCourses = storage.tcc_courses || [];
        const customMappings = storage.tcc_custom_mappings || {};

        const existingMap = new Map();
        existingCourses.forEach(c => existingMap.set(c.id, c));

        // パース処理 (content script内でも軽量実行)
        const updated = sites.map(site => {
          if (existingMap.has(site.id)) {
            // 既存の手動修正を維持
            return existingMap.get(site.id);
          }
          const cleanTitle = site.title.replace(/[\(（\[【].*?[\)）\]】]/g, "").trim() || site.title;
          let catId = customMappings[cleanTitle] || "uncategorized";
          if (catId === "uncategorized") {
            for (const cat of categories) {
              if (cat.keywords && cat.keywords.some(kw => cleanTitle.includes(kw))) {
                catId = cat.id;
                break;
              }
            }
          }
          return {
            id: site.id,
            rawTitle: site.title,
            title: cleanTitle,
            term: (site.props && site.props.term) || "2024年度",
            year: 2024,
            credits: cleanTitle.includes("論文") || cleanTitle.includes("研究") ? 6 : (cleanTitle.includes("実技") || cleanTitle.includes("実験") ? 1 : 2),
            categoryId: catId,
            status: "enrolled",
            isManual: false,
            updatedAt: Date.now()
          };
        });

        chrome.storage.local.set({
          tcc_courses: updated,
          tcc_last_sync_time: Date.now()
        }, () => {
          syncBtn.disabled = false;
          syncBtn.textContent = "✓ 同期完了!";
          setTimeout(() => { syncBtn.textContent = "🔄 TACTと同期"; }, 2000);
          refreshQuickView();
        });
      });
    } catch (err) {
      alert("同期に失敗しました: " + err.message);
      syncBtn.disabled = false;
      syncBtn.textContent = "🔄 TACTと同期";
    }
  });

  // 初回ロード時に状態を反映
  refreshQuickView();
})();
