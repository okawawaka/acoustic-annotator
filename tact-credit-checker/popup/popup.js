/**
 * TACT Credit Checker - Popup Controller
 */

import { DEFAULT_PRESETS } from "../core/presets.js";
import { parseCourseSite, calculateCredits, guessCategory } from "../core/parser.js";
import { loadAppState, saveCourses, updateLastSync } from "../core/storage.js";
import { getMockCourseSites, checkTactSession, fetchUserCourseSites } from "../core/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const presetNameEl = document.getElementById("preset-name");
  const passedCreditsEl = document.getElementById("passed-credits");
  const totalReqLabelEl = document.getElementById("total-req-label");
  const enrolledCreditsEl = document.getElementById("enrolled-credits");
  const achievementPctEl = document.getElementById("achievement-pct");
  const summaryPassedBar = document.getElementById("summary-passed-bar");
  const summaryEnrolledBar = document.getElementById("summary-enrolled-bar");
  const remainingLabel = document.getElementById("remaining-label");
  const categoryQuickList = document.getElementById("category-quick-list");
  const syncBtn = document.getElementById("sync-tact-btn");
  const openDashBtn = document.getElementById("open-dashboard-btn");
  const openFullDashBtn = document.getElementById("open-full-dashboard-btn");
  const loadSampleBtn = document.getElementById("load-sample-btn");

  let appState = await loadAppState();

  function render() {
    const currentPreset = DEFAULT_PRESETS.find(p => p.id === appState.presetId) || DEFAULT_PRESETS[0];
    const deptStr = (appState.studentProfile && appState.studentProfile.department) ? `（${appState.studentProfile.department}）` : "";
    presetNameEl.textContent = `${currentPreset.name}${deptStr}`;

    const summary = calculateCredits(appState.courses, appState.categories);
    const totalReq = summary.totalRequired || currentPreset.totalRequired || 124;

    const passedPct = Math.min(100, Math.round((summary.totalPassed / totalReq) * 100));
    const enrolledPct = Math.min(100 - passedPct, Math.round((summary.totalEnrolled / totalReq) * 100));

    passedCreditsEl.innerHTML = `${summary.totalPassed} <small id="total-req-label">/ ${totalReq}</small>`;
    enrolledCreditsEl.textContent = `+${summary.totalEnrolled}`;
    achievementPctEl.textContent = `${passedPct}%`;

    summaryPassedBar.style.width = `${passedPct}%`;
    summaryEnrolledBar.style.width = `${enrolledPct}%`;

    const remaining = Math.max(0, totalReq - summary.totalPassed);
    remainingLabel.textContent = `残り ${remaining} 単位`;

    // カテゴリリストの描画
    categoryQuickList.innerHTML = "";
    Object.values(summary.categoryProgress).forEach(cat => {
      const row = document.createElement("div");
      row.className = "category-row";

      const badgeClass = cat.isFulfilled ? "badge-fulfilled" : "badge-pending";
      const badgeText = cat.isFulfilled ? "達成" : `残${Math.max(0, cat.required - cat.passed)}`;

      row.innerHTML = `
        <div class="cat-info">
          <span class="cat-color-tag" style="background-color: ${cat.color};"></span>
          <span class="cat-name">${cat.name}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="cat-credits">
            <strong>${cat.passed}</strong> / ${cat.required}
          </span>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
      categoryQuickList.appendChild(row);
    });
  }

  // ダッシュボードを開く
  function openDashboard() {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      const url = chrome.runtime.getURL("dashboard/dashboard.html");
      chrome.tabs.create({ url });
    } else {
      window.open("../dashboard/dashboard.html", "_blank");
    }
  }

  openDashBtn.addEventListener("click", openDashboard);
  openFullDashBtn.addEventListener("click", openDashboard);

  // TACTと同期
  syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<span>⏳</span> 同期中...`;

    try {
      const session = await checkTactSession();
      if (!session.isLoggedIn) {
        alert("TACT (https://tact.ac.thers.ac.jp) にログインしたタブが開いているかご確認ください。\nログイン中のタブを開いた状態で再度お試しください。");
        syncBtn.disabled = false;
        syncBtn.innerHTML = `<span class="btn-icon">🔄</span> TACTと同期`;
        return;
      }

      const rawSites = await fetchUserCourseSites(session.baseUrl, session.tabId);
      const existingMap = new Map((appState.courses || []).map(c => [c.id, c]));

      const parsedCourses = rawSites.map(site => {
        let course;
        if (existingMap.has(site.id)) {
          course = existingMap.get(site.id); // 既存編集を保持
          const catExists = appState.categories.some(cat => cat.id === course.categoryId);
          if (!course.categoryId || course.categoryId === "uncategorized" || !catExists) {
            course.categoryId = guessCategory(course.title, appState.categories, appState.mappings);
          }
        } else {
          course = parseCourseSite(site, appState.categories, appState.mappings);
        }
        return course;
      });

      await saveCourses(parsedCourses);
      await updateLastSync(session.user);
      appState.courses = parsedCourses;

      render();
      syncBtn.innerHTML = `<span>✓</span> 同期完了!`;
      setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.innerHTML = `<span class="btn-icon">🔄</span> TACTと同期`;
      }, 1500);
    } catch (err) {
      alert("同期エラー: " + err.message);
      syncBtn.disabled = false;
      syncBtn.innerHTML = `<span class="btn-icon">🔄</span> TACTと同期`;
    }
  });

  // サンプルデータ読み込み
  loadSampleBtn.addEventListener("click", async () => {
    const mockSites = getMockCourseSites();
    const parsedCourses = mockSites.map(s => parseCourseSite(s, appState.categories, appState.mappings));
    await saveCourses(parsedCourses);
    appState.courses = parsedCourses;
    render();
    alert("名大の模擬履修データ（16科目）を読み込みました！");
  });

  render();
});
