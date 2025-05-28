/**
 * 生徒間の関係性タイプ
 */
export type RelationType = 'co_seat' | 'no_co_seat';

export interface RelationConfigData {
  studentId1: string;
  studentId2: string;
  type: RelationType; // 'co_seat': 一緒に座りたい, 'no_co_seat': 一緒に座りたくない
}