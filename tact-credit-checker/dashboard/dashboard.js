/**
 * TACT Credit Checker - Full Dashboard Controller
 */

import { DEFAULT_PRESETS } from "../core/presets.js";
import { parseCourseSite, calculateCredits } from "../core/parser.js";
import {
  loadAppState,
  saveCourses,
  saveCategories,
  switchPreset,
  saveMapping,
  updateLastSync
} from "../core/storage.js";
import {
  getMockCourseSites,
  checkTactSession,
  fetchUserCourseSites
} from "../core/api.js";

// アプリケーション状態
let state = {
  presetId: "",
  categories: [],
  courses: [],
  mappings: {},
  lastSync: null,
  user: null,
  currentView: "kanban", // "kanban" | "table"
  searchQuery: "",
  statusFilter: "all"
};

document.addEventListener("DOMContentLoaded", async () => {
  state = { ...state, ...(await loadAppState()) };
  initUI();
  render();
});

/**
 * UIイベント・要素の初期化
 */
function initUI() {
  // プリセットセレクタ
  const presetSelect = document.getElementById("preset-select");
  presetSelect.innerHTML = "";
  DEFAULT_PRESETS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.presetId) opt.selected = true;
    presetSelect.appendChild(opt);
  });

  presetSelect.addEventListener("change", async (e) => {
    const newPresetId = e.target.value;
    if (confirm("モデルを切り替えると区分設定がリセットされます。よろしいですか？")) {
      const newCategories = await switchPreset(newPresetId);
      if (newCategories) {
        state.presetId = newPresetId;
        state.categories = newCategories;
        // 科目のカテゴリ再判定
        state.courses.forEach(c => {
          if (!c.isManual && (!state.mappings[c.title])) {
            const matched = state.categories.find(cat =>
              cat.keywords && cat.keywords.some(kw => c.title.includes(kw))
            );
            if (matched) c.categoryId = matched.id;
          }
        });
        await saveCourses(state.courses);
        render();
      }
    } else {
      presetSelect.value = state.presetId;
    }
  });

  // ビュー切り替え
  const kanbanBtn = document.getElementById("view-kanban-btn");
  const tableBtn = document.getElementById("view-table-btn");
  const kanbanView = document.getElementById("kanban-view");
  const tableView = document.getElementById("table-view");

  kanbanBtn.addEventListener("click", () => {
    state.currentView = "kanban";
    kanbanBtn.classList.add("active");
    tableBtn.classList.remove("active");
    kanbanView.style.display = "block";
    tableView.style.display = "none";
    render();
  });

  tableBtn.addEventListener("click", () => {
    state.currentView = "table";
    tableBtn.classList.add("active");
    kanbanBtn.classList.remove("active");
    kanbanView.style.display = "none";
    tableView.style.display = "block";
    render();
  });

  // 検索・フィルタ
  const searchInput = document.getElementById("course-search-input");
  const filterSelect = document.getElementById("status-filter-select");

  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderContentOnly();
  });

  filterSelect.addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    renderContentOnly();
  });

  // TACTと同期
  const syncBtn = document.getElementById("sync-tact-btn");
  syncBtn.addEventListener("click", handleTactSync);

  // サンプルデータ読み込み
  const sampleBtn = document.getElementById("load-sample-btn");
  sampleBtn.addEventListener("click", handleLoadSample);

  // モーダルイベント
  setupModals();
}

/**
 * 画面全体の再描画
 */
function render() {
  renderKpi();
  renderContentOnly();
}

/**
 * KPI・ヘッダー情報の更新
 */
function renderKpi() {
  const summary = calculateCredits(state.courses, state.categories);
  const totalReq = summary.totalRequired || 124;

  const passedCreditsEl = document.getElementById("kpi-passed-credits");
  const enrolledCreditsEl = document.getElementById("kpi-enrolled-credits");
  const requiredCreditsEl = document.getElementById("kpi-required-credits");
  const passedBar = document.getElementById("kpi-passed-bar");
  const enrolledBar = document.getElementById("kpi-enrolled-bar");
  const progressText = document.getElementById("kpi-progress-text");
  const remainingText = document.getElementById("kpi-remaining-text");
  const statusBadge = document.getElementById("overall-status-badge");

  passedCreditsEl.textContent = summary.totalPassed;
  enrolledCreditsEl.textContent = summary.totalEnrolled;
  requiredCreditsEl.textContent = totalReq;

  const passedPct = Math.min(100, Math.round((summary.totalPassed / totalReq) * 100));
  const enrolledPct = Math.min(100 - passedPct, Math.round((summary.totalEnrolled / totalReq) * 100));

  passedBar.style.width = `${passedPct}%`;
  enrolledBar.style.width = `${enrolledPct}%`;

  progressText.textContent = `達成率: ${passedPct}% (修得済 ${summary.totalPassed} 単位 / 見込計 ${summary.totalPotential} 単位)`;
  const remaining = Math.max(0, totalReq - summary.totalPassed);
  remainingText.textContent = remaining === 0 ? "🎉 総必要単位を達成!" : `あと ${remaining} 単位必要`;

  if (summary.isAllFulfilled) {
    statusBadge.textContent = "✓ 卒業要件充足";
    statusBadge.className = "badge badge-success";
  } else {
    statusBadge.textContent = "要件未充足";
    statusBadge.className = "badge badge-warning";
  }

  // 区分ミニバー
  const miniBarsContainer = document.getElementById("mini-category-bars");
  miniBarsContainer.innerHTML = "";
  let fulfilledCount = 0;
  const categoriesList = Object.values(summary.categoryProgress);

  categoriesList.forEach(cat => {
    if (cat.isFulfilled) fulfilledCount++;
    const catPct = cat.required > 0 ? Math.min(100, Math.round((cat.passed / cat.required) * 100)) : 100;
    const row = document.createElement("div");
    row.className = "mini-bar-row";
    row.innerHTML = `
      <span class="mini-bar-label" title="${cat.name}">${cat.name}</span>
      <div class="mini-bar-track">
        <div class="mini-bar-fill" style="width: ${catPct}%; background-color: ${cat.color};"></div>
      </div>
      <span class="mini-bar-stat">${cat.passed}/${cat.required}</span>
    `;
    miniBarsContainer.appendChild(row);
  });

  document.getElementById("fulfilled-category-count").textContent = `${fulfilledCount} / ${categoriesList.length} 区分達成`;

  // 同期状況
  document.getElementById("sync-total-courses").textContent = state.courses.length;
  if (state.lastSync) {
    const d = new Date(state.lastSync);
    document.getElementById("sync-last-time").textContent = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    document.getElementById("sync-tact-status").textContent = "同期済 (最新)";
  } else {
    document.getElementById("sync-last-time").textContent = "未同期";
    document.getElementById("sync-tact-status").textContent = "未連携";
  }
}

/**
 * かんばん / テーブル コンテンツの描画
 */
function renderContentOnly() {
  const summary = calculateCredits(state.courses, state.categories);

  // フィルタリング
  const filteredCourses = state.courses.filter(course => {
    const matchesSearch = !state.searchQuery || course.title.toLowerCase().includes(state.searchQuery);
    const matchesStatus = state.statusFilter === "all" || course.status === state.statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 未分類シェルフ
  const uncategorizedCourses = filteredCourses.filter(c => !c.categoryId || c.categoryId === "uncategorized");
  const shelf = document.getElementById("uncategorized-shelf");
  const shelfContainer = document.getElementById("uncategorized-cards-container");
  const shelfCount = document.getElementById("uncategorized-count");

  if (uncategorizedCourses.length > 0) {
    shelf.style.display = "flex";
    shelfCount.textContent = uncategorizedCourses.length;
    shelfContainer.innerHTML = "";
    uncategorizedCourses.forEach(c => {
      shelfContainer.appendChild(createCourseCard(c));
    });
  } else {
    shelf.style.display = "none";
  }

  // かんばんボード描画
  if (state.currentView === "kanban") {
    renderKanbanBoard(summary, filteredCourses);
  } else {
    renderTableView(filteredCourses);
  }
}

/**
 * かんばんボードの描画
 */
function renderKanbanBoard(summary, filteredCourses) {
  const board = document.getElementById("kanban-board");
  board.innerHTML = "";

  state.categories.forEach(cat => {
    const catData = summary.categoryProgress[cat.id] || { passed: 0, required: cat.requiredCredits || 0 };
    const column = document.createElement("div");
    column.className = "kanban-column";
    column.dataset.categoryId = cat.id;

    const catPct = catData.required > 0 ? Math.min(100, Math.round((catData.passed / catData.required) * 100)) : 100;

    column.innerHTML = `
      <div class="column-header">
        <div class="column-title-row">
          <div class="column-title-wrap">
            <span class="column-color-indicator" style="background-color: ${cat.color};"></span>
            <span class="column-name">${cat.name}</span>
          </div>
          <span class="column-stat-badge">
            ${catData.passed} / ${catData.required} 単位
          </span>
        </div>
        <div class="column-progress-bar">
          <div class="column-progress-fill" style="width: ${catPct}%; background-color: ${cat.color};"></div>
        </div>
      </div>
      <div class="column-cards" data-dropzone-cat="${cat.id}"></div>
    `;

    // ドラッグ＆ドロップ設定
    setupDropzone(column, cat.id);

    const cardsContainer = column.querySelector(".column-cards");
    const coursesInCat = filteredCourses.filter(c => c.categoryId === cat.id);

    coursesInCat.forEach(course => {
      cardsContainer.appendChild(createCourseCard(course));
    });

    board.appendChild(column);
  });
}

/**
 * テーブルビューの描画
 */
function renderTableView(filteredCourses) {
  const tbody = document.getElementById("course-table-body");
  tbody.innerHTML = "";

  if (filteredCourses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">該当する科目がありません</td></tr>`;
    return;
  }

  filteredCourses.forEach(course => {
    const tr = document.createElement("tr");

    const category = state.categories.find(c => c.id === course.categoryId);
    const catName = category ? category.name : "未分類";

    const statusPill = getStatusPill(course.status);

    tr.innerHTML = `
      <td><strong>${course.title}</strong></td>
      <td>${course.term || "-"}</td>
      <td>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${category ? category.color : '#cbd5e1'};"></span>
          ${catName}
        </span>
      </td>
      <td>
        <span class="credit-tag" data-action="cycle-credit" data-id="${course.id}">${course.credits} 単位</span>
      </td>
      <td>
        <span class="status-pill ${statusPill.className}" data-action="cycle-status" data-id="${course.id}">
          ${statusPill.label}
        </span>
      </td>
      <td>
        <button class="card-del-btn" data-action="delete-course" data-id="${course.id}" title="削除">🗑️</button>
      </td>
    `;

    // イベントバインド
    tr.querySelector('[data-action="cycle-credit"]').addEventListener("click", () => cycleCredit(course.id));
    tr.querySelector('[data-action="cycle-status"]').addEventListener("click", () => cycleStatus(course.id));
    tr.querySelector('[data-action="delete-course"]').addEventListener("click", () => deleteCourse(course.id));

    tbody.appendChild(tr);
  });
}

/**
 * 科目カード要素の生成
 */
function createCourseCard(course) {
  const card = document.createElement("div");
  card.className = "course-card";
  card.draggable = true;
  card.dataset.id = course.id;

  const statusPill = getStatusPill(course.status);

  card.innerHTML = `
    <div class="card-title-row">
      <span class="course-title" title="${course.rawTitle || course.title}">${course.title}</span>
      <button class="card-del-btn" title="科目を削除">✕</button>
    </div>
    <div class="course-meta-row">
      <span class="course-term">${course.term || "2024年度"}</span>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="credit-tag" title="クリックで単位数を変更">${course.credits}単位</span>
        <span class="status-pill ${statusPill.className}" title="クリックで状態を切り替え">${statusPill.label}</span>
      </div>
    </div>
  `;

  // ドラッグイベント
  card.addEventListener("dragstart", (e) => {
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", course.id);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  // 単位数切り替え (1 -> 2 -> 4 -> 6 -> 1)
  const creditTag = card.querySelector(".credit-tag");
  creditTag.addEventListener("click", (e) => {
    e.stopPropagation();
    cycleCredit(course.id);
  });

  // ステータス切り替え (passed -> enrolled -> failed -> exempt)
  const statusEl = card.querySelector(".status-pill");
  statusEl.addEventListener("click", (e) => {
    e.stopPropagation();
    cycleStatus(course.id);
  });

  // 削除
  const delBtn = card.querySelector(".card-del-btn");
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteCourse(course.id);
  });

  return card;
}

/**
 * ドロップゾーン（カラム）のイベント設定
 */
function setupDropzone(columnEl, categoryId) {
  columnEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    columnEl.classList.add("drag-over");
  });

  columnEl.addEventListener("dragleave", () => {
    columnEl.classList.remove("drag-over");
  });

  columnEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    columnEl.classList.remove("drag-over");
    const courseId = e.dataTransfer.getData("text/plain");
    const course = state.courses.find(c => c.id === courseId);
    if (course && course.categoryId !== categoryId) {
      course.categoryId = categoryId;
      // ユーザーの手動振分を学習マッピングに保存
      await saveMapping(course.title, categoryId);
      await saveCourses(state.courses);
      render();
    }
  });
}

function getStatusPill(status) {
  switch (status) {
    case "passed": return { label: "修得済", className: "status-passed" };
    case "enrolled": return { label: "履修中", className: "status-enrolled" };
    case "failed": return { label: "不可", className: "status-failed" };
    case "exempt": return { label: "免除", className: "status-exempt" };
    default: return { label: "履修中", className: "status-enrolled" };
  }
}

async function cycleCredit(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;
  const credits = Number(course.credits) || 2;
  const nextCredits = credits === 1 ? 2 : credits === 2 ? 4 : credits === 4 ? 6 : 1;
  course.credits = nextCredits;
  await saveCourses(state.courses);
  render();
}

async function cycleStatus(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;
  const order = ["enrolled", "passed", "failed", "exempt"];
  const currentIdx = order.indexOf(course.status);
  course.status = order[(currentIdx + 1) % order.length];
  await saveCourses(state.courses);
  render();
}

async function deleteCourse(courseId) {
  if (confirm("この科目を削除しますか？")) {
    state.courses = state.courses.filter(c => c.id !== courseId);
    await saveCourses(state.courses);
    render();
  }
}

/**
 * TACT同期処理
 */
async function handleTactSync() {
  const syncBtn = document.getElementById("sync-tact-btn");
  syncBtn.disabled = true;
  syncBtn.innerHTML = `<span>⏳</span> 同期中...`;

  try {
    const session = await checkTactSession();
    if (!session.isLoggedIn) {
      const openTab = confirm(
        "TACT（https://tact.ac.thers.ac.jp）へのログインが確認できませんでした。\n\n" +
        "【確認事項】\n" +
        "1. ブラウザで TACT にログインしたタブが開いているかご確認ください。\n" +
        "2. まだ開いていない場合、「OK」を押すと TACT のページを新しいタブで開きます。\n" +
        "（TACTでログイン後、再度このボタンを押してください）\n\n" +
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
      syncBtn.innerHTML = `<span class="btn-icon">🔄</span> TACTと同期`;
      return;
    }

    const sites = await fetchUserCourseSites(session.baseUrl, session.tabId);
    const existingMap = new Map(state.courses.map(c => [c.id, c]));

    const parsed = sites.map(site => {
      if (existingMap.has(site.id)) {
        return existingMap.get(site.id); // 既存編集を保護
      }
      return parseCourseSite(site, state.categories, state.mappings);
    });

    state.courses = parsed;
    state.lastSync = Date.now();
    state.user = session.user;

    await saveCourses(state.courses);
    await updateLastSync(session.user);

    render();
    alert(`TACTから ${sites.length} 件の講義情報を同期しました！`);
  } catch (err) {
    alert("同期エラー: " + err.message);
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `<span class="btn-icon">🔄</span> TACTと同期`;
  }
}

/**
 * サンプルデータ読み込み処理
 */
async function handleLoadSample() {
  const mockSites = getMockCourseSites();
  const parsed = mockSites.map(s => parseCourseSite(s, state.categories, state.mappings));
  state.courses = parsed;
  state.lastSync = Date.now();
  await saveCourses(state.courses);
  render();
  alert("名大の模擬履修データ（16科目）を読み込みました！");
}

/**
 * モーダル操作のセットアップ
 */
function setupModals() {
  // 閉じるボタン共通
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      document.getElementById(modalId).style.display = "none";
    });
  });

  // 科目追加モーダル
  const addCourseBtn = document.getElementById("add-course-btn");
  const addCourseModal = document.getElementById("add-course-modal");
  const addCategorySelect = document.getElementById("add-category");
  const addCourseForm = document.getElementById("add-course-form");

  addCourseBtn.addEventListener("click", () => {
    addCategorySelect.innerHTML = `<option value="uncategorized">未分類</option>`;
    state.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      addCategorySelect.appendChild(opt);
    });
    addCourseModal.style.display = "flex";
  });

  addCourseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("add-title").value.trim();
    const credits = parseInt(document.getElementById("add-credits").value, 10);
    const term = document.getElementById("add-term").value.trim();
    const categoryId = document.getElementById("add-category").value;
    const courseStatus = document.getElementById("add-status").value;

    const newCourse = {
      id: `manual-${Date.now()}`,
      title: title,
      rawTitle: title,
      credits: credits,
      term: term,
      year: 2025,
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

  // 要件ルールエディタ
  const editRulesBtn = document.getElementById("edit-rules-btn");
  const ruleEditorModal = document.getElementById("rule-editor-modal");
  const ruleList = document.getElementById("rule-category-list");
  const saveRulesBtn = document.getElementById("save-rules-btn");
  const addNewCategoryBtn = document.getElementById("add-new-category-btn");

  editRulesBtn.addEventListener("click", () => {
    renderRuleEditorList();
    ruleEditorModal.style.display = "flex";
  });

  function renderRuleEditorList() {
    ruleList.innerHTML = "";
    state.categories.forEach((cat, idx) => {
      const row = document.createElement("div");
      row.className = "rule-row";
      row.innerHTML = `
        <input type="color" class="rule-color-input" value="${cat.color || '#3b82f6'}" data-idx="${idx}" data-field="color">
        <input type="text" class="form-input" value="${cat.name}" data-idx="${idx}" data-field="name" placeholder="区分名">
        <div style="display: flex; align-items: center; gap: 4px;">
          <input type="number" class="form-input" value="${cat.requiredCredits}" min="0" max="150" data-idx="${idx}" data-field="credits">
          <span style="font-size: 11px;">単位</span>
        </div>
        <button class="card-del-btn" data-del-cat="${idx}">✕</button>
      `;
      row.querySelector("[data-del-cat]").addEventListener("click", () => {
        if (confirm(`区分「${cat.name}」を削除しますか？`)) {
          state.categories.splice(idx, 1);
          renderRuleEditorList();
        }
      });
      ruleList.appendChild(row);
    });
  }

  addNewCategoryBtn.addEventListener("click", () => {
    state.categories.push({
      id: `custom-cat-${Date.now()}`,
      name: "新規区分",
      requiredCredits: 4,
      color: "#6366f1",
      keywords: []
    });
    renderRuleEditorList();
  });

  saveRulesBtn.addEventListener("click", async () => {
    // 編集内容を反映
    const rows = ruleList.querySelectorAll(".rule-row");
    rows.forEach((row, idx) => {
      const color = row.querySelector('[data-field="color"]').value;
      const name = row.querySelector('[data-field="name"]').value.trim();
      const credits = parseInt(row.querySelector('[data-field="credits"]').value, 10) || 0;
      if (state.categories[idx]) {
        state.categories[idx].color = color;
        state.categories[idx].name = name;
        state.categories[idx].requiredCredits = credits;
      }
    });

    await saveCategories(state.categories);
    ruleEditorModal.style.display = "none";
    render();
  });

  // バックアップ・エクスポート・インポート
  const backupBtn = document.getElementById("export-import-btn");
  const backupModal = document.getElementById("backup-modal");
  const exportJsonBtn = document.getElementById("export-json-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const importFileInput = document.getElementById("import-file-input");

  backupBtn.addEventListener("click", () => {
    backupModal.style.display = "flex";
  });

  exportJsonBtn.addEventListener("click", () => {
    const data = {
      presetId: state.presetId,
      categories: state.categories,
      courses: state.courses,
      mappings: state.mappings,
      exportedAt: new Date().toISOString()
    };
    downloadFile(JSON.stringify(data, null, 2), "tact-credit-checker-backup.json", "application/json");
  });

  exportCsvBtn.addEventListener("click", () => {
    let csv = "科目名,開講期,区分,単位数,ステータス\n";
    state.courses.forEach(c => {
      const cat = state.categories.find(k => k.id === c.categoryId);
      const catName = cat ? cat.name : "未分類";
      const statusLabel = getStatusPill(c.status).label;
      csv += `"${c.title}","${c.term || ''}","${catName}",${c.credits},"${statusLabel}"\n`;
    });
    downloadFile("\uFEFF" + csv, "履修科目単位一覧.csv", "text/csv;charset=utf-8;");
  });

  importFileInput.addEventListener("change", (e) => {
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
          if (imported.mappings) state.mappings = imported.mappings;
          await saveCourses(state.courses);
          await saveCategories(state.categories);
          backupModal.style.display = "none";
          render();
          alert("データを復元しました！");
        } else {
          alert("無効なJSONフォーマットです。");
        }
      } catch (err) {
        alert("インポート失敗: " + err.message);
      }
    };
    reader.readAsText(file);
  });
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}
