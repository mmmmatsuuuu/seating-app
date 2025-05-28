// src/components/output/SeatingTable.tsx
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useAppState } from '../../contexts/AppStateContext';

// OutputPanel.tsx と同じフィールド定義を使用
interface StudentOutputFields {
  id: boolean;
  number: boolean;
  name: boolean;
  kana: boolean;
  info1: boolean;
  info2: boolean;
  info3: boolean;
}

interface SeatingTableProps {
  // 表示するフィールドの選択状態を受け取る
  selectedFields: StudentOutputFields;
}

const SeatingTable: React.FC<SeatingTableProps> = ({ selectedFields }) => {
  const { students, seatMap } = useAppState();

  // 表示するヘッダーを動的に生成
  const headers = useMemo(() => {
    const defaultHeaders = ['行', '列'];
    if (selectedFields.id) defaultHeaders.push('生徒ID');
    if (selectedFields.number) defaultHeaders.push('出席番号');
    if (selectedFields.name) defaultHeaders.push('名前');
    if (selectedFields.kana) defaultHeaders.push('フリガナ');
    if (selectedFields.info1) defaultHeaders.push('情報1');
    if (selectedFields.info2) defaultHeaders.push('情報2');
    if (selectedFields.info3) defaultHeaders.push('情報3');
    return defaultHeaders;
  }, [selectedFields]);

  // 表示するテーブルデータを整形
  const tableRows = useMemo(() => {
    const rows: (string | number | null)[][] = [];
    const maxRow = Math.max(...seatMap.map((seat) => seat.row));
    const maxCol = Math.max(...seatMap.map((seat) => seat.col));

    for (let r = 1; r <= maxRow; r++) {
      for (let c = 1; c <= maxCol; c++) {
        const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
        const rowData: (string | number | null)[] = [r, c]; // 行と列は常に表示

        if (seat && seat.assignedStudentId) {
          const student = students.find((s) => s.id === seat.assignedStudentId);
          if (student) {
            if (selectedFields.id) rowData.push(student.id);
            if (selectedFields.number) rowData.push(student.number);
            if (selectedFields.name) rowData.push(student.name);
            if (selectedFields.kana) rowData.push(student.kana);
            if (selectedFields.info1) rowData.push(student.info1);
            if (selectedFields.info2) rowData.push(student.info2);
            if (selectedFields.info3) rowData.push(student.info3);
          } else {
            // 席に割り当てられた生徒IDがあるが、生徒が見つからない場合（エラーケース）
            // 選択されたフィールドの数だけ空文字列を追加して列数を合わせる
            for (let i = 0; i < headers.length - 2; i++) rowData.push('');
          }
        } else if (seat && !seat.isUsable) {
            // 使えない席の場合
            rowData.push('（使用不可）');
            for (let i = 0; i < headers.length - 3; i++) rowData.push(''); // 残りの列を埋める
        } else {
          // 空席の場合
          rowData.push('（空席）');
          for (let i = 0; i < headers.length - 3; i++) rowData.push(''); // 残りの列を埋める
        }
        rows.push(rowData);
      }
    }
    return rows;
  }, [students, seatMap, selectedFields, headers.length]); // headers.length も依存に追加

  return (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
      <Table stickyHeader aria-label="seating output table" size="small">
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={headers.length} align="center">
                表示する座席データがありません。
              </TableCell>
            </TableRow>
          )}
          {tableRows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SeatingTable;