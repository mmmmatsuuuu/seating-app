import { useCallback } from "react";
import { AppStateProvider } from "./contexts/AppStateContext";
import { useAppState } from "./contexts/AppStateContext";
import { AppPhaseConstants, DEFAULT_SEAT_ROWS, DEFAULT_SEAT_COLS } from "./constants";
import Layout from "./components/Layout/Layout";
import OutputPanel from "./components/Output/OutputPanel";

import StudentInput from "./components/Student/StudentInput"; // フェーズ 1
import SeatConfig from "./components/Config/SeatConfig";
import RelationConfig from "./components/Config/RelationConfig";
import RouletteDisplay from "./components/Roulette/RouletteDisplay";
import SeatingChart from "./components/Chart/SeatingChart";

// MUI Typography をインポート（デフォルトケースの表示用）
import { Typography, Box } from "@mui/material";
import type { SeatMapData } from "./types/Seat";
import type { Student } from "./types/Student";
import type { RelationConfigData } from "./types/Relation";

function AppContent() {
  const { students, setStudents, seatMap, setSeatMap, appPhase, setAppPhase, relationConfig, setRelationConfig } = useAppState();

  // 生徒情報読み込み完了ハンドラ
  const handleStudentsLoaded = useCallback((loadedStudents: Student[]) => {
    setStudents(loadedStudents); // Context の生徒状態を更新

    // 生徒情報が読み込まれたら、デフォルトの座席マップを生成してセット
    // 既存の座席マップがない場合のみ生成
    if (!seatMap || seatMap.length === 0) {
      const initialSeatMap: SeatMapData[] = [];
      for (let r = 0; r < DEFAULT_SEAT_ROWS; r++) {
        for (let c = 0; c < DEFAULT_SEAT_COLS; c++) {
          initialSeatMap.push({
            seatId: `R${r + 1}C${c + 1}`,
            assignedStudentId: null,
            isUsable: true, // デフォルトは全て使用可能
            row: r + 1, // 行番号を1から始める
            col: c + 1, // 列番号を1から始める
          });
        }
      }
      setSeatMap(initialSeatMap); // Context の座席マップ状態を更新
    }

    setAppPhase(AppPhaseConstants.config); // アプリフェーズを次の設定フェーズへ進める
  }, [setStudents, setSeatMap, setAppPhase, seatMap]);
  
  const renderPhaseContent = () => {
    switch (appPhase) {
      case AppPhaseConstants.input:
        return <StudentInput 
                  onStudentsLoaded={handleStudentsLoaded}
                />;
      case AppPhaseConstants.config:
        return  <SeatConfig 
                  currentSeatMap={seatMap}
                  students={students}
                  onConfigFinished={(updateSeatMap) => {
                    setSeatMap(updateSeatMap);
                    setAppPhase(AppPhaseConstants.relation); // 座席設定後は関係性設定フェーズへ進む
                  }}
                  onCancel={() => {
                    // キャンセル時の処理 (必要に応じて実装)
                  }}
                />;
      case AppPhaseConstants.relation:
        return  <RelationConfig 
                  students={students}
                  currentRelationConfig={relationConfig}
                  onConfigFinished={(updateRelationConfig: RelationConfigData[]) => {
                    setRelationConfig(updateRelationConfig);
                    setAppPhase(AppPhaseConstants.roulette); // 関係性設定後はルーレットフェーズへ進む
                  }}
                  onCancel={() => {
                    // キャンセル時の処理 (必要に応じて実装)
                  }}
                />;
      case AppPhaseConstants.roulette:
        return  <RouletteDisplay />;
      case AppPhaseConstants.chart:
        return <SeatingChart />;
      case AppPhaseConstants.finished:
        return <OutputPanel />;
      default:
        return <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="h5">準備中...</Typography>
              </Box>;
    }
  }
  return (
    <Layout>
      {renderPhaseContent()}
    </Layout>
  );
}

function App() {
  
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  )
}

export default App
