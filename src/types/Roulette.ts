// src/types/Roulette.ts

import type { Student } from './Student';

/**
 * ルーレットの状態を定義するインターフェースです。
 */
export interface RouletteState {
  /**
   * ルーレットが現在実行中（点灯が動いている）かどうかを示します。
   */
  isRunning: boolean;
  /**
   * ルーレットで現在点灯している座席のIDです。
   */
  currentSelectedSeatId: string | null;
  /**
   * 現在座席を割り当てようとしている生徒です。
   */
  currentAssigningStudent: Student | null;
  /**
   * これまでに割り当てられた生徒と座席のペアの履歴です。
   * 例: [{ studentId: 's1', seatId: 'R1C1' }, ...]
   */
  winningHistory: { studentId: string; seatId: string }[];
  /**
   * ルーレットが一時停止中（結果が表示されているが、次の生徒はまだ選んでいない）かどうかを示します。
   */
  isStopped: boolean;
}