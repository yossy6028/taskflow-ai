# Firebase セットアップガイド

## PCとスマホでデータを共有するための設定

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例：taskflow-ai）
4. Google アナリティクスは任意（オフでもOK）

### 2. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「メール/パスワード」を有効化
4. 保存

### 3. Realtime Database の設定

1. 左メニューから「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. 場所を選択（asia-southeast1 推奨）
4. セキュリティルール：最初は「テストモード」を選択
5. 後で以下のルールに変更：

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 4. Firebase設定の取得

1. プロジェクト設定（歯車アイコン）をクリック
2. 「全般」タブの下部「マイアプリ」セクション
3. 「</> (ウェブアプリ)」をクリック
4. アプリ名を入力（例：TaskFlow Web）
5. 「Firebase Hosting」はチェック不要
6. 「アプリを登録」をクリック
7. 表示される設定をコピー

### 5. 環境変数の設定

`.env.local` ファイルを作成し、以下の内容を追加：

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=あなたのAPIキー
VITE_FIREBASE_AUTH_DOMAIN=あなたのプロジェクト.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://あなたのプロジェクト.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=あなたのプロジェクトID
VITE_FIREBASE_STORAGE_BUCKET=あなたのプロジェクト.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=送信者ID
VITE_FIREBASE_APP_ID=アプリID

# 既存の設定（変更不要）
GEMINI_API_KEY=既存の値
```

### 6. 使い方

1. **初回利用時**：
   - メールアドレスとパスワードでアカウント作成
   - 同じアカウントでPCとスマホからログイン

2. **データ同期**：
   - タスクやプロジェクトは自動的に同期
   - インターネット接続が必要

3. **セキュリティ**：
   - パスワードは6文字以上
   - メールアドレスは実在のものでなくてもOK（例：test@example.com）

### 7. 料金について

- **無料枠**：
  - 認証：月間10,000回のログイン
  - Realtime Database：1GBストレージ、10GB/月の転送量
  - 個人利用なら十分な容量

### 8. トラブルシューティング

**Q: ログインできない**
- A: Firebase Consoleで Authentication が有効になっているか確認

**Q: データが同期されない**
- A: Realtime Database のURLが正しいか確認（.firebasedatabase.app で終わる）

**Q: エラー「Permission Denied」**
- A: セキュリティルールを確認（テストモードか、上記のルールを適用）

### デモアカウント

テスト用アカウント：
- Email: demo@taskflow.ai
- Password: demo123

※本番環境では必ず自分のアカウントを作成してください