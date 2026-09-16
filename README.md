# 音響分析ソフトウェア・スイート (Acoustic Analysis Suite)

大学院・音声学研究のための音響分析アプリケーションプロジェクト群です。
それぞれのアプリケーションは独立したディレクトリ（pps/<アプリ名>/）に配置され、相互に依存せず個別に開発・実行できます。

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
│   │   └── backend/           # FastAPI + Whisper / Web Audio エンジン
│   └── ...
└── README.md
```

---

## 🚀 アプリケーションの起動方法

### 1. Acoustic Annotator (pps/annotator)

#### バックエンド (FastAPI)
`ash
cd apps/annotator/backend
uv run uvicorn app.main:app --port 8000
`

#### フロントエンド (Next.js)
`ash
cd apps/annotator/frontend
npm run dev
`
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## ➕ 新しい音響分析アプリを追加する場合
pps/ 配下に新しいフォルダ（例: pps/formant-analyzer/ など）を作成し、そこに独立したフロントエンド・バックエンドを配置してください。既存のアノテーターアプリのコードや動作に一切影響を与えずに新アプリを開発できます。