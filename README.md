# TaskFlow AI

AIを活用した対話型タスク管理・ガントチャート自動生成アプリケーション

## 🚀 クイックスタート

### 1. 初回セットアップ
```bash
# setup-taskflow.command をダブルクリック
# または
./setup-taskflow.command
```

### 2. APIキーの設定
`.env.local` ファイルを編集して、実際のAPIキーを設定：

```env
GEMINI_API_KEY=あなたのGemini APIキー
GOOGLE_CALENDAR_API_KEY=あなたのGoogle Calendar APIキー（オプション）
```

#### APIキーの取得方法：
- **Gemini API**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Google Calendar API**: [Google Cloud Console](https://console.cloud.google.com/)

### 3. アプリケーションの起動

#### 開発モードで起動（推奨）
```bash
# start-taskflow.command をダブルクリック
# または
./start-taskflow.command
```

#### 本番モードで起動
```bash
# start-taskflow-production.command をダブルクリック
# または
./start-taskflow-production.command
```

## 📁 コマンドファイル一覧

| ファイル名 | 説明 | 用途 |
|-----------|------|------|
| `setup-taskflow.command` | 初期セットアップ | 初回のみ実行 |
| `start-taskflow.command` | 開発版の起動 | 日常的な使用（推奨） |
| `start-taskflow-production.command` | 本番版の起動 | 最適化されたビルド |

## 🎯 主な機能

- **AI対話機能**: ChatGPT-5,による自然な対話
- **タスク自動生成**: 漠然としたアイデアを具体的なタスクに分解
- **ガントチャート**: D3.js による視覚的なプロジェクト管理
- **データ永続化**: SQLite によるローカルデータ保存
- **カレンダー連携**: Google Calendar との同期（開発中）

## 🛠 技術スタック

- **フロントエンド**: Electron + React + TypeScript
- **AI**: Google Gemini 2.5 Pro/Flash API
- **状態管理**: Redux Toolkit
- **データベース**: SQLite (better-sqlite3)
- **ビジュアライゼーション**: D3.js
- **スタイリング**: Tailwind CSS

## 📝 使い方

1. **AIとの対話を開始**
   - 左側のチャットパネルでアイデアを入力
   - AIが5-10回の対話を通じて詳細を引き出します

2. **タスクの生成**
   - 対話完了後、「タスク生成」ボタンをクリック
   - AIが自動的にタスクを分解・構造化

3. **ガントチャートで管理**
   - 生成されたタスクがガントチャートに表示
   - ドラッグ&ドロップで日程調整可能

4. **進捗の更新**
   - タスクリストから進捗率を更新
   - リアルタイムでガントチャートに反映

## 🔧 トラブルシューティング

### アプリケーションが起動しない
- Node.js がインストールされているか確認
- `setup-taskflow.command` を実行して依存関係を再インストール

### APIエラーが発生する
- `.env.local` ファイルのAPIキーが正しいか確認
- APIキーの利用制限に達していないか確認

### ビルドエラー
```bash
npm run build:main
npm run build:renderer
```

## 📄 ライセンス

MIT License

## 👤 作者

Yoshii Katsuhiko

---

問題が発生した場合は、以下のコマンドで詳細なログを確認できます：
```bash
npm run dev
```