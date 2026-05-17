# アーキテクチャ設計書

## 概要

席替えアプリは、教室の座席をランダムに割り当てるための SPA（シングルページアプリケーション）。
フェーズ駆動型の UI 設計を採用しており、ユーザーはステップバイステップで操作を進める。
バックエンドなし・データベースなしで、全データをブラウザのメモリおよびローカルストレージで管理する。

## 技術スタック

| カテゴリ | 採用技術 | バージョン |
|----------|----------|-----------|
| フレームワーク | React | 19 |
| 言語 | TypeScript | 5.8 |
| ビルドツール | Vite | 6 |
| UI ライブラリ | MUI (Material UI) | 7 |
| ドラッグ&ドロップ | @hello-pangea/dnd | 18 |
| CSV 解析 | PapaParse | 5 |
| PDF 出力 | jsPDF + html2canvas | - |

## 状態管理

アプリケーションの全状態は `AppStateContext`（`src/contexts/AppStateContext.tsx`）で一元管理する。

### なぜ Context API を選んだか

- 規模が小さく、外部の状態管理ライブラリ（Zustand, Redux 等）は不要
- フェーズ間で共有するデータが多いため、Props のバケツリレーを避けたい
- React 標準機能のみで完結させてシンプルさを維持する

### Context が管理する状態

| 状態 | 型 | 説明 |
|------|----|------|
| `students` | `Student[]` | 全生徒データ |
| `seatMap` | `SeatMapData[]` | 全座席の状態（使用可否・割り当て状況を含む） |
| `appPhase` | `AppPhase` | 現在のアプリフェーズ |
| `rouletteState` | `RouletteState` | ルーレット実行中の状態 |
| `fixedSeatAssignments` | `FixedSeatAssignment[]` | 固定座席割り当ての設定 |

### Context に追加すべきでないもの

- コンポーネントローカルな UI 状態（モーダルの開閉、入力中のテキストなど）
- ルーレットアニメーションの中間状態（`useRef` で管理する）

## データの永続化

`src/utils/localStorage.ts` のユーティリティを通じて、全 Context 状態をローカルストレージに保存・復元できる。
操作は `Layout.tsx` のヘッダーメニュー（保存・読み込み・リセット）から行う。

## コンポーネント構成

```
App
└── AppStateProvider（Context）
    └── AppContent（フェーズに応じてコンポーネントを切り替え）
        └── Layout（共通レイアウト・ヘッダーナビゲーション）
            ├── StudentInput        （input フェーズ）
            ├── SeatConfig          （config フェーズ）
            │   └── SeatMapConfig
            ├── FixedSeatConfig     （fixedSeat フェーズ）
            │   └── SeatMapChart
            ├── RouletteDisplay     （roulette フェーズ）
            │   ├── StudentList
            │   └── Seat
            ├── SeatingChart        （chart / finished フェーズ）
            │   └── SeatMapChart
            └── OutputPanel         （finished フェーズ）
                └── PrintableSeatChart
```

## ファイル構成

```
src/
├── App.tsx                     # ルートコンポーネント・フェーズルーティング
├── main.tsx                    # エントリーポイント
├── index.css                   # グローバル CSS
├── vite-env.d.ts
├── contexts/
│   └── AppStateContext.tsx     # グローバル状態管理（全フェーズで共有）
├── components/
│   ├── Chart/
│   │   └── SeatingChart.tsx    # 座席確認・D&D による手動調整
│   ├── Config/
│   │   ├── SeatConfig.tsx      # 座席レイアウト設定画面（ラッパー）
│   │   └── FixedSeatConfig.tsx # 固定座席設定画面
│   ├── ControlPanel/
│   │   └── ControlPanel.tsx    # 汎用コントロールパネル
│   ├── Layout/
│   │   └── Layout.tsx          # 共通レイアウト・ヘッダー・データ保存操作
│   ├── Output/
│   │   ├── OutputPanel.tsx     # PDF 出力・クリップボードコピー操作
│   │   ├── PrintableSeatChart.tsx # 印刷・PDF 用の座席表レイアウト
│   │   └── SeatingTable.tsx    # 座席一覧テーブル
│   ├── Roulette/
│   │   └── RouletteDisplay.tsx # ルーレット実行・座席割り当て
│   ├── Seat/
│   │   ├── Seat.tsx            # 個別座席コンポーネント（1 席分）
│   │   ├── SeatMapChart.tsx    # 座席マップ全体の表示（グリッド）
│   │   └── SeatMapConfig.tsx   # 座席レイアウト設定 UI
│   └── Student/
│       ├── StudentInput.tsx    # 生徒情報の入力（CSV・テキスト）
│       └── StudentList.tsx     # 生徒リストの表示・選択
├── constants/
│   └── index.ts                # アプリ全体の定数・フェーズ定義
├── types/
│   ├── Roulette.ts             # ルーレット状態の型
│   ├── Seat.ts                 # 座席データの型
│   └── Student.ts              # 生徒データの型
└── utils/
    ├── csvParser.ts            # CSV 解析ユーティリティ
    └── localStorage.ts         # ローカルストレージ操作ユーティリティ
```
