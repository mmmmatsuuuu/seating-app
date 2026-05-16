# 実装計画・既知の課題

## 優先度の凡例

- 🔴 高: 機能上の問題・ユーザーが困る使いにくさに直結
- 🟡 中: あると便利・UX の改善
- 🟢 低: 将来的に検討

---

## 未実装・無効化中の機能

### 🔴 RelationConfig（関係性設定）の再有効化

**現状**:  
`App.tsx` のフェーズスイッチで `case AppPhaseConstants.relation` がコメントアウトされており、ユーザーが UI から設定できない状態。  
`Layout.tsx` のフェーズナビゲーションでも `"relation"` がコメントアウトされている。  
ただし、ルーレットのロジック（`RouletteDisplay.tsx` の `checkRelationConstraints`）は実装済みのため、データを直接投入すれば機能する。

**対応方針**:
1. `App.tsx` の `case AppPhaseConstants.relation` のコメントアウトを解除
2. `Layout.tsx` のフェーズナビゲーション配列に `"relation"` を追加
3. フェーズ遷移を `fixedSeat → relation → roulette` に変更（`FixedSeatConfig` の `onConfigFinished` を更新）
4. `RelationConfig.tsx` の実装が正しく動作するか確認・修正

---

## 既知の技術的負債

### 🟡 MUI Grid の @ts-ignore

**箇所**: `RouletteDisplay.tsx`, `FixedSeatConfig.tsx`, `OutputPanel.tsx` 等の複数箇所  
**原因**: MUI v7 の `Grid` が新しい `size` prop API に移行したが、型定義が合わない  
**対応**: MUI v7 のドキュメントに従い `Grid2` コンポーネントまたは正しい型アサーションに書き換える

### 🟡 alert() の使用

**箇所**: `OutputPanel.tsx`（PDF 出力・クリップボードコピーの成否通知）、`Layout.tsx`（データ保存・読み込みの通知）  
**問題**: `alert()` は UI をブロックし、スタイルも統一できない  
**対応**: MUI の `Snackbar` + `Alert` コンポーネントによる通知に置き換える

### 🟡 クリップボード API の非推奨

**箇所**: `OutputPanel.tsx` の `handleCopyToClipboard`  
**問題**: `document.execCommand('copy')` は非推奨 API  
**対応**: `navigator.clipboard.writeText()` に移行する（HTTPS 環境が必要）

### 🟡 setInterval の不要な残存

**箇所**: `RouletteDisplay.tsx` の `startRoulette`  
**問題**: `requestAnimationFrame` でアニメーションを制御しているにもかかわらず、何もしない `setInterval` が残っている  
**対応**: 削除する

### 🟢 ローカルストレージのキーの不整合

**箇所**: `constants/index.ts` の `LOCAL_STORAGE_KEY = 'seatingAppData'` と `localStorage.ts` の `STORAGE_KEY = 'seatingArrangementAppData'` が異なる  
**問題**: constants のキーが実際には使われていない  
**対応**: どちらかに統一する

---

## 今後追加したい機能

### 🟡 CSV のより柔軟な読み込み

**現状**: CSV の列順や列名に依存した読み込みになっている可能性がある  
**要望**: 列のマッピングをユーザーが指定できる UI（「どの列が氏名か」を選べる）

### 🟡 座席レイアウトのプリセット保存

**要望**: 設定した行列数・使用不可席のパターンを名前をつけて保存し、次回から読み込めるようにする  
**実装方針**: ローカルストレージにプリセットリストを別キーで保存

### 🟡 印刷最適化

**現状**: PDF 出力は DOM キャプチャ方式のため、フォント・解像度に限界がある  
**対応候補**:
- CSS `@media print` を使った印刷対応
- より精度の高い PDF 生成ライブラリへの移行

### 🟢 複数クラスの管理

**現状**: 1 クラス分のデータのみ管理可能  
**要望**: 複数クラスを切り替えられる機能（クラス名で保存・切り替え）  
**実装方針**: ローカルストレージにクラスリストとして管理する
