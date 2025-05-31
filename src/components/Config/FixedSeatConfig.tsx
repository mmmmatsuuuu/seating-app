import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Alert,
  AlertTitle,
  Chip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ChairIcon from '@mui/icons-material/Chair'; // 座席を示すアイコン

import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat'; // SeatMapData をインポート
import type { FixedSeatAssignment } from '../../types/Seat'; // 新しく定義した型をインポート

import SeatMapChart from '../Seat/SeatMapChart'; // SeatMapChart をインポート
import { DragDropContext } from '@hello-pangea/dnd'; // DragDropContext をインポート

/**
 * FixedSeatConfigProps インターフェース
 * 固定座席設定コンポーネントが受け取るPropsの型定義です。
 */
interface FixedSeatConfigProps {
  /**
   * 現在の生徒のリストです。
   */
  students: Student[];
  /**
   * 利用可能な座席のマップデータです。
   */
  seatMap: SeatMapData[]; // seatCount の代わりに seatMap を受け取る

  /**
   * 現在の固定座席割り当てデータです。
   */
  currentFixedSeatAssignments: FixedSeatAssignment[];
  /**
   * 固定座席割り当てが完了し、データが更新されたときに呼び出されるコールバック関数です。
   */
  onConfigFinished: (updatedConfig: FixedSeatAssignment[]) => void;
  /**
   * キャンセル時に呼び出されるコールバック関数です。
   */
  onCancel: () => void;
}

/**
 * 生徒の固定座席を設定するコンポーネントです。
 */
const FixedSeatConfig: React.FC<FixedSeatConfigProps> = ({
  students,
  seatMap, // Props に seatMap を追加
  currentFixedSeatAssignments,
  onConfigFinished,
  onCancel,
}) => {
  // 編集中の固定座席割り当てを管理するState
  const [editableFixedSeatAssignments, setEditableFixedSeatAssignments] = useState<FixedSeatAssignment[]>(currentFixedSeatAssignments);
  // 現在選択中の生徒ID (1人選択)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // 現在選択中の座席ID (1つ選択)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 生徒リストを番号順にソート
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  // 既に割り当て済みの生徒IDのSet
  const assignedStudentIds = useMemo(() => {
    return new Set(editableFixedSeatAssignments.map(assignment => assignment.studentId));
  }, [editableFixedSeatAssignments]);

  // 既に割り当て済みの座席IDのSet
  const assignedSeatIds = useMemo(() => {
    return new Set(editableFixedSeatAssignments.map(assignment => assignment.seatId));
  }, [editableFixedSeatAssignments]);

  // SeatMapChart に渡すハイライトする座席IDのSet
  const highlightedSeatIds = useMemo(() => {
    return selectedSeatId ? new Set([selectedSeatId]) : new Set<string>();
  }, [selectedSeatId]);


  // 生徒がクリックされたときのハンドラ
  const handleStudentClick = useCallback((studentId: string) => {
    setErrorMessage(null); // エラーメッセージをクリア
    // 既に割り当て済みの生徒は選択できない
    if (assignedStudentIds.has(studentId)) {
      setErrorMessage('この生徒は既に座席に割り当てられています。');
      return;
    }
    setSelectedStudentId((prevSelectedId) => (prevSelectedId === studentId ? null : studentId));
  }, [assignedStudentIds]);

  // 座席がクリックされたときのハンドラ (SeatMapChartから渡される)
  const handleSeatClick = useCallback((seatId: string) => {
    setErrorMessage(null); // エラーメッセージをクリア
    // 既に他の生徒が割り当てられている座席は選択できないようにする
    if (assignedSeatIds.has(seatId)) {
      setErrorMessage(`座席 ${seatId} は既に他の生徒に割り当てられています。`);
      return;
    }
    setSelectedSeatId((prevSelectedId) => (prevSelectedId === seatId ? null : seatId));
  }, [assignedSeatIds]);

  // 割り当てを追加するハンドラ
  const handleAddAssignment = useCallback(() => {
    if (!selectedStudentId || !selectedSeatId) {
      setErrorMessage('生徒と座席をそれぞれ1つずつ選択してください。');
      return;
    }

    // 既に選択中の生徒が割り当てられている場合はエラー (handleStudentClickでチェック済みだが念のため)
    if (assignedStudentIds.has(selectedStudentId)) {
      setErrorMessage('この生徒は既に他の座席に割り当てられています。');
      return;
    }
    // 既に選択中の座席が割り当てられている場合はエラー (handleSeatClickでチェック済みだが念のため)
    if (assignedSeatIds.has(selectedSeatId)) {
      setErrorMessage('この座席は既に他の生徒に割り当てられています。');
      return;
    }

    setEditableFixedSeatAssignments((prevConfig) => [
      ...prevConfig,
      { studentId: selectedStudentId, seatId: selectedSeatId },
    ]);
    setSelectedStudentId(null); // 割り当て後、選択をクリア
    setSelectedSeatId(null); // 割り当て後、選択をクリア
    setErrorMessage(null);
  }, [selectedStudentId, selectedSeatId, assignedStudentIds, assignedSeatIds]); // 依存配列に assignedStudentIds, assignedSeatIds を追加

  // 割り当てを削除するハンドラ
  const handleDeleteAssignment = useCallback((indexToDelete: number) => {
    setEditableFixedSeatAssignments((prevConfig) =>
      prevConfig.filter((_, index) => index !== indexToDelete)
    );
  }, []);

  // 全ての割り当てをクリアするハンドラ
  const handleClearAllAssignments = useCallback(() => {
    if (window.confirm('全ての固定座席割り当てを削除してもよろしいですか？')) {
      setEditableFixedSeatAssignments([]);
    }
  }, []);

  // 設定を保存するハンドラ
  const handleSaveConfig = useCallback(() => {
    onConfigFinished(editableFixedSeatAssignments);
  }, [editableFixedSeatAssignments, onConfigFinished]);

  // 選択された生徒の名前と座席名を取得
  const getSelectedInfo = useMemo(() => {
    const studentName = selectedStudentId ? students.find((s) => s.id === selectedStudentId)?.name || `不明な生徒(${selectedStudentId})` : 'なし';
    const seatName = selectedSeatId || 'なし';
    return `選択中: 生徒: ${studentName}, 座席: ${seatName}`;
  }, [selectedStudentId, selectedSeatId, students]);

  // 割り当てを表示する関数
  const renderAssignment = useCallback((assignment: FixedSeatAssignment, index: number) => {
    const student = students.find(s => s.id === assignment.studentId);
    if (!student) return null; // 生徒が見つからない場合は表示しない

    return (
      <ListItem
        key={index}
        secondaryAction={
          <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAssignment(index)}>
            <DeleteIcon />
          </IconButton>
        }
      >
        <ListItemIcon>
          <ChairIcon color="action" />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Typography color='gray'>座席割り当て: </Typography>
              <Typography>{student.name} を {assignment.seatId} に</Typography>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                avatar={<Avatar>{student.number}</Avatar>}
                label={student.name}
                size="small"
              />
              <ChairIcon fontSize="small" color="primary" />
              <Chip
                label={assignment.seatId}
                size="small"
              />
            </Box>
          }
        />
      </ListItem>
    );
  }, [students, handleDeleteAssignment]);

  // DragDropContext の onDragEnd ハンドラ (ここではD&Dを無効にしているため、空の関数でOK)
  const onDragEnd = useCallback(() => {
    // このコンポーネントではD&Dは無効化されているため、何もしない
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        固定座席設定
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        特定の生徒を特定の座席に割り当てます。
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラー</AlertTitle>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* 左側: 生徒リスト */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={6} size={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              生徒の選択
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              座席を割り当てたい生徒を1人選択してください。
            </Typography>
            <List sx={{ maxHeight: 500, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
              {sortedStudents.length === 0 ? (
                <ListItem><ListItemText secondary="生徒がいません。最初のステップで生徒を登録してください。" /></ListItem>
              ) : (
                sortedStudents.map((student) => (
                  // @ts-ignore
                  <ListItem
                    key={student.id}
                    button
                    onClick={() => handleStudentClick(student.id)}
                    selected={selectedStudentId === student.id}
                    disabled={assignedStudentIds.has(student.id)} // 既に割り当てられている生徒は選択不可
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.primary.light + ' !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.primary.light,
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar>{student.number}</Avatar>
                    </ListItemIcon>
                    <ListItemText primary={`${student.name}`} />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* 右側: 座席グリッド (SeatMapChart を使用) */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={6} size={8}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              座席の選択
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              生徒を座らせたい座席を1つ選択してください。
            </Typography>
            {seatMap.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', mt: 3, width: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  座席マップが設定されていません。
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  「座席レイアウト設定」から座席を作成してください。
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'auto', overflow: 'auto' }}>
                {/* DragDropContext で SeatMapChart をラップ */}
                <DragDropContext onDragEnd={onDragEnd}>
                  <SeatMapChart
                    seatMap={seatMap.map(seat => ({
                      ...seat,
                      // FixedSeatConfig で割り当てられた生徒を SeatMapData に反映させる
                      assignedStudentId: editableFixedSeatAssignments.find(a => a.seatId === seat.seatId)?.studentId || seat.assignedStudentId
                    }))}
                    students={students}
                    onClickSeat={handleSeatClick}
                    displayMode="config" // 座席の設定モードとして表示
                    highlightedSeatIds={highlightedSeatIds} // 選択中の座席をハイライト
                    isDragAndDropEnabled={false} // 固定座席設定ではD&Dは無効
                  />
                </DragDropContext>
              </Box>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {getSelectedInfo}
              </Typography>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={() => { setSelectedStudentId(null); setSelectedSeatId(null); }}
                disabled={!selectedStudentId && !selectedSeatId}
              >
                選択解除
              </Button>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<ChairIcon />}
                onClick={handleAddAssignment}
                disabled={!selectedStudentId || !selectedSeatId}
                sx={{ flexGrow: 1 }}
              >
                この座席に割り当てる
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 設定された座席割り当てリスト */}
      <Paper elevation={2} sx={{ p: 2, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom component="div">
            設定済み固定座席
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ClearAllIcon />}
            onClick={handleClearAllAssignments}
            disabled={editableFixedSeatAssignments.length === 0}
            size="small"
          >
            全クリア
          </Button>
        </Box>
        <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
          {editableFixedSeatAssignments.length === 0 ? (
            <ListItem><ListItemText secondary="まだ固定座席は設定されていません。" /></ListItem>
          ) : (
            editableFixedSeatAssignments.map((assignment, index) => renderAssignment(assignment, index))
          )}
        </List>
      </Paper>


      {/* ナビゲーションボタン */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onCancel}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveConfig}
        >
          固定座席を確定し次へ
        </Button>
      </Box>
    </Box>
  );
};

export default FixedSeatConfig;