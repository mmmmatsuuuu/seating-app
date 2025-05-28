import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Divider
} from '@mui/material';
import Seat from './Seat';
import { DEFAULT_SEAT_ROWS, DEFAULT_SEAT_COLS, MAX_SEATS } from '../../constants';
import type { SeatMap, SeatMapData } from '../../types/Seat';

/**
 * SeatMapConfig コンポーネントが受け取るPropsの型定義です。
 */
interface SeatMapConfigProps {
  /**
   * 座席レイアウト設定が完了したときに呼び出されるコールバック関数です。
   * 設定された行数、列数、そして最終的な座席マップを引数として受け取ります。
   */
  onConfigComplete: (rows: number, cols: number, finalSeatMap: SeatMap) => void;

  /**
   * 初期行数です。指定がなければ DEFAULT_SEAT_ROWS が使用されます。
   */
  initialRows?: number;

  /**
   * 初期列数です。指定がなければ DEFAULT_SEAT_COLS が使用されます。
   */
  initialCols?: number;

  /**
   * 既存の座席マップデータ。編集開始時の初期値として使用されます。
   */
  existingSeatMap?: SeatMap;
}

/**
 * 座席レイアウト（行数と列数）を設定し、個々の座席の使用可否を設定するコンポーネントです。
 */
const SeatMapConfig: React.FC<SeatMapConfigProps> = ({
  onConfigComplete,
  initialRows = DEFAULT_SEAT_ROWS,
  initialCols = DEFAULT_SEAT_COLS,
  existingSeatMap = [],
}) => {
  const [rows, setRows] = useState<number>(initialRows);
  const [cols, setCols] = useState<number>(initialCols);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentEditedSeatMap, setCurrentEditedSeatMap] = useState<SeatMap>([]);

  // コンポーネントがマウントされたとき、または行・列・既存マップが変更されたときに座席マップを生成
  useEffect(() => {
    const newMap: SeatMapData[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seatId = `R${r + 1}C${c + 1}`;
        const existingSeat = existingSeatMap.find(s => s.seatId === seatId);
        newMap.push({
          seatId: seatId,
          assignedStudentId: existingSeat ? existingSeat.assignedStudentId : null,
          isUsable: existingSeat ? existingSeat.isUsable : true,
          row: r + 1, // 行番号を1から始める
          col: c + 1, // 列番号を1から始める
        });
      }
    }
    setCurrentEditedSeatMap(newMap);
  }, [rows, cols, existingSeatMap]);

  // 行数の入力ハンドラ
  const handleRowsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) {
      setRows(1);
      setErrorMessage('行数は1以上の整数で入力してください。');
    } else if (value * cols > MAX_SEATS) {
       setRows(value);
       setErrorMessage(`総座席数が${MAX_SEATS}を超える可能性があります。行数は${Math.floor(MAX_SEATS / cols)}以下にしてください。`);
    } else {
      setRows(value);
      setErrorMessage(null);
    }
  }, [cols]);

  // 列数の入力ハンドラ
  const handleColsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) {
      setCols(1);
      setErrorMessage('列数は1以上の整数で入力してください。');
    } else if (value * rows > MAX_SEATS) {
      setCols(value);
      setErrorMessage(`総座席数が${MAX_SEATS}を超える可能性があります。列数は${Math.floor(MAX_SEATS / rows)}以下にしてください。`);
    } else {
      setCols(value);
      setErrorMessage(null);
    }
  }, [rows]);

  // 座席クリックハンドラ：isUsableをトグル
  const handleSeatClick = useCallback((seatId: string) => {
    setCurrentEditedSeatMap(prevMap => {
      return prevMap.map(seat =>
        seat.seatId === seatId ? { ...seat, isUsable: !seat.isUsable } : seat
      );
    });
  }, []);

  // 「座席マップを確定し次へ」ボタンのハンドラ
  const handleGenerateClick = useCallback(() => {
    if (rows < 1 || cols < 1) {
      setErrorMessage('行数、列数ともに1以上の整数を入力してください。');
      return;
    }
    if (rows * cols > MAX_SEATS) {
        setErrorMessage(`総座席数が${MAX_SEATS}を超えています。行数または列数を減らしてください。`);
        return;
    }

    setErrorMessage(null);
    onConfigComplete(rows, cols, currentEditedSeatMap);
  }, [rows, cols, currentEditedSeatMap, onConfigComplete]);

  // 使用可能な座席数を計算するuseMemo
  const usableSeatCount = useMemo(() => {
    return currentEditedSeatMap.filter(seat => seat.isUsable).length;
  }, [currentEditedSeatMap]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        座席レイアウトの設定
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        座席の行数と列数を入力し、座席をクリックして使用不可の座席を設定します。
      </Typography>

      {/* 行数・列数入力エリア */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* @ts-ignore */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="行数 (Rows)"
              type="number"
              value={rows}
              onChange={handleRowsChange}
              fullWidth
              inputProps={{ min: 1 }}
              error={!!errorMessage && errorMessage.includes('行数')}
              helperText={!!errorMessage && errorMessage.includes('行数') ? errorMessage : ' '}
            />
          </Grid>
          {/* @ts-ignore */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="列数 (Columns)"
              type="number"
              value={cols}
              onChange={handleColsChange}
              fullWidth
              inputProps={{ min: 1 }}
              error={!!errorMessage && errorMessage.includes('列数')}
              helperText={!!errorMessage && errorMessage.includes('列数') ? errorMessage : ' '}
            />
          </Grid>
        </Grid>

        {/* 総座席数表示を「使用可能な座席数」に変更 */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'right' }}>
          使用可能な座席数: {usableSeatCount} 席 (総座席数: {rows * cols})
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>入力エラー</AlertTitle>
            {errorMessage}
          </Alert>
        )}
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* 座席設定エリア */}
      <Typography variant="h6" component="h3" gutterBottom>
        座席の使用可否設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        表示されている座席をクリックして、使用不可に設定できます。
      </Typography>
      <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
        <Grid container spacing={1} justifyContent="center" wrap="wrap">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            // @ts-ignore
            <Grid container item xs={12} key={`row-${rowIndex}`} spacing={1} justifyContent="center" wrap="nowrap">
              {Array.from({ length: cols }).map((_, colIndex) => {
                const seatId = `R${rowIndex + 1}C${colIndex + 1}`;
                const seatData = currentEditedSeatMap.find(s => s.seatId === seatId);
                const displaySeatData: SeatMapData = seatData || {
                  seatId: seatId,
                  assignedStudentId: null,
                  isUsable: true,
                  row: rowIndex + 1, // 行番号を1から始める
                  col: colIndex + 1, // 列番号を1から始める
                };

                return (
                  // @ts-ignore
                  <Grid item key={seatId}>
                    <Seat
                      seatId={seatId}
                      seatData={displaySeatData}
                      assignedStudent={null}
                      onClick={handleSeatClick}
                      isConfigMode={true} // このコンポーネントでは常に設定モード
                      isHighlighted={false} // ハイライトは設定モードでは不要
                      displayMode="config" // 表示モードを設定モードに
                      isDragDisabled={true} // ドラッグは設定モードでは無効
                    />
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </Paper>
      {rows * cols > MAX_SEATS && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>警告</AlertTitle>
            設定された総座席数が推奨される最大数（{MAX_SEATS}）を超えています。パフォーマンスに影響が出る可能性があります。
          </Alert>
      )}

      {/* 次へボタン */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGenerateClick}
          disabled={!!errorMessage || rows < 1 || cols < 1 || rows * cols === 0 || rows * cols > MAX_SEATS}
        >
          座席レイアウトを確定し次へ
        </Button>
      </Box>
    </Box>
  );
};

export default SeatMapConfig;