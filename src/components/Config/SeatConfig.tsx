import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  useTheme,
  Divider,
} from '@mui/material';
import SeatMapConfig from '../Seat/SeatMapConfig'; // 統合された SeatMapConfig をインポート
import type { SeatMap } from '../../types/Seat';
import type { Student } from '../../types/Student';

/**
 * SeatConfigProps インターフェース
 * 座席設定コンポーネントが受け取るPropsの型定義です。
 */
interface SeatConfigProps {
  /**
   * 現在の座席マップデータ（Appコンテキストから渡されることを想定）。
   */
  currentSeatMap: SeatMap;
  /**
   * 現在の生徒データ（Appコンテキストから渡されることを想定）。
   */
  students: Student[]; // student data is still needed for SeatMapConfig to preserve assignedStudentId if any
  /**
   * 設定が完了し、座席マップが更新されたときに呼び出されるコールバック関数です。
   */
  onConfigFinished: (updatedSeatMap: SeatMap) => void;
  /**
   * キャンセル時に呼び出されるコールバック関数です。
   */
  onCancel: () => void;
}

/**
 * 座席に関する設定を管理するコンポーネントです。
 * 1. 座席マップの行と列の設定、および個々の座席の使用可否設定 (SeatMapConfig)
 */
const SeatConfig: React.FC<SeatConfigProps> = ({
  currentSeatMap,
  onConfigFinished,
  onCancel,
}) => {
  const theme = useTheme();
  // ステッパーの現在のアクティブなステップ (ここでは1ステップのみ)
  const [activeStep, setActiveStep] = useState(0); // 0: レイアウト設定, 1: 完了

  // レイアウト設定 (SeatMapConfig) が完了したときのハンドラ
  const handleSeatMapConfigComplete = useCallback((rows: number, cols: number, finalSeatMap: SeatMap) => {
    // SeatMapConfig から受け取った最終的な座席マップを直接 onConfigFinished で親に渡す
    onConfigFinished(finalSeatMap);
    setActiveStep((prevActiveStep) => prevActiveStep + 1); // 完了ステップへ
    console.log('SeatMapConfig completed with rows:', rows, 'cols:', cols, 'finalSeatMap:', finalSeatMap);
  }, [onConfigFinished]);

  // 「設定を確定する」ボタンは、handleSeatMapConfigComplete が呼び出された時点で、
  // 親の onConfigFinished が呼び出されるため、このコンポーネントには最終ボタンは不要。
  // あるいは、完了画面で最終ボタンを表示する

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        座席設定
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* ステッパー (1ステップのみなのでシンプルになる) */}
      {/* <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper> */}

      {/* ステップコンテンツ */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        {activeStep === 0 && (
          <SeatMapConfig
            initialRows={currentSeatMap.length > 0 ? Math.max(...currentSeatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[1] || '0'))) : undefined}
            initialCols={currentSeatMap.length > 0 ? Math.max(...currentSeatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[2] || '0'))) : undefined}
            existingSeatMap={currentSeatMap} // 既存の座席マップを渡す
            onConfigComplete={handleSeatMapConfigComplete} // 統合されたハンドラを渡す
          />
        )}
        {activeStep === 1 && (
          <Box sx={{ mt: 3, p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
              座席設定が完了しました！
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              次のフェーズへ進むことができます。
            </Typography>
            {/* ここで直接次のフェーズへ進むボタンなどを配置するか、親に任せる */}
          </Box>
        )}
      </Paper>

      {/* ナビゲーションボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{ color: theme.palette.error.main, borderColor: theme.palette.error.main }}
        >
          キャンセル
        </Button>
      </Box>
    </Box>
  );
};

export default SeatConfig;