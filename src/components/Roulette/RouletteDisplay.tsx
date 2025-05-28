// src/components/Roulette/RouletteDisplay.tsx

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
import type { SeatMap } from '../../types/Seat';
import type { RelationConfigData } from '../../types/Relation';
import { useAppState } from '../../contexts/AppStateContext';
import type { TransitionProps } from '@mui/material/transitions';
import { RelationTypeConstants } from '../../constants';
import type { RouletteState } from '../../types/Roulette';

// ダイアログのトランジション設定
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement; // childrenの型をより厳密に
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// 隣接する座席IDを返すヘルパー関数 (座席IDの形式が "R{row}C{col}" と仮定)
const getAdjacentSeatIds = (seatId: string, seatMap: SeatMap): string[] => {
  const match = seatId.match(/R(\d+)C(\d+)/);
  if (!match) return [];

  const row = parseInt(match[1], 10);
  const col = parseInt(match[2], 10);
  const adjacentIds: string[] = [];

  // seatMapが空の場合や、パースできないseatIdが含まれる場合のフォールバック
  const allRows = seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[1] || '0', 10));
  const allCols = seatMap.map(s => parseInt(s.seatId.match(/R(\d+)C(\d+)/)?.[2] || '0', 10));

  const maxRow = allRows.length > 0 ? Math.max(...allRows) : 0;
  const maxCol = allCols.length > 0 ? Math.max(...allCols) : 0;
  const minRow = allRows.length > 0 ? Math.min(...allRows) : 0;
  const minCol = allCols.length > 0 ? Math.min(...allCols) : 0;


  // 上、下、左、右の隣接座席
  const potentialAdjacents = [
    `R${row - 1}C${col}`, // 上
    `R${row + 1}C${col}`, // 下
    `R${row}C${col - 1}`, // 左
    `R${row}C${col + 1}`, // 右
  ];

  potentialAdjacents.forEach(adjId => {
    // 実際に座席マップに存在し、かつ自分自身ではないことを確認
    // 行と列の範囲内であるかもチェック
    const adjMatch = adjId.match(/R(\d+)C(\d+)/);
    if (adjMatch) {
      const adjRow = parseInt(adjMatch[1], 10);
      const adjCol = parseInt(adjMatch[2], 10);
      if (adjRow >= minRow && adjRow <= maxRow && adjCol >= minCol && adjCol <= maxCol && seatMap.some(s => s.seatId === adjId) && adjId !== seatId) {
        adjacentIds.push(adjId);
      }
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
    setAppPhase, // アプリフェーズ変更用
  } = useAppState();

  const rouletteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null); // requestAnimationFrame のIDを保持
  const rouletteSpeed = 50; // 空席が点灯する速度 (ms)
  const [openResultModal, setOpenResultModal] = useState<boolean>(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<Student | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  // 未割り当ての生徒リスト
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
      // まだ割り当てる生徒が選択されていない場合、最初の未割り当て生徒を自動選択
      setSelectedStudentForAssignment(unassignedStudents[0]);
      setRouletteState((prev:RouletteState) => ({ ...prev, currentAssigningStudent: unassignedStudents[0] }));
    } else if (unassignedStudents.length === 0 && rouletteState.isStopped === false) {
      // 全ての生徒が割り当てられたら、ルーレットを停止状態にする
      setRouletteState((prev:RouletteState) => ({ ...prev, isRunning: false, isStopped: true }));
    }
  }, [unassignedStudents, rouletteState.currentAssigningStudent, rouletteState.isStopped, setRouletteState]);


  // 関係性制約をチェックする関数
  const checkRelationConstraints = useCallback((
    targetSeatId: string,
    assigningStudent: Student,
    currentSeatMap: SeatMap,
    allStudents: Student[],
    relations: RelationConfigData[]
  ): boolean => {
    const adjacentSeats = getAdjacentSeatIds(targetSeatId, currentSeatMap);

    for (const rel of relations) {
      // 対象生徒が含まれる関係性のみをチェック
      if (rel.studentId1 === assigningStudent.id || rel.studentId2 === assigningStudent.id) {
        const partnerId = rel.studentId1 === assigningStudent.id ? rel.studentId2 : rel.studentId1;
        const partnerStudent = allStudents.find(s => s.id === partnerId);

        // パートナーがまだ割り当てられていない、または座席IDがない場合はこの関係性はスキップ
        if (!partnerStudent || !partnerStudent.isAssigned || !partnerStudent.assignedSeatId) {
          continue;
        }

        const partnerSeatId = partnerStudent.assignedSeatId;

        if (rel.type === RelationTypeConstants.CO_SEAT) {
          // 一緒に座りたい関係性: パートナーが隣接する座席にいるべき
          if (!adjacentSeats.includes(partnerSeatId)) {
            // 隣接していない場合はNG
            return false;
          }
        } else if (rel.type === RelationTypeConstants.NO_CO_SEAT) {
          // 一緒に座りたくない関係性: パートナーが隣接する座席にいるべきではない
          if (adjacentSeats.includes(partnerSeatId)) {
            // 隣接している場合はNG
            return false;
          }
        }
      }
    }
    return true; // 全ての制約を満たしている
  }, []); // getAdjacentSeatIds は useCallback の外にあるため依存配列から除外


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
    setRouletteState((prev:RouletteState) => ({ ...prev, isRunning: true, isStopped: false, currentSelectedSeatId: null })); // 初期化時にcurrentSelectedSeatIdをnullに

    // 既存のアニメーションフレームをキャンセル
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

    // 一応、長時間実行防止のための setInterval (通常は requestAnimationFrame で十分)
    // 実際のルーレット停止はこの setInterval ではなく stopRoulette で行う
    rouletteIntervalRef.current = setInterval(() => {
        // ここでは特に何もしない
    }, 1000); // 1秒ごとにチェック
  }, [availableSeats, rouletteState.isRunning, selectedStudentForAssignment, setRouletteState, rouletteSpeed]);


  // ルーレット停止ハンドラ
  const stopRoulette = useCallback(() => {
    if (!rouletteState.isRunning) return;

    if (rouletteIntervalRef.current) {
      clearInterval(rouletteIntervalRef.current);
      rouletteIntervalRef.current = null;
    }

    // requestAnimationFrame も停止
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    let finalSelectedSeatId = rouletteState.currentSelectedSeatId;

    // もし点灯が始まっていないなどでnullの場合、ランダムに一つ選ぶ
    if (!finalSelectedSeatId && availableSeats.length > 0) {
        finalSelectedSeatId = availableSeats[Math.floor(Math.random() * availableSeats.length)]?.seatId || null;
    }

    if (!finalSelectedSeatId || !selectedStudentForAssignment) {
      setLocalErrorMessage('座席または生徒が選択できませんでした。');
      setRouletteState(prev => ({ ...prev, isRunning: false, isStopped: true, currentSelectedSeatId: null, currentAssigningStudent: null }));
      return;
    }

    // 関係性制約のチェックと再抽選ロジック
    let attempts = 0;
    const maxAttempts = 100; // 無限ループ防止のため
    let isValidSeat = false;
    let chosenSeatId = finalSelectedSeatId;
    const shuffledAvailableSeats = [...availableSeats].sort(() => Math.random() - 0.5); // 選択肢をシャッフル

    while (!isValidSeat && attempts < maxAttempts) {
      // 既に選ばれた座席が有効かチェック
      if (checkRelationConstraints(chosenSeatId, selectedStudentForAssignment, seatMap, students, relationConfig)) {
        isValidSeat = true;
      } else {
        // 制約を満たさない場合、別のランダムな空席を再選択
        const nextSeat = shuffledAvailableSeats.find(seat =>
            seat.seatId !== chosenSeatId &&
            checkRelationConstraints(seat.seatId, selectedStudentForAssignment, seatMap, students, relationConfig)
        );

        if (nextSeat) {
            chosenSeatId = nextSeat.seatId;
        } else {
            // 関係性を満たす座席が見つからない場合
            setLocalErrorMessage('関係性を満たす空席が見つかりませんでした。');
            isValidSeat = true; // ループを抜けるため
            chosenSeatId = ""; // 割り当て失敗
            break;
        }
      }
      attempts++;
    }

    if (!isValidSeat || !chosenSeatId) {
        setLocalErrorMessage('関係性を満たす座席を見つけられませんでした。手動で割り当てるか、関係性設定を見直してください。');
        setRouletteState(prev => ({
            ...prev,
            isRunning: false,
            isStopped: true,
            currentSelectedSeatId: null,
            currentAssigningStudent: null,
        }));
        return;
    }

    // 座席の割り当て
    const updatedSeatMap = seatMap.map(seat =>
      seat.seatId === chosenSeatId
        ? { ...seat, assignedStudentId: selectedStudentForAssignment.id }
        : seat
    );
    setSeatMap(updatedSeatMap);
    

    // 生徒の割り当て状態を更新
    const updatedStudents = students.map(s =>
      s.id === selectedStudentForAssignment.id
        ? { ...s, isAssigned: true, assignedSeatId: chosenSeatId }
        : s
    );
    setStudents(updatedStudents);

    // ルーレットの状態を更新
    setRouletteState(prev => ({
      ...prev,
      isRunning: false,
      isStopped: true, // 停止状態
      currentSelectedSeatId: chosenSeatId, // 最終的に割り当てられた座席
      currentAssigningStudent: selectedStudentForAssignment,
      winningHistory: [...prev.winningHistory, { studentId: selectedStudentForAssignment.id, seatId: chosenSeatId }],
    }));

    setOpenResultModal(true); // 結果モーダルを開く
  }, [rouletteState.isRunning, rouletteState.currentSelectedSeatId, availableSeats, selectedStudentForAssignment, checkRelationConstraints, seatMap, students, relationConfig, setSeatMap, setStudents, setRouletteState]);

  // 結果モーダルを閉じるハンドラ
  const handleCloseResultModal = useCallback(() => {
    setOpenResultModal(false);
    // 次の生徒を自動的に選択するか、完了状態にする
    const nextUnassignedStudent = unassignedStudents.find(s => s.id !== selectedStudentForAssignment?.id);
    if (nextUnassignedStudent) {
      setSelectedStudentForAssignment(nextUnassignedStudent);
      setRouletteState(prev => ({ ...prev, currentAssigningStudent: nextUnassignedStudent, isStopped: false, currentSelectedSeatId: null })); // next student selection clears previous seat highlight
    } else {
      // 全員割り当て完了
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
      setLocalErrorMessage(null); // エラーメッセージをクリア
    } else {
        setLocalErrorMessage('既に座席が割り当てられているか、生徒が見つかりません。');
    }
  }, [rouletteState.isRunning, students, setRouletteState]);


  // リセットボタンハンドラ
  const handleResetRoulette = useCallback(() => {
    if (window.confirm('現在の座席割り当てとルーレット状態を全てリセットしてもよろしいですか？')) {
      // 座席マップの割り当てをクリア
      const resetSeatMap = seatMap.map(seat => ({ ...seat, assignedStudentId: null }));
      setSeatMap(resetSeatMap);

      // 生徒の割り当て状態をクリア
      const resetStudents = students.map(s => ({ ...s, isAssigned: false, assignedSeatId: null }));
      setStudents(resetStudents);

      // ルーレットの状態を初期化
      const initialAssigningStudent = unassignedStudents.length > 0 ? unassignedStudents[0] : null;
      setRouletteState({
        isRunning: false,
        currentSelectedSeatId: null,
        currentAssigningStudent: initialAssigningStudent,
        winningHistory: [],
        isStopped: false,
      });
      setLocalErrorMessage(null);
      setSelectedStudentForAssignment(initialAssigningStudent); // 最初の生徒を再選択
    }
  }, [seatMap, students, unassignedStudents, setSeatMap, setStudents, setRouletteState]);

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
    if (unassignedStudents.length > availableSeats.length) {
        setLocalErrorMessage(`生徒 (${unassignedStudents.length}人) が空席 (${availableSeats.length}席) より多いため、一括割り当てできません。`);
        return;
    }
    if (!window.confirm('残りの生徒をランダムに空席へ一括割り当てします。よろしいですか？')) {
      return;
    }

    setLocalErrorMessage(null);
    let tempSeatMap: SeatMap = [...seatMap];
    let tempStudents: Student[] = [...students];
    let tempWinningHistory = [...rouletteState.winningHistory];

    const assignableSeatsCopy = [...availableSeats]; // 利用可能な座席のシャッフルコピー
    // シャッフル
    for (let i = assignableSeatsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assignableSeatsCopy[i], assignableSeatsCopy[j]] = [assignableSeatsCopy[j], assignableSeatsCopy[i]];
    }

    const unassignedCopy = [...unassignedStudents];
     // シャッフル
    for (let i = unassignedCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unassignedCopy[i], unassignedCopy[j]] = [unassignedCopy[j], unassignedCopy[i]];
    }

    unassignedCopy.forEach(student => {
      let assigned = false;
      let attempts = 0;
      const maxAttempts = assignableSeatsCopy.length * 2; // 無限ループ防止、十分な試行回数

      // 関係性制約を満たす座席を見つけるまで試行
      let currentSeatIndex = 0;
      while (!assigned && currentSeatIndex < assignableSeatsCopy.length && attempts < maxAttempts) {
        const potentialSeat = assignableSeatsCopy[currentSeatIndex];

        if (!potentialSeat || !potentialSeat.seatId) {
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

          // 割り当て済みの座席はリストから削除 (spliceは元の配列を変更するので注意)
          assignableSeatsCopy.splice(currentSeatIndex, 1);
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
    if (!localErrorMessage) { // エラーがなければ成功メッセージ
      console.log('全ての生徒を一括割り当てしました。');
    }
  }, [unassignedStudents, availableSeats, seatMap, students, relationConfig, rouletteState.winningHistory, setSeatMap, setStudents, setRouletteState, checkRelationConstraints, localErrorMessage]);


  // 全ての座席が埋まったか、生徒がいなくなったら自動的に次のフェーズへ
  const allStudentsAssigned = unassignedStudents.length === 0;

  // useEffect(() => {
  //   if (allStudentsAssigned && rouletteState.isStopped) {
  //     setAppPhase('chart'); // 全員割り当てられたら座席表フェーズへ遷移
  //   }
  // }, [allStudentsAssigned, rouletteState.isStopped, setAppPhase]);


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        座席割り当てルーレット
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        未割り当ての生徒を選び、「スタート」で空席をランダムに点灯させ、座席を割り当てます。
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
                disabled={rouletteState.isRunning} // ルーレット実行中はリセットできない
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
            <Grid container spacing={1} justifyContent="center" wrap="wrap">
              {/* rows と cols を取得してレンダリング */}
              {/* seatMap が空でないことを確認 */}
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

                    // SeatMapConfigとは異なり、seatDataが存在しない場合は表示しない (グリッドの範囲外)
                    if (!seatData) return null; // 存在しない座席は表示しない
                    // if (!seatData || !seatData.isUsable) return null; // 使用不可の座席は表示しない

                    // 割り当てられている生徒を探す
                    const assignedStudent = students.find(s => s.id === seatData.assignedStudentId);

                    // 点灯中の座席は特別なスタイルを適用
                    const isHighlighted = rouletteState.isRunning && rouletteState.currentSelectedSeatId === seatId;
                    const highlightColor = isHighlighted ? 'warning.main' : undefined; // 点灯色

                    return (
                      // @ts-ignore
                      <Grid item key={seatId}>
                        <Box sx={{
                            border: isHighlighted ? '3px solid' : '1px solid',
                            borderColor: isHighlighted ? highlightColor : (assignedStudent ? 'primary.dark' : 'grey.400'),
                            boxShadow: isHighlighted ? 6 : 1, // 点灯中は影を濃くする
                            transition: 'all 0.1s ease-in-out', // 点滅を滑らかに
                            borderRadius: 2,
                        }}>
                            <Seat
                              seatId={seatId}
                              seatData={seatData}
                              assignedStudent={assignedStudent || null}
                              onClick={() => { /* ルーレットフェーズではクリックで割り当てはしない */ }}
                              isHighlighted={isHighlighted}
                              isConfigMode={false} // ルーレットフェーズでは設定モードではない
                              displayMode='roulette' // ルーレットフェーズ用の表示モード
                              isDragDisabled={true} // ドラッグは無効化
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
          onClick={() => setAppPhase('relation')} // 前のフェーズに戻る
          disabled={rouletteState.isRunning}
        >
          前の設定に戻る
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => setAppPhase('chart')}
          disabled={rouletteState.isRunning || !allStudentsAssigned} // 全員割り当てられていなければ無効
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