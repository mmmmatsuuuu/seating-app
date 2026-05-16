# CLAUDE.md

## コマンド

コマンドはすべてコンテナ上で実行する。事前に `docker compose up -d` でコンテナを起動しておくこと。

```bash
# コンテナ操作
docker compose up -d                                      # コンテナをバックグラウンドで起動
docker compose down                                       # コンテナを停止・削除

# アプリケーション操作（コンテナ内で実行）
docker compose exec app npm run dev -- --host             # 開発サーバー起動 (http://localhost:5173)
docker compose exec app npm run build                     # 本番ビルド (tsc + vite build)
docker compose exec app npm run lint                      # ESLint 実行
docker compose exec app npm run preview -- --host         # ビルド結果のプレビュー
docker compose exec app npm install                       # 依存パッケージのインストール
docker compose exec app npm install <package>             # パッケージの追加
```

> `--host` フラグは Vite の開発サーバーをコンテナ外からアクセス可能にするために必要。

## 設計ドキュメント（変更前に必ず参照）

| ドキュメント | 参照するとき |
|-------------|------------|
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ全体・Context 設計・ファイル構成を確認するとき |
| [docs/app-flow.md](docs/app-flow.md) | フェーズ遷移・各画面の責務・完了条件を確認するとき |
| [docs/data-model.md](docs/data-model.md) | 型定義の意図・座席IDの命名規則・制約を確認するとき |
| [docs/components.md](docs/components.md) | コンポーネントの責務・Props・禁止事項を確認するとき |
| [docs/roadmap.md](docs/roadmap.md) | 未実装機能・既知の技術的負債を確認するとき |

## 重要な制約・禁止事項

- **Context への状態追加**: `AppStateContext.tsx` の `AppState` インターフェースと `useMemo` の依存配列も必ず同時に更新すること
- **グローバル状態**: `AppStateContext` 以外の状態管理ライブラリ・Context を新たに導入しないこと
- **座席ID形式**: `R{行番号}C{列番号}`（例: `R1C1`）の形式を変えないこと。複数箇所で正規表現パースしている
- **@ts-ignore**: 新規コードでは使用しないこと（既存コードの MUI Grid 関連のみ許容）
- **コメント**: 「何をしているか」は書かない。「なぜそうしているか」だけ書く
- **不要な抽象化**: 現在の用途に合わせた最小限の実装にとどめること

## コーディング規約

- コンポーネントは `React.FC` 型で定義する
- Props の型は同ファイル内にインターフェースとして定義する
- UIコンポーネントは MUI を使用する（独自スタイルコンポーネントは作らない）
- フェーズ担当コンポーネントのみ `useAppState()` で Context にアクセスする（表示専用コンポーネントは Props のみで動作させる）

## 開発フロー

### ブランチ戦略（GitHub Flow）

```
main（常にデプロイ可能な状態を保つ）
  └── feature/<name>    # 機能追加
  └── fix/<name>        # バグ修正
  └── docs/<name>       # ドキュメント更新
  └── refactor/<name>   # リファクタリング
  └── chore/<name>      # 設定・依存関係の変更
```

- `main` への直接 push は禁止。必ずブランチを切って PR 経由でマージする
- ブランチ名は作業内容が分かる短い英語にする（例: `feature/relation-config`, `fix/bulk-assign-fixed-seat`）

### コミットメッセージ規則

形式: `<prefix>: <日本語で変更内容を簡潔に>`

| prefix | 用途 |
|--------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントの追加・更新 |
| `refactor` | 動作を変えないリファクタリング |
| `chore` | 設定・依存関係・ビルド関連の変更 |
| `style` | コードスタイルの変更（ロジック変更なし） |

例:
```
feat: RelationConfig を再有効化しフェーズに組み込む
fix: 一括割り当て時に固定座席が反映されない問題を修正
docs: コンポーネント仕様書にセカンダリコンポーネントを追記
refactor: RouletteDisplay の座席決定ロジックを関数に切り出す
chore: MUI Grid の @ts-ignore を Grid2 API に置き換え
```

### PR のルール

- PR タイトルはコミットメッセージと同じ形式（`<prefix>: <日本語説明>`）
- PR 本文には「何を・なぜ変えたか」を記載する
- ソロ開発のため self-merge で構わないが、PR は必ず作成して変更の経緯を残す
- Claude Code に PR 作成を依頼する際も、この形式で作成するよう指示する
