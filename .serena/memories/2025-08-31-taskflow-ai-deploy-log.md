日時: 2025-08-31
タイトル: TaskFlow AI デプロイと承認フロー修正の経緯ログ

概要
- 課題1: タスク承認後に「処理中」のまま進まない
- 課題2: 承認後、タスクが保存されず一覧が空になる（Web/Firebase）
- 課題3: Vercel 本番が旧ビルド/別プロジェクトを配信しており、最新の修正が反映されない

対応の流れ（時系列）
1) 調査
   - AIDialogue.tsx の承認処理(acceptTasks)と storage(Firebase/SQLite) ルートを確認。
   - Firebase Realtime Database の URL に %20/空白混入（asia-so  utheast1）を検出。

2) 承認フロー実装修正
   - 承認作成タスクの初期ステータスを 'in-progress' へ統一。
   - 既存重複タスク時に、SQLite 側は既存行の status 更新を許可（createTask 内）。
   - 保存結果の厳格チェックを追加（success !== true を失敗扱い）。
   - 作成直後に Redux へ addTask で即時反映 & 取得結果とマージして setTasks（DB反映遅延のフォールバック）。

3) Firebase 側ハードニング
   - src/services/firebase.ts: normalizeUrl を強化。
     - decodeURIComponent、半角/全角空白/%20 除去。
     - 'asia-so   utheast1' → 'asia-southeast1' など表記ゆれ補正。

4) Vercel 設定
   - vercel.json 新規追加: buildCommand `npm run build:renderer`, outputDirectory `dist/renderer`。
   - 途中、ignoreCommand により本番ビルドが常に Canceled になったため削除（fix(vercel): remove ignoreCommand）。
   - ブランチ `deploy/vite-vercel-fixes` を作成 → PR #3 を作成。
   - GitHub UI からの Preview 作成が不安定だったため、Deploy Hook（プレビュー用・本番用）でビルドを起動（URLは秘匿）。
   - main を CLI でマージして自動本番デプロイをトリガー。
   - 最終的に Production の最新デプロイが Current になったことを確認（スクショ: FHXc9Vx6U が Current）。

5) lake ドメイン確認
   - https://taskflow-ai-lake.vercel.app が旧HTML（apple-mobile-web-app-capable 残存）を配信。
   - 案内: 旧プロジェクト名を変更してサブドメインを解放 → 本命プロジェクト名を `taskflow-ai-lake` に変更して本番ドメインを付け替える手順を提示。

確認ログ（代表）
- 旧挙動: "Dispatching setTasks with 0 tasks"（保存失敗でも成功扱いのため空表示）。
- 新挙動: "🚀 Dispatching setTasks with N merged tasks"（保存成功分は UI に必ず残る）。

現在の状態
- 本番プロジェクトの最新デプロイは Current。修正コードは反映済み。
- lake ドメインは旧プロジェクト配信の可能性あり（HTMLマーカーが旧式）。付け替えを推奨。

残課題/推奨
- PWA アイコン（/public/icon-192.png, icon-512.png）を追加して警告を解消。
- Vercel の環境変数（Production/Preview）で VITE_FIREBASE_* と VITE_GEMINI_API_KEY を再確認（特に DATABASE_URL）。
- lake ドメインのプロジェクト名付け替えを実施後、承認→保存のエンドツーエンド確認。

備考
- Deploy Hook の URL は機密のため、このログでは記載を省略（リポジトリ設定の Settings → Git → Deploy Hooks から再取得可）。

