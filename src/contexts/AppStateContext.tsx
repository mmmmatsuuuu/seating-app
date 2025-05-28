import React, {
  createContext,
  useContext,
  useState,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type { Student } from '../types/Student';
import type { SeatMap } from '../types/Seat';
import type { RelationConfigData } from '../types/Relation';
import type { RouletteState } from '../types/Roulette';

// =============================================================================
// 型定義
// =============================================================================

// 座席データの型 (簡易版、必要に応じて詳細化)
export interface Seat {
  id: string;
  row: number;
  col: number;
  isUsable: boolean; // 使用可能か（座れる場所か）
  studentId: string | null; // 割り当てられている生徒のID
}

// App全体のフェーズを表す型
export type AppPhase =
  | 'input'
  | 'config'
  | 'relation'
  | 'roulette'
  | 'chart'
  | 'finished';

// アプリケーション全体の状態を定義するインターフェース
interface AppState {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  seatMap: SeatMap;
  setSeatMap: React.Dispatch<React.SetStateAction<SeatMap>>;
  appPhase: AppPhase;
  setAppPhase: React.Dispatch<React.SetStateAction<AppPhase>>;
  rouletteState: RouletteState;
  setRouletteState: React.Dispatch<React.SetStateAction<RouletteState>>;
  relationConfig: RelationConfigData[];
  setRelationConfig: React.Dispatch<React.SetStateAction<RelationConfigData[]>>;
  // TODO: 他のグローバルステート
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
  const [seatMap, setSeatMap] = useState<SeatMap>([]);
  const [appPhase, setAppPhase] = useState<AppPhase>('input');
  const [rouletteState, setRouletteState] = useState<RouletteState>({
    isRunning: false,
    currentSelectedSeatId: null, // 現在点灯している座席ID
    currentAssigningStudent: null, // 現在座席を割り当てる生徒
    winningHistory: [], // 割り当て済みの生徒IDと座席IDのペア { studentId, seatId }
    isStopped: false, // ルーレットが一時停止中か
  });
  const [relationConfig, setRelationConfig] = useState<RelationConfigData[]>([]);

  // students のセッターをラップして isAssigned, assignedSeatId を初期化/更新
  // const setStudents = useCallback((newStudents: Student[]) => {
  //   // 既存の割り当て状態を考慮しつつ、新しい生徒リストをセット
  //   setStudentsState(prevStudents => {
  //     return newStudents.map(newStudent => {
  //       const existingStudent = prevStudents.find(s => s.id === newStudent.id);
  //       return {
  //         ...newStudent,
  //         isAssigned: existingStudent ? existingStudent.isAssigned : false,
  //         assignedSeatId: existingStudent ? existingStudent.assignedSeatId : null,
  //       };
  //     });
  //   });
  // }, []);
  // const setStudents = useCallback((newStudents: Student[]) => {
  //   setStudentsState(newStudents);
  // }, []); // 依存配列は空でOK、setStudentsStateは安定しているため

  // seatMap のセッターをラップして assignedStudentId を初期化/更新
  // const setSeatMap = useCallback((newSeatMap: SeatMap) => {
  //   // 座席マップがリセットされる場合、生徒の割り当て状態もリセット
  //   // ただし、ルーレットフェーズ以外での変更の場合は、既存の割り当てを維持する必要がある
  //   setSeatMapState(prevMap => {
  //       return newSeatMap.map(newSeat => {
  //           const existingSeat = prevMap.find(s => s.seatId === newSeat.seatId);
  //           return {
  //               ...newSeat,
  //               // 基本的に、座席マップ設定フェーズで変更されたisUsableのみを反映
  //               // assignedStudentId はルーレットフェーズで更新される
  //               assignedStudentId: existingSeat ? existingSeat.assignedStudentId : null,
  //           };
  //       });
  //   });
  // }, []);
  // const setSeatMap = useCallback((newSeatMap: SeatMap) => {
  //   setSeatMapState(newSeatMap);
  // }, []); // 依存配列は空でOK、setSeatMapStateは安定しているため


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

