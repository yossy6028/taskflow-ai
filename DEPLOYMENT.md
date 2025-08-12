# TaskFlow AI デプロイメントガイド

## Vercel環境変数の設定

### 必須の環境変数

TaskFlow AIをVercelにデプロイする際は、以下の環境変数を設定する必要があります：

#### 1. Gemini API Key (必須)
```
VITE_GEMINI_API_KEY=AIzaSyA-4jEpv2dACzU-zvd68yQeCMTEvNKzygY
```
- AI対話機能とタスク生成に必要
- [Google AI Studio](https://makersuite.google.com/app/apikey)から取得

#### 2. Firebase設定 (必須)
```
VITE_FIREBASE_API_KEY=AIzaSyDJxpnAO-mf-Y-AVHu3BEOfFQNVlrEXq1g
VITE_FIREBASE_AUTH_DOMAIN=taskflow-ai-dc492.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://taskflow-ai-dc492-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=taskflow-ai-dc492
VITE_FIREBASE_STORAGE_BUCKET=taskflow-ai-dc492.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=829585643084
VITE_FIREBASE_APP_ID=1:829585643084:web:e50f81208640b3518006e9
```
- デバイス間のデータ同期に必要
- [Firebase Console](https://console.firebase.google.com/)から取得

### Vercelでの設定手順

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 左メニューから「Environment Variables」を選択
5. 各環境変数を追加：
   - Key: 環境変数名（例：`VITE_GEMINI_API_KEY`）
   - Value: 実際のAPIキー
   - Environment: Production, Preview, Development すべてにチェック
6. 「Save」をクリック

### 設定後の確認

1. Vercelで新しいデプロイをトリガー（GitHubにプッシュするか、手動でRedeploy）
2. デプロイが完了したら、アプリケーションにアクセス
3. AI対話機能でタスク生成を試して動作確認

### トラブルシューティング

#### エラー: "Gemini API key not configured"
- Vercelの環境変数に`VITE_GEMINI_API_KEY`が設定されているか確認
- 環境変数名が正確に`VITE_GEMINI_API_KEY`になっているか確認（大文字小文字も重要）
- 設定後、再デプロイが完了しているか確認

#### エラー: "Firebase not configured"
- すべてのFirebase環境変数が正しく設定されているか確認
- Firebase Realtime Databaseのリージョンが`asia-southeast1`になっているか確認

### ローカル開発環境

ローカルで開発する場合は、`.env.local`ファイルを作成して同じ環境変数を設定してください：

```bash
# .env.localの作成
cp .env.example .env.local
# エディタで.env.localを開いて、APIキーを設定
```

### セキュリティ注意事項

- APIキーを直接GitHubにコミットしないでください
- `.env.local`ファイルは`.gitignore`に含まれています
- 本番環境では必ずVercelの環境変数機能を使用してください