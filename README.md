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

### 8. スイス・スタイル コマンドパレット (Ctrl+K / :)
- <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> または通常時に <kbd>:</kbd>（コロン）1打で即座に起動するキーボードコマンドパレット。
- 再生速度変更、境界挿入・削除、Undo/Redo、表示周波数切替、音響分析、TSV/CSVエクスポートなど 30 種類以上の全操作を日本語・英語のあいまい検索でキーボードから手を離さず即時実行可能。

### 9. 全区間音響データ一括集計テーブル & CSVエクスポート (Acoustic Metrics Table)
- TextGrid 内の全区間（全インターバルTier対応）の音響パラメータを自動計算し、一覧表（データテーブル）として可視化・エクスポート。
- **計測項目**: `Tier`, `Label`, `Start(s)`, `End(s)`, `Duration(ms)`, `Mean F0`, `Min F0`, `Max F0`, `F1`, `F2`, `F3`, `Mean Intensity(dB)`, `COG(重心周波数 Hz)`。
- **リアルタイム検索 & 絞り込み**: ラベル名やTier名での部分一致検索、Tier別絞り込み、空白区間除外トグル。
- **1クリック CSV ダウンロード**: UTF-8 BOM付きCSVファイルとしてエクスポート（Excel、R、Pythonの分析パイプラインにそのまま利用可能）。
- **TSV クリップボード一括コピー**: スプレッドシートやGoogle Docsへの貼り付けに対応。
- **区間ジャンプ & 試聴**: テーブル行をクリックするとタイムライン上の該当区間にジャンプ、右端の `Play` ボタンでその区間のみを即時再生。

### 10. IPA（国際音声字母）クイック入力パレットバー (IPA Quick Ribbon)
- 音声学研究・ラベリング時に特殊文字の入力が困難だった課題を解消する入力支援バー。
- **クイックリボン**: タイムライン直上に配置。高頻度な音声記号（`ɯ`, `ə`, `ː`, `̥`, `ɕ`, `ʑ`, `ç`, `ɸ`, `ɾ`, `ɴ`, `ŋ`, `ʔ`, `t͡ɕ` 等）を**1クリックで選択区間のラベルに直接挿入**。
- **全記号ドロワー**: 「全記号」ボタンで日本語高頻度・母音・子音・ダイアクリティカルマーク（長音・無声音化・鼻音化など）を網羅した詳細グリッドを展開。

### 11. パワースペクトル断面表示 (FFT / LPC Spectral Slice)
- 任意時間または選択区間における **FFT パワースペクトル** と **LPC スペクトル包絡線**（声道共鳴ピーク・フォルマント位置）を重ね合わせて高精度表示。
- 重心周波数 (COG) などのスペクトルモーメントもリアルタイム算出。

### 12. Praat 音響分析パラメータ設定 (Analysis Settings)
- 広帯域（Wideband 5ms: フォルマント用）/ 狭帯域（Narrowband 30ms: 倍音用）スペクトログラム切替。
- ピッチ探索下限・上限 (Hz)、動的レンジ (dB) のリアルタイム調整に対応。

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

## 📜 ライセンス & 使用ライブラリ (License & Attributions)

本プロジェクトはオープンサイエンスおよび音声学・言語学研究への貢献のため、以下のライセンスで公開されています。

### 1. プロジェクト本体のライセンス
- **リポジトリ全体 & バックエンド (`apps/annotator/backend`)**:
  - **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**
  - バックエンドは Praat 本体のアルゴリズムおよび `praat-parselmouth` (GPLv3) を統合しているため、GPL-3.0 にて頒布されます。
- **フロントエンド (`apps/annotator/frontend`)**:
  - **[MIT License](apps/annotator/frontend/package.json)**
  - ブラウザ内で動作する独自の音響解析アルゴリズム（Burg LPC, 自己相関ピッチ抽出, STFT, 音響VAD）および UI コンポーネント群は、純粋な TypeScript クリーンルーム実装であり、MIT ライセンスの下で自由に再利用可能です。
- **独立 Web ツール群 (`ipa-keyboard`, `phonological-rule-editor`, `syntax-tree-editor`)**:
  - **MIT License**

### 2. 主要依存ライブラリのライセンス確認状況

本スイートで使用しているすべての主要外部ライブラリは、ライセンスの互換性・適法性が確認されています。

| レイヤー | ライブラリ名 | バージョン | ライセンス種別 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `next` | 14.x | MIT | React フレームワーク (App Router) |
| **Frontend** | `react` / `react-dom` | 18.x | MIT | UI 宣言的レンダリング |
| **Frontend** | `lucide-react` | 0.395.x | ISC (MIT同等) | スイス・スタイル UI アイコンセット |
| **Frontend** | `tailwindcss` | 3.4.x | MIT | 幾何学ユーティリティ CSS スタイリング |
| **Frontend** | `clsx` / `tailwind-merge` | 2.x | MIT | クラス名マージ・条件分岐 |
| **Backend** | `fastapi` | 0.110.x | MIT | 高速 ASGI Web API フレームワーク |
| **Backend** | `uvicorn` | 0.28.x | BSD-3-Clause | ASGI サーバー |
| **Backend** | `pydantic` | 2.6.x | MIT | データ構造バリデーション |
| **Backend** | `praatio` | 6.x | MIT | Praat TextGrid 入出力・操作 |
| **Backend** | `praat-parselmouth` | 0.4.x | GPL-3.0 | Praat C++ コア音響分析 Python バインディング |
| **Backend** | `numpy` | 1.26.x | BSD-3-Clause | 音声数値多次元配列演算 |
| **Backend** | `scipy` | 1.12.x | BSD-3-Clause | 信号処理・フィルタ・自己相関 |
| **Backend** | `soundfile` | 0.12.x | BSD-3-Clause | WAV 読み書き (libsndfile ラッパー) |
| **Backend** | `faster-whisper` | 1.0.x | MIT | 高速音声認識・トランスクリプション |

---

## 📚 謝辞 (Attributions)

- **Praat: doing phonetics by computer** — Paul Boersma & David Weenink (University of Amsterdam)
- **International Phonetic Association (IPA)** — Handbook of the International Phonetic Association
- **Ekimeihyo Atsume.** — IPA Input Tool Concept & Layout Reference (https://ekimeihyo.net/o/ipa.html)