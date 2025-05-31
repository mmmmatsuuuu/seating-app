import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/system';
import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';
import { Draggable } from '@hello-pangea/dnd'; // Draggable をインポート

interface SeatProps {
  seatId: string;
  seatData: SeatMapData;
  assignedStudent?: Student | null;
  onClick?: (seatId: string) => void;
  // --- 新しく追加・変更するProps ---
  isConfigMode: boolean; // 設定モードかどうか
  isHighlighted?: boolean; // ルーレット決定フェーズでハイライト表示するかどうか
  displayMode: 'config' | 'roulette' | 'assign' | 'final'; // 現在の表示モード
  isDragDisabled?: boolean; // ドラッグを無効にするかどうか (SeatMapChartから渡される)
}

const Seat: React.FC<SeatProps> = ({
  seatId,
  seatData,
  assignedStudent,
  onClick,
  isConfigMode,
  isHighlighted = false, // デフォルト値を設定
  displayMode,
  isDragDisabled = true, // デフォルトはドラッグ無効
}) => {
  const { isUsable, assignedStudentId } = seatData;

  const handleClick = () => {
    // D&Dが有効な final モードでは、座席のクリックはD&Dを優先するため、
    // onClick はルーレット決定フェーズ（assignモード）でのみ有効とするのが一般的です。
    // 設定モード（config）では isConfigMode で制御。
    if (onClick && (isConfigMode || displayMode === 'assign')) {
      onClick(seatId);
    }
  };

  // 座席の背景色と境界線の色を動的に決定
  const seatColor = useMemo(() => {
    if (isConfigMode) {
      // 設定モード
      return isUsable ? 'lightgreen' : 'grey.400'; // 使用可能/不可を明示
    } else {
      // 表示モード ('assign' or 'final')
      if (!isUsable) return 'grey.300'; // 使用不可の席
      if (assignedStudentId) return 'info.main'; // 生徒が座っている席
      if (isHighlighted) return 'warning.light'; // ハイライトされている空席 (ルーレット決定用)
      return 'primary.light'; // 通常の空席
    }
  }, [isConfigMode, isUsable, assignedStudentId, isHighlighted]);

  const borderColor = useMemo(() => {
    if (isHighlighted) return 'warning.dark'; // ハイライトされている場合は強調
    if (isConfigMode) return isUsable ? 'lightgreen' : 'grey.500';
    return assignedStudentId ? 'info.dark' : 'primary.dark';
  }, [isConfigMode, isUsable, assignedStudentId, isHighlighted]);

  const textColor = useMemo(() => {
    if (isConfigMode) return 'text.primary';
    if (!isUsable) return 'text.secondary';
    if (assignedStudentId) return 'white'; // 生徒名が白で見やすいように
    if (isHighlighted) return 'text.primary';
    return 'text.primary';
  }, [isConfigMode, isUsable, assignedStudentId, isHighlighted]);


  // カーソルの表示をモードとD&Dの状態に応じて制御
  const cursorStyle = useMemo(() => {
    if (isConfigMode || (displayMode === 'assign' && isHighlighted)) {
      return 'pointer'; // 設定変更、ルーレット決定時のクリック可能
    }
    if (displayMode === 'final' && !isDragDisabled && assignedStudentId) {
      return 'grab'; // D&Dが有効でドラッグ可能なら grab
    }
    return 'default'; // その他はデフォルト
  }, [isConfigMode, displayMode, isHighlighted, isDragDisabled, assignedStudentId]);

  const seatStyles: SxProps<Theme> = {
    width: { xs: 70, sm: 80, md: 110 }, // 幅の調整
    height: { xs: 70, sm: 80, md: 80 }, // 高さの調整
    fontSize: { xs: '0.6rem', sm: '0.75rem', md: '0.85rem' }, // フォントサイズの調整
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    p: 0.5, // パディングを少し減らす
    borderRadius: 2,
    transition: 'all 0.2s ease-in-out',
    boxShadow: 1,

    bgcolor: seatColor,
    border: `2px solid ${borderColor}`, // 境界線を太くして見やすく
    opacity: isUsable ? 1 : 0.6,
    cursor: cursorStyle,

    // ホバー時のスタイル
    '&:hover': {
      bgcolor: (() => {
        if (isConfigMode || (displayMode === 'assign' && isHighlighted)) {
          return isUsable ? (assignedStudentId ? 'primary.main' : 'grey.300') : 'grey.500';
        }
        if (displayMode === 'final' && !isDragDisabled && assignedStudentId) {
          return 'info.dark'; // ドラッグ可能時のホバー色
        }
        return undefined; // ホバーしない
      })(),
      boxShadow: 3,
      opacity: (() => {
        if (isConfigMode || (displayMode === 'assign' && isHighlighted) || (displayMode === 'final' && !isDragDisabled && assignedStudentId)) {
          return 0.8;
        }
        return undefined;
      })(),
    },
  };

  // 座席IDから行と列の情報を解析 (例: "R1C1" -> R:1, C:1)
  const match = seatId.match(/R(\d+)C(\d+)$/);
  const rowColText = match ? `(${match[1]},${match[2]})` : '';


  // 生徒が割り当てられており、かつ final モードで D&D が有効な場合のみ Draggable でラップ
  const shouldBeDraggable = displayMode === 'final' && assignedStudentId && !isDragDisabled;

  const seatContent = (
    <>
      <Typography variant="caption" color="text.secondary"
        sx={{ fontSize: { xs: '0.4rem', sm: '0.5rem', md: '0.6rem' }, color: textColor }} // テキスト色も統一
      >
        {`座席 ${seatId} ${rowColText}`} {/* 行列情報を追加 */}
      </Typography>

      {assignedStudentId && assignedStudent ? (
        <Box sx={{ textAlign: 'center', mt: 0.5 }}>
          <Typography variant="body1" component="div"
            sx={{ fontWeight: 'bold', lineHeight: 1.2, fontSize: { xs: '0.5rem', sm: '0.75rem', md: '1rem' }, color: textColor }}
          >
            {assignedStudent.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1.2}
            sx={{ fontSize: { xs: '0.3rem', sm: '0.3rem', md: '0.5rem' }, color: textColor }}
          >
            ({assignedStudent.number})
          </Typography>
        </Box>
      ) : (
        // 空席または使用不可の表示
        <Typography variant="body2" color="text.secondary"
          sx={{ mt: 0.5, fontSize: { xs: '0.5rem', sm: '0.75rem', md: '1rem' }, color: textColor }}
        >
          {isConfigMode ? (isUsable ? '使用可能' : '使用不可') : (isUsable ? '空席' : '使用不可')}
        </Typography>
      )}

      {/* ルーレット決定フェーズでハイライトされている空席の場合の表示 */}
      {displayMode === 'assign' && isHighlighted && !assignedStudentId && (
        <Typography variant="body2" sx={{ fontWeight: 'bold', animation: 'blink 1s infinite', mt: 0.5, color: 'text.primary' }}>
          ここに配置
        </Typography>
      )}
      {/* CSSアニメーションを定義 */}
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );

  return (
    <Paper
      elevation={isUsable ? (assignedStudentId ? 4 : (isHighlighted ? 3 : 2)) : 0} // 影の濃さを状態に応じて調整
      sx={seatStyles}
      onClick={handleClick}
    >
      {shouldBeDraggable ? (
        <Draggable draggableId={assignedStudentId!} index={0} isDragDisabled={isDragDisabled}>
          {(providedDraggable, snapshotDraggable) => (
            <Box
              ref={providedDraggable.innerRef}
              {...providedDraggable.draggableProps}
              {...providedDraggable.dragHandleProps}
              sx={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                // ドラッグ中のスタイル
                bgcolor: snapshotDraggable.isDragging ? 'info.dark' : undefined,
                color: snapshotDraggable.isDragging ? 'white' : undefined,
                borderRadius: 'inherit', // 親のPaperのborderRadiusを継承
              }}
            >
              {seatContent}
            </Box>
          )}
        </Draggable>
      ) : (
        seatContent
      )}
    </Paper>
  );
};

export default Seat;