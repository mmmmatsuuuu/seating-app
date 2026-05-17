import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import Seat from '../Seat/Seat';

import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';
import type { RelationConfigData } from '../../types/Relation';
import { useAppState } from '../../contexts/AppStateContext';
import type { TransitionProps } from '@mui/material/transitions';
import { RelationTypeConstants } from '../../constants';
import type { RouletteState } from '../../types/Roulette';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getAdjacentSeatIds = (seatId: string, seatMap: SeatMapData[]): string[] => {
  const match = seatId.match(/R(\d+)C(\d+)/);
  if (!match) return [];
  const row = parseInt(match[1], 10);
  const col = parseInt(match[2], 10);
  const potentialAdjacents = [
    `R${row - 1}C${col}`,
    `R${row + 1}C${col}`,
    `R${row}C${col - 1}`,
    `R${row}C${col + 1}`,
  ];
  return potentialAdjacents.filter(adjId => seatMap.some(s => s.seatId === adjId) && adjId !== seatId);
};

const BULK_SPIN_MS = 800;
const BULK_CONFIRM_MS = 300;

const RouletteDisplay: React.FC = () => {
  const {
    students,
    setStudents,
    seatMap,
    setSeatMap,
    rouletteState,
    setRouletteState,
    relationConfig,
    fixedSeatAssignments,
    setAppPhase,
  } = useAppState();

  const animationFrameRef = useRef<number | null>(null);
  const bulkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rouletteSpeed = 100;
  const [openResultModal, setOpenResultModal] = useState<boolean>(false);
  const [bulkCompleteModalOpen, setBulkCompleteModalOpen] = useState(false);
  const [isBulkAnimating, setIsBulkAnimating] = useState(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<Student | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [manuallySelectedSeatIdForRoulette, setManuallySelectedSeatIdForRoulette] = useState<string | null>(null);
  const [panelVisible, setPanelVisible] = useState(true);

  const unassignedStudents = useMemo(() => {
    return students.filter(s => !s.isAssigned).sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  const availableSeats = useMemo(() => {
    return seatMap.filter(seat => seat.isUsable && !seat.assignedStudentId);
  }, [seatMap]);

  useEffect(() => {
    if (!rouletteState.currentAssigningStudent && unassignedStudents.length > 0) {
      setSelectedStudentForAssignment(unassignedStudents[0]);
      setRouletteState((prev: RouletteState) => ({ ...prev, currentAssigningStudent: unassignedStudents[0] }));
    } else if (unassignedStudents.length === 0 && rouletteState.isStopped === false) {
      setRouletteState((prev: RouletteState) => ({ ...prev, isRunning: false, isStopped: true }));
    }
  }, [unassignedStudents, rouletteState.currentAssigningStudent, rouletteState.isStopped, setRouletteState]);

  const checkRelationConstraints = useCallback((
    targetSeatId: string,
    assigningStudent: Student | null,
    currentSeatMap: SeatMapData[],
    allStudents: Student[],
    relations: RelationConfigData[]
  ): boolean => {
    if (!assigningStudent) return false;
    const adjacentSeats = getAdjacentSeatIds(targetSeatId, currentSeatMap);
    for (const rel of relations) {
      if (rel.studentId1 === assigningStudent.id || rel.studentId2 === assigningStudent.id) {
        const partnerId = rel.studentId1 === assigningStudent.id ? rel.studentId2 : rel.studentId1;
        const partnerStudent = allStudents.find(s => s.id === partnerId);
        if (!partnerStudent || !partnerStudent.isAssigned || !partnerStudent.assignedSeatId) continue;
        const partnerSeatId = partnerStudent.assignedSeatId;
        if (rel.type === RelationTypeConstants.CO_SEAT && !adjacentSeats.includes(partnerSeatId)) return false;
        if (rel.type === RelationTypeConstants.NO_CO_SEAT && adjacentSeats.includes(partnerSeatId)) return false;
      }
    }
    return true;
  }, []);

  const startRoulette = useCallback(() => {
    if (availableSeats.length === 0) { setLocalErrorMessage('割り当て可能な空席がありません。'); return; }
    if (!selectedStudentForAssignment) { setLocalErrorMessage('座席を割り当てる生徒が選択されていません。'); return; }
    if (rouletteState.isRunning) return;

    setLocalErrorMessage(null);
    setRouletteState((prev: RouletteState) => ({ ...prev, isRunning: true, isStopped: false, currentSelectedSeatId: null }));
    setManuallySelectedSeatIdForRoulette(null);

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (!lastTime || currentTime - lastTime >= rouletteSpeed) {
        lastTime = currentTime;
        const randomIndex = Math.floor(Math.random() * availableSeats.length);
        const randomSeatId = availableSeats[randomIndex]?.seatId || null;
        setRouletteState((prev: RouletteState) => ({ ...prev, currentSelectedSeatId: randomSeatId }));
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [availableSeats, rouletteState.isRunning, selectedStudentForAssignment, setRouletteState, rouletteSpeed]);

  const stopRoulette = useCallback(() => {
    if (!rouletteState.isRunning) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setLocalErrorMessage(null);

    if (!selectedStudentForAssignment) {
      setLocalErrorMessage('座席を割り当てる生徒が選択されていません。');
      setRouletteState(prev => ({ ...prev, isRunning: false, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
      setManuallySelectedSeatIdForRoulette(null);
      return;
    }

    let finalChosenSeatId: string | null = null;
    let isValidFinalSeat = false;

    const fixedAssignmentForStudent = fixedSeatAssignments.find(fsa => fsa.studentId === selectedStudentForAssignment.id);

    if (fixedAssignmentForStudent) {
      const fixedSeatId = fixedAssignmentForStudent.seatId;
      const targetFixedSeat = seatMap.find(seat => seat.seatId === fixedSeatId);
      if (!targetFixedSeat || !targetFixedSeat.isUsable) {
        setLocalErrorMessage(`生徒 ${selectedStudentForAssignment.name} の固定座席 (${fixedSeatId}) は使用できません。`);
      } else if (targetFixedSeat.assignedStudentId && targetFixedSeat.assignedStudentId !== selectedStudentForAssignment.id) {
        setLocalErrorMessage(`生徒 ${selectedStudentForAssignment.name} の固定座席 (${fixedSeatId}) は既に他の生徒に割り当てられています。`);
      } else {
        finalChosenSeatId = fixedSeatId;
        isValidFinalSeat = true;
      }
    } else if (manuallySelectedSeatIdForRoulette) {
      const selectedSeatData = availableSeats.find(seat => seat.seatId === manuallySelectedSeatIdForRoulette);
      if (selectedSeatData) {
        if (checkRelationConstraints(manuallySelectedSeatIdForRoulette, selectedStudentForAssignment, seatMap, students, relationConfig)) {
          finalChosenSeatId = manuallySelectedSeatIdForRoulette;
          isValidFinalSeat = true;
        } else {
          setLocalErrorMessage(`選択された座席 (${manuallySelectedSeatIdForRoulette}) は関係性制約を満たしません。`);
        }
      } else {
        setLocalErrorMessage(`選択された座席 (${manuallySelectedSeatIdForRoulette}) は利用できません。`);
      }
    }

    if (!isValidFinalSeat && rouletteState.currentSelectedSeatId) {
      const currentRouletteSeatData = availableSeats.find(seat => seat.seatId === rouletteState.currentSelectedSeatId);
      if (currentRouletteSeatData && checkRelationConstraints(rouletteState.currentSelectedSeatId, selectedStudentForAssignment, seatMap, students, relationConfig)) {
        finalChosenSeatId = rouletteState.currentSelectedSeatId;
        isValidFinalSeat = true;
      }
    }

    if (!isValidFinalSeat) {
      let attempts = 0;
      const maxAttempts = 100;
      const shuffledAvailableSeats = [...availableSeats].sort(() => Math.random() - 0.5);
      while (!isValidFinalSeat && attempts < maxAttempts) {
        const potentialSeat = shuffledAvailableSeats[attempts % shuffledAvailableSeats.length];
        if (potentialSeat?.seatId && checkRelationConstraints(potentialSeat.seatId, selectedStudentForAssignment, seatMap, students, relationConfig)) {
          finalChosenSeatId = potentialSeat.seatId;
          isValidFinalSeat = true;
        }
        attempts++;
      }
      if (!isValidFinalSeat || !finalChosenSeatId) {
        setLocalErrorMessage('関係性を満たす空席が見つかりませんでした。手動で割り当てるか、関係性設定を見直してください。');
        setRouletteState(prev => ({ ...prev, isRunning: false, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
        setManuallySelectedSeatIdForRoulette(null);
        return;
      }
    }

    const updatedSeatMap = seatMap.map(seat =>
      seat.seatId === finalChosenSeatId ? { ...seat, assignedStudentId: selectedStudentForAssignment.id } : seat
    );
    setSeatMap(updatedSeatMap);

    const updatedStudents = students.map(s =>
      s.id === selectedStudentForAssignment.id ? { ...s, isAssigned: true, assignedSeatId: finalChosenSeatId } : s
    );
    setStudents(updatedStudents);

    setRouletteState(prev => ({
      ...prev,
      isRunning: false,
      isStopped: true,
      currentSelectedSeatId: finalChosenSeatId,
      currentAssigningStudent: selectedStudentForAssignment,
      winningHistory: [...prev.winningHistory, { studentId: selectedStudentForAssignment.id, seatId: finalChosenSeatId! }],
    }));

    setManuallySelectedSeatIdForRoulette(null);
    setOpenResultModal(true);
  }, [rouletteState.isRunning, rouletteState.currentSelectedSeatId, availableSeats, selectedStudentForAssignment, checkRelationConstraints, seatMap, students, relationConfig, setSeatMap, setStudents, setRouletteState, manuallySelectedSeatIdForRoulette, fixedSeatAssignments]);

  const handleCloseResultModal = useCallback(() => {
    setOpenResultModal(false);
    const nextUnassignedStudent = unassignedStudents.find(s => s.id !== selectedStudentForAssignment?.id);
    if (nextUnassignedStudent) {
      setSelectedStudentForAssignment(nextUnassignedStudent);
      setRouletteState(prev => ({ ...prev, currentAssigningStudent: nextUnassignedStudent, isStopped: false, currentSelectedSeatId: null }));
    } else {
      setRouletteState(prev => ({ ...prev, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
    }
  }, [unassignedStudents, selectedStudentForAssignment, setRouletteState]);

  const handleResetRoulette = useCallback(() => {
    if (!window.confirm('現在のルーレットによる座席割り当てを全てリセットしてもよろしいですか？固定座席の設定は維持されます。')) return;

    const resetSeatMap = seatMap.map(seat => ({ ...seat, assignedStudentId: null }));
    setSeatMap(resetSeatMap);

    const resetStudents = students.map(s => ({ ...s, isAssigned: false, assignedSeatId: null }));
    setStudents(resetStudents);

    const initialAssigningStudent = resetStudents.filter(s => !s.isAssigned).sort((a, b) => Number(a.number) - Number(b.number))[0] || null;
    setRouletteState({
      isRunning: false,
      currentSelectedSeatId: null,
      currentAssigningStudent: initialAssigningStudent,
      winningHistory: [],
      isStopped: false,
    });
    setLocalErrorMessage(null);
    setSelectedStudentForAssignment(initialAssigningStudent);
    setManuallySelectedSeatIdForRoulette(null);
  }, [seatMap, students, setSeatMap, setStudents, setRouletteState]);

  const handleStudentSelect = useCallback((studentId: string) => {
    const student = students.find((s: Student) => s.id === studentId);
    if (student && !student.isAssigned) {
      setSelectedStudentForAssignment(student);
      setRouletteState((prev: RouletteState) => ({ ...prev, currentAssigningStudent: student, isStopped: false, currentSelectedSeatId: null }));
      setLocalErrorMessage(null);
      setManuallySelectedSeatIdForRoulette(null);
    }
  }, [students, setRouletteState]);

  const handleBulkAssign = useCallback(() => {
    if (unassignedStudents.length === 0) { setLocalErrorMessage('割り当てる生徒がいません。'); return; }
    if (availableSeats.length === 0) { setLocalErrorMessage('割り当て可能な空席がありません。'); return; }
    if (unassignedStudents.length > availableSeats.length) {
      setLocalErrorMessage(`生徒 (${unassignedStudents.length}人) が空席 (${availableSeats.length}席) より多いため、一括割り当てできません。`);
      return;
    }
    if (!window.confirm('残りの生徒をランダムに空席へ一括割り当てします。よろしいですか？')) return;

    setLocalErrorMessage(null);

    // --- 割り当てキューを事前計算 ---
    let tempSeatMap: SeatMapData[] = JSON.parse(JSON.stringify(seatMap));
    let tempStudents: Student[] = JSON.parse(JSON.stringify(students));
    const assignedStudentIds = new Set<string>();
    const assignedSeatIds = new Set<string>();
    const queue: { studentId: string; seatId: string }[] = [];
    const errors: string[] = [];

    // 固定座席の未割り当て生徒を先にキューへ
    fixedSeatAssignments.forEach(fsa => {
      const student = tempStudents.find(s => s.id === fsa.studentId && !s.isAssigned);
      const seat = tempSeatMap.find(s => s.seatId === fsa.seatId);
      if (!student) return;
      if (!seat || !seat.isUsable) { errors.push(`生徒 ${student.name} の固定座席 (${fsa.seatId}) は使用できません。`); return; }
      if (seat.assignedStudentId && seat.assignedStudentId !== student.id) { errors.push(`生徒 ${student.name} の固定座席 (${fsa.seatId}) は既に他の生徒に割り当てられています。`); return; }
      if (assignedStudentIds.has(student.id) || assignedSeatIds.has(fsa.seatId)) return;

      queue.push({ studentId: student.id, seatId: fsa.seatId });
      tempSeatMap = tempSeatMap.map(s => s.seatId === fsa.seatId ? { ...s, assignedStudentId: student.id } : s);
      tempStudents = tempStudents.map(s => s.id === student.id ? { ...s, isAssigned: true, assignedSeatId: fsa.seatId } : s);
      assignedStudentIds.add(student.id);
      assignedSeatIds.add(fsa.seatId);
    });

    // 残りをランダムにキューへ
    const remaining = tempStudents.filter(s => !s.isAssigned);
    const remainingSeats = tempSeatMap.filter(s => s.isUsable && !s.assignedStudentId);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    for (let i = remainingSeats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSeats[i], remainingSeats[j]] = [remainingSeats[j], remainingSeats[i]];
    }
    remaining.forEach(student => {
      let assigned = false;
      for (let i = 0; i < remainingSeats.length; i++) {
        const seat = remainingSeats[i];
        if (assignedSeatIds.has(seat.seatId)) continue;
        if (checkRelationConstraints(seat.seatId, student, tempSeatMap, tempStudents, relationConfig)) {
          queue.push({ studentId: student.id, seatId: seat.seatId });
          tempSeatMap = tempSeatMap.map(s => s.seatId === seat.seatId ? { ...s, assignedStudentId: student.id } : s);
          tempStudents = tempStudents.map(s => s.id === student.id ? { ...s, isAssigned: true, assignedSeatId: seat.seatId } : s);
          assignedStudentIds.add(student.id);
          assignedSeatIds.add(seat.seatId);
          remainingSeats.splice(i, 1);
          assigned = true;
          break;
        }
      }
      if (!assigned) errors.push(student.name);
    });

    if (errors.length > 0) {
      setLocalErrorMessage(`以下の生徒の座席を見つけられませんでした: ${errors.join(', ')}`);
      return;
    }

    // 固定座席・ランダムの区別なく順番を完全にシャッフル
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    // --- 1人ずつアニメーション実行 ---
    setIsBulkAnimating(true);
    setManuallySelectedSeatIdForRoulette(null);

    const runBulkAnimation = (
      remaining: { studentId: string; seatId: string }[],
      liveSeatMap: SeatMapData[],
      liveStudents: Student[],
      liveHistory: { studentId: string; seatId: string }[],
    ) => {
      if (remaining.length === 0) {
        setIsBulkAnimating(false);
        setSelectedStudentForAssignment(null);
        setRouletteState((prev: RouletteState) => ({
          ...prev,
          isRunning: false,
          isStopped: true,
          currentSelectedSeatId: null,
          currentAssigningStudent: null,
          winningHistory: liveHistory,
        }));
        setBulkCompleteModalOpen(true);
        return;
      }

      const { studentId, seatId } = remaining[0];
      const student = liveStudents.find(s => s.id === studentId)!;
      const animatableSeats = liveSeatMap.filter(s => s.isUsable && !s.assignedStudentId);

      setSelectedStudentForAssignment(student);
      setRouletteState((prev: RouletteState) => ({
        ...prev,
        isRunning: true,
        isStopped: false,
        currentAssigningStudent: student,
        currentSelectedSeatId: null,
      }));

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      let lastTime = 0;
      const spin = (t: number) => {
        if (!lastTime || t - lastTime >= rouletteSpeed) {
          lastTime = t;
          const idx = Math.floor(Math.random() * animatableSeats.length);
          setRouletteState((prev: RouletteState) => ({ ...prev, currentSelectedSeatId: animatableSeats[idx]?.seatId || null }));
        }
        animationFrameRef.current = requestAnimationFrame(spin);
      };
      animationFrameRef.current = requestAnimationFrame(spin);

      bulkTimeoutRef.current = setTimeout(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        const newSeatMap = liveSeatMap.map(s =>
          s.seatId === seatId ? { ...s, assignedStudentId: studentId } : s
        );
        const newStudents = liveStudents.map(s =>
          s.id === studentId ? { ...s, isAssigned: true, assignedSeatId: seatId } : s
        );
        const newHistory = [...liveHistory, { studentId, seatId }];

        setSeatMap(newSeatMap);
        setStudents(newStudents);
        setRouletteState((prev: RouletteState) => ({
          ...prev,
          isRunning: false,
          isStopped: true,
          currentSelectedSeatId: seatId,
          currentAssigningStudent: student,
          winningHistory: newHistory,
        }));

        bulkTimeoutRef.current = setTimeout(() => {
          runBulkAnimation(remaining.slice(1), newSeatMap, newStudents, newHistory);
        }, BULK_CONFIRM_MS);
      }, BULK_SPIN_MS);
    };

    runBulkAnimation(queue, seatMap, students, rouletteState.winningHistory);
  }, [unassignedStudents, availableSeats, seatMap, students, relationConfig, rouletteState.winningHistory, fixedSeatAssignments, setSeatMap, setStudents, setRouletteState, checkRelationConstraints, rouletteSpeed]);

  const handleCancelBulkAssign = useCallback(() => {
    if (bulkTimeoutRef.current) clearTimeout(bulkTimeoutRef.current);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsBulkAnimating(false);
    setRouletteState((prev: RouletteState) => ({ ...prev, isRunning: false, isStopped: true, currentSelectedSeatId: null }));
  }, [setRouletteState]);

  const allStudentsAssigned = unassignedStudents.length === 0;
  const maxRow = seatMap.length > 0 ? Math.max(...seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[1] || '0', 10))) : 0;
  const maxCol = seatMap.length > 0 ? Math.max(...seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[2] || '0', 10))) : 0;
  const assignedCount = students.length - unassignedStudents.length;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 8px)', pt: 2 }}>
      {localErrorMessage && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }} onClose={() => setLocalErrorMessage(null)}>
          {localErrorMessage}
        </Alert>
      )}
      {allStudentsAssigned && (
        <Alert severity="success" sx={{ mx: 2, mb: 2 }}>
          全ての生徒の座席が決定しました！
        </Alert>
      )}

      {/* 座席グリッド - 画面中央に配置 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'auto', px: 1 }}>
        <Box sx={{ alignSelf: 'stretch', textAlign: 'center', bgcolor: 'grey.800', color: 'white', py: 0.5, borderRadius: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>黒板（前）</Typography>
        </Box>
        {Array.from({ length: maxRow }).map((_, rowIndex) => (
          <Box key={`row-${rowIndex}`} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            {Array.from({ length: maxCol }).map((_, colIndex) => {
              const seatId = `R${rowIndex + 1}C${colIndex + 1}`;
              const seatData = seatMap.find(s => s.seatId === seatId);
              if (!seatData) return null;

              const assignedStudent = students.find(s => s.id === seatData.assignedStudentId);
              const isHighlighted = rouletteState.isRunning && rouletteState.currentSelectedSeatId === seatId;
              const isManuallySelected = manuallySelectedSeatIdForRoulette === seatId;

              return (
                <Box
                  key={seatId}
                  sx={{
                    border: (isHighlighted || isManuallySelected) ? '3px solid' : '1px solid',
                    borderColor: (isHighlighted || isManuallySelected) ? 'warning.main' : (assignedStudent ? 'primary.dark' : 'grey.400'),
                    boxShadow: (isHighlighted || isManuallySelected) ? 6 : 1,
                    transition: 'all 0.1s ease-in-out',
                    borderRadius: 2,
                  }}
                >
                  <Seat
                    seatId={seatId}
                    seatData={seatData}
                    assignedStudent={assignedStudent || null}
                    onClick={
                      (rouletteState.isRunning && !seatData.assignedStudentId && seatData.isUsable)
                        ? () => setManuallySelectedSeatIdForRoulette(seatId)
                        : undefined
                    }
                    isHighlighted={isHighlighted || isManuallySelected}
                    isConfigMode={false}
                    displayMode='roulette'
                    isDragDisabled={true}
                  />
                </Box>
              );
            })}
          </Box>
        ))}
        <Box sx={{ alignSelf: 'stretch', textAlign: 'center', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">後</Typography>
        </Box>
      </Box>

      {/* パネル非表示時: 展開ボタンのみ表示 */}
      {!panelVisible && (
        <Paper
          elevation={4}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1100, borderRadius: 2 }}
        >
          <IconButton onClick={() => setPanelVisible(true)} size="small" sx={{ p: 1 }}>
            <KeyboardArrowUpIcon />
          </IconButton>
        </Paper>
      )}

      {/* フローティング操作パネル（画面右下） */}
      {panelVisible && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            px: 2,
            py: 1.5,
            zIndex: 1100,
            borderRadius: 3,
            minWidth: 320,
          }}
        >
          {/* 1行目: 進捗 + 次の生徒(Autocomplete) + 折りたたみボタン */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {assignedCount} / {students.length} 名割り当て済み
            </Typography>
            <Autocomplete<Student>
              options={unassignedStudents}
              getOptionLabel={(s: Student) => `${s.number}番 ${s.name}`}
              value={selectedStudentForAssignment}
              onChange={(_: React.SyntheticEvent, student: Student | null) => { if (student) handleStudentSelect(student.id); }}
              isOptionEqualToValue={(option: Student, value: Student) => option.id === value.id}
              disabled={rouletteState.isRunning}
              size="small"
              sx={{ flexGrow: 1, minWidth: 160 }}
              noOptionsText="未割り当ての生徒がいません"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="次の生徒"
                  inputProps={{ ...params.inputProps, style: { fontSize: '1.25rem', fontWeight: 'bold' } }}
                />
              )}
            />
            <IconButton size="small" onClick={() => setPanelVisible(false)}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </Box>

          {/* 2行目: 操作ボタン */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={startRoulette}
              disabled={isBulkAnimating || rouletteState.isRunning || !selectedStudentForAssignment || availableSeats.length === 0}
            >
              スタート
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<StopIcon />}
              onClick={stopRoulette}
              disabled={isBulkAnimating || !rouletteState.isRunning}
            >
              ストップ
            </Button>
            {isBulkAnimating ? (
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<StopIcon />}
                onClick={handleCancelBulkAssign}
              >
                一括中止
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="info"
                size="small"
                startIcon={<ShuffleIcon />}
                onClick={handleBulkAssign}
                disabled={rouletteState.isRunning || unassignedStudents.length === 0 || availableSeats.length === 0 || unassignedStudents.length > availableSeats.length}
              >
                全員一括
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleResetRoulette}
              disabled={isBulkAnimating || rouletteState.isRunning}
            >
              リセット
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={() => setAppPhase('chart')}
              disabled={!allStudentsAssigned}
            >
              座席表へ
            </Button>
          </Box>
        </Paper>
      )}

      {/* 座席決定モーダル */}
      <Dialog
        open={openResultModal}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleCloseResultModal}
        aria-describedby="roulette-result-dialog-description"
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <EmojiEventsIcon color="warning" sx={{ fontSize: 60, mb: -1 }} />
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            決定！
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {rouletteState.currentAssigningStudent && rouletteState.currentSelectedSeatId ? (
            <Typography variant="h5" color="text.primary" sx={{ mt: 1 }}>
              <Box component="span" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {rouletteState.currentAssigningStudent.name}
              </Box>
              さんは
              <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                {rouletteState.currentSelectedSeatId}
              </Box>
              に決定しました！
            </Typography>
          ) : (
            <Typography variant="h6" color="text.secondary">選ばれませんでした。</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseResultModal} variant="contained" size="large">OK</Button>
        </DialogActions>
      </Dialog>

      {/* 一括割り当て完了ダイアログ */}
      <Dialog
        open={bulkCompleteModalOpen}
        TransitionComponent={Transition}
        onClose={() => setBulkCompleteModalOpen(false)}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <EmojiEventsIcon color="warning" sx={{ fontSize: 60, mb: -1 }} />
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'success.main' }}>
            全員決定！
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.primary" sx={{ mt: 1 }}>
            全 {students.length} 名の座席が決まりました！
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
          <Button onClick={() => setBulkCompleteModalOpen(false)} variant="outlined" size="large">閉じる</Button>
          <Button onClick={() => { setBulkCompleteModalOpen(false); setAppPhase('chart'); }} variant="contained" color="success" size="large" startIcon={<DoneAllIcon />}>
            座席表へ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RouletteDisplay;
