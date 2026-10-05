import { DEFAULT_PRESETS, SUPPORTED_FACULTIES, LIT_DEPARTMENTS, buildLiteratureCategories } from "../core/presets.js";
import { parseCourseSite, calculateCredits, guessCategory, estimateCredits, isNonCreditCourse } from "../core/parser.js";
import {
  loadAppState,
  saveCourses,
  saveCategories,
  saveStudentProfile,
  switchPreset,
  saveMapping,
  updateLastSync,
  resetAllData
} from "../core/storage.js";
import {
  getMockCourseSites,
  checkTactSession,
  fetchUserCourseSites
} from "../core/api.js";

let state = {
  presetId: "",
  categories: [],
  courses: [],
  mappings: {},
  lastSync: null,
  user: null,
  studentProfile: {
    entranceYear: new Date().getFullYear(),
    faculty: "文学部",
    department: "人文学科"
  },
  currentTab: "tab-summary",
  searchQuery: "",
  categoryFilter: "all",
  expandedCategories: new Set()
};

document.addEventListener("DOMContentLoaded", async () => {
  const loaded = await loadAppState();
  state = { ...state, ...loaded };
  // 既存科目の中に現行カテゴリに存在しないものや未分類のものがあれば再推定
  let hadUnmapped = false;
  state.courses.forEach(course => {
    const catExists = state.categories.some(c => c.id === course.categoryId);
    if (!course.categoryId || course.categoryId === "uncategorized" || !catExists) {
      const guessed = guessCategory(course.title, state.categories, state.mappings);
      if (guessed && guessed !== "uncategorized") {
        course.categoryId = guessed;
        hadUnmapped = true;
      }
    }
  });
  if (hadUnmapped) {
    await saveCourses(state.courses);
  }
  await syncThesisCourse();
  initUI();
  render();
});

/**
 * UIの初期化
 */
function initUI() {
  // タブ切り替え
  const tabs = document.querySelectorAll(".tact-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add("active");
      state.currentTab = targetId;
      render();
    });
  });

  // プロファイル変更リンク
  document.getElementById("switch-preset-btn").addEventListener("click", () => {
    // タブ3（学修要覧・要件設定シート）へ切り替え
    const ruleTabBtn = document.querySelector('[data-tab="tab-rules"]');
    if (ruleTabBtn) ruleTabBtn.click();
  });

  document.getElementById("jump-to-courses-btn").addEventListener("click", () => {
    state.categoryFilter = "uncategorized";
    const courseTabBtn = document.querySelector('[data-tab="tab-courses"]');
    if (courseTabBtn) courseTabBtn.click();
  });

  // 検索・フィルタ
  const filterInput = document.getElementById("course-filter-input");
  if (filterInput) {
    filterInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderCoursesTable();
    });
  }

  const catFilter = document.getElementById("course-cat-filter");
  if (catFilter) {
    catFilter.addEventListener("change", (e) => {
      state.categoryFilter = e.target.value;
      renderCoursesTable();
    });
  }

  // TACT同期
  document.getElementById("sync-tact-btn").addEventListener("click", handleTactSync);

  // サンプルデータ
  document.getElementById("load-sample-btn").addEventListener("click", handleLoadSample);

  // 拡張機能ストレージの変更監視（ポップアップ等からの更新を即時反映）
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        let shouldRerender = false;
        if (changes.tact_credit_courses) {
          state.courses = changes.tact_credit_courses.newValue || [];
          shouldRerender = true;
        }
        if (changes.tact_credit_categories) {
          state.categories = changes.tact_credit_categories.newValue || [];
          shouldRerender = true;
        }
        if (changes.tact_credit_profile) {
          state.studentProfile = changes.tact_credit_profile.newValue || state.studentProfile;
          shouldRerender = true;
        }
        if (changes.tact_credit_preset_id) {
          state.presetId = changes.tact_credit_preset_id.newValue || state.presetId;
          shouldRerender = true;
        }
        if (changes.tact_credit_mappings) {
          state.mappings = changes.tact_credit_mappings.newValue || {};
          shouldRerender = true;
        }
        if (shouldRerender) {
          render();
        }
      }
    });
  }

  // モーダル初期化
  setupModals();

  // ルール編集タブの初期化
  initRuleEditor();
}

/**
 * 画面全体の再描画
 */
function render() {
  renderProfileBar();
  renderSummary();
  renderCoursesTable();
  document.getElementById("tab-course-count").textContent = state.courses.length;
}

/**
 * 卒業論文（10単位・TACT連携対象外）の手動修得トグルと科目同期
 */
async function syncThesisCourse() {
  const thesisIndex = state.courses.findIndex(c => c.id === "manual_major_thesis_10");
  const isPassed = !!(state.studentProfile && state.studentProfile.thesisPassed);

  if (isPassed) {
    if (thesisIndex === -1) {
      state.courses.push({
        id: "manual_major_thesis_10",
        title: "卒業論文",
        rawTitle: "卒業論文 (論文審査合格・10単位)",
        courseCode: "THESIS-10",
        term: "第4年次 通年",
        year: new Date().getFullYear(),
        season: "通年",
        credits: 10,
        categoryId: "major_thesis",
        origin: "faculty",
        isEstimated: false,
        status: "passed",
        isNonCredit: false,
        isManual: true,
        updatedAt: Date.now()
      });
      await saveCourses(state.courses);
    }
  } else {
    if (thesisIndex !== -1) {
      state.courses.splice(thesisIndex, 1);
      await saveCourses(state.courses);
    }
  }
}

/**
 * プロファイルバーの描画
 */
function renderProfileBar() {
  const summary = calculateCredits(state.courses, state.categories);
  const totalReq = summary.totalRequired || 124;
  const p = state.studentProfile || {};
  const yearText = p.entranceYear ? `${p.entranceYear}年度入学生` : "";
  const facultyText = p.faculty || "名古屋大学";
  const deptText = p.department ? `（${p.department}）` : "";

  document.getElementById("profile-display-text").textContent = `${yearText} ｜ ${facultyText} ${deptText}`;
  document.getElementById("profile-total-credits").textContent = totalReq;
}

/**
 * タブ1: 卒業要件・単位配当表の描画
 */
function renderSummary() {
  const summary = calculateCredits(state.courses, state.categories);
  const totalReq = summary.totalRequired || 124;

  // 上部メトリック
  document.getElementById("sum-passed-credits").textContent = summary.totalPassed;
  document.getElementById("sum-enrolled-credits").textContent = summary.totalEnrolled;
  document.getElementById("sum-potential-credits").textContent = summary.totalPotential;
  document.getElementById("sum-required-credits").textContent = totalReq;

  const remaining = Math.max(0, totalReq - summary.totalPassed);
  document.getElementById("sum-remaining-credits").textContent = remaining;

  const passedPct = Math.min(100, Math.round((summary.totalPassed / totalReq) * 100));
  const enrolledPct = Math.min(100 - passedPct, Math.round((summary.totalEnrolled / totalReq) * 100));

  document.getElementById("sum-passed-bar").style.width = `${passedPct}%`;
  document.getElementById("sum-enrolled-bar").style.width = `${enrolledPct}%`;
  document.getElementById("legend-passed-txt").textContent = summary.totalPassed;
  document.getElementById("legend-enrolled-txt").textContent = summary.totalEnrolled;
  document.getElementById("sum-progress-pct").textContent = `${passedPct}%`;

  const statusTag = document.getElementById("overall-status-tag");
  if (summary.isAllFulfilled) {
    statusTag.textContent = "✓ 卒業要件達成";
    statusTag.className = "tact-status-tag tag-success";
  } else {
    statusTag.textContent = `卒業要件未充足（あと${remaining}単位）`;
    statusTag.className = "tact-status-tag tag-warning";
  }

  // 文学部 進級判定（2年次終了時38単位基準・仮進級判定）
  const advBar = document.getElementById("advancement-info-bar");
  const advBadge = document.getElementById("advancement-status-badge");
  const currentPreset = DEFAULT_PRESETS.find(p => p.id === state.presetId) || DEFAULT_PRESETS[0];

  if (currentPreset.advancementRequired > 0) {
    advBar.style.display = "flex";
    let advPassed = 0;
    let langShortfall = 0;

    state.categories.forEach(cat => {
      const advReq = cat.advancementRequired || 0;
      if (advReq > 0) {
        const catData = summary.categoryProgress[cat.id] || { passed: 0 };
        advPassed += Math.min(advReq, catData.passed);
        if (cat.id === "lang_en" || cat.id === "lang_second") {
          langShortfall += Math.max(0, advReq - catData.passed);
        }
      }
    });

    const isAdvFulfilled = advPassed >= currentPreset.advancementRequired;
    if (isAdvFulfilled) {
      advBadge.textContent = `✓ 進級基準充足 (${advPassed} / ${currentPreset.advancementRequired} 単位)`;
      advBadge.style.background = "#dcfce7";
      advBadge.style.color = "#15803d";
    } else if (langShortfall <= 2 && (advPassed + langShortfall) >= currentPreset.advancementRequired) {
      advBadge.textContent = `⚠️ 仮進級対象（言語文化${langShortfall}単位不足 / 計${advPassed}単位）`;
      advBadge.style.background = "#fef3c7";
      advBadge.style.color = "#b45309";
    } else {
      const diff = currentPreset.advancementRequired - advPassed;
      advBadge.textContent = `進級要件未充足（38単位中 ${advPassed}単位 / あと${diff}単位）`;
      advBadge.style.background = "#fee2e2";
      advBadge.style.color = "#b91c1c";
    }
  } else {
    advBar.style.display = "none";
  }

  // 未分類アラート
  const uncatCount = summary.uncategorizedCourses.length;
  const warnEl = document.getElementById("uncategorized-warning");
  if (uncatCount > 0) {
    warnEl.style.display = "flex";
    document.getElementById("warn-uncat-count").textContent = uncatCount;
  } else {
    warnEl.style.display = "none";
  }

  // 単位配当表の描画（大区分グループ別）
  const tbody = document.getElementById("requirement-table-body");
  tbody.innerHTML = "";

  const standardOrder = ["全学教育科目", "専門系科目", "専門科目", "学部専門科目", "専門教育科目", "その他・自由選択"];
  const dynamicSections = [];
  standardOrder.forEach(s => {
    if (state.categories.some(c => c.section === s)) dynamicSections.push(s);
  });
  state.categories.forEach(cat => {
    const sec = cat.section || "全学教育科目";
    if (!dynamicSections.includes(sec)) dynamicSections.push(sec);
  });

  const categoriesBySec = {};
  dynamicSections.forEach(s => categoriesBySec[s] = []);

  state.categories.forEach(cat => {
    const sec = cat.section || "全学教育科目";
    if (!categoriesBySec[sec]) categoriesBySec[sec] = [];
    categoriesBySec[sec].push(cat);
  });

  dynamicSections.forEach(secName => {
    const cats = categoriesBySec[secName];
    if (!cats || cats.length === 0) return;

    // 大区分ヘッダー
    const secData = summary.sectionSummary[secName] || { required: 0, passed: 0, enrolled: 0 };
    const secRemaining = Math.max(0, secData.required - secData.passed);
    const secRow = document.createElement("tr");
    secRow.className = "section-header-row";
    secRow.innerHTML = `
      <td colspan="3">【${secName}】</td>
      <td style="text-align: right;">${secData.required}</td>
      <td style="text-align: right; color: var(--tact-success);">${secData.passed}</td>
      <td style="text-align: right; color: #0284c7;">+${secData.enrolled}</td>
      <td style="text-align: right; font-weight: 700; ${secRemaining > 0 ? 'color: var(--tact-danger);' : ''}">${secRemaining === 0 ? '-' : secRemaining}</td>
      <td style="text-align: center;">${secData.passed >= secData.required ? '<span class="badge-fulfilled">充足</span>' : '<span class="badge-unfulfilled">未充足</span>'}</td>
    `;
    tbody.appendChild(secRow);

    // 中区分（group）ごとにグループ化
    let lastGroup = null;

    cats.forEach(cat => {
      // 中区分サブヘッダーの表示
      if (cat.group && cat.group !== lastGroup) {
        lastGroup = cat.group;
        const groupRow = document.createElement("tr");
        groupRow.style.backgroundColor = "#f1f5f9";
        groupRow.style.fontSize = "12px";
        groupRow.style.fontWeight = "700";
        groupRow.style.color = "#334155";
        groupRow.innerHTML = `
          <td colspan="8" style="padding: 5px 12px; border-left: 3px solid var(--tact-blue);">
            📁 ${cat.group}
          </td>
        `;
        tbody.appendChild(groupRow);
      }

      const data = summary.categoryProgress[cat.id] || { passed: 0, enrolled: 0, required: cat.requiredCredits || 0, courses: [] };
      const row = document.createElement("tr");
      row.style.cursor = "pointer";
      row.title = "クリックでこの区分の算入科目を確認";

      const isFulfilled = data.passed >= data.required;
      const shortfall = Math.max(0, data.required - data.passed);
      const isThesisCat = cat.id === "major_thesis";
      const thesisHtml = isThesisCat ? `
        <div style="margin-top: 5px;" class="thesis-toggle-wrap">
          <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 5px; background: #eff6ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #bfdbfe; font-size: 11px;">
            <input type="checkbox" class="thesis-complete-toggle" ${state.studentProfile && state.studentProfile.thesisPassed ? 'checked' : ''}>
            <span style="font-weight: 700; color: #1d4ed8;">卒業論文（10単位）提出・合格済として算入</span>
          </label>
          <span style="font-size: 10.5px; color: var(--tact-text-sub); margin-left: 6px;">※TACT連携外のため手動で切替可能</span>
        </div>
      ` : '';

      row.innerHTML = `
        <td style="color: var(--tact-text-sub); font-size: 11.5px;">${cat.group || cat.section || ''}</td>
        <td>
          <span style="font-weight: 600; color: var(--tact-navy);">${isExpanded ? '▼' : '▶'} ${cat.name}</span>
          <span style="font-size: 11px; color: var(--tact-text-sub); margin-left: 6px;">(${data.courses.length}科目)</span>
          ${thesisHtml}
        </td>
        <td style="font-size: 12px; color: var(--tact-text-sub);">${cat.note || '-'}</td>
        <td style="text-align: right; font-weight: 600;">${data.required}</td>
        <td style="text-align: right; font-weight: 700; color: var(--tact-success);">${data.passed}</td>
        <td style="text-align: right; color: #0284c7;">${data.enrolled > 0 ? `+${data.enrolled}` : '-'}</td>
        <td style="text-align: right; font-weight: 700;">${shortfall > 0 ? `<span class="badge-unfulfilled">残 ${shortfall}</span>` : '-'}</td>
        <td style="text-align: center;">
          ${isFulfilled ? '<span class="badge-fulfilled">✓ 充足</span>' : `<span class="badge-unfulfilled">あと ${shortfall}</span>`}
        </td>
      `;

      // 卒業論文トグルのイベント
      if (isThesisCat) {
        const toggleInput = row.querySelector(".thesis-complete-toggle");
        if (toggleInput) {
          toggleInput.addEventListener("click", (e) => e.stopPropagation());
          toggleInput.addEventListener("change", async (e) => {
            e.stopPropagation();
            state.studentProfile = state.studentProfile || {};
            state.studentProfile.thesisPassed = e.target.checked;
            await syncThesisCourse();
            await saveStudentProfile(state.studentProfile);
            render();
          });
        }
      }

      // クリックで科目展開
      row.addEventListener("click", () => {
        if (state.expandedCategories.has(cat.id)) {
          state.expandedCategories.delete(cat.id);
        } else {
          state.expandedCategories.add(cat.id);
        }
        renderSummary();
      });

      tbody.appendChild(row);

      // アコーディオン展開行
      if (isExpanded) {
        const detailRow = document.createElement("tr");
        detailRow.style.backgroundColor = "#fafbfc";
        const courseListHtml = data.courses.length === 0
          ? `<span style="color: var(--tact-text-sub); font-size: 11.5px;">この区分に登録されている科目はありません。</span>`
          : `<div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;">
              ${data.courses.map(c => `
                <span style="background: #ffffff; border: 1px solid var(--tact-border); padding: 3px 8px; border-radius: 3px; font-size: 11.5px;">
                  <strong>${c.title}</strong> (${c.credits}単位 / ${c.status === 'passed' ? '修得済' : '履修中'})
                  ${c.origin === 'ilas' ? '<span style="color:#0284c7;font-size:10px;margin-left:3px;">[教養]</span>' : c.origin === 'faculty' ? '<span style="color:#b45309;font-size:10px;margin-left:3px;">[学部]</span>' : ''}
                </span>
              `).join('')}
             </div>`;

        detailRow.innerHTML = `
          <td></td>
          <td colspan="7" style="padding: 6px 12px 10px 12px; border-bottom: 1px dashed var(--tact-border);">
            <div style="font-size: 11px; font-weight: 700; color: var(--tact-text-sub); margin-bottom: 4px;">算入科目一覧:</div>
            ${courseListHtml}
          </td>
        `;
        tbody.appendChild(detailRow);
      }
    });
  });

  // 未分類科目がある場合は要件表の末尾にも要確認行を明示
  if (summary.uncategorizedCourses && summary.uncategorizedCourses.length > 0) {
    const uncatPassedCredits = summary.uncategorizedCourses
      .filter(c => c.status === "passed" || c.status === "exempt")
      .reduce((s, c) => s + (c.credits || 0), 0);
    const uncatEnrolledCredits = summary.uncategorizedCourses
      .filter(c => c.status === "enrolled")
      .reduce((s, c) => s + (c.credits || 0), 0);

    const uncatRow = document.createElement("tr");
    uncatRow.style.backgroundColor = "#fffbeb";
    uncatRow.style.borderTop = "2px solid #f59e0b";
    uncatRow.innerHTML = `
      <td style="color: #b45309; font-weight: 700;">⚠️ 要確認</td>
      <td>
        <span style="font-weight: 700; color: #b45309;">未分類科目（${summary.uncategorizedCourses.length}件）</span>
        <div style="font-size: 11px; color: #78350f;">どの区分（全学／専門等）に算入するか未指定の講義です。</div>
      </td>
      <td style="font-size: 11.5px; color: #78350f;">「履修科目一覧」タブで学生便覧の配当区分に割り当ててください</td>
      <td style="text-align: right; color: #94a3b8;">-</td>
      <td style="text-align: right; font-weight: 700; color: #b45309;">計 ${uncatPassedCredits} 単位</td>
      <td style="text-align: right; color: #0284c7;">${uncatEnrolledCredits > 0 ? `+${uncatEnrolledCredits}` : '-'}</td>
      <td style="text-align: right; color: #94a3b8;">-</td>
      <td style="text-align: center;">
        <button class="tact-btn tact-btn-sm tact-btn-warning" id="resolve-uncat-table-btn" style="font-size: 11px; padding: 3px 8px;">区分を設定</button>
      </td>
    `;
    tbody.appendChild(uncatRow);

    const resolveBtn = uncatRow.querySelector("#resolve-uncat-table-btn");
    if (resolveBtn) {
      resolveBtn.addEventListener("click", () => {
        state.categoryFilter = "uncategorized";
        const courseTabBtn = document.querySelector('[data-tab="tab-courses"]');
        if (courseTabBtn) courseTabBtn.click();
      });
    }
  }

  // 単位対象外サイト（事務・連絡・e-Learning等）の通知行
  if (summary.nonCreditCourses && summary.nonCreditCourses.length > 0) {
    const nonCreditRow = document.createElement("tr");
    nonCreditRow.style.backgroundColor = "#f8fafc";
    nonCreditRow.style.borderTop = "1px dashed var(--tact-border)";
    nonCreditRow.innerHTML = `
      <td style="color: var(--tact-text-sub); font-size: 11.5px;">-</td>
      <td>
        <span style="font-weight: 600; color: #475569;">🚫 単位対象外・事務サイト（${summary.nonCreditCourses.length}件）</span>
        <div style="font-size: 11px; color: var(--tact-text-sub);">お知らせ・e-Learning研修・学生支援等の非講義サイト（単位計算から除外済）</div>
      </td>
      <td style="font-size: 11.5px; color: var(--tact-text-sub);">単位換算なし（0単位）</td>
      <td style="text-align: right; color: var(--tact-text-sub);">-</td>
      <td style="text-align: right; color: var(--tact-text-sub); font-weight: 600;">0 単位</td>
      <td style="text-align: right; color: var(--tact-text-sub);">-</td>
      <td style="text-align: right; color: var(--tact-text-sub);">-</td>
      <td style="text-align: center;">
        <button class="tact-btn tact-btn-sm tact-btn-light" id="view-noncredit-table-btn" style="font-size: 11px; padding: 2px 7px;">一覧で確認</button>
      </td>
    `;
    tbody.appendChild(nonCreditRow);

    const viewNonCreditBtn = nonCreditRow.querySelector("#view-noncredit-table-btn");
    if (viewNonCreditBtn) {
      viewNonCreditBtn.addEventListener("click", () => {
        state.categoryFilter = "non_credit";
        const courseTabBtn = document.querySelector('[data-tab="tab-courses"]');
        if (courseTabBtn) courseTabBtn.click();
      });
    }
  }
}

/**
 * タブ2: 履修科目一覧・個別精査テーブルの描画
 */
function renderCoursesTable() {
  const tbody = document.getElementById("course-management-tbody");
  tbody.innerHTML = "";

  const nonCreditCount = state.courses.filter(c => c.isNonCredit || c.categoryId === "non_credit").length;

  // 区分フィルターセレクトの更新
  const catFilterSelect = document.getElementById("course-cat-filter");
  const currentCatFilter = state.categoryFilter;
  catFilterSelect.innerHTML = `
    <option value="all">すべての単位対象科目</option>
    <option value="all_with_non_credit">全サイト（事務・非単位含む）</option>
    <option value="non_credit">🚫 単位対象外・事務サイトのみ (${nonCreditCount}件)</option>
    <option value="uncategorized">⚠️ 未分類のみ</option>
  `;
  state.categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.section ? `[${c.section}] ` : ''}${c.name}`;
    if (c.id === currentCatFilter) opt.selected = true;
    catFilterSelect.appendChild(opt);
  });
  if (currentCatFilter) catFilterSelect.value = currentCatFilter;

  // フィルタリング
  const filtered = state.courses.filter(c => {
    const matchesSearch = !state.searchQuery ||
      c.title.toLowerCase().includes(state.searchQuery) ||
      (c.term && c.term.toLowerCase().includes(state.searchQuery));

    let matchesCat = true;
    const isNonCredit = c.isNonCredit || c.categoryId === "non_credit";

    if (state.categoryFilter === "all") {
      // 通常表示: 単位対象科目のみ
      matchesCat = !isNonCredit;
    } else if (state.categoryFilter === "all_with_non_credit") {
      matchesCat = true;
    } else if (state.categoryFilter === "non_credit") {
      matchesCat = isNonCredit;
    } else if (state.categoryFilter === "uncategorized") {
      matchesCat = (!c.categoryId || c.categoryId === "uncategorized") && !isNonCredit;
    } else {
      matchesCat = c.categoryId === state.categoryFilter;
    }

    return matchesSearch && matchesCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--tact-text-sub); padding: 24px;">該当する科目がありません</td></tr>`;
    return;
  }

  filtered.forEach((course, index) => {
    const tr = document.createElement("tr");
    const isNonCredit = course.isNonCredit || course.categoryId === "non_credit";

    if (isNonCredit) {
      tr.style.backgroundColor = "#f8fafc";
      tr.style.opacity = "0.85";
    }

    // 区分セレクトのHTML生成（大区分・中区分で階層化）
    let catOptions = `<option value="uncategorized" ${(!course.categoryId || course.categoryId === 'uncategorized') ? 'selected' : ''}>⚠️ 未分類</option>`;
    catOptions += `<option value="non_credit" ${isNonCredit ? 'selected' : ''}>🚫 単位対象外（事務・連絡・研修等）</option>`;

    const catGroups = {};
    state.categories.forEach(cat => {
      const gName = cat.group ? `${cat.section}（${cat.group}）` : cat.section;
      if (!catGroups[gName]) catGroups[gName] = [];
      catGroups[gName].push(cat);
    });

    Object.entries(catGroups).forEach(([gName, cats]) => {
      catOptions += `<optgroup label="${gName}">`;
      cats.forEach(cat => {
        catOptions += `<option value="${cat.id}" ${course.categoryId === cat.id ? 'selected' : ''}>${cat.name} (${cat.requiredCredits}単位)</option>`;
      });
      catOptions += `</optgroup>`;
    });

    let originBadge = '';
    if (course.origin === 'ilas') {
      originBadge = '<span style="background: #e0f2fe; color: #0369a1; font-size: 10.5px; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-left: 5px;">全学</span>';
    } else if (course.origin === 'faculty') {
      originBadge = '<span style="background: #fef3c7; color: #92400e; font-size: 10.5px; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-left: 5px;">文学部</span>';
    }

    let estimatedBadge = '';
    if (course.isEstimated && !isNonCredit) {
      estimatedBadge = '<span title="講義名から自動推定された区分です。必要に応じてご確認ください" style="background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; margin-left: 4px;">⚠️推定</span>';
    }

    tr.innerHTML = `
      <td style="color: var(--tact-text-sub);">${index + 1}</td>
      <td>
        <span style="font-weight: 600; color: ${isNonCredit ? '#475569' : 'var(--tact-navy)'};">${course.title}</span>
        ${originBadge}
        ${estimatedBadge}
        ${isNonCredit ? `<span style="background: #e2e8f0; color: #475569; font-size: 11px; padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">単位対象外</span>` : ''}
        ${course.rawTitle && course.rawTitle !== course.title ? `<div style="font-size: 11px; color: var(--tact-text-sub);">${course.rawTitle}</div>` : ''}
      </td>
      <td style="font-size: 12px; color: var(--tact-text-muted);">${course.term || "-"}</td>
      <td>
        <select class="tact-select tact-select-sm cat-select" data-id="${course.id}" style="width: 100%;">
          ${catOptions}
        </select>
      </td>
      <td style="text-align: center;">
        <select class="tact-select tact-select-sm credit-select" data-id="${course.id}">
          <option value="0" ${course.credits === 0 ? 'selected' : ''}>0 単位（非算入）</option>
          <option value="1" ${course.credits === 1 ? 'selected' : ''}>1 単位</option>
          <option value="2" ${course.credits === 2 ? 'selected' : ''}>2 単位</option>
          <option value="4" ${course.credits === 4 ? 'selected' : ''}>4 単位</option>
          <option value="6" ${course.credits === 6 ? 'selected' : ''}>6 単位</option>
          <option value="8" ${course.credits === 8 ? 'selected' : ''}>8 単位</option>
        </select>
      </td>
      <td style="text-align: center;">
        <select class="tact-select tact-select-sm status-select" data-id="${course.id}">
          <option value="enrolled" ${course.status === 'enrolled' ? 'selected' : ''}>履修中</option>
          <option value="passed" ${course.status === 'passed' ? 'selected' : ''}>修得済</option>
          <option value="failed" ${course.status === 'failed' ? 'selected' : ''}>不可</option>
          <option value="exempt" ${course.status === 'exempt' ? 'selected' : ''}>免除・対象外</option>
        </select>
      </td>
      <td style="text-align: center;">
        <button class="tact-btn-link del-course-btn" data-id="${course.id}" style="color: var(--tact-danger);">削除</button>
      </td>
    `;

    // 区分変更イベント
    tr.querySelector(".cat-select").addEventListener("change", async (e) => {
      const newCatId = e.target.value;
      course.categoryId = newCatId;
      if (newCatId === "non_credit") {
        course.isNonCredit = true;
        course.credits = 0;
        course.status = "exempt";
      } else {
        course.isNonCredit = false;
        if (course.credits === 0) {
          course.credits = estimateCredits(course.title, course.rawTitle);
        }
      }
      await saveMapping(course.title, newCatId);
      await saveCourses(state.courses);
      renderSummary();
      renderCoursesTable();
    });

    // 単位数変更イベント
    tr.querySelector(".credit-select").addEventListener("change", async (e) => {
      course.credits = parseInt(e.target.value, 10);
      if (course.credits > 0 && course.isNonCredit) {
        course.isNonCredit = false;
      }
      await saveCourses(state.courses);
      renderSummary();
    });

    // 状況変更イベント
    tr.querySelector(".status-select").addEventListener("change", async (e) => {
      course.status = e.target.value;
      await saveCourses(state.courses);
      renderSummary();
    });

    // 削除イベント
    tr.querySelector(".del-course-btn").addEventListener("click", async () => {
      if (confirm(`講義「${course.title}」を削除しますか？`)) {
        state.courses = state.courses.filter(c => c.id !== course.id);
        await saveCourses(state.courses);
        render();
      }
    });

    tbody.appendChild(tr);
  });
}

/**
 * タブ3: 学修要覧・要件設定シートの初期化 & イベント
 */
/**
 * タブ3: 学修要覧・要件設定シートの初期化 & イベント
 */
function initRuleEditor() {
  const presetSelect = document.getElementById("cfg-preset-select");
  const deptSelect = document.getElementById("cfg-lit-department-select");
  const deptWrapper = document.getElementById("cfg-dept-wrapper");

  presetSelect.innerHTML = "";
  DEFAULT_PRESETS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.presetId) opt.selected = true;
    presetSelect.appendChild(opt);
  });

  // 文学部 専修セレクトボックスの初期化（5学繫・22専攻をグループ化）
  if (deptSelect) {
    deptSelect.innerHTML = "";

    // 学系ごとにグループ化
    const groups = {};
    LIT_DEPARTMENTS.forEach(dept => {
      const g = dept.facultyGroup || "人文学科";
      if (!groups[g]) groups[g] = [];
      groups[g].push(dept);
    });

    Object.entries(groups).forEach(([groupName, depts]) => {
      const optGroup = document.createElement("optgroup");
      optGroup.label = `【${groupName}】`;
      depts.forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept.id;
        opt.textContent = dept.name;
        optGroup.appendChild(opt);
      });
      deptSelect.appendChild(optGroup);
    });

    // 現在の所属専修の選択
    const currentDeptName = (state.studentProfile && state.studentProfile.department) || "";
    const matchedDept = LIT_DEPARTMENTS.find(d => d.name === currentDeptName || d.id === currentDeptName);
    if (matchedDept) {
      deptSelect.value = matchedDept.id;
    } else {
      deptSelect.value = "philosophy";
    }
  }

  const p = state.studentProfile || {};
  const entranceYearInput = document.getElementById("cfg-entrance-year");
  if (entranceYearInput) entranceYearInput.value = p.entranceYear || 2024;

  const updateDeptVisibility = () => {
    if (deptWrapper) {
      deptWrapper.style.display = (presetSelect.value === "nu-humanities") ? "block" : "none";
    }
  };
  updateDeptVisibility();

  // プリセット変更イベント
  presetSelect.addEventListener("change", (e) => {
    const selectedPreset = DEFAULT_PRESETS.find(p => p.id === e.target.value);
    if (selectedPreset) {
      if (confirm("選択した学部の標準枠組みを読み込みますか？\n（現在の区分・単位数設定は上書きされます）")) {
        state.presetId = selectedPreset.id;
        state.studentProfile.faculty = selectedPreset.faculty;
        if (selectedPreset.id === "nu-humanities" && deptSelect) {
          const deptId = deptSelect.value || "philosophy";
          const deptObj = LIT_DEPARTMENTS.find(d => d.id === deptId);
          state.studentProfile.department = deptObj ? deptObj.name : "哲学専修";
          state.categories = buildLiteratureCategories(deptId);
        } else {
          state.categories = JSON.parse(JSON.stringify(selectedPreset.categories));
          state.studentProfile.department = "";
        }
        updateDeptVisibility();
        reclassifyCourses();
        renderRuleEditorTable();
        render();
      } else {
        presetSelect.value = state.presetId;
      }
    }
  });

  // 文学部 専修変更イベント
  if (deptSelect) {
    deptSelect.addEventListener("change", (e) => {
      const deptId = e.target.value;
      const deptObj = LIT_DEPARTMENTS.find(d => d.id === deptId);
      const deptName = deptObj ? deptObj.name : "哲学専修";

      if (confirm(`文学部の所属専修を「${deptName}」に変更し、専門科目（実習・演習・特殊講義・卒論）の配当要件を自動再構成しますか？`)) {
        state.studentProfile.department = deptName;
        state.categories = buildLiteratureCategories(deptId);
        reclassifyCourses();
        renderRuleEditorTable();
        render();
      } else {
        const matched = LIT_DEPARTMENTS.find(d => d.name === state.studentProfile.department || d.id === state.studentProfile.department);
        deptSelect.value = matched ? matched.id : "philosophy";
      }
    });
  }

  renderRuleEditorTable();

  // 新規区分追加ボタン
  document.getElementById("add-rule-row-btn").addEventListener("click", () => {
    state.categories.push({
      id: `custom-cat-${Date.now()}`,
      section: "専門科目",
      name: "新規科目区分",
      requiredCredits: 4,
      note: "学生便覧記載の条件",
      keywords: []
    });
    renderRuleEditorTable();
  });

  // 設定保存ボタン
  document.getElementById("save-custom-rules-btn").addEventListener("click", async () => {
    const rows = document.querySelectorAll("#rule-edit-tbody tr");
    const updatedCategories = [];

    rows.forEach((row, idx) => {
      const section = row.querySelector('[data-field="section"]').value.trim();
      const name = row.querySelector('[data-field="name"]').value.trim();
      const credits = parseInt(row.querySelector('[data-field="credits"]').value, 10) || 0;
      const note = row.querySelector('[data-field="note"]').value.trim();
      const origCat = state.categories[idx] || {};

      updatedCategories.push({
        ...origCat,
        section,
        name,
        requiredCredits: credits,
        note
      });
    });

    state.categories = updatedCategories;
    const yearEl = document.getElementById("cfg-entrance-year");
    state.studentProfile.entranceYear = yearEl ? (parseInt(yearEl.value, 10) || 2024) : 2024;

    if (deptSelect && (presetSelect.value === "nu-humanities" || state.presetId === "nu-humanities")) {
      const deptObj = LIT_DEPARTMENTS.find(d => d.id === deptSelect.value);
      state.studentProfile.department = deptObj ? deptObj.name : state.studentProfile.department;
    }

    reclassifyCourses();

    await saveCategories(state.categories);
    await saveStudentProfile(state.studentProfile);
    await saveCourses(state.courses);

    alert("学修要覧・卒業要件設定を保存しました！\n科目への区分割り当ても更新されました。");
    render();
  });
}

/**
 * 登録済み科目のカテゴリを最新のカテゴリリストで再割り当て
 */
function reclassifyCourses() {
  state.courses.forEach(course => {
    const catExists = state.categories.some(c => c.id === course.categoryId);
    if (!course.categoryId || course.categoryId === "uncategorized" || !catExists) {
      course.categoryId = guessCategory(course.title, state.categories, state.mappings);
    }
  });
}

function renderRuleEditorTable() {
  const tbody = document.getElementById("rule-edit-tbody");
  tbody.innerHTML = "";

  state.categories.forEach((cat, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <select class="tact-select tact-select-sm" data-field="section" style="width: 100%;">
          <option value="全学教育科目" ${cat.section === '全学教育科目' ? 'selected' : ''}>全学教育科目</option>
          <option value="専門系科目" ${cat.section === '専門系科目' ? 'selected' : ''}>専門系科目</option>
          <option value="専門科目" ${cat.section === '専門科目' ? 'selected' : ''}>専門科目</option>
          <option value="学部専門科目" ${cat.section === '学部専門科目' ? 'selected' : ''}>学部専門科目</option>
          <option value="専門教育科目" ${cat.section === '専門教育科目' ? 'selected' : ''}>専門教育科目</option>
          <option value="その他・自由選択" ${cat.section === 'その他・自由選択' ? 'selected' : ''}>その他・自由選択</option>
        </select>
      </td>
      <td>
        <input type="text" class="tact-input tact-input-sm" data-field="name" value="${cat.name}" style="width: 100%;">
      </td>
      <td>
        <input type="number" class="tact-input tact-input-sm" data-field="credits" value="${cat.requiredCredits}" min="0" max="150" style="width: 100%;">
      </td>
      <td>
        <input type="text" class="tact-input tact-input-sm" data-field="note" value="${cat.note || ''}" placeholder="例: 英語4単位＋初修外国語4単位必修等" style="width: 100%;">
      </td>
      <td style="text-align: center;">
        <button class="tact-btn-link del-rule-btn" data-idx="${idx}" style="color: var(--tact-danger);">✕</button>
      </td>
    `;

    tr.querySelector(".del-rule-btn").addEventListener("click", () => {
      state.categories.splice(idx, 1);
      renderRuleEditorTable();
    });

    tbody.appendChild(tr);
  });
}

/**
 * TACT同期処理
 */
async function handleTactSync() {
  const syncBtn = document.getElementById("sync-tact-btn");
  syncBtn.disabled = true;
  syncBtn.innerHTML = `<span>⏳</span> 講義取得中...`;

  try {
    const session = await checkTactSession();
    if (!session.isLoggedIn) {
      const openTab = confirm(
        "TACT（https://tact.ac.thers.ac.jp）へのログインが確認できませんでした。\n\n" +
        "【確認事項】\n" +
        "1. ブラウザで TACT にログインしたタブが開いているかご確認ください。\n" +
        "2. まだ開いていない場合、「OK」を押すと TACT のページを新しいタブで開きます。\n\n" +
        "TACTを開きますか？"
      );
      if (openTab) {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: "https://tact.ac.thers.ac.jp" });
        } else {
          window.open("https://tact.ac.thers.ac.jp", "_blank");
        }
      }
      syncBtn.disabled = false;
      syncBtn.innerHTML = `<span>🔄</span> TACTと同期`;
      return;
    }

    const sites = await fetchUserCourseSites(session.baseUrl, session.tabId);
    const existingMap = new Map(state.courses.map(c => [c.id, c]));

    const parsed = sites.map(site => {
      let course;
      if (existingMap.has(site.id)) {
        course = existingMap.get(site.id);
        // カテゴリが未設定、または現行カテゴリ一覧に存在しない場合は再推定して修復
        const catExists = state.categories.some(cat => cat.id === course.categoryId);
        if (!course.categoryId || course.categoryId === "uncategorized" || !catExists) {
          course.categoryId = guessCategory(course.title, state.categories, state.mappings);
        }
      } else {
        course = parseCourseSite(site, state.categories, state.mappings);
      }
      return course;
    });

    state.courses = parsed;
    await syncThesisCourse();
    state.lastSync = Date.now();
    state.user = session.user;

    await saveCourses(state.courses);
    await updateLastSync(session.user);

    render();
    alert(`TACTから ${sites.length} 件の講義を全件同期しました！\n「履修科目一覧・個別精査」タブで手引きの区分をご確認ください。`);
  } catch (err) {
    alert("同期エラー: " + err.message);
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `<span>🔄</span> TACTと同期`;
  }
}

/**
 * サンプルデータ読み込み処理
 */
async function handleLoadSample() {
  const mockSites = getMockCourseSites();
  const parsed = mockSites.map(s => parseCourseSite(s, state.categories, state.mappings));
  state.courses = parsed;
  await syncThesisCourse();
  state.lastSync = Date.now();
  await saveCourses(state.courses);
  render();
  alert("名大の模擬履修データを読み込みました！");
}

/**
 * モーダル操作のセットアップ
 */
function setupModals() {
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      document.getElementById(modalId).style.display = "none";
    });
  });

  // 科目手動追加
  const addCourseBtn = document.getElementById("add-course-btn");
  const addCourseModal = document.getElementById("add-course-modal");
  const addCategorySelect = document.getElementById("manual-course-category");
  const addCourseForm = document.getElementById("add-course-form");

  addCourseBtn.addEventListener("click", () => {
    addCategorySelect.innerHTML = `<option value="uncategorized">⚠️ 未分類</option>`;
    state.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = `${cat.section ? `[${cat.section}] ` : ''}${cat.name}`;
      addCategorySelect.appendChild(opt);
    });
    addCourseModal.style.display = "flex";
  });

  addCourseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("manual-course-title").value.trim();
    const credits = parseInt(document.getElementById("manual-course-credits").value, 10);
    const term = document.getElementById("manual-course-term").value.trim();
    const categoryId = document.getElementById("manual-course-category").value;
    const courseStatus = document.getElementById("manual-course-status").value;

    const newCourse = {
      id: `manual-${Date.now()}`,
      title: title,
      rawTitle: title,
      credits: credits,
      term: term,
      year: new Date().getFullYear(),
      categoryId: categoryId,
      status: courseStatus,
      isManual: true,
      updatedAt: Date.now()
    };

    state.courses.push(newCourse);
    await saveCourses(state.courses);
    addCourseModal.style.display = "none";
    addCourseForm.reset();
    render();
  });

  // バックアップモーダル
  const backupBtn = document.getElementById("backup-btn");
  const backupModal = document.getElementById("backup-modal");
  backupBtn.addEventListener("click", () => {
    backupModal.style.display = "flex";
  });

  document.getElementById("export-json-btn").addEventListener("click", () => {
    const data = {
      presetId: state.presetId,
      studentProfile: state.studentProfile,
      categories: state.categories,
      courses: state.courses,
      mappings: state.mappings,
      exportedAt: new Date().toISOString()
    };
    downloadFile(JSON.stringify(data, null, 2), "tact-credit-checker-backup.json", "application/json");
  });

  document.getElementById("export-csv-btn").addEventListener("click", () => {
    let csv = "大区分,科目区分,講義名,開講期,単位数,状況\n";
    state.courses.forEach(c => {
      const cat = state.categories.find(k => k.id === c.categoryId);
      const secName = cat ? cat.section : "未分類";
      const catName = cat ? cat.name : "未分類";
      const statusLabel = c.status === "passed" ? "修得済" : c.status === "enrolled" ? "履修中" : c.status === "failed" ? "不可" : "免除";
      csv += `"${secName}","${catName}","${c.title}","${c.term || ''}",${c.credits},"${statusLabel}"\n`;
    });
    downloadFile("\uFEFF" + csv, "名大履修科目一覧.csv", "text/csv;charset=utf-8;");
  });

  document.getElementById("import-json-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.courses && imported.categories) {
          state.courses = imported.courses;
          state.categories = imported.categories;
          if (imported.presetId) state.presetId = imported.presetId;
          if (imported.studentProfile) state.studentProfile = imported.studentProfile;
          if (imported.mappings) state.mappings = imported.mappings;
          await saveCourses(state.courses);
          await saveCategories(state.categories);
          if (state.studentProfile) await saveStudentProfile(state.studentProfile);
          backupModal.style.display = "none";
          render();
          alert("データを復元しました！");
        } else {
          alert("無効なJSONファイルです。");
        }
      } catch (err) {
        alert("インポート失敗: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("reset-data-btn").addEventListener("click", async () => {
    if (confirm("本当に保存データを全消去しますか？\n（復元できなくなります）")) {
      await resetAllData();
      location.reload();
    }
  });
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}
