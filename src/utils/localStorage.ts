// src/utils/localStorage.ts

import type { AppPhase } from '../contexts/AppStateContext'; // AppPhase をインポート
import type { Student } from '../types/Student';
import type { SeatMap } from '../types/Seat'; // SeatMap は SeatMapData[] なので問題なし
import type { RouletteState } from '../types/Roulette';
import type { RelationConfigData } from '../types/Relation';

// LocalStorageに保存するデータのキー
const STORAGE_KEY = 'seatingArrangementAppData';

/**
 * アプリケーション全体のデータを保存するための型定義
 * これにより、保存・読み込み時に型安全性が向上します。
 */
export interface AppPersistedState {
  students: Student[];
  seatMap: SeatMap; // SeatMapData[]
  appPhase: AppPhase;
  rouletteState: RouletteState;
  relationConfig: RelationConfigData[];
  // 将来的に保存したい他の状態があればここに追加
}

/**
 * アプリケーションの状態をLocalStorageに保存します。
 * @param data 保存するアプリケーションの状態オブジェクト
 */
export const saveAppData = (data: AppPersistedState): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serializedData);
    console.log('アプリケーションデータが保存されました。');
  } catch (error) {
    console.error('データの保存中にエラーが発生しました:', error);
    throw new Error('データの保存に失敗しました。');
  }
};

/**
 * LocalStorageからアプリケーションの状態を読み込みます。
 * @returns 読み込んだアプリケーションの状態オブジェクト、またはnull（データがない場合やパースエラーの場合）
 */
export const loadAppData = (): AppPersistedState | null => {
  try {
    const serializedData = localStorage.getItem(STORAGE_KEY);
    if (serializedData === null) {
      console.log('保存されたアプリケーションデータがありません。');
      return null;
    }
    const data: AppPersistedState = JSON.parse(serializedData);
    console.log('アプリケーションデータが読み込まれました。');
    return data;
  } catch (error) {
    console.error('データの読み込み中にエラーが発生しました:', error);
    // データ形式が不正な場合も考慮し、nullを返す
    return null;
  }
};

/**
 * LocalStorageからアプリケーションの状態データを削除します。
 */
export const clearAppData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('アプリケーションデータが削除されました。');
  } catch (error) {
    console.error('データの削除中にエラーが発生しました:', error);
    throw new Error('データの削除に失敗しました。');
  }
};