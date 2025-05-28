import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material'; // Typography を追加
import Seat from './Seat';
import type { SeatMap } from '../../types/Seat'; // SeatMap と SeatMapData をインポート
import type { Student } from '../../types/Student';
import { Droppable } from '@hello-pangea/dnd';

interface SeatMapChartProps {
  seatMap: SeatMap; // SeatMapData の配列を受け取る
  students: Student[]; // 全生徒データ
  highlightedSeatIds?: Set<string>; // ハイライトする座席IDのSet
  onClickSeat?: (seatId: string) => void; // 座席クリック時のハンドラ
  displayMode: 'config' | 'assign' | 'final'; // 表示モード
  isDragAndDropEnabled?: boolean; // D&Dが有効なフェーズかどうかのフラグ
  // ルーレット決定フェーズで使用される可能性のある情報もここで定義
  // 例: currentRouletteStudentId: string | null;
}

const SeatMapChart: React.FC<SeatMapChartProps> = ({
  seatMap,
  students,
  highlightedSeatIds = new Set(),
  onClickSeat,
  displayMode,
  isDragAndDropEnabled = false,
}) => {
  // 生徒IDから生徒オブジェクトを高速に検索するためのMap
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  // 座席マップの行と列の最大値を計算（グリッドレイアウトのために必要）
  // SeatMapData に row/col が直接含まれないため、座席IDから推測するか、
  // 親コンポーネントから rows/cols の情報を渡す必要があります。
  // ここでは座席IDが "R{row}C{col}" 形式と仮定して最大列数を計算します。
  const maxCols = useMemo(() => {
    if (seatMap.length === 0) return 1;
    let currentMaxCols = 0;
    seatMap.forEach(seat => {
      const match = seat.seatId.match(/C(\d+)$/);
      if (match && match[1]) {
        currentMaxCols = Math.max(currentMaxCols, parseInt(match[1], 10));
      }
    });
    return currentMaxCols || 1; // 少なくとも1列
  }, [seatMap]);


  // seatMapが空の場合のガード
  if (!seatMap || seatMap.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', mt: 3, width: '100%', maxWidth: 600 }}>
        <Typography variant="h6" color="text.secondary">
          座席マップが設定されていません。
        </Typography>
        <Typography variant="body2" color="text.secondary">
          「座席レイアウト設定」から座席を作成してください。
        </Typography>
      </Paper>
    );
  }

  // 座席がドロップ可能かどうかを制御
  // isDragAndDropEnabled が true の場合にのみ、個々の座席がドロップ可能になるように Seat に渡す
  const isSeatDroppableInThisMode = isDragAndDropEnabled && (displayMode === 'final'); // D&Dは final モードでのみ有効とする

  return (
    <Box
      sx={{
        display: 'grid',
        // maxCols を使用して動的にカラム数を設定
        gridTemplateColumns: `repeat(${maxCols}, minmax(80px, 1fr))`,
        gap: 1.5,
        p: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        bgcolor: 'background.paper',
        width: 'fit-content',
        boxShadow: 3,
        overflowX: 'auto',
      }}
    >
      {seatMap.map((seat) => (
        <Droppable droppableId={seat.seatId} key={seat.seatId} isDropDisabled={!isSeatDroppableInThisMode}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: '80px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Seat
                // seatId と assignedStudentId を直接渡すように変更
                seatId={seat.seatId}
                seatData={seat}
                // 座席の行と列の情報を Seat.tsx に渡す場合
                // row={/* seatIdから解析するか、別のpropsとしてAppから渡す */}
                // col={/* seatIdから解析するか、別のpropsとしてAppから渡す */}
                onClick={onClickSeat ? () => onClickSeat(seat.seatId) : undefined}
                isConfigMode={displayMode === 'config'}
                isHighlighted={highlightedSeatIds.has(seat.seatId)}
                displayMode={displayMode}
                assignedStudent={seat.assignedStudentId ? studentMap.get(seat.assignedStudentId) : null}
                // D&Dのドラッグ可能状態をSeatに渡す
                // 生徒が割り当てられていて、かつ D&Dが有効なフェーズの場合のみドラッグ可能
                isDragDisabled={!(isDragAndDropEnabled && displayMode === 'final' && seat.assignedStudentId)}
              />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ))}
    </Box>
  );
};

export default SeatMapChart;