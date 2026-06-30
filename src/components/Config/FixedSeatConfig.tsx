import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Alert,
  AlertTitle,
  Divider,
  Autocomplete,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';
import type { FixedSeatAssignment } from '../../types/Seat';

interface FixedSeatConfigProps {
  students: Student[];
  seatMap: SeatMapData[];
  currentFixedSeatAssignments: FixedSeatAssignment[];
  onConfigFinished: (updatedConfig: FixedSeatAssignment[]) => void;
  onCancel: () => void;
}

// 生徒ごとの許可エリアを色分けするためのパレット
const STUDENT_COLORS = [
  '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
  '#0097a7', '#c2185b', '#5d4037', '#455a64', '#afb42b',
];

// 座席IDを行・列に分解する。座席ID形式 R{行}C{列} に依存
const parseSeatId = (seatId: string): { row: number; col: number } | null => {
  const match = seatId.match(/R(\d+)C(\d+)/);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
};

const FixedSeatConfig: React.FC<FixedSeatConfigProps> = ({
  students,
  seatMap,
  currentFixedSeatAssignments,
  onConfigFinished,
  onCancel,
}) => {
  const [editableFixedSeatAssignments, setEditableFixedSeatAssignments] = useState<FixedSeatAssignment[]>(currentFixedSeatAssignments);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  // 設定のある生徒に固定色を割り当てる（一覧の並び順で安定させる）
  const studentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    editableFixedSeatAssignments.forEach((a, i) => {
      map.set(a.studentId, STUDENT_COLORS[i % STUDENT_COLORS.length]);
    });
    return map;
  }, [editableFixedSeatAssignments]);

  // 座席IDごとに、その席を許可エリアに含む生徒ID一覧
  const seatToStudentIds = useMemo(() => {
    const map = new Map<string, string[]>();
    editableFixedSeatAssignments.forEach(a => {
      a.seatIds.forEach(seatId => {
        const list = map.get(seatId) ?? [];
        list.push(a.studentId);
        map.set(seatId, list);
      });
    });
    return map;
  }, [editableFixedSeatAssignments]);

  const currentSeatIds = useMemo(() => {
    const assignment = editableFixedSeatAssignments.find(a => a.studentId === selectedStudentId);
    return new Set(assignment?.seatIds ?? []);
  }, [editableFixedSeatAssignments, selectedStudentId]);

  const maxRow = useMemo(
    () => seatMap.reduce((max, s) => Math.max(max, parseSeatId(s.seatId)?.row ?? 0), 0),
    [seatMap]
  );
  const maxCol = useMemo(
    () => seatMap.reduce((max, s) => Math.max(max, parseSeatId(s.seatId)?.col ?? 0), 0),
    [seatMap]
  );

  // 選択中の生徒の許可座席集合を書き換える。空になったら設定ごと削除する
  const setSeatIdsForCurrentStudent = useCallback((updater: (prev: string[]) => string[]) => {
    if (!selectedStudentId) return;
    setEditableFixedSeatAssignments(prev => {
      const existing = prev.find(a => a.studentId === selectedStudentId);
      const nextSeatIds = updater(existing?.seatIds ?? []);
      const others = prev.filter(a => a.studentId !== selectedStudentId);
      if (nextSeatIds.length === 0) return others;
      return [...others, { studentId: selectedStudentId, seatIds: nextSeatIds }];
    });
  }, [selectedStudentId]);

  const toggleSeat = useCallback((seatId: string) => {
    setSeatIdsForCurrentStudent(prev =>
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
    );
  }, [setSeatIdsForCurrentStudent]);

  const addRange = useCallback((fromSeatId: string, toSeatId: string) => {
    const from = parseSeatId(fromSeatId);
    const to = parseSeatId(toSeatId);
    if (!from || !to) return;
    const rowMin = Math.min(from.row, to.row);
    const rowMax = Math.max(from.row, to.row);
    const colMin = Math.min(from.col, to.col);
    const colMax = Math.max(from.col, to.col);
    const inRangeUsableSeatIds = seatMap
      .filter(s => {
        if (!s.isUsable) return false;
        const pos = parseSeatId(s.seatId);
        return pos && pos.row >= rowMin && pos.row <= rowMax && pos.col >= colMin && pos.col <= colMax;
      })
      .map(s => s.seatId);
    setSeatIdsForCurrentStudent(prev => Array.from(new Set([...prev, ...inRangeUsableSeatIds])));
  }, [seatMap, setSeatIdsForCurrentStudent]);

  const handleSeatClick = useCallback((seatId: string, isUsable: boolean) => {
    setErrorMessage(null);
    if (!selectedStudentId) {
      setErrorMessage('先に許可エリアを設定する生徒を選択してください。');
      return;
    }
    if (!isUsable) return;

    if (selectionMode === 'single') {
      toggleSeat(seatId);
      return;
    }
    // 範囲選択: 1回目で始点、2回目で終点を決めて矩形をまとめて追加
    if (!rangeAnchor) {
      setRangeAnchor(seatId);
    } else {
      addRange(rangeAnchor, seatId);
      setRangeAnchor(null);
    }
  }, [selectedStudentId, selectionMode, rangeAnchor, toggleSeat, addRange]);

  const handleSelectStudent = useCallback((studentId: string | null) => {
    setSelectedStudentId(studentId);
    setRangeAnchor(null);
    setErrorMessage(null);
  }, []);

  const handleClearCurrentStudent = useCallback(() => {
    setSeatIdsForCurrentStudent(() => []);
    setRangeAnchor(null);
  }, [setSeatIdsForCurrentStudent]);

  const handleDeleteAssignment = useCallback((studentId: string) => {
    setEditableFixedSeatAssignments(prev => prev.filter(a => a.studentId !== studentId));
    if (selectedStudentId === studentId) handleSelectStudent(null);
  }, [selectedStudentId, handleSelectStudent]);

  const handleClearAllAssignments = useCallback(() => {
    if (window.confirm('全ての座席指定を削除してもよろしいですか？')) {
      setEditableFixedSeatAssignments([]);
      setRangeAnchor(null);
    }
  }, []);

  const handleSaveConfig = useCallback(() => {
    onConfigFinished(editableFixedSeatAssignments.filter(a => a.seatIds.length > 0));
  }, [editableFixedSeatAssignments, onConfigFinished]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        座席指定
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        生徒を選んでから、その生徒が座れる座席を選択します。1席だけならその席に固定、複数選べばその中から抽選されます。
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        条件が多すぎて、ルーレット時にすでに希望が埋まってしまっている場合は、希望を無視して座席をランダムに割り当てるのでご了承ください。
      </Alert>

      <Divider sx={{ mb: 3 }} />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          <AlertTitle>エラー</AlertTitle>
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* サイドバー: 設定済み座席指定 */}
        {sidebarVisible && (
          <Paper elevation={2} sx={{ p: 2, width: 260, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                設定済み ({editableFixedSeatAssignments.length}名)
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
                editableFixedSeatAssignments.map((assignment) => {
                  const student = students.find(s => s.id === assignment.studentId);
                  if (!student) return null;
                  const color = studentColorMap.get(assignment.studentId);
                  return (
                    <ListItem
                      key={assignment.studentId}
                      disablePadding
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleDeleteAssignment(assignment.studentId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        selected={selectedStudentId === assignment.studentId}
                        onClick={() => handleSelectStudent(assignment.studentId)}
                        sx={{ py: 0.5 }}
                      >
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, mr: 1, flexShrink: 0 }} />
                        <ListItemText
                          primary={`${student.number}番 ${student.name}`}
                          secondary={`${assignment.seatIds.length}席`}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })
              )}
            </List>
          </Paper>
        )}

        {/* メインコンテンツ */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {!sidebarVisible && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ChevronRightIcon />}
              onClick={() => setSidebarVisible(true)}
              sx={{ mb: 2 }}
            >
              設定済み座席指定 ({editableFixedSeatAssignments.length}名)
            </Button>
          )}

          {/* 生徒選択・選択モードエリア */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Autocomplete<Student>
                options={sortedStudents}
                getOptionLabel={(s: Student) => `${s.number}番 ${s.name}`}
                value={selectedStudent}
                onChange={(_: React.SyntheticEvent, student: Student | null) => handleSelectStudent(student?.id ?? null)}
                isOptionEqualToValue={(option: Student, value: Student) => option.id === value.id}
                size="small"
                sx={{ minWidth: 220, flexGrow: 1 }}
                noOptionsText="生徒がいません"
                renderInput={(params) => <TextField {...params} label="座席を指定する生徒" />}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={selectionMode}
                onChange={(_, mode) => { if (mode) { setSelectionMode(mode); setRangeAnchor(null); } }}
              >
                <ToggleButton value="single">個別選択</ToggleButton>
                <ToggleButton value="range">範囲選択</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleClearCurrentStudent}
                disabled={!selectedStudentId || currentSeatIds.size === 0}
              >
                この生徒の指定をクリア
              </Button>
            </Box>
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {selectedStudent ? (
                <Typography variant="body2" color="text.secondary">
                  {selectedStudent.number}番 {selectedStudent.name} の許可席: <strong>{currentSeatIds.size}席</strong>
                  {selectionMode === 'range' && (
                    <> ／ 範囲選択: {rangeAnchor ? `始点 ${rangeAnchor} を選択中。終点をクリック` : '始点をクリック'}</>
                  )}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  生徒を選択すると座席を指定できます。
                </Typography>
              )}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'auto' }}>
              <Box sx={{ alignSelf: 'stretch', textAlign: 'center', bgcolor: 'grey.800', color: 'white', py: 0.5, borderRadius: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>黒板（前）</Typography>
              </Box>
              {Array.from({ length: maxRow }).map((_, rowIndex) => (
                <Box key={`row-${rowIndex}`} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                  {Array.from({ length: maxCol }).map((_, colIndex) => {
                    const seatId = `R${rowIndex + 1}C${colIndex + 1}`;
                    const seatData = seatMap.find(s => s.seatId === seatId);
                    if (!seatData) return <Box key={seatId} sx={{ width: 92, height: 72 }} />;

                    const isCurrent = currentSeatIds.has(seatId);
                    const isAnchor = rangeAnchor === seatId;
                    const otherStudentIds = (seatToStudentIds.get(seatId) ?? []).filter(id => id !== selectedStudentId);
                    const currentColor = selectedStudentId ? studentColorMap.get(selectedStudentId) : undefined;

                    return (
                      <Box
                        key={seatId}
                        onClick={() => handleSeatClick(seatId, seatData.isUsable)}
                        sx={{
                          width: 92,
                          height: 72,
                          p: 0.5,
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          cursor: seatData.isUsable ? 'pointer' : 'not-allowed',
                          bgcolor: !seatData.isUsable ? 'grey.300' : (isCurrent ? (currentColor ?? 'primary.main') : 'background.paper'),
                          color: isCurrent ? 'white' : 'text.primary',
                          opacity: seatData.isUsable ? 1 : 0.6,
                          border: isAnchor ? '3px dashed' : '2px solid',
                          borderColor: isAnchor ? 'warning.main' : (isCurrent ? (currentColor ?? 'primary.dark') : 'grey.400'),
                          transition: 'all 0.1s ease-in-out',
                          '&:hover': seatData.isUsable ? { boxShadow: 3, opacity: 0.85 } : undefined,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>
                          {seatId}
                        </Typography>
                        {!seatData.isUsable ? (
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', mt: 1 }}>使用不可</Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, justifyContent: 'center', mt: 0.3 }}>
                            {otherStudentIds.slice(0, 3).map(id => {
                              const s = students.find(st => st.id === id);
                              if (!s) return null;
                              return (
                                <Chip
                                  key={id}
                                  label={s.number}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.6rem',
                                    bgcolor: studentColorMap.get(id),
                                    color: 'white',
                                    '& .MuiChip-label': { px: 0.6 },
                                  }}
                                />
                              );
                            })}
                            {otherStudentIds.length > 3 && (
                              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                                +{otherStudentIds.length - 3}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
              <Box sx={{ alignSelf: 'stretch', textAlign: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">後</Typography>
              </Box>
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
          座席指定を確定し次へ
        </Button>
      </Box>
    </Box>
  );
};

export default FixedSeatConfig;
