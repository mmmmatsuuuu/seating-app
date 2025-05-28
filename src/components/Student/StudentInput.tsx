// src/Student/StudentInput.tsx

import React, { useState, useCallback } from 'react';
import { Button, TextField, Box, Typography, Paper, Grid } from '@mui/material';
// import { useAppState } from '../contexts/AppStateContext'; // 親で状態管理する場合は不要
import type { Student } from '../../types/Student'; // Student 型をインポート
import { parseStudentData } from '../../utils/csvParser'; // CSVパース関数をインポート
import StudentList from './StudentList'; // StudentList コンポーネントをインポート
import { CSV_DELIMITERS } from '../../constants'; // CSV区切り文字候補をインポート

// Props の型定義
interface StudentInputProps {
  onStudentsLoaded: (students: Student[]) => void; // 生徒情報読み込み完了時に呼ばれるコールバック
}

const StudentInput: React.FC<StudentInputProps> = ({ onStudentsLoaded }) => {
  // ローカルStateの定義
  const [file, setFile] = useState<File | null>(null); // 選択されたファイル
  const [inputText, setInputText] = useState(''); // テキストエリアの入力値
  const [parsedStudentsPreview, setParsedStudentsPreview] = useState<Student[]>([]); // パースされた生徒データのプレビュー
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  // ファイル選択時のハンドラ
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null); // エラーをクリア
      // ファイルリーダーでファイルを読み込む
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          // 読み込んだテキストをパース
          const students = parseStudentData(text, CSV_DELIMITERS); // 区切り文字候補を渡す
          setParsedStudentsPreview(students);
        } catch (err) {
          setError('ファイルのパースに失敗しました。形式を確認してください。');
          setParsedStudentsPreview([]); // プレビューをクリア
          console.error(err); // 開発者向けにエラーログ
        }
      };
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。');
        setParsedStudentsPreview([]);
      };
      reader.readAsText(selectedFile); // テキストとして読み込む
    } else {
      setFile(null);
      setParsedStudentsPreview([]);
      setError(null);
    }
  }, []); // 依存配列は空

  // テキストエリア入力/ペースト時のハンドラ
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setInputText(text);
    setError(null); // エラーをクリア
    console.log('Input text changed:', text); // デバッグ用ログ
    try {
      // 入力されたテキストをパース
      const students = parseStudentData(text, CSV_DELIMITERS); // 区切り文字候補を渡す
      console.log('Parsed students:', students); // パース結果のデバッグ用ログ
      setParsedStudentsPreview(students);
    } catch (err) {
       // エラー時はプレビューをクリアするが、エラーメッセージはテキストエリアの内容が変わるたびに出さない方がユーザー体験が良い場合も
       // ここではパース可能な状態であればプレビュー表示するシンプルな実装とする
       setParsedStudentsPreview([]);
       // setError('入力形式を確認してください。'); // エラー表示は読み込みボタン押下時などに集約しても良い
       // console.error(err);
    }
  }, []); // 依存配列は空

  // 生徒情報読み込みボタンのハンドラ
  const handleLoadStudents = useCallback(() => {
    if (parsedStudentsPreview.length === 0) {
      setError('読み込む生徒情報がありません。');
      return;
    }
    // 必要に応じてここで最終的なバリデーションを行う
    // 例: 必須項目が全て埋まっているかなど

    // 親コンポーネントに生徒データを渡す
    onStudentsLoaded(parsedStudentsPreview);
    // ここで親が appPhase を 'config' などに更新する想定
  }, [parsedStudentsPreview, onStudentsLoaded]); // parsedStudentsPreview または onStudentsLoaded が変更されたら useCallback を再生成

  return (
    <Box> {/* 全体を囲むコンテナ */}
      <Typography variant="h5" gutterBottom>
        生徒情報を取り込む
      </Typography>
      <Typography variant="body1" gutterBottom>
        CSVファイルをアップロードするか、生徒情報をコピー＆ペーストしてください。
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* ファイルアップロードエリア */}
          <Paper elevation={3} sx={{ p: 2, mb: 3, flexGrow: 1 }}> {/* 少し影付きのコンテナ */}
            <Typography variant="h6" sx={{ mb: 2 }}>CSVファイルをアップロード</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* 非表示のファイル入力要素 */}
              <input
                type="file"
                accept=".csv, .txt" // CSVやテキストファイルを許可
                style={{ display: 'none' }}
                id="csv-file-upload" // ボタンと紐付けるためのID
                onChange={handleFileChange}
              />
              {/* ファイル入力要素と紐付いたボタン */}
              <label htmlFor="csv-file-upload">
                <Button variant="contained" component="span"> {/* component="span" でラベル要素として機能させる */}
                  ファイルを選択
                </Button>
              </label>
              {/* 選択されたファイル名を表示 */}
              {file && (
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ※ 形式: 番号,氏名,ふりがな,追加情報1,追加情報2,追加情報3 (ヘッダー行なし)
            </Typography>
          </Paper>
        </Grid>
        <Grid size={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* コピペ入力エリア */}
          <Paper elevation={3} sx={{ p: 2, mb: 3, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>生徒情報をコピー＆ペースト</Typography>
            <TextField
              label="ここに生徒情報を貼り付け"
              multiline // 複数行入力可能に
              rows={8} // 表示行数
              fullWidth // 幅を親要素いっぱいに
              value={inputText}
              onChange={handleInputChange}
              // onPaste={handleInputChange} // onChange で paste イベントもハンドリングされることが多い
              placeholder="例:&#10;1,山田太郎,やまだたろう,男性,〇〇中学,A組&#10;2,鈴木花子,すずきはなこ,女性,△△小学校,B組" // プレースホルダーに行ブレーク含める
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ※ 各項目をカンマ(,),タブ(\t)などで区切り、生徒ごとに改行してください。
            </Typography>
          </Paper>
        </Grid>
      </Grid>



      {/* プレビュー表示エリア */}
      {parsedStudentsPreview.length > 0 && ( // パース結果がある場合のみ表示
         <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>読み込みプレビュー ({parsedStudentsPreview.length}名)</Typography>
            {/* StudentList コンポーネントでプレビュー表示 */}
            <StudentList students={parsedStudentsPreview} /> {/* onStudentClick などは不要 */}
         </Paper>
      )}

      {/* エラーメッセージ表示 */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          エラー: {error}
        </Typography>
      )}

      {/* 読み込みボタン */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleLoadStudents}
          disabled={parsedStudentsPreview.length === 0} // プレビューがない場合は無効
        >
          生徒情報を読み込む ({parsedStudentsPreview.length}名)
        </Button>
      </Box>
    </Box>
  );
};

export default StudentInput;