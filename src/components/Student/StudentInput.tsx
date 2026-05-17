import React, { useState, useCallback } from 'react';
import { Button, TextField, Box, Typography, Paper, Grid, Alert, AlertTitle, Chip } from '@mui/material';
import type { Student } from '../../types/Student';
import { parseStudentData } from '../../utils/csvParser';
import StudentList from './StudentList';
import { CSV_DELIMITERS } from '../../constants';

interface StudentInputProps {
  onStudentsLoaded: (students: Student[]) => void;
}

const COLUMN_GUIDE = [
  { label: '出席番号', required: false },
  { label: '氏名', required: true },
  { label: 'ふりがな', required: false },
  { label: '情報1', required: false },
  { label: '情報2', required: false },
  { label: '情報3', required: false },
] as const;

const SAMPLE_CSV_ROWS = [
  '1,山田太郎,やまだたろう,男性,A組,',
  '2,鈴木花子,すずきはなこ,女性,B組,',
  '3,佐藤次郎,さとうじろう,,C組,',
].join('\n');

const StudentInput: React.FC<StudentInputProps> = ({ onStudentsLoaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [parsedStudentsPreview, setParsedStudentsPreview] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          setParsedStudentsPreview(parseStudentData(text, CSV_DELIMITERS));
        } catch {
          setError('ファイルのパースに失敗しました。形式を確認してください。');
          setParsedStudentsPreview([]);
        }
      };
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。');
        setParsedStudentsPreview([]);
      };
      reader.readAsText(selectedFile);
    } else {
      setFile(null);
      setParsedStudentsPreview([]);
      setError(null);
    }
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setInputText(text);
    setError(null);
    try {
      setParsedStudentsPreview(parseStudentData(text, CSV_DELIMITERS));
    } catch {
      setParsedStudentsPreview([]);
    }
  }, []);

  const handleLoadStudents = useCallback(() => {
    if (parsedStudentsPreview.length === 0) {
      setError('読み込む生徒情報がありません。');
      return;
    }
    onStudentsLoaded(parsedStudentsPreview);
  }, [parsedStudentsPreview, onStudentsLoaded]);

  const handleDownloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV_ROWS], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        生徒情報を取り込む
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>入力形式</AlertTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="body2">列順（左から）：</Typography>
          {COLUMN_GUIDE.map((col, i) => (
            <Chip
              key={i}
              label={col.required ? `${col.label}（必須）` : col.label}
              size="small"
              color={col.required ? 'primary' : 'default'}
            />
          ))}
        </Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          区切りはカンマ（,）・タブ・スペースなどを自動判別。ヘッダー行は不要です。
        </Typography>
        <Button size="small" variant="outlined" onClick={handleDownloadSample}>
          サンプルCSVをダウンロード
        </Button>
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={3} sx={{ p: 2, mb: 3, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>CSVファイルをアップロード</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="file"
                accept=".csv, .txt"
                style={{ display: 'none' }}
                id="csv-file-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="csv-file-upload">
                <Button variant="contained" component="span">
                  ファイルを選択
                </Button>
              </label>
              {file && (
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid size={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={3} sx={{ p: 2, mb: 3, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>生徒情報をコピー＆ペースト</Typography>
            <TextField
              label="ここに生徒情報を貼り付け"
              multiline
              rows={8}
              fullWidth
              value={inputText}
              onChange={handleInputChange}
              placeholder={`例:\n1,山田太郎,やまだたろう,男性,A組,\n2,鈴木花子,すずきはなこ,女性,B組,`}
            />
          </Paper>
        </Grid>
      </Grid>

      {parsedStudentsPreview.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>読み込みプレビュー ({parsedStudentsPreview.length}名)</Typography>
          <StudentList students={parsedStudentsPreview} />
        </Paper>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          エラー: {error}
        </Typography>
      )}

      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleLoadStudents}
          disabled={parsedStudentsPreview.length === 0}
        >
          生徒情報を読み込む ({parsedStudentsPreview.length}名)
        </Button>
      </Box>
    </Box>
  );
};

export default StudentInput;
