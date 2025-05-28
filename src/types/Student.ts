// src/types/Student.ts

/**
 * 生徒データの型定義です。
 * アプリケーション内で生徒一人ひとりを表現するために使用します。
 */
export interface Student {
  /**
   * 生徒の一意の識別子です。
   * アプリケーション内で生徒を特定するために使用します。
   * (UUIDなど、CSV/コピペデータにIDがない場合は生成する必要があります)
   */
  id: string;

  /**
   * 生徒の番号（出席番号など）です。
   */
  number: string;

  /**
   * 生徒の氏名です。
   */
  name: string;

  /**
   * 生徒の氏名のふりがなです。
   */
  kana: string;

  /**
   * ユーザーが設定できる追加情報1です。
   * (例: 性別)
   */
  info1: string;

  /**
   * ユーザーが設定できる追加情報2です。
   * (例: 出身学校)
   */
  info2: string;

  /**
   * ユーザーが設定できる追加情報3です。
   * (例: 特記事項、アレルギーなど)
   */
  info3: string;

  /**
   * この生徒が既に座席に割り当てられているか
   */
  isAssigned: boolean;

  /**
   * この生徒に現在割り当てられている座席のIDです。
   * まだ座席が割り当てられていない場合は null となります。
   */
  assignedSeatId: string | null;
}

// 今後、生徒のIDのみを参照する場合などに便利な型エイリアスを定義しても良い
// export type StudentId = string;