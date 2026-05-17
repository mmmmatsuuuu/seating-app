import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  AlertTitle,
  Divider,
  Autocomplete,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ChairIcon from '@mui/icons-material/Chair';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';
import type { FixedSeatAssignment } from '../../types/Seat';

import SeatMapChart from '../Seat/SeatMapChart';
import { DragDropContext } from '@hello-pangea/dnd';

interface FixedSeatConfigProps {
  students: Student[];
  seatMap: SeatMapData[];
  currentFixedSeatAssignments: FixedSeatAssignment[];
  onConfigFinished: (updatedConfig: FixedSeatAssignment[]) => void;
  onCancel: () => void;
}

const FixedSeatConfig: React.FC<FixedSeatConfigProps> = ({
  students,
  seatMap,
  currentFixedSeatAssignments,
  onConfigFinished,
  onCancel,
}) => {
  const [editableFixedSeatAssignments, setEditableFixedSeatAssignments] = useState<FixedSeatAssignment[]>(currentFixedSeatAssignments);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  const assignedStudentIds = useMemo(() => {
    return new Set(editableFixedSeatAssignments.map(a => a.studentId));
  }, [editableFixedSeatAssignments]);

  const assignedSeatIds = useMemo(() => {
    return new Set(editableFixedSeatAssignments.map(a => a.seatId));
  }, [editableFixedSeatAssignments]);

  const highlightedSeatIds = useMemo(() => {
    return selectedSeatId ? new Set([selectedSeatId]) : new Set<string>();
  }, [selectedSeatId]);

  const handleSeatClick = useCallback((seatId: string) => {
    setErrorMessage(null);
    if (assignedSeatIds.has(seatId)) {
      setErrorMessage(`座席 ${seatId} は既に他の生徒に割り当てられています。`);
      return;
    }
    setSelectedSeatId((prev) => (prev === seatId ? null : seatId));
  }, [assignedSeatIds]);

  const handleAddAssignment = useCallback(() => {
    if (!selectedStudent || !selectedSeatId) {
      setErrorMessage('生徒と座席をそれぞれ選択してください。');
      return;
    }
    if (assignedStudentIds.has(selectedStudent.id)) {
      setErrorMessage('この生徒は既に他の座席に割り当てられています。');
      return;
    }
    if (assignedSeatIds.has(selectedSeatId)) {
      setErrorMessage('この座席は既に他の生徒に割り当てられています。');
      return;
    }

    setEditableFixedSeatAssignments((prev) => [
      ...prev,
      { studentId: selectedStudent.id, seatId: selectedSeatId },
    ]);
    setSelectedStudent(null);
    setSelectedSeatId(null);
    setErrorMessage(null);
  }, [selectedStudent, selectedSeatId, assignedStudentIds, assignedSeatIds]);

  const handleDeleteAssignment = useCallback((indexToDelete: number) => {
    setEditableFixedSeatAssignments((prev) =>
      prev.filter((_, index) => index !== indexToDelete)
    );
  }, []);

  const handleClearAllAssignments = useCallback(() => {
    if (window.confirm('全ての固定座席割り当てを削除してもよろしいですか？')) {
      setEditableFixedSeatAssignments([]);
    }
  }, []);

  const handleSaveConfig = useCallback(() => {
    onConfigFinished(editableFixedSeatAssignments);
  }, [editableFixedSeatAssignments, onConfigFinished]);

  const onDragEnd = useCallback(() => {}, []);

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

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* サイドバー: 設定済み固定座席 */}
        {sidebarVisible && (
          <Paper elevation={2} sx={{ p: 2, width: 240, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                設定済み ({editableFixedSeatAssignments.length}件)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  color="warning"
                  onClick={handleClearAllAssignments}
                  disabled={editableFixedSeatAssignments.length === 0}
                  title="全クリア"
                >
                  <ClearAllIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setSidebarVisible(false)}>
                  <ChevronLeftIcon />
                </IconButton>
              </Box>
            </Box>
            <List dense sx={{ maxHeight: 500, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
              {editableFixedSeatAssignments.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="まだ設定されていません" secondaryTypographyProps={{ variant: 'caption' }} />
                </ListItem>
              ) : (
                editableFixedSeatAssignments.map((assignment, index) => {
                  const student = students.find(s => s.id === assignment.studentId);
                  if (!student) return null;
                  return (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleDeleteAssignment(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText
                        primary={`${student.number}番 ${student.name}`}
                        secondary={assignment.seatId}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  );
                })
              )}
            </List>
          </Paper>
        )}

        {/* メインコンテンツ */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* サイドバー非表示時の展開ボタン */}
          {!sidebarVisible && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ChevronRightIcon />}
              onClick={() => setSidebarVisible(true)}
              sx={{ mb: 2 }}
            >
              設定済み固定座席 ({editableFixedSeatAssignments.length}件)
            </Button>
          )}

          {/* 生徒・座席選択エリア */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Autocomplete<Student>
                options={sortedStudents}
                getOptionLabel={(s: Student) => `${s.number}番 ${s.name}`}
                value={selectedStudent}
                onChange={(_: React.SyntheticEvent, student: Student | null) => {
                  setErrorMessage(null);
                  setSelectedStudent(student);
                }}
                getOptionDisabled={(s: Student) => assignedStudentIds.has(s.id)}
                isOptionEqualToValue={(option: Student, value: Student) => option.id === value.id}
                size="small"
                sx={{ minWidth: 200, flexGrow: 1 }}
                noOptionsText="生徒がいません"
                renderInput={(params) => <TextField {...params} label="生徒を選択" />}
              />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                座席: {selectedSeatId || '未選択'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<ChairIcon />}
                onClick={handleAddAssignment}
                disabled={!selectedStudent || !selectedSeatId}
              >
                割り当てる
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => { setSelectedStudent(null); setSelectedSeatId(null); setErrorMessage(null); }}
                disabled={!selectedStudent && !selectedSeatId}
              >
                選択解除
              </Button>
            </Box>
          </Paper>

          {/* 座席グリッド */}
          {seatMap.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                座席マップが設定されていません。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                「座席レイアウト設定」から座席を作成してください。
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <DragDropContext onDragEnd={onDragEnd}>
                <SeatMapChart
                  seatMap={seatMap.map(seat => ({
                    ...seat,
                    assignedStudentId: editableFixedSeatAssignments.find(a => a.seatId === seat.seatId)?.studentId || seat.assignedStudentId,
                  }))}
                  students={students}
                  onClickSeat={handleSeatClick}
                  displayMode="config"
                  highlightedSeatIds={highlightedSeatIds}
                  isDragAndDropEnabled={false}
                />
              </DragDropContext>
            </Box>
          )}
        </Box>
      </Box>

      {/* ナビゲーションボタン */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" color="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="contained" size="large" onClick={handleSaveConfig}>
          固定座席を確定し次へ
        </Button>
      </Box>
    </Box>
  );
};

export default FixedSeatConfig;
