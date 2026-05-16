# データモデル定義

型定義ファイルは `src/types/` に配置されている。
このドキュメントは、型定義の意図・背景・制約を補足するためのもの。型そのものは各ファイルを参照すること。

---

## Student（生徒）

**ファイル**: `src/types/Student.ts`

```typescript
interface Student {
  id: string;                   // UUID（CSV にIDがなければ生成）
  number: string;               // 出席番号
  name: string;                 // 氏名
  kana: string;                 // ふりがな
  info1: string;                // 追加情報1（例: 性別）
  info2: string;                // 追加情報2（例: 出身学校）
  info3: string;                // 追加情報3（例: 特記事項）
  isAssigned: boolean;          // 座席割り当て済みフラグ
  assignedSeatId: string | null; // 割り当て済み座席ID
}
```

### 設計上の注意点

- `isAssigned` と `assignedSeatId` は冗長だが意図的。`isAssigned` は未割り当て生徒の高速フィルタリングに、`assignedSeatId` は座席IDへの直接アクセスに使う
- 両方を常に同時に更新すること。片方だけ更新すると不整合が生じる
- `info1` 〜 `info3` は汎用フィールドで用途はユーザーが決める。空文字列がデフォルト

---

## SeatMapData（座席）

**ファイル**: `src/types/Seat.ts`

```typescript
interface SeatMapData {
  seatId: string;               // 座席ID（例: "R1C1"）
  row: number;                  // 行番号（1 始まり）
  col: number;                  // 列番号（1 始まり）
  assignedStudentId: string | null; // 割り当て生徒ID
  isUsable: boolean;            // 使用可否
}

type SeatMap = SeatMapData[];
```

### 座席IDの命名規則（変更禁止）

- 形式: `R{行番号}C{列番号}`（例: `R1C1`, `R3C5`）
- 行番号・列番号は 1 始まり
- 以下のファイルで正規表現 `R(\d+)C(\d+)` によるパースが行われているため、この形式を変えてはならない:
  - `RouletteDisplay.tsx`（`getAdjacentSeatIds`）
  - `SeatConfig.tsx`（行列数の逆算）
  - `SeatingChart.tsx`（行列グリッドの構築）

### isUsable の扱い

- `false` の座席は、ルーレット・一括割り当て・PDF 出力すべてで除外される
- 教室の障害物（柱、棚など）や、クラス人数が少ない場合の余剰席として使う

---

## FixedSeatAssignment（固定座席割り当て）

**ファイル**: `src/types/Seat.ts`

```typescript
interface FixedSeatAssignment {
  studentId: string; // Student.id に対応
  seatId: string;    // SeatMapData.seatId に対応
}
```

### 役割と動作

- 特定の生徒を特定の座席に固定するための設定（1 生徒につき 1 座席）
- `fixedSeatAssignments` として `AppStateContext` で管理
- `fixedSeat` フェーズで設定し、`roulette` フェーズで適用される
- ルーレット実行時、固定座席の生徒は最優先でその座席に割り当てられる
- 固定座席は `SeatMapData.assignedStudentId` や `Student.isAssigned` には反映されない（あくまで「予約」の情報）。実際の反映はルーレット停止・一括割り当て時に行われる

---

## RelationConfigData（生徒間の関係性）

**ファイル**: `src/types/Relation.ts`

```typescript
type RelationType = 'co_seat' | 'no_co_seat';

interface RelationConfigData {
  studentId1: string;
  studentId2: string;
  type: RelationType; // co_seat: 隣に座らせたい, no_co_seat: 隣に座らせたくない
}
```

### 現在の状態

- UI（`RelationConfig` コンポーネント）がコメントアウトされており、ユーザーがこの設定を入力できない状態
- ただし、ルーレットロジック（`checkRelationConstraints`）は実装済みのため、データが存在すれば機能する
- 再有効化の計画は `docs/roadmap.md` 参照

### 隣接チェックの定義

- 上下左右 4 方向のみ（斜めは隣接と見なさない）
- `getAdjacentSeatIds` 関数（`RouletteDisplay.tsx` 内）で計算

---

## RouletteState（ルーレット実行状態）

**ファイル**: `src/types/Roulette.ts`

```typescript
interface RouletteState {
  isRunning: boolean;                                  // ルーレットアニメーション実行中かどうか
  currentSelectedSeatId: string | null;                // アニメーションで現在点灯している座席ID
  currentAssigningStudent: Student | null;              // 現在割り当て対象の生徒
  winningHistory: { studentId: string; seatId: string }[]; // 割り当て履歴
  isStopped: boolean;                                  // 一時停止中（結果表示中）かどうか
}
```

### 設計上の注意点

- `isRunning` と `isStopped` は独立したフラグ。両方 `false` が「待機中」、`isRunning=true` が「アニメーション中」、`isStopped=true` が「結果表示中」
- アニメーションのループは `requestAnimationFrame` で管理し、`ref` にフレームIDを保持する（`animationFrameRef`）。コンポーネントのアンマウント時に `cancelAnimationFrame` でクリーンアップすること

---

## AppPersistedState（ローカルストレージ保存形式）

**ファイル**: `src/utils/localStorage.ts`

```typescript
interface AppPersistedState {
  students: Student[];
  seatMap: SeatMap;
  appPhase: AppPhase;
  rouletteState: RouletteState;
  relationConfig: RelationConfigData[];
  fixedSeatAssignments: FixedSeatAssignment[];
}
```

全 Context 状態をそのままシリアライズして保存する。
`AppState` に新しいフィールドを追加した場合は、ここにも追加すること。

---

## 定数（`src/constants/index.ts`）

| 定数名 | 値 | 説明 |
|--------|----|------|
| `DEFAULT_SEAT_ROWS` | `6` | 座席マップのデフォルト行数 |
| `DEFAULT_SEAT_COLS` | `7` | 座席マップのデフォルト列数 |
| `MAX_SEATS` | `100` | 座席の最大数 |
| `ROULETTE_INTERVAL_MS` | `50` | ルーレット点灯切り替え間隔（ms）※現在は requestAnimationFrame で上書きされている |
| `LOCAL_STORAGE_KEY` | `'seatingAppData'` | 定数定義（実際のキーは localStorage.ts 内で別途定義） |
| `AppPhaseConstants` | Record | フェーズ名を定数として参照するためのオブジェクト |
| `AppPhaseTitles` | Record | フェーズの日本語表示名（ヘッダーの Tooltip に使用） |
| `AppPhaseIcons` | Record | フェーズのアイコンコンポーネント（ヘッダーボタンに使用） |
