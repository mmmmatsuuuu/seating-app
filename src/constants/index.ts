import type React from 'react';
import type { AppPhase } from '../contexts/AppStateContext';
import GroupIcon from '@mui/icons-material/Group';
import ChairAltIcon from '@mui/icons-material/ChairAlt';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AppsIcon from '@mui/icons-material/Apps';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { SvgIconProps } from '@mui/material';


// =============================================================================
// アプリケーションフェーズに関する定数と型
// =============================================================================


/**
 * 各アプリケーションフェーズに対応する定数オブジェクトです。
 * これにより、例えば AppPhaseConstants.INPUT のようにアクセスできます。
 */
export const AppPhaseConstants: Record<AppPhase, AppPhase> = {
  input: 'input',
  config: 'config',
  fixedSeat: 'fixedSeat', // 固定座席割り当てのフェーズ
  relation: 'relation',
  roulette: 'roulette',
  chart: 'chart',
  finished: 'finished',
};

/**
 * アプリケーションフェーズをユーザーフレンドリーな表示文字列にマッピングするオブジェクトです。
 * レイアウトのヘッダーなどで現在のステップを表示するために使用できます。
 */
export const AppPhaseTitles: Record<any, string> = {
  [AppPhaseConstants.input]: '生徒情報の取り込み',
  [AppPhaseConstants.config]: '座席レイアウトを設定',
  [AppPhaseConstants.fixedSeat]: '固定座席割り当てを設定', // 固定座席割り当てのフェーズ
  [AppPhaseConstants.relation]: '関係性を設定',
  [AppPhaseConstants.roulette]: 'ルーレット',
  [AppPhaseConstants.chart]: '座席表を確認・出力',
  [AppPhaseConstants.finished]: '完了',
};

export const AppPhaseIcons: Record<any, React.ComponentType<SvgIconProps>> = {
  [AppPhaseConstants.input]: GroupIcon,
  [AppPhaseConstants.config]: ChairAltIcon,
  [AppPhaseConstants.fixedSeat]: ManageAccountsIcon, // 固定座席割り当てのアイコン
  [AppPhaseConstants.relation]: ManageAccountsIcon,
  [AppPhaseConstants.roulette]: ShuffleIcon,
  [AppPhaseConstants.chart]: AppsIcon,
  [AppPhaseConstants.finished]: CheckCircleOutlineIcon,
};


// =============================================================================
// その他のアプリケーション全体で使用する定数
// =============================================================================

/**
 * ローカルストレージにデータを保存する際のキー名です。
 */
export const LOCAL_STORAGE_KEY = 'seatingAppData';

/**
 * 座席表のデフォルトの行数です。
 */
export const DEFAULT_SEAT_ROWS = 6;

/**
 * 座席表のデフォルトの列数です。
 */
export const DEFAULT_SEAT_COLS = 7;
/**
 * 座席表のデフォルトの列数です。
 */
export const MAX_SEATS = 100;

/**
 * ルーレットアニメーションの生徒切り替え間隔（ミリ秒）です。
 */
export const ROULETTE_INTERVAL_MS = 50;

/**
 * CSVパース時に試行する区切り文字の候補です。
 */
export const CSV_DELIMITERS = [',', '\t', ';', '|'];

// ... 今後必要になる可能性のあるその他の定数をここに追加してください ...

// src/constants/index.ts
export const RelationTypeConstants = {
  CO_SEAT: 'co_seat',
  NO_CO_SEAT: 'no_co_seat',
} as const;
