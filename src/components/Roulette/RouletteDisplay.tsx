import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Alert,
  AlertTitle,
  LinearProgress, // プログレスバーを追加
  Divider, // Dividerを追加
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ShuffleIcon from '@mui/icons-material/Shuffle'; // 一括割り当て用
import RestartAltIcon from '@mui/icons-material/RestartAlt'; // リセット用
import DoneAllIcon from '@mui/icons-material/DoneAll'; // 全員決定用
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import Seat from '../Seat/Seat'; // 座席コンポーネント
import StudentList from '../Student/StudentList'; // 生徒リストコンポーネント

import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';
import type { RelationConfigData } from '../../types/Relation';
import { useAppState } from '../../contexts/AppStateContext';
import type { TransitionProps } from '@mui/material/transitions';
import { RelationTypeConstants } from '../../constants';
import type { RouletteState } from '../../types/Roulette';

// ダイアログのトランジション設定
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// 隣接する座席IDを返すヘルパー関数 (座席IDの形式が "R{row}C{col}" と仮定)
const getAdjacentSeatIds = (seatId: string, seatMap: SeatMapData[]): string[] => {
  const match = seatId.match(/R(\d+)C(\d+)/);
  if (!match) return [];

  const row = parseInt(match[1], 10);
  const col = parseInt(match[2], 10);
  const adjacentIds: string[] = [];

  const potentialAdjacents = [
    `R${row - 1}C${col}`, // 上
    `R${row + 1}C${col}`, // 下
    `R${row}C${col - 1}`, // 左
    `R${row}C${col + 1}`, // 右
  ];

  potentialAdjacents.forEach(adjId => {
    if (seatMap.some(s => s.seatId === adjId) && adjId !== seatId) {
      adjacentIds.push(adjId);
    }
  });
  return adjacentIds;
};

/**
 * RouletteDisplay コンポーネント
 * ルーレットの実行と座席割り当てを管理します。
 */
const RouletteDisplay: React.FC = () => {
  const {
    students,
    setStudents,
    seatMap,
    setSeatMap,
    rouletteState,
    setRouletteState,
    relationConfig,
    fixedSeatAssignments, // fixedSeatAssignments を取得
    setAppPhase,
  } = useAppState();

  const rouletteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rouletteSpeed = 60;
  const [openResultModal, setOpenResultModal] = useState<boolean>(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<Student | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  // ユーザーがルーレット中に手動で選択した座席ID
  const [manuallySelectedSeatIdForRoulette, setManuallySelectedSeatIdForRoulette] = useState<string | null>(null);

  // 未割り当ての生徒リスト (ルーレット開始時には全ての生徒が含まれる可能性がある)
  const unassignedStudents = useMemo(() => {
    return students.filter(s => !s.isAssigned).sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  // 空席（使用可能かつ未割り当ての座席）リスト
  const availableSeats = useMemo(() => {
    return seatMap.filter(seat => seat.isUsable && !seat.assignedStudentId);
  }, [seatMap]);

  // ルーレット開始前の準備
  useEffect(() => {
    if (!rouletteState.currentAssigningStudent && unassignedStudents.length > 0) {
      setSelectedStudentForAssignment(unassignedStudents[0]);
      setRouletteState((prev:RouletteState) => ({ ...prev, currentAssigningStudent: unassignedStudents[0] }));
    } else if (unassignedStudents.length === 0 && rouletteState.isStopped === false) {
      setRouletteState((prev:RouletteState) => ({ ...prev, isRunning: false, isStopped: true }));
    }
  }, [unassignedStudents, rouletteState.currentAssigningStudent, rouletteState.isStopped, setRouletteState]);


  // 関係性制約をチェックする関数
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

        if (!partnerStudent || !partnerStudent.isAssigned || !partnerStudent.assignedSeatId) {
          continue;
        }

        const partnerSeatId = partnerStudent.assignedSeatId;

        if (rel.type === RelationTypeConstants.CO_SEAT) {
          if (!adjacentSeats.includes(partnerSeatId)) {
            return false;
          }
        } else if (rel.type === RelationTypeConstants.NO_CO_SEAT) {
          if (adjacentSeats.includes(partnerSeatId)) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);


  // ルーレット開始ハンドラ
  const startRoulette = useCallback(() => {
    if (availableSeats.length === 0) {
      setLocalErrorMessage('割り当て可能な空席がありません。');
      return;
    }
    if (!selectedStudentForAssignment) {
      setLocalErrorMessage('座席を割り当てる生徒が選択されていません。');
      return;
    }
    if (rouletteState.isRunning) return;

    setLocalErrorMessage(null);
    setRouletteState((prev:RouletteState) => ({ ...prev, isRunning: true, isStopped: false, currentSelectedSeatId: null }));
    setManuallySelectedSeatIdForRoulette(null); // ルーレット開始時に手動選択をクリア

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (rouletteIntervalRef.current) {
        clearInterval(rouletteIntervalRef.current);
        rouletteIntervalRef.current = null;
    }

    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (!lastTime || currentTime - lastTime >= rouletteSpeed) {
        lastTime = currentTime;

        // 利用可能な座席の中からランダムに選択
        const randomIndex = Math.floor(Math.random() * availableSeats.length);
        const randomSeatId = availableSeats[randomIndex]?.seatId || null;

        setRouletteState((prev: RouletteState) => ({ ...prev, currentSelectedSeatId: randomSeatId }));
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    rouletteIntervalRef.current = setInterval(() => {
        // ここでは特に何もしない
    }, 1000);
  }, [availableSeats, rouletteState.isRunning, selectedStudentForAssignment, setRouletteState, rouletteSpeed]);


  // ルーレット停止ハンドラ
  const stopRoulette = useCallback(() => {
    if (!rouletteState.isRunning) return;

    if (rouletteIntervalRef.current) {
      clearInterval(rouletteIntervalRef.current);
      rouletteIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setLocalErrorMessage(null); // 以前のエラーメッセージをクリア

    if (!selectedStudentForAssignment) {
        setLocalErrorMessage('座席を割り当てる生徒が選択されていません。');
        setRouletteState(prev => ({ ...prev, isRunning: false, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
        setManuallySelectedSeatIdForRoulette(null);
        return;
    }

    let finalChosenSeatId: string | null = null;
    let isValidFinalSeat = false;

    // 現在割り当てようとしている生徒が固定座席を持っているかチェック
    const fixedAssignmentForStudent = fixedSeatAssignments.find(fsa => fsa.studentId === selectedStudentForAssignment.id);

    if (fixedAssignmentForStudent) {
      // 1. 生徒が固定座席を持っている場合、その固定座席に強制的に決定
      const fixedSeatId = fixedAssignmentForStudent.seatId;
      const targetFixedSeat = seatMap.find(seat => seat.seatId === fixedSeatId);

      if (!targetFixedSeat || !targetFixedSeat.isUsable) {
        setLocalErrorMessage(`生徒 ${selectedStudentForAssignment.name} の固定座席 (${fixedSeatId}) は使用できません。座席設定を確認してください。`);
      } else if (targetFixedSeat.assignedStudentId && targetFixedSeat.assignedStudentId !== selectedStudentForAssignment.id) {
        // 既に他の生徒に割り当てられている場合
        setLocalErrorMessage(`生徒 ${selectedStudentForAssignment.name} の固定座席 (${fixedSeatId}) は既に他の生徒に割り当てられています。`);
      } else {
        finalChosenSeatId = fixedSeatId;
        isValidFinalSeat = true;
      }
    } else if (manuallySelectedSeatIdForRoulette) {
      // 2. 固定座席を持たない生徒で、ユーザーが手動で座席を選択している場合、それを優先
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

    // 3. 上記のいずれでも有効な座席が見つからなかった場合、ルーレットが点灯していた座席を試す (固定座席のない生徒のみ)
    if (!isValidFinalSeat && rouletteState.currentSelectedSeatId) {
        const currentRouletteSeatData = availableSeats.find(seat => seat.seatId === rouletteState.currentSelectedSeatId);
        if (currentRouletteSeatData) {
            if (checkRelationConstraints(rouletteState.currentSelectedSeatId, selectedStudentForAssignment, seatMap, students, relationConfig)) {
                finalChosenSeatId = rouletteState.currentSelectedSeatId;
                isValidFinalSeat = true;
            }
        }
    }

    // 4. 上記のいずれでも有効な座席が見つからなかった場合、ランダムに制約を満たす座席を探す (固定座席のない生徒のみ)
    if (!isValidFinalSeat) {
        let attempts = 0;
        const maxAttempts = 100;
        const shuffledAvailableSeats = [...availableSeats].sort(() => Math.random() - 0.5);

        while (!isValidFinalSeat && attempts < maxAttempts) {
            const potentialSeat = shuffledAvailableSeats[attempts % shuffledAvailableSeats.length];

            if (potentialSeat && potentialSeat.seatId) {
                if (checkRelationConstraints(potentialSeat.seatId, selectedStudentForAssignment, seatMap, students, relationConfig)) {
                    finalChosenSeatId = potentialSeat.seatId;
                    isValidFinalSeat = true;
                }
            }
            attempts++;
        }

        if (!isValidFinalSeat || !finalChosenSeatId) {
            setLocalErrorMessage('関係性を満たす空席が見つかりませんでした。手動で割り当てるか、関係性設定を見直してください。');
            setRouletteState(prev => ({
                ...prev,
                isRunning: false,
                isStopped: true,
                currentSelectedSeatId: null,
                currentAssigningStudent: null,
            }));
            setManuallySelectedSeatIdForRoulette(null);
            return;
        }
    }

    // 最終的に決定した座席で割り当てを実行
    const updatedSeatMap = seatMap.map(seat =>
      seat.seatId === finalChosenSeatId
        ? { ...seat, assignedStudentId: selectedStudentForAssignment.id }
        : seat
    );
    setSeatMap(updatedSeatMap);

    const updatedStudents = students.map(s =>
      s.id === selectedStudentForAssignment.id
        ? { ...s, isAssigned: true, assignedSeatId: finalChosenSeatId }
        : s
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

    setManuallySelectedSeatIdForRoulette(null); // 割り当て成功後も手動選択をクリア
    setOpenResultModal(true);
  }, [rouletteState.isRunning, rouletteState.currentSelectedSeatId, availableSeats, selectedStudentForAssignment, checkRelationConstraints, seatMap, students, relationConfig, setSeatMap, setStudents, setRouletteState, manuallySelectedSeatIdForRoulette, fixedSeatAssignments]);


  // 結果モーダルを閉じるハンドラ
  const handleCloseResultModal = useCallback(() => {
    setOpenResultModal(false);
    const nextUnassignedStudent = unassignedStudents.find(s => s.id !== selectedStudentForAssignment?.id);
    if (nextUnassignedStudent) {
      setSelectedStudentForAssignment(nextUnassignedStudent);
      setRouletteState(prev => ({ ...prev, currentAssigningStudent: nextUnassignedStudent, isStopped: false, currentSelectedSeatId: null }));
    } else {
      setRouletteState(prev => ({ ...prev, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
      setLocalErrorMessage('全ての生徒の座席が決定しました！');
    }
  }, [unassignedStudents, selectedStudentForAssignment, setRouletteState]);

  // 生徒リストのクリックハンドラ（次に座席を割り当てる生徒を選択）
  const handleStudentSelect = useCallback((studentId: string) => {
    if (rouletteState.isRunning) {
        setLocalErrorMessage('ルーレット実行中は生徒を変更できません。');
        return;
    }
    const student = students.find(s => s.id === studentId);
    if (student && !student.isAssigned) {
      setSelectedStudentForAssignment(student);
      setRouletteState(prev => ({ ...prev, currentAssigningStudent: student, isStopped: false, currentSelectedSeatId: null }));
      setLocalErrorMessage(null);
      setManuallySelectedSeatIdForRoulette(null); // 生徒選択時に手動選択をクリア
    } else {
        setLocalErrorMessage('既に座席が割り当てられているか、生徒が見つかりません。');
    }
  }, [rouletteState.isRunning, students, setRouletteState]);


  // リセットボタンハンドラ
  const handleResetRoulette = useCallback(() => {
    if (window.confirm('現在のルーレットによる座席割り当てを全てリセットしてもよろしいですか？固定座席の設定は維持されます。')) {
      // 座席マップの割り当てを全てクリア
      const resetSeatMap = seatMap.map(seat => ({ ...seat, assignedStudentId: null }));
      setSeatMap(resetSeatMap);

      // 生徒の割り当て状態を全てクリア
      const resetStudents = students.map(s => ({ ...s, isAssigned: false, assignedSeatId: null }));
      setStudents(resetStudents);

      // ルーレットの状態を初期化
      const initialAssigningStudent = resetStudents.filter(s => !s.isAssigned).sort((a,b) => Number(a.number) - Number(b.number))[0] || null;
      setRouletteState({
        isRunning: false,
        currentSelectedSeatId: null,
        currentAssigningStudent: initialAssigningStudent,
        winningHistory: [],
        isStopped: false,
      });
      setLocalErrorMessage(null);
      setSelectedStudentForAssignment(initialAssigningStudent);
      setManuallySelectedSeatIdForRoulette(null); // リセット時にも手動選択をクリア
    }
  }, [seatMap, students, setSeatMap, setStudents, setRouletteState]); // fixedSeatAssignments は依存配列から削除


  // 全員一括割り当てハンドラ
  const handleBulkAssign = useCallback(() => {
    if (unassignedStudents.length === 0) {
        setLocalErrorMessage('割り当てる生徒がいません。');
        return;
    }
    if (availableSeats.length === 0) {
        setLocalErrorMessage('割り当て可能な空席がありません。');
        return;
    }
    // このチェックは、固定座席の生徒が割り当てられる前の状態で行われるため、
    // 厳密には不正確になる可能性がありますが、大まかな初期チェックとして残します。
    if (unassignedStudents.length > availableSeats.length) {
        setLocalErrorMessage(`生徒 (${unassignedStudents.length}人) が空席 (${availableSeats.length}席) より多いため、一括割り当てできません。`);
        return;
    }
    if (!window.confirm('残りの生徒をランダムに空席へ一括割り当てします。よろしいですか？')) {
      return;
    }

    setLocalErrorMessage(null);
    // 現在の seatMap と students を基に一時的なコピーを作成
    // JSON.parse(JSON.stringify()) を使用してディープコピーを確実にする
    let tempSeatMap: SeatMapData[] = JSON.parse(JSON.stringify(seatMap));
    let tempStudents: Student[] = JSON.parse(JSON.stringify(students));
    let tempWinningHistory = [...rouletteState.winningHistory];

    // 割り当て済み生徒のIDを追跡するためのSet
    const assignedStudentIdsInTemp = new Set<string>();
    // 割り当て済み座席のIDを追跡するためのSet
    const assignedSeatIdsInTemp = new Set<string>();

    // --- フェーズ1: 固定座席の生徒を割り当てる ---
    const fixedAssignmentErrors: string[] = [];
    fixedSeatAssignments.forEach(fixedAssignment => {
      const student = tempStudents.find(s => s.id === fixedAssignment.studentId);
      const fixedSeat = tempSeatMap.find(s => s.seatId === fixedAssignment.seatId);

      if (!student) {
        fixedAssignmentErrors.push(`固定座席が設定されている生徒 (${fixedAssignment.studentId}) が見つかりません。`);
        return;
      }
      if (!fixedSeat) {
        fixedAssignmentErrors.push(`生徒 ${student.name} の固定座席 (${fixedAssignment.seatId}) が見つかりません。`);
        return;
      }
      if (!fixedSeat.isUsable) {
        fixedAssignmentErrors.push(`生徒 ${student.name} の固定座席 (${fixedAssignment.seatId}) は使用不可です。`);
        return;
      }
      // ここではまだ誰も割り当てられていないはずなので、このチェックは主に論理的な安全のため
      if (fixedSeat.assignedStudentId && fixedSeat.assignedStudentId !== student.id) {
        fixedAssignmentErrors.push(`生徒 ${student.name} の固定座席 (${fixedAssignment.seatId}) は既に他の生徒に割り当てられています。`);
        return;
      }
      // もし既に割り当て済みであればスキップ（これは App.tsx の初期化ロジックに依存）
      if (assignedStudentIdsInTemp.has(student.id)) {
        console.warn(`生徒 ${student.name} は既に割り当て済みとして認識されています。`);
        return;
      }
      if (assignedSeatIdsInTemp.has(fixedSeat.seatId)) {
        console.warn(`座席 ${fixedSeat.seatId} は既に割り当て済みとして認識されています。`);
        return;
      }


      // 生徒を固定座席に割り当て
      tempSeatMap = tempSeatMap.map(s =>
        s.seatId === fixedSeat.seatId
          ? { ...s, assignedStudentId: student.id }
          : s
      );
      tempStudents = tempStudents.map(s =>
        s.id === student.id
          ? { ...s, isAssigned: true, assignedSeatId: fixedSeat.seatId }
          : s
      );
      tempWinningHistory.push({ studentId: student.id, seatId: fixedSeat.seatId });
      assignedStudentIdsInTemp.add(student.id);
      assignedSeatIdsInTemp.add(fixedSeat.seatId);
    });

    if (fixedAssignmentErrors.length > 0) {
      setLocalErrorMessage('固定座席の割り当て中に問題が発生しました:\n' + fixedAssignmentErrors.join('\n'));
      // 固定座席の割り当てに失敗した場合は、そこで処理を中断することも検討
      // 今回は、エラーメッセージを表示しつつ、可能な限りランダム割り当てを続行する
    }

    // --- フェーズ2: 残りの生徒をランダムに割り当てる ---
    // 固定座席に割り当てられていない生徒のみを対象とする
    const remainingUnassignedStudents = tempStudents.filter(s => !s.isAssigned);
    // 固定座席に割り当てられていない空席のみを対象とする
    const remainingAvailableSeats = tempSeatMap.filter(seat => seat.isUsable && !seat.assignedStudentId);

    // シャッフル
    for (let i = remainingUnassignedStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingUnassignedStudents[i], remainingUnassignedStudents[j]] = [remainingUnassignedStudents[j], remainingUnassignedStudents[i]];
    }
    for (let i = remainingAvailableSeats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingAvailableSeats[i], remainingAvailableSeats[j]] = [remainingAvailableSeats[j], remainingAvailableSeats[i]];
    }

    remainingUnassignedStudents.forEach(student => {
      let assigned = false;
      let attempts = 0;
      const maxAttempts = remainingAvailableSeats.length * 2; // 無限ループ防止、十分な試行回数

      // 既に割り当て済みであればスキップ（フェーズ1で割り当てられた固定座席の生徒など）
      if (assignedStudentIdsInTemp.has(student.id)) {
        assigned = true;
        return;
      }

      // 関係性制約を満たす座席を見つけるまで試行
      let currentSeatIndex = 0;
      while (!assigned && currentSeatIndex < remainingAvailableSeats.length && attempts < maxAttempts) {
        const potentialSeat = remainingAvailableSeats[currentSeatIndex];

        if (!potentialSeat || !potentialSeat.seatId) {
            currentSeatIndex++;
            attempts++;
            continue;
        }

        // 既に割り当て済みであればスキップ
        if (assignedSeatIdsInTemp.has(potentialSeat.seatId)) {
            currentSeatIndex++;
            attempts++;
            continue;
        }

        if (checkRelationConstraints(potentialSeat.seatId, student, tempSeatMap, tempStudents, relationConfig)) {
          // 関係性を満たす場合、割り当て
          tempSeatMap = tempSeatMap.map(s =>
            s.seatId === potentialSeat.seatId
              ? { ...s, assignedStudentId: student.id }
              : s
          );
          tempStudents = tempStudents.map(s =>
            s.id === student.id
              ? { ...s, isAssigned: true, assignedSeatId: potentialSeat.seatId }
              : s
          );
          tempWinningHistory.push({ studentId: student.id, seatId: potentialSeat.seatId });

          assignedStudentIdsInTemp.add(student.id);
          assignedSeatIdsInTemp.add(potentialSeat.seatId);

          // 割り当て済みの座席はリストから削除 (spliceは元の配列を変更するので注意)
          remainingAvailableSeats.splice(currentSeatIndex, 1);
          assigned = true;
        } else {
          // 関係性を満たさない場合、次の座席を試す
          currentSeatIndex++;
          attempts++;
        }
      }
      if (!assigned) {
          console.warn(`生徒 ${student.name} (${student.number}) に適切な座席を見つけられませんでした。`);
          setLocalErrorMessage(prev => prev ? prev + `\n生徒 ${student.name} の座席を見つけられませんでした。` : `生徒 ${student.name} の座席を見つけられませんでした。関係性設定を見直してください。`);
      }
    });

    setSeatMap(tempSeatMap);
    setStudents(tempStudents);
    setRouletteState(prev => ({
      ...prev,
      winningHistory: tempWinningHistory,
      isRunning: false,
      isStopped: true, // 全員割り当てなので停止状態
      currentSelectedSeatId: null,
      currentAssigningStudent: null,
    }));
    setSelectedStudentForAssignment(null);
    setManuallySelectedSeatIdForRoulette(null); // 一括割り当て時にも手動選択をクリア
    if (!localErrorMessage) {
      console.log('全ての生徒を一括割り当てしました。');
    }
  }, [unassignedStudents, availableSeats, seatMap, students, relationConfig, rouletteState.winningHistory, fixedSeatAssignments, setSeatMap, setStudents, setRouletteState, checkRelationConstraints, localErrorMessage]);

  const allStudentsAssigned = unassignedStudents.length === 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        座席割り当てルーレット
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        未割り当ての生徒を選び、「スタート」で空席をランダムに点灯させ、座席を割り当てます。
        ルーレット実行中に座席をクリックすると、その座席に決定できます。
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {localErrorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラー</AlertTitle>
          {localErrorMessage}
        </Alert>
      )}

      {/* プログレスバー (オプション) */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          割り当て済み生徒数: {students.length - unassignedStudents.length} / {students.length}
        </Typography>
        <LinearProgress variant="determinate" value={(students.length - unassignedStudents.length) / students.length * 100} sx={{ height: 10, borderRadius: 5 }} />
      </Box>

      <Grid container spacing={4}>
        {/* 左側: 未割り当て生徒リスト */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={4} size={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <StudentList
              title={`未割り当て生徒 (${unassignedStudents.length}人)`}
              students={unassignedStudents}
              selectedStudentIds={selectedStudentForAssignment ? [selectedStudentForAssignment.id] : []}
              onStudentClick={handleStudentSelect}
              emptyMessage="全ての生徒が座席に割り当てられました！"
              maxHeight="300px"
              sx={{ mb: 2 }}
              type='minimal'
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              次に座席を割り当てる生徒:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'end' }}>
              {selectedStudentForAssignment?.name || '選択してください'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column' } }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={startRoulette}
                disabled={rouletteState.isRunning || !selectedStudentForAssignment || availableSeats.length === 0}
                sx={{ flexGrow: 1 }}
              >
                スタート
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={stopRoulette}
                disabled={!rouletteState.isRunning}
                sx={{ flexGrow: 1 }}
              >
                ストップ
              </Button>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: { xs: 'column' } }}>
              <Button
                variant="outlined"
                color="info"
                startIcon={<ShuffleIcon />}
                onClick={handleBulkAssign}
                disabled={rouletteState.isRunning || unassignedStudents.length === 0 || availableSeats.length === 0 || unassignedStudents.length > availableSeats.length}
                sx={{ flexGrow: 1 }}
              >
                全員一括割り当て
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={handleResetRoulette}
                disabled={rouletteState.isRunning}
                sx={{ flexGrow: 1 }}
              >
                リセット
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* 右側: 座席レイアウト表示エリア */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={8} size={9}>
          <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              座席レイアウト
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ルーレット実行中にクリックすると、その座席に決定します。
            </Typography>
            <Grid container spacing={1} justifyContent="center" wrap="wrap">
              {seatMap.length > 0 && Array.from({
                length: Math.max(...seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[1] || '0', 10)))
              }).map((_, rowIndex) => (
                // @ts-ignore
                <Grid container item xs={12} key={`row-${rowIndex}`} spacing={1} justifyContent="center" wrap="no-wrap">
                  {Array.from({
                    length: Math.max(...seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[2] || '0', 10)))
                  }).map((_, colIndex) => {
                    const seatId = `R${rowIndex + 1}C${colIndex + 1}`;
                    const seatData = seatMap.find(s => s.seatId === seatId);

                    if (!seatData) return null;

                    const assignedStudent = students.find(s => s.id === seatData.assignedStudentId);

                    const isHighlighted = rouletteState.isRunning && rouletteState.currentSelectedSeatId === seatId;
                    // 手動選択された座席もハイライト
                    const isManuallySelected = manuallySelectedSeatIdForRoulette === seatId;
                    const highlightColor = isHighlighted || isManuallySelected ? 'warning.main' : undefined;

                    return (
                      // @ts-ignore
                      <Grid item key={seatId}>
                        <Box sx={{
                            border: (isHighlighted || isManuallySelected) ? '3px solid' : '1px solid',
                            borderColor: (isHighlighted || isManuallySelected) ? highlightColor : (assignedStudent ? 'primary.dark' : 'grey.400'),
                            boxShadow: (isHighlighted || isManuallySelected) ? 6 : 1,
                            transition: 'all 0.1s ease-in-out',
                            borderRadius: 2,
                        }}>
                            <Seat
                              seatId={seatId}
                              seatData={seatData}
                              assignedStudent={assignedStudent || null}
                              // ルーレット実行中で、かつ空席の場合のみクリック可能
                              onClick={
                                (rouletteState.isRunning && !seatData.assignedStudentId && seatData.isUsable) ?
                                () => setManuallySelectedSeatIdForRoulette(seatId) : undefined
                              }
                              isHighlighted={isHighlighted || isManuallySelected}
                              isConfigMode={false}
                              displayMode='roulette'
                              isDragDisabled={true}
                            />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ))}
            </Grid>
            {availableSeats.length === 0 && unassignedStudents.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    <AlertTitle>空席不足</AlertTitle>
                    空席がありません。座席レイアウトを見直すか、割り当てられていない生徒を減らしてください。
                </Alert>
            )}
            {allStudentsAssigned && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    <AlertTitle>割り当て完了</AlertTitle>
                    全ての生徒の座席が決定しました！「座席表へ」進んでください。
                </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* フッターボタン */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setAppPhase('fixedSeat')}
          disabled={rouletteState.isRunning}
        >
          前の設定に戻る
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => setAppPhase('chart')}
          disabled={rouletteState.isRunning || !allStudentsAssigned}
          startIcon={<DoneAllIcon />}
        >
          座席表へ
        </Button>
      </Box>

      {/* 結果表示モーダル */}
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
            <Typography variant="h6" color="text.secondary">
              選ばれませんでした。
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseResultModal} variant="contained" size="large">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RouletteDisplay;
