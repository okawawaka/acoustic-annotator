# 音響分析ソフトウェア・スイート (Acoustic Analysis Suite)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?logo=github)](https://okawawaka.github.io/acoustic-annotator/)

大学院・音声学（Phonetics）・言語学研究のための、ブラウザ上で動作する高性能音響分析 & Praat TextGrid アノテーション・アプリケーション群です。

---

## 🌐 オンライン公開版 (Web Standalone)

👉 **[https://okawawaka.github.io/acoustic-annotator/](https://okawawaka.github.io/acoustic-annotator/)**

- **サーバー不要・完全クライアントサイド動作**:
  音声ファイルを外部サーバーにアップロードすることなく、ブラウザ内の高精度 DSP エンジン（Burg LPC 多項式根探索, 自己相関ピッチ検出, STFT スペクトログラム, 音響VAD）によって瞬時に音響分析が行われます。

---

## ✨ 主な機能と特徴

### 1. 国際タイポグラフィ・スイススタイル (Swiss Typographic Style)
- ヨゼフ・ミューラー＝ブロックマン等の設計思想に基づく、**角丸ゼロ (`rounded-none`)**・**装飾的シャドウの排除 (`shadow-none`)**・**Stark Black (`#111111`) & Swiss Red (`#E30613`)** の厳格な幾何学グリッドデザインを採用。

### 2. 音響音声学・Praat 互換の精密分析
- **基本周波数 (F0) ピッチ抽出**: 自己相関法（Autocorrelation）による正確なピッチ軌跡描画
- **LPC フォルマント軌跡 (F1〜F3)**: Burg 法および多項式根探索による声道共鳴周波数の自動推定
- **縦軸周波数レンジ切替**: 0-500Hz（F0観察）、0-3000Hz（母音帯）、0-5000Hz（標準）、0-8000Hz（子音帯）
- **話者別LPC声道長補正**: 女性 (5500Hz) / 男性 (5000Hz) / 子供 (6000Hz) の上限切替

### 3. ブラウザ内マイク高音質PCM録音
- 音響分析に最適化された歪みのないマイクキャプチャ（AGC・ノイズ抑制等の自動補正バイパス）。
- 60fps Canvas リアルタイム VU メーター（クリッピング警告バー付き）。
- Praat と完全な互換性を持つ **16-bit リニア PCM WAV**（44-byte RIFFヘッダー付き）への自動オンザフライ変換。

### 4. 統合ファイルオープン & ドラッグ＆ドロップ
- 1つの「ファイルを開く」ボタンまたはドラッグ＆ドロップで、**音声ファイルと TextGrid ファイルを同時に一括読み込み**可能。
- 各種文字コード（UTF-8, UTF-16LE, UTF-16BE, Shift-JIS）の自動判別に対応。

### 5. 音響VAD（無音自動区間分割）& 台本自動配置
- 音声波形エネルギーから「声が出ている区間」と「ポーズ（無音）」を一瞬で自動判別し、TextGrid 区間を自動生成。
- 既存のテキスト（台本・発話内容）から、一文字・単語・文単位で発話タイミングに自動マッピング。

### 6. F1-F2 音響母音空間プロット (Vowel Space Chart)
- TextGrid 内の母音区間（日本語母音・英語母音・IPA）の定常部（20-80%）から中央値を自動抽出し、音響母音四辺形を描画。CSV エクスポートにも対応。

### 7. Praat ライクな高速キーボード操作 & Undo/Redo
- <kbd>Space</kbd>: 再生 / 一時停止
- <kbd>Tab</kbd>: 選択区間の再生
- <kbd>Shift</kbd> + <kbd>Tab</kbd>: 前の区間に移動
- <kbd>Enter</kbd>: 現在位置に境界を挿入
- <kbd>Alt</kbd> + <kbd>→</kbd> / <kbd>←</kbd>: 次 / 前の区間にフォーカス移動
- <kbd>Alt</kbd> + <kbd>Delete</kbd>: 境界を削除して直前区間と結合
- <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd>: 無制限の Undo / Redo 操作

---

## 📁 リポジトリ構成 (Suite Ecosystem)

```text
音響分析ソフト/
├── apps/
│   └── annotator/             # 【メイン】Praat TextGrid 音声アノテーションソフト
│       ├── frontend/          # Next.js (TypeScript + Tailwind CSS, スイススタイル)
│       └── backend/           # FastAPI (Python 3.12 + Parselmouth, ローカル開発用)
├── ipa-keyboard/              # 【Webツール】IPA 国際音声記号キーボード
├── phonological-rule-editor/  # 【Webツール】音韻規則・音変化エディタ（KaTeX / SVG）
├── syntax-tree-editor/        # 【Webツール】統語論・言語学 構文木エディタ
├── LICENSE                    # GNU General Public License v3.0
└── README.md                  # 本ドキュメント
```

---

## 🚀 ローカル起動方法

### フロントエンド (Next.js Standalone)
```bash
cd apps/annotator/frontend
npm install
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### Windows ワンクリック起動
ルート直下の `start.bat` を実行すると、自動的に環境が立ち上がりブラウザが開きます。

---

## 📜 ライセンス (License)

本プロジェクトはオープンサイエンスおよび音声学・言語学研究への貢献のため、以下のライセンスで公開されています。

- **リポジトリ全体 & バックエンド (`apps/annotator/backend`)**:
  - **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**
- **フロントエンド (`apps/annotator/frontend`)**:
  - **[MIT License](apps/annotator/frontend/package.json)**
  - ブラウザ内で動作する独自の音響解析アルゴリズム（Burg LPC, ピッチ抽出, STFT, 音響VAD）および UI コンポーネント群は、純粋な TypeScript クリーンルーム実装であり、MIT ライセンスの下で自由に再利用可能です。
- **独立 Web ツール群 (`ipa-keyboard`, `phonological-rule-editor`, `syntax-tree-editor`)**:
  - **MIT License**

---

## 📚 謝辞 (Attributions)

- **Praat: doing phonetics by computer** — Paul Boersma & David Weenink (University of Amsterdam)
- **International Phonetic Association (IPA)** — Handbook of the International Phonetic Association