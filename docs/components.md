# コンポーネント仕様

## 設計原則

- コンポーネントは単一の責務を持つ
- グローバル状態（`AppStateContext`）へのアクセスは、フェーズ担当コンポーネントのみが行う
- 再利用コンポーネント（`Seat`, `StudentList`, `SeatMapChart` 等）は Props のみで動作し、Context に直接アクセスしない

---

## フェーズ担当コンポーネント

### StudentInput（`src/components/Student/StudentInput.tsx`）

**フェーズ**: `input`  
**責務**: 生徒データの入力・読み込み  
**主要 Props（コールバック）**:
- `onStudentsLoaded(students: Student[])`: 生徒データ確定時に `App.tsx` へ返す

**禁止事項**: 座席への割り当ては行わない

---

### SeatConfig（`src/components/Config/SeatConfig.tsx`）

**フェーズ**: `config`  
**責務**: 座席レイアウト設定のラッパー。`SeatMapConfig` を包んでフェーズ遷移と接続する  
**主要 Props**:
- `currentSeatMap: SeatMap`: 現在の座席マップ（行列数の初期値に使用）
- `students: Student[]`: 生徒データ（`SeatMapConfig` に渡す）
- `onConfigFinished(updatedSeatMap: SeatMap)`: 設定確定時のコールバック
- `onCancel()`: キャンセル時のコールバック

**禁止事項**: 生徒の割り当ては行わない

---

### FixedSeatConfig（`src/components/Config/FixedSeatConfig.tsx`）

**フェーズ**: `fixedSeat`  
**責務**: 特定の生徒を特定の座席に固定する設定の UI  
**主要 Props**:
- `students: Student[]`
- `seatMap: SeatMapData[]`
- `currentFixedSeatAssignments: FixedSeatAssignment[]`
- `onConfigFinished(updatedConfig: FixedSeatAssignment[])`: 確定時のコールバック

**禁止事項**: `Student.isAssigned` の更新は行わない。`FixedSeatAssignment[]` の設定のみ  
**子コンポーネント**: `SeatMapChart`（D&D 無効、クリックで選択）

---

### RouletteDisplay（`src/components/Roulette/RouletteDisplay.tsx`）

**フェーズ**: `roulette`  
**責務**: ルーレットアニメーションと座席割り当ての実行  
**Context から参照**: `students`, `setStudents`, `seatMap`, `setSeatMap`, `rouletteState`, `setRouletteState`, `relationConfig`, `fixedSeatAssignments`, `setAppPhase`  

**実装上の注意**:
- アニメーションは `requestAnimationFrame` で管理。`animationFrameRef` に格納し、コンポーネントアンマウント時・ルーレット停止時に `cancelAnimationFrame` でクリーンアップする
- `setInterval` も補助的に使っているが実質何もしていない（削除候補）

**子コンポーネント**: `StudentList`, `Seat`

---

### SeatingChart（`src/components/Chart/SeatingChart.tsx`）

**フェーズ**: `chart` / `finished`  
**責務**: 座席確認・D&D による手動調整・最終表示  
**Context から参照**: `students`, `setStudents`, `seatMap`, `setSeatMap`, `appPhase`, `setAppPhase`  

**実装上の注意**:
- `chart` と `finished` の 2 つのフェーズで使われる。`appPhase` で動作を切り替える
- D&D は `chart` フェーズのみ有効。`finished` フェーズでは `DragDropContext` はラップするが D&D を無効化
- 未割り当て生徒がいる場合は `roulette` フェーズに自動リダイレクト（`useEffect` で監視）

**子コンポーネント**: `SeatMapChart`

---

### OutputPanel（`src/components/Output/OutputPanel.tsx`）

**フェーズ**: `finished`  
**責務**: 出力オプションの選択・PDF 出力・クリップボードコピー  
**Context から参照**: `students`, `seatMap`（読み取りのみ）  

**実装上の注意**:
- PDF 出力は `html2canvas` で `id="main-seating-chart-container"` の DOM 要素をキャプチャする。この ID が存在しないと出力できないため、`PrintableSeatChart` が必ずレンダリングされている状態で呼ぶこと
- `document.execCommand('copy')` を使用（非推奨 API）。`navigator.clipboard.writeText` への移行が望ましい

**子コンポーネント**: `PrintableSeatChart`

---

## 再利用コンポーネント

### SeatMapChart（`src/components/Seat/SeatMapChart.tsx`）

**責務**: 座席マップ全体のグリッド表示。D&D のコンテキスト管理を含む  
**Props**:
- `seatMap: SeatMapData[]`: 表示する座席データ
- `students: Student[]`: 生徒データ（名前等の表示のため）
- `highlightedSeatIds: Set<string>`: ハイライト表示する座席IDのセット
- `onClickSeat: ((seatId: string) => void) | undefined`: 座席クリック時コールバック（`undefined` でクリック不可）
- `displayMode: 'config' | 'assign' | 'roulette' | 'final'`: 表示モード（`Seat` コンポーネントに伝達）
- `isDragAndDropEnabled: boolean`: D&D の有効・無効

**注意**: このコンポーネントは `@hello-pangea/dnd` の `Droppable` を各座席に設定している。`isDragAndDropEnabled=false` の場合も `DragDropContext` でラップが必要（呼び出し元が担当）

---

### Seat（`src/components/Seat/Seat.tsx`）

**責務**: 個別の座席 1 つの表示  
**Props**:
- `seatId: string`
- `seatData: SeatMapData`
- `assignedStudent: Student | null`
- `onClick: (() => void) | undefined`
- `isHighlighted: boolean`
- `isConfigMode: boolean`
- `displayMode: string`
- `isDragDisabled: boolean`

**注意**: `displayMode` によって表示内容が変わる（設定モードでは使用可否トグル、ルーレットモードでは点灯アニメーション等）

---

### SeatMapConfig（`src/components/Seat/SeatMapConfig.tsx`）

**責務**: 座席マップの行列数変更・個別座席の使用不可切り替え UI  
**親コンポーネント**: `SeatConfig` 専用（他から使わない）  
**Props**:
- `initialRows?: number`: 初期行数
- `initialCols?: number`: 初期列数
- `existingSeatMap: SeatMap`: 既存の座席マップ（使用可否の引き継ぎに使用）
- `onConfigComplete(rows, cols, finalSeatMap)`: 確定時コールバック

---

### StudentList（`src/components/Student/StudentList.tsx`）

**責務**: 生徒リストの表示と選択  
**Props**:
- `title: string`
- `students: Student[]`
- `selectedStudentIds: string[]`
- `onStudentClick: (studentId: string) => void`
- `emptyMessage: string`
- `maxHeight?: string`
- `type?: 'minimal' | 'full'`: `'minimal'` でコンパクト表示（ルーレット画面用）

---

### PrintableSeatChart（`src/components/Output/PrintableSeatChart.tsx`）

**責務**: PDF 出力・プレビュー用の座席表レイアウト  
**注意**: スタイルはインラインで記述する（`html2canvas` が外部 CSS を正しくキャプチャできない場合があるため）

---

## 未使用コンポーネント（将来対応）

### RelationConfig（`src/components/Config/RelationConfig.tsx`）

**状態**: `App.tsx` のフェーズスイッチでコメントアウト中  
**責務**: 生徒間の関係性（隣に座らせたい・たくない）の設定 UI  
**再有効化計画**: `docs/roadmap.md` 参照

### ControlPanel（`src/components/ControlPanel/ControlPanel.tsx`）

**状態**: 現在どのフェーズからも参照されていない（用途不明）  
**対応**: 必要なければ削除を検討

### SeatingTable（`src/components/Output/SeatingTable.tsx`）

**状態**: `OutputPanel.tsx` から参照されていない可能性あり（要確認）
