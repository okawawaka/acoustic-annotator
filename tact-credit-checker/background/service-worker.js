/**
 * TACT Credit Checker - Service Worker (Background Script)
 * Manifest V3 に準拠したバックグラウンド処理
 */

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("TACT Credit Checker installed.");
  }
});

// メッセージハンドラー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_DASHBOARD") {
    const url = chrome.runtime.getURL("dashboard/dashboard.html");
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "FETCH_TACT_SITES") {
    const baseUrl = message.baseUrl || "https://tact.ac.thers.ac.jp";
    fetch(`${baseUrl}/direct/site.json`, {
      credentials: "include",
      headers: { "Accept": "application/json" }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 非同期レスポンス
  }

  if (message.action === "CHECK_TACT_SESSION") {
    const baseUrl = message.baseUrl || "https://tact.ac.thers.ac.jp";
    fetch(`${baseUrl}/direct/session/current.json`, {
      credentials: "include",
      headers: { "Accept": "application/json" }
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
