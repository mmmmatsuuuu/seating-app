/**
 * 個々の座席の現在の状態と設定を保持するデータ構造です。
 */
export interface SeatMapData {
  /** 座席の一意のID (例: "R1C1") */
  seatId: string;
  /** この座席に割り当てられている生徒のID。割り当てられていない場合は null。 */
  /** 座席の行番号 */
  row: number; // 追加
  /** 座席の列番号 */
  col: number; // 追加
  assignedStudentId: string | null;
  /** この座席が現在使用可能かどうか (true: 使用可能, false: 使用不可)。デフォルトは true。 */
  isUsable: boolean;
  // 他にも、今後追加する可能性のある座席属性 (例: groupId, isWindowSeat など)
}

// SeatMapData の配列は座席マップ全体を表します。
export type SeatMap = SeatMapData[];

/**
 * 固定座席割り当ての型定義
 * 特定の生徒が座れる座席を「許可エリア」として複数指定します。
 * ルーレットはこのエリア内の空席から抽選し、エリアが埋まっていれば
 * 全空席から抽選する（条件を無視する）フォールバック動作になります。
 */
export interface FixedSeatAssignment {
  /**
   * 割り当てられた生徒のID。
   * Student 型の id プロパティに対応します。
   */
  studentId: string;
  /**
   * この生徒に許可する座席IDの配列。
   * 要素が1つならピンポイント固定と同じ挙動になる。
   * 複数指定するとその中から抽選される。
   */
  seatIds: string[];
}