// src/components/output/OutputPanel.tsx
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
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAppState } from '../../contexts/AppStateContext';
import PrintableSeatChart from './PrintableSeatChart';

// PDF生成ライブラリ (例: jsPDFとhtml2canvas)
// プロジェクトにインストールが必要です:
// npm install jspdf html2canvas
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 出力可能な生徒情報の項目
interface StudentOutputFields {
  id: boolean;
  number: boolean; // 出席番号など
  name: boolean;
  kana: boolean;
  info1: boolean;
  info2: boolean;
  info3: boolean;
}

const OutputPanel: React.FC = () => {
  const { students, seatMap } = useAppState();

  // チェックボックスの状態管理
  const [selectedFields, setSelectedFields] = useState<StudentOutputFields>({
    id: false,
    number: true, // デフォルトで出席番号を表示
    name: true, // デフォルトで名前を表示
    kana: false,
    info1: false,
    info2: false,
    info3: false,
  });

  // チェックボックスの変更ハンドラ
  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedFields({
        ...selectedFields,
        [event.target.name]: event.target.checked,
      });
    },
    [selectedFields]
  );

  // 選択された項目があるかどうかの判定 (ボタンの disabled 状態に使用)
  const hasSelectedFields = useMemo(() => {
    return Object.values(selectedFields).some((isChecked) => isChecked);
  }, [selectedFields]);

  // 座席表データと生徒情報を結合し、表示形式に整形する関数
  // この関数は、PDF出力とコピー機能で共通して使用します。
  const getOutputTableData = useCallback(() => {
    const tableData: { [key: string]: string | number | null }[][] = [];
    const maxRow = Math.max(...seatMap.map((seat) => seat.row));
    const maxCol = Math.max(...seatMap.map((seat) => seat.col));

    for (let r = 1; r <= maxRow; r++) {
      const rowData: { [key: string]: string | number | null }[] = [];
      for (let c = 1; c <= maxCol; c++) {
        const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
        let cellData: { [key: string]: string | number | null } = {
          seatId: seat ? seat.seatId : null,
          row: r,
          col: c,
        };

        if (seat && seat.assignedStudentId) {
          const student = students.find((s) => s.id === seat.assignedStudentId);
          if (student) {
            // 選択されたフィールドのみをセルデータに追加
            if (selectedFields.id) cellData.id = student.id;
            if (selectedFields.number) cellData.number = student.number;
            if (selectedFields.name) cellData.name = student.name;
            if (selectedFields.kana) cellData.kana = student.kana;
            if (selectedFields.info1) cellData.info1 = student.info1;
            if (selectedFields.info2) cellData.info2 = student.info2;
            if (selectedFields.info3) cellData.info3 = student.info3;
          }
        }
        rowData.push(cellData);
      }
      tableData.push(rowData);
    }
    return tableData;
  }, [students, seatMap, selectedFields]);

  // PDF出力ハンドラ
  const handleGeneratePdf = useCallback(async () => {
    if (!hasSelectedFields) {
      // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
      alert('表示したい項目を選択してください。');
      return;
    }

    // main-seating-chart-container の内容をPDF化します。
    // このdivには、SeatMapChartと詳細データテーブルの両方が含まれます。
    const input = document.getElementById('main-seating-chart-container');

    if (!input) {
      // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
      alert('PDF出力元の要素が見つかりません。開発者ツールでIDを確認してください。');
      return;
    }

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // 高解像度でキャプチャ
        useCORS: true, // 外部画像などがある場合にCORSを許可
        logging: true, // デバッグ用にログを出力
      });
      const imgData = canvas.toDataURL('image/jpeg');
      const pdf = new jsPDF({
        orientation: 'landscape', // 横向き
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 297; // A4横の幅
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const margin = 10;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth - 2 * margin, imgHeight - 2 * margin);
      pdf.save('seat-arrangement-chart.pdf');
    } catch (error) {
      console.error('PDF生成中にエラーが発生しました:', error);
      // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
      alert('PDFの生成に失敗しました。');
    }
  }, [hasSelectedFields]);


  // クリップボードにコピーするハンドラ (CSV形式)
  const handleCopyToClipboard = useCallback(() => {
    if (!hasSelectedFields) {
      // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
      alert('表示したい項目を選択してください。');
      return;
    }

    const maxRow = Math.max(...seatMap.map((seat) => seat.row));
    const maxCol = Math.max(...seatMap.map((seat) => seat.col));
    let csvContent = '';

    // 選択されたフィールドのキーのリストと、そのラベルのマップ
    const activeFieldKeys: { key: keyof StudentOutputFields; label: string }[] = [];
    if (selectedFields.id) activeFieldKeys.push({ key: 'id', label: '生徒ID' });
    if (selectedFields.number) activeFieldKeys.push({ key: 'number', label: '出席番号' });
    if (selectedFields.name) activeFieldKeys.push({ key: 'name', label: '名前' });
    if (selectedFields.kana) activeFieldKeys.push({ key: 'kana', label: 'フリガナ' });
    if (selectedFields.info1) activeFieldKeys.push({ key: 'info1', label: '情報1' });
    if (selectedFields.info2) activeFieldKeys.push({ key: 'info2', label: '情報2' });
    if (selectedFields.info3) activeFieldKeys.push({ key: 'info3', label: '情報3' });

    // 各座席表の行に対応するCSVブロックを生成
    for (let r = 1; r <= maxRow; r++) {

      // 各項目ごとのデータ行を生成 (例: 出席番号	S1_番号	S2_番号)
      activeFieldKeys.forEach(field => {
        let fieldDataRow: (string | number | null)[] = [];
        fieldDataRow.push(field.label); // 項目名（例: 出席番号）

        for (let c = 1; c <= maxCol; c++) {
          const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
          const student = seat && seat.assignedStudentId
            ? students.find((s) => s.id === seat.assignedStudentId)
            : null;

          if (seat) { // 使用可能な座席
            if (student) { // 生徒が割り当てられている場合
              // @ts-ignore
              fieldDataRow.push(student[field.key] ?? ''); // 該当フィールドの値
            } else { // 空席の場合
              fieldDataRow.push('空席');
            }
          } else { // 使用不可な座席
            fieldDataRow.push('使用不可');
          }
        }
        csvContent += fieldDataRow.map(v => (v === null || v === undefined) ? '' : String(v)).join('\t') + '\n';
      });
    }

    // document.execCommand('copy') を使用してクリップボードにコピー
    const textarea = document.createElement('textarea');
    textarea.value = csvContent;
    textarea.style.position = 'fixed'; // 画面外に配置
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
        alert('座席データがクリップボードにコピーされました！\n表計算ソフトに貼り付けてください。');
      } else {
        console.error('Fallback: クリップボードへのコピーに失敗しました (execCommand)');
        // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
        alert('クリップボードへのコピーに失敗しました。ブラウザがこの操作を許可していません。');
      }
    } catch (err) {
      console.error('Fallback: クリップボードへのコピー中にエラーが発生しました:', err);
      // NOTE: alert() は UI をブロックするため、本番環境ではカスタムモーダルなどに置き換えるべきです。
      alert('クリップボードへのコピーに失敗しました。');
    } finally {
      document.body.removeChild(textarea); // 一時的なtextareaを削除
    }
  }, [hasSelectedFields, getOutputTableData, selectedFields]);

  return (
    <>
      {/* 既存の出力オプションコントロール */}
      <Paper elevation={3} sx={{ p: 3, my: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" gutterBottom align="center">
          座席表出力オプション
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>表示項目を選択:</Typography>
        <Grid container spacing={1}>
          {Object.entries(selectedFields).map(([key, value]) => (
            // @ts-ignore
            <Grid item xs={4} sm={2} key={key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={value}
                    onChange={handleFieldChange}
                    name={key}
                  />
                }
                label={
                  key === 'id' ? '生徒ID' :
                  key === 'number' ? '出席番号' :
                  key === 'name' ? '名前' :
                  key === 'kana' ? 'フリガナ' :
                  `情報${key.slice(-1)}` // info1, info2, info3
                }
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Tooltip title={hasSelectedFields ? "現在の座席表をPDFで出力" : "出力項目を選択してください"}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGeneratePdf}
              startIcon={<PictureAsPdfIcon />}
              disabled={!hasSelectedFields}
            >
              PDF出力
            </Button>
          </Tooltip>
          <Tooltip title={hasSelectedFields ? "座席データを表計算ソフト用にコピー" : "出力項目を選択してください"}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCopyToClipboard}
              startIcon={<ContentCopyIcon />}
              disabled={!hasSelectedFields}
            >
              コピー
            </Button>
          </Tooltip>
        </Box>
      </Paper>

      {/* main-seating-chart-container: 座席表プレビューと詳細データ表示用 */}
      <Paper elevation={3} sx={{ p: 3, my: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          座席表プレビューと詳細データ
        </Typography>
        <div id="main-seating-chart-container" style={{ padding: '20px', overflowX: 'auto' }}>
          {/* 視覚的な座席表 */}
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>座席表</Typography>
          <Typography variant="h5"  sx={{ my: 2, mx: 32, p: 1, border: 2, textAlign: "center" }}>教卓</Typography>
          <PrintableSeatChart
            seatMap={seatMap}
            students={students}
            selectedFields={selectedFields}
          />

        </div>
        {/* 詳細データテーブル */}
        {hasSelectedFields ? (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>座席詳細データ</Typography>
            <div style={{ overflowX: 'auto' }}> {/* 小さい画面での横スクロールを可能にする */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>行</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>列</th>
                    {selectedFields.id && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>生徒ID</th>}
                    {selectedFields.number && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>出席番号</th>}
                    {selectedFields.name && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>名前</th>}
                    {selectedFields.kana && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>フリガナ</th>}
                    {selectedFields.info1 && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>情報1</th>}
                    {selectedFields.info2 && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>情報2</th>}
                    {selectedFields.info3 && <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>情報3</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* getOutputTableDataの結果をフラット化し、各座席データをテーブルの行として表示 */}
                  {getOutputTableData().flat().map((seatCellData, index) => {
                    // isUsableがfalseの座席や、生徒が割り当てられていない座席はテーブルに表示しない
                    if (seatCellData.seatId === null && seatCellData.assignedStudentId === null) {
                      return null;
                    }
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.row}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.col}</td>
                        {selectedFields.id && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.id ?? ''}</td>}
                        {selectedFields.number && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.number ?? ''}</td>}
                        {selectedFields.name && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.name ?? ''}</td>}
                        {selectedFields.kana && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.kana ?? ''}</td>}
                        {selectedFields.info1 && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.info1 ?? ''}</td>}
                        {selectedFields.info2 && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.info2 ?? ''}</td>}
                        {selectedFields.info3 && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{seatCellData.info3 ?? ''}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Typography variant="body1" color="textSecondary" sx={{ mt: 4, textAlign: 'center' }}>
            表示する項目を選択すると、詳細データが表示されます。
          </Typography>
        )}
      </Paper>
    </>
  );
};

export default OutputPanel;