import React, { useCallback, useMemo, useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd'; // hello-pangea/dnd の DropResult をインポート
import SeatMapChart from '../Seat/SeatMapChart';
import { useAppState } from '../../contexts/AppStateContext'; // AppStateContext から必要なものをインポート
import type { Student } from '../../types/Student'; // Student 型をインポート
import type { SeatMapData } from '../../types/Seat'; // SeatMapData をインポート

interface SeatingChartProps {
  // AppStateContext から必要な状態を取得するため、特定のPropsは不要
  // ただし、必要に応じてSeatingChart固有のPropsを追加可能
}

const SeatingChart: React.FC<SeatingChartProps> = () => {
  // AppStateContext から必要な状態とセッターを取得
  const {
    students,
    setStudents,
    seatMap,
    setSeatMap,
    appPhase,
    setAppPhase,
  } = useAppState();

  // まだ席が決まっていない生徒
  const unassignedStudents = useMemo(
    () => students.filter((s) => !s.assignedSeatId),
    [students]
  );

  // コンポーネントがマウントされた際、または appPhase が変更された際に、
  // 全員の席が決まっているかチェックし、決まっていない場合はルーレットフェーズに戻す
  useEffect(() => {
    if (appPhase === 'chart' || appPhase === 'finished') { // このフェーズに入ろうとした時にチェック
      if (unassignedStudents.length > 0) {
        console.warn('全ての生徒が席に割り当てられていません。ルーレットフェーズに戻ります。');
        setAppPhase('roulette'); // ルーレットフェーズに戻す
      }
    }
  }, [appPhase, unassignedStudents.length, setAppPhase]); // 依存配列にunassignedStudents.lengthを追加

  // ドラッグ＆ドロップの終了時のハンドラ（座席調整フェーズ用）
  const handleMoveStudent = useCallback((result: DropResult) => {
    // appPhase が 'chart' (座席調整フェーズ) でない場合は何もしない
    if (appPhase !== 'chart') return;

    if (!result.destination) {
      return; // ドロップ先がない場合
    }

    const draggedStudentId = result.draggableId; // DraggableId は生徒ID
    const fromSeatId = result.source.droppableId; // Source DroppableId は元の座席ID
    const toSeatId = result.destination.droppableId; // Destination DroppableId は新しい座席ID

    // 同じ座席にドロップされた場合、何もしない
    if (fromSeatId === toSeatId) {
      return;
    }

    // 移動先の座席に既に生徒が座っているか確認
    const studentAtToSeat = students.find(s => s.assignedSeatId === toSeatId);

    // 生徒の状態を更新
    setStudents((prevStudents: Student[]) => {
      let newStudents = [...prevStudents];
      // ドラッグされた生徒の席を更新
      newStudents = newStudents.map((s) =>
        s.id === draggedStudentId ? { ...s, assignedSeatId: toSeatId } : s
      );

      // 移動先の席に生徒がいた場合、その生徒を元の席に戻す（入れ替え）
      if (studentAtToSeat) {
        newStudents = newStudents.map((s) =>
          s.id === studentAtToSeat.id ? { ...s, assignedSeatId: fromSeatId } : s
        );
      }
      return newStudents;
    });

    // 座席マップの状態を更新
    setSeatMap((prevMap: SeatMapData[]) => {
      let newMap = [...prevMap];
      // 元の座席を空にする（または入れ替えの場合は元の生徒を戻す）
      newMap = newMap.map((seat: SeatMapData) => // SeatMapData 型を明示
        seat.seatId === fromSeatId ? { ...seat, assignedStudentId: studentAtToSeat ? studentAtToSeat.id : null } : seat
      );
      // 新しい座席に生徒を割り当てる
      newMap = newMap.map((seat: SeatMapData) => // SeatMapData 型を明示
        seat.seatId === toSeatId ? { ...seat, assignedStudentId: draggedStudentId } : seat
      );
      return newMap;
    });

  }, [appPhase, students, setStudents, setSeatMap]); // 依存配列に students, setStudents, setSeatMap を追加

  // 座席調整フェーズ完了ボタンのハンドラ
  const handleAdjustCompleteButtonClick = useCallback(() => {
    setAppPhase('finished'); // 座席調整完了後、'finished' (最終表示フェーズ) に遷移
  }, [setAppPhase]);

  // D&Dが有効なフェーズかどうか
  // 'chart' が座席調整フェーズに相当
  const isDragAndDropActive = appPhase === 'chart';

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Typography variant="h5" gutterBottom>
        {appPhase === 'chart' ? '座席調整・確認' :
         appPhase === 'finished' ? '最終座席表' :
         '座席表'}
      </Typography>

      {/* まだ席が決まっていない生徒がいる場合の注意メッセージ */}
      {appPhase !== 'roulette' && unassignedStudents.length > 0 && (
          <Paper elevation={3} sx={{ p: 2, bgcolor: 'error.light', color: 'white', minWidth: 200, textAlign: 'center' }}>
            <Typography variant="h6">
              ！未配置の生徒がいます！
            </Typography>
            <Typography variant="body2">
              ルーレットフェーズに戻って生徒を配置してください。
            </Typography>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => setAppPhase('roulette')}
              sx={{ mt: 1 }}
            >
              ルーレットに戻る
            </Button>
          </Paper>
        )}

      {/* D&Dコンテキストは、D&Dが有効なフェーズまたは最終表示フェーズでラップする */}
      {isDragAndDropActive || appPhase === 'finished' ? (
        <DragDropContext onDragEnd={handleMoveStudent}>
          <SeatMapChart
            seatMap={seatMap}
            students={students}
            highlightedSeatIds={new Set()} // 調整/最終フェーズではハイライト不要
            onClickSeat={undefined} // 調整/最終フェーズではクリックによる割り当ては行わない
            displayMode="final" // 最終表示モード
            isDragAndDropEnabled={isDragAndDropActive} // D&Dを有効にするかどうかを appPhase で制御
          />
        </DragDropContext>
      ) : (
        // その他のフェーズ（roulette、input、config、relationなど）ではD&Dは無効
        // SeatMapChartは表示のみ
        <SeatMapChart
          seatMap={seatMap}
          students={students}
          highlightedSeatIds={new Set()} // このフェーズではハイライトしない
          onClickSeat={undefined} // このフェーズではクリックによる割り当ては行わない
          displayMode="assign" // 表示モードは'assign'または'config'に適宜変更してください
          isDragAndDropEnabled={false} // D&Dを無効にする
        />
      )}

      {/* 座席調整フェーズ完了ボタン */}
      {appPhase === 'chart' && unassignedStudents.length === 0 && ( // 全員着席している場合のみ表示
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleAdjustCompleteButtonClick}
          sx={{ mt: 2 }}
        >
          座席調整を完了する
        </Button>
      )}

      {/* 最終完了フェーズでの表示 */}
      {appPhase === 'finished' && (
        <Typography variant="h6" color="success.main" sx={{mt: 2}}>
          最終的な座席配置が完了しました！
        </Typography>
      )}
    </Box>
  );
};

export default SeatingChart;