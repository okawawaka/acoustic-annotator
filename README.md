# 音響分析ソフトウェア・スイート (Acoustic Analysis Suite)

大学院・音声学研究のための音響分析アプリケーションプロジェクト群です。
それぞれのアプリケーションは独立したディレクトリ（`apps/<アプリ名>/` または各Webツール）に配置され、相互に依存せず個別に開発・実行できます。

---

## 🌐 オンライン公開版 (Web Standalone)

- **Acoustic Annotator (Web版)**: [https://okawawaka.github.io/acoustic-annotator/](https://okawawaka.github.io/acoustic-annotator/)
  - 完全クライアントサイド動作（サーバー通信不要）。ブラウザ内DSPエンジン（Burg LPC多項式根探索, 自己相関F0, STFT, 音響VAD）により即時動作します。

---

## 📁 ディレクトリ構成

```text
音響分析ソフト/
├── phonological-rule-editor/  # 【Webツール】言語学 音韻規則・音変化エディタ（KaTeX / PNG / SVG）
├── syntax-tree-editor/        # 【Webツール】言語学 構文木エディタ（スイス・スタイル）
├── ipa-keyboard/              # 【Webツール】IPA 国際音声記号キーボード
├── apps/
│   ├── annotator/             # 【アプリ1】Praat TextGrid 音声アノテーションソフト
│   │   ├── frontend/          # Next.js 純白・ミニマルUI
│   │   └── backend/           # FastAPI + Whisper / Parselmouth エンジン
│   └── ...
├── LICENSE                    # GNU General Public License v3.0
└── README.md
```

---

## 🚀 ローカル起動方法

### 1. Acoustic Annotator (`apps/annotator`)

#### バックエンド (FastAPI)
```bash
cd apps/annotator/backend
uv run uvicorn app.main:app --port 8000
```

#### フロントエンド (Next.js)
```bash
cd apps/annotator/frontend
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## ➕ 新しい音響分析アプリを追加する場合
`apps/` 配下に新しいフォルダ（例: `apps/formant-analyzer/` など）を作成し、そこに独立したフロントエンド・バックエンドを配置してください。既存のアノテーターアプリのコードや動作に一切影響を与えずに新アプリを開発できます。

---

## 📜 ライセンス (License)

本リポジトリは、オープンサイエンスおよび音声学・言語学研究コミュニティへの貢献のため、以下の通り公開されています。

- **リポジトリ全体 & バックエンド (`apps/annotator/backend`)**:
  - **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**
  - 音声学解析ライブラリ `praat-parselmouth` をインポート・結合しているため、GPLv3 が適用されます。
- **フロントエンド (`apps/annotator/frontend`)**:
  - **[MIT License](apps/annotator/frontend/package.json)**
  - ブラウザ内で動作する独自の音響解析アルゴリズム（Burg LPC 多項式根探索, 自己相関ピッチ, STFT, 音響VAD）および UI コンポーネントは、Praat C/C++ コードに依存しない純粋な TypeScript クリーンルーム実装であり、独立して MIT ライセンスの下で自由に再利用可能です。
- **独立Webツール群 (`ipa-keyboard`, `phonological-rule-editor`, `syntax-tree-editor`)**:
  - **MIT License**

---

## 📚 謝辞・サードパーティ著作権表示 (Third-Party Notices & Attributions)

本ソフトウェアの開発にあたり、以下の優れた学術ソフトウェアおよびオープンソースライブラリを利用・参照しています。各作者に深く感謝いたします。

- **Praat: doing phonetics by computer**
  - Authors: Paul Boersma & David Weenink (University of Amsterdam)
  - License: GNU General Public License (GPL-2.0 or later)
  - Web: [https://www.fon.hum.uva.nl/praat/](https://www.fon.hum.uva.nl/praat/)
- **Parselmouth: Praat in Python, the Pythonic way**
  - Author: Yannick Jadoul et al.
  - License: GNU General Public License v3.0 or later (GPL-3.0-or-later)
  - Web: [https://github.com/YannickJadoul/Parselmouth](https://github.com/YannickJadoul/Parselmouth)
- **Faster-Whisper / CTranslate2**
  - Authors: Guillaume Klein, Systran, OpenAI
  - License: MIT License
  - Web: [https://github.com/SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- **praatio**
  - Author: Tim Mahrt
  - License: MIT License
  - Web: [https://github.com/timmahrt/praatio](https://github.com/timmahrt/praatio)