import React, {
  createContext,
  useContext,
  useState,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type { Student } from '../types/Student';
import type { SeatMapData } from '../types/Seat'; // SeatMap を SeatMapData[] に変更
import type { RelationConfigData } from '../types/Relation';
import type { RouletteState } from '../types/Roulette';
import type { FixedSeatAssignment } from '../types/Seat'; // 新しく定義した型をインポート

// =============================================================================
// 型定義
// =============================================================================

// App全体のフェーズを表す型
export type AppPhase =
  | 'input'
  | 'config'
  | 'fixedSeat' // 新しい固定座席設定フェーズを追加
  | 'relation' // 関係性設定フェーズは残すか、必要に応じて削除
  | 'roulette'
  | 'chart'
  | 'finished';

// アプリケーション全体の状態を定義するインターフェース
interface AppState {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  seatMap: SeatMapData[]; // SeatMap を SeatMapData[] に変更
  setSeatMap: React.Dispatch<React.SetStateAction<SeatMapData[]>>; // SeatMap を SeatMapData[] に変更
  appPhase: AppPhase;
  setAppPhase: React.Dispatch<React.SetStateAction<AppPhase>>;
  rouletteState: RouletteState;
  setRouletteState: React.Dispatch<React.SetStateAction<RouletteState>>;
  relationConfig: RelationConfigData[];
  setRelationConfig: React.Dispatch<React.SetStateAction<RelationConfigData[]>>;
  fixedSeatAssignments: FixedSeatAssignment[]; // 新しい固定座席割り当ての状態
  setFixedSeatAssignments: React.Dispatch<React.SetStateAction<FixedSeatAssignment[]>>; // 新しい固定座席割り当てのセッター
}

// AppStateContext の作成
const AppStateContext = createContext<AppState | undefined>(undefined);

// AppStateProvider の Props の型定義
interface AppStateProviderProps {
  children: ReactNode;
}

// AppStateProvider コンポーネント
export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMapData[]>([]); // SeatMap を SeatMapData[] に変更
  const [appPhase, setAppPhase] = useState<AppPhase>('input');
  const [rouletteState, setRouletteState] = useState<RouletteState>({
    isRunning: false,
    currentSelectedSeatId: null, // 現在点灯している座席ID
    currentAssigningStudent: null, // 現在座席を割り当てる生徒
    winningHistory: [], // 割り当て済みの生徒IDと座席IDのペア { studentId, seatId }
    isStopped: false, // ルーレットが一時停止中か
  });
  const [relationConfig, setRelationConfig] = useState<RelationConfigData[]>([]);
  // 新しい固定座席割り当ての状態を初期化
  const [fixedSeatAssignments, setFixedSeatAssignments] = useState<FixedSeatAssignment[]>([]);

  const value = useMemo(
    () => ({
      students,
      setStudents,
      seatMap,
      setSeatMap,
      appPhase,
      setAppPhase,
      rouletteState,
      setRouletteState,
      relationConfig,
      setRelationConfig,
      fixedSeatAssignments, // useMemo の依存配列に追加
      setFixedSeatAssignments, // useMemo の依存配列に追加
    }),
    [
      students,
      setStudents,
      seatMap,
      setSeatMap,
      appPhase,
      setAppPhase,
      rouletteState,
      setRouletteState,
      relationConfig,
      setRelationConfig,
      fixedSeatAssignments, // useMemo の依存配列に追加
      setFixedSeatAssignments, // useMemo の依存配列に追加
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
