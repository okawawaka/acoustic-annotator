# Acoustic Annotator 🎙️✨
> **Praatの手作業アノテーションをAIとWeb技術で快適に。**  
> PC / iPad / タブレット両用・CPU高速文字起こし対応の次世代音響分析・TextGridアノテーションツール。

[![CI](https://github.com/okawawaka/acoustic-annotator/actions/workflows/ci.yml/badge.svg)](https://github.com/okawawaka/acoustic-annotator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](backend)
[![Next.js: 14](https://img.shields.io/badge/frontend-Next.js%2014-black.svg)](frontend)

---

## 🌟 主な特徴

| 機能 | 特徴 |
|---|---|
| 🎈 **誰でも直感的に操作** | 初学者でも迷わないモダンなUI。スペースキー（再生/停止）、Tab（区間再生）、Enter（現在位置に境界挿入）などPraat互換のショートカットを完備。 |
| 📱 **iPad・タブレット対応** | ローカルPCで起動すれば、同一Wi-Fi内のiPadやタブレットからアクセス可能。Safariの「ホーム画面に追加」で**フルスクリーンPWAアプリ**として動作。Apple Pencilでの操作にも最適化。 |
| ⚡ **CPU高速最適化 (GPU不要)** | CTranslate2ベースの **Faster-Whisper (INT8量子化)** を採用。高価なGPUがない一般的なノートPC（CPU）でも省メモリ＆高速に文字起こし可能。 |
| 🌐 **多言語対応** | 日本語・英語をはじめとする **99言語** の自動認識・タイムスタンプ取得に対応。 |
| 📑 **柔軟なTextGrid管理** | 区間ティア（IntervalTier）と点ティア（PointTier）を自由に追加・編集。Praat公式の `.TextGrid`（Short/Long形式）と完全な双方向互換。 |
| 🚀 **超大量・長時間音声もサクサク** | 音声の全体波形ピークデータを事前生成し、可視範囲のみをCanvas描画（LODレンダリング）。長時間の音声でもUIが重くなりません。 |

---

## 🚀 クイックスタート

### 1. 前提条件
- [Node.js](https://nodejs.org/) (v18+)
- [uv](https://docs.astral.sh/uv/) または Python (3.10+)

### 2. インストール
リポジトリをクローンして依存関係をセットアップします：

```bash
git clone https://github.com/okawawaka/acoustic-annotator.git
cd acoustic-annotator

# バックエンドのセットアップ (uvの場合)
cd backend && uv sync && cd ..

# フロントエンドのセットアップ
cd frontend && npm install && cd ..
```

### 3. ワンクリック起動

#### Windowsの場合
プロジェクトルートにある **`start.bat`** をダブルクリックするか、ターミナルで実行します：
```cmd
start.bat
```

#### macOS / Linuxの場合
```bash
chmod +x start.sh
./start.sh
```

起動すると、コンソールに以下のようにURLが表示され、PCのブラウザが自動で開きます：
```text
========================================================
  Acoustic Annotator (Praat互換 Webエディション)
========================================================
[起動情報]
  PCブラウザ用URL:    http://localhost:3000
  iPad / スマホ用URL: http://192.168.1.15:3000
========================================================
```

---

## 📱 iPad / タブレットからの接続方法

1. PCとiPadを**同じWi-Fiネットワーク**に接続します。
2. 起動時にコンソールに表示されたiPad用URL（例: `http://192.168.1.15:3000`）をiPadのSafariで開きます。
3. 画面下部（または上部）の共有ボタン（四角から矢印が出ているアイコン）をタップし、**「ホーム画面に追加」**を選択します。
4. ホーム画面に作成されたアプリアイコンをタップすると、URLバーのない全画面モードで快適にアノテーションできます。

---

## ⌨️ ショートカットキー一覧

| キー | 動作 |
|---|---|
| `Space` | 音声の再生 / 一時停止 |
| `Tab` | 選択中の区間を再生 |
| `Enter` | 現在の再生ヘッド位置に新しい境界を挿入 |
| `ダブルクリック` | 区間・ポイントのラベル（文字）をインライン編集 |
| `ドラッグ` | 波形上で区間選択 / 境界線の位置調整 |

---

## 🛠️ GitHub バージョン管理・開発運用

本プロジェクトは **GitHub Flow** に基づいて開発されています。

- **`main` ブランチ**: 常にテストがパスし動作可能な安定版ブランチ。
- **CI/CD (`.github/workflows/ci.yml`)**:
  - PushおよびPull Request時に以下が自動実行されます：
    - Pythonバックエンド: `pytest` 単体テスト
    - フロントエンド: TypeScript型チェック & Next.jsプロダクションビルド
- **Issue & PR テンプレート**:
  - 不具合報告や機能要望は `.github/ISSUE_TEMPLATE` をご活用ください。

---

## 📄 ライセンス

本ソフトウェアは [MIT License](LICENSE) のもとで公開されています。研究・教育・商用利用を問わず自由にご利用いただけます。