import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Grid,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAppState } from '../../contexts/AppStateContext';
import PrintableSeatChart from './PrintableSeatChart';

interface StudentOutputFields {
  id: boolean;
  number: boolean;
  name: boolean;
  kana: boolean;
  info1: boolean;
  info2: boolean;
  info3: boolean;
}

const OutputPanel: React.FC = () => {
  const { students, seatMap } = useAppState();

  const [selectedFields, setSelectedFields] = useState<StudentOutputFields>({
    id: false,
    number: true,
    name: true,
    kana: false,
    info1: false,
    info2: false,
    info3: false,
  });
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'info' });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedFields(prev => ({ ...prev, [event.target.name]: event.target.checked }));
    },
    []
  );

  const hasSelectedFields = useMemo(
    () => Object.values(selectedFields).some(v => v),
    [selectedFields]
  );

  const handlePrint = useCallback(() => {
    if (!hasSelectedFields) {
      showSnackbar('表示したい項目を選択してください。', 'warning');
      return;
    }
    window.print();
  }, [hasSelectedFields, showSnackbar]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!hasSelectedFields) {
      showSnackbar('表示したい項目を選択してください。', 'warning');
      return;
    }

    const maxRow = Math.max(...seatMap.map((seat) => seat.row));
    const maxCol = Math.max(...seatMap.map((seat) => seat.col));
    let csvContent = '';

    const activeFieldKeys: { key: keyof StudentOutputFields; label: string }[] = [];
    if (selectedFields.id) activeFieldKeys.push({ key: 'id', label: '生徒ID' });
    if (selectedFields.number) activeFieldKeys.push({ key: 'number', label: '出席番号' });
    if (selectedFields.name) activeFieldKeys.push({ key: 'name', label: '名前' });
    if (selectedFields.kana) activeFieldKeys.push({ key: 'kana', label: 'フリガナ' });
    if (selectedFields.info1) activeFieldKeys.push({ key: 'info1', label: '情報1' });
    if (selectedFields.info2) activeFieldKeys.push({ key: 'info2', label: '情報2' });
    if (selectedFields.info3) activeFieldKeys.push({ key: 'info3', label: '情報3' });

    for (let r = 1; r <= maxRow; r++) {
      activeFieldKeys.forEach(field => {
        const row: (string | number | null)[] = [field.label];
        for (let c = 1; c <= maxCol; c++) {
          const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
          const student = seat?.assignedStudentId
            ? students.find((s) => s.id === seat.assignedStudentId)
            : null;
          if (seat) {
            row.push(student ? (student[field.key as 'id' | 'number' | 'name' | 'kana' | 'info1' | 'info2' | 'info3'] ?? '') : '空席');
          } else {
            row.push('使用不可');
          }
        }
        csvContent += row.map(v => (v === null || v === undefined) ? '' : String(v)).join('\t') + '\n';
      });
    }

    try {
      await navigator.clipboard.writeText(csvContent);
      showSnackbar('座席データがクリップボードにコピーされました！表計算ソフトに貼り付けてください。', 'success');
    } catch {
      showSnackbar('クリップボードへのコピーに失敗しました。', 'error');
    }
  }, [hasSelectedFields, seatMap, students, selectedFields, showSnackbar]);

  return (
    <>
      {/* 印刷時には非表示にする操作パネル */}
      <Paper elevation={3} sx={{ p: 3, my: 3, display: 'flex', flexDirection: 'column', gap: 2, '@media print': { display: 'none' } }}>
        <Typography variant="h6" gutterBottom align="center">
          座席表出力オプション
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>表示項目を選択:</Typography>
        <Grid container spacing={1}>
          {(Object.entries(selectedFields) as [keyof StudentOutputFields, boolean][]).map(([key, value]) => (
            <Grid size={{ xs: 4, sm: 2 }} key={key}>
              <FormControlLabel
                control={<Checkbox checked={value} onChange={handleFieldChange} name={key} />}
                label={
                  key === 'id' ? '生徒ID' :
                  key === 'number' ? '出席番号' :
                  key === 'name' ? '名前' :
                  key === 'kana' ? 'フリガナ' :
                  `情報${key.slice(-1)}`
                }
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Tooltip title={hasSelectedFields ? '座席表を印刷' : '出力項目を選択してください'}>
            <span>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrint}
                startIcon={<PrintIcon />}
                disabled={!hasSelectedFields}
              >
                印刷
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={hasSelectedFields ? '座席データを表計算ソフト用にコピー' : '出力項目を選択してください'}>
            <span>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCopyToClipboard}
                startIcon={<ContentCopyIcon />}
                disabled={!hasSelectedFields}
              >
                コピー
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {/* 印刷対象エリア。@media print で #print-area だけが表示される */}
      <div id="print-area">
        <Paper elevation={3} sx={{ p: 3, my: 3, '@media print': { boxShadow: 'none', margin: 0, padding: 0 } }}>
          <Typography variant="h6" gutterBottom align="center" sx={{ '@media print': { display: 'none' } }}>
            座席表プレビュー
          </Typography>

          {/* 上部テキストボックス（タイトル欄） */}
          <TextField
            fullWidth
            variant="standard"
            placeholder="〇年〇組 座席表"
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            inputProps={{ style: { textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' } }}
            sx={{
              mb: 2,
              '@media print': {
                '& .MuiInput-underline::before, & .MuiInput-underline::after': { display: 'none' },
              },
            }}
          />

          <Box className="print-chart-wrapper" sx={{ overflowX: 'auto' }}>
            <PrintableSeatChart
              seatMap={seatMap}
              students={students}
              selectedFields={selectedFields}
            />
          </Box>

          {/* 下部テキストボックス（備考欄） */}
          <TextField
            fullWidth
            variant="standard"
            placeholder="〇月〇日から"
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
            inputProps={{ style: { textAlign: 'center' } }}
            sx={{
              mt: 2,
              '@media print': {
                '& .MuiInput-underline::before, & .MuiInput-underline::after': { display: 'none' },
              },
            }}
          />
        </Paper>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OutputPanel;
