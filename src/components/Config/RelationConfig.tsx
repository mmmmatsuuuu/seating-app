// src/Config/RelationConfig.tsx

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
  Divider,
  Chip,
  IconButton,
  Alert,
  AlertTitle,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import GroupIcon from '@mui/icons-material/Group';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

import type { Student } from '../../types/Student'; // 生徒の型定義
import type { RelationConfigData } from '../../types/Relation'; // 関係性の型定義 (今後作成)
import { RelationTypeConstants } from '../../constants'; // 関係性の種類定義 (今後作成)

/**
 * RelationConfigProps インターフェース
 * 関係性設定コンポーネントが受け取るPropsの型定義です。
 */
interface RelationConfigProps {
  /**
   * 現在の生徒のリストです。
   */
  students: Student[];
  /**
   * 現在の関係性設定データです。
   */
  currentRelationConfig: RelationConfigData[];
  /**
   * 関係性設定が完了し、データが更新されたときに呼び出されるコールバック関数です。
   */
  onConfigFinished: (updatedConfig: RelationConfigData[]) => void;
  /**
   * キャンセル時に呼び出されるコールバック関数です。
   */
  onCancel: () => void;
}

/**
 * 生徒間の関係性（例: 一緒に座りたい、隣に座りたくないなど）を設定するコンポーネントです。
 */
const RelationConfig: React.FC<RelationConfigProps> = ({
  students,
  currentRelationConfig,
  onConfigFinished,
  onCancel,
}) => {
  // 編集中の関係性設定を管理するState
  const [editableRelationConfig, setEditableRelationConfig] = useState<RelationConfigData[]>(currentRelationConfig);
  // 現在選択中の生徒ID (関係性を設定するために2人選択する)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 生徒リストを番号順にソート
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  // 生徒がクリックされたときのハンドラ
  const handleStudentClick = useCallback((studentId: string) => {
    setErrorMessage(null); // エラーメッセージをクリア
    setSelectedStudentIds((prevSelected) => {
      if (prevSelected.includes(studentId)) {
        // 既に選択されている場合は選択解除
        return prevSelected.filter((id) => id !== studentId);
      } else if (prevSelected.length < 2) {
        // 2人まで選択可能
        return [...prevSelected, studentId];
      }
      return prevSelected; // 3人目以降は選択しない
    });
  }, []);

  // 関係性を追加するハンドラ
  const handleAddRelation = useCallback((type: typeof RelationTypeConstants[keyof typeof RelationTypeConstants]) => {
    if (selectedStudentIds.length !== 2) {
      setErrorMessage('関係性を設定するには2人の生徒を選択してください。');
      return;
    }

    const [id1, id2] = selectedStudentIds.sort(); // 順序を正規化するためソート
    // 既に同じ関係性が存在しないかチェック
    const exists = editableRelationConfig.some(
      (rel) =>
        ((rel.studentId1 === id1 && rel.studentId2 === id2) ||
         (rel.studentId1 === id2 && rel.studentId2 === id1)) &&
        rel.type === type
    );

    if (exists) {
      setErrorMessage('既に同じ関係性が存在します。');
      return;
    }

    setEditableRelationConfig((prevConfig) => [
      ...prevConfig,
      { studentId1: id1, studentId2: id2, type },
    ]);
    setSelectedStudentIds([]); // 関係性追加後、選択をクリア
    setErrorMessage(null);
  }, [selectedStudentIds, editableRelationConfig]);

  // 関係性を削除するハンドラ
  const handleDeleteRelation = useCallback((indexToDelete: number) => {
    setEditableRelationConfig((prevConfig) =>
      prevConfig.filter((_, index) => index !== indexToDelete)
    );
  }, []);

  // 全ての関係性をクリアするハンドラ
  const handleClearAllRelations = useCallback(() => {
    if (window.confirm('全ての設定された関係性を削除してもよろしいですか？')) {
      setEditableRelationConfig([]);
    }
  }, []);

  // 設定を保存するハンドラ
  const handleSaveConfig = useCallback(() => {
    onConfigFinished(editableRelationConfig);
  }, [editableRelationConfig, onConfigFinished]);

  // 選択された生徒の名前を取得
  const getSelectedStudentNames = useMemo(() => {
    return selectedStudentIds
      .map((id) => students.find((s) => s.id === id)?.name || `不明な生徒(${id})`)
      .join(' と ');
  }, [selectedStudentIds, students]);

  // 関係性を表示する関数
  const renderRelation = useCallback((relation: RelationConfigData, index: number) => {
    const student1 = students.find(s => s.id === relation.studentId1);
    const student2 = students.find(s => s.id === relation.studentId2);

    if (!student1 || !student2) return null; // 生徒が見つからない場合は表示しない

    const icon = relation.type === RelationTypeConstants.CO_SEAT ? (
      <CheckCircleOutlineIcon color="success" />
    ) : (
      <CancelOutlinedIcon color="error" />
    );

    const typeText = relation.type === RelationTypeConstants.CO_SEAT ? '一緒に座りたい' : '一緒に座りたくない';

    return (
      <ListItem
        key={index}
        secondaryAction={
          <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteRelation(index)}>
            <DeleteIcon />
          </IconButton>
        }
      >
        <ListItemIcon>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Typography color='gray'>{ typeText }: </Typography>
              <Typography>{ student1.name}と{ student2.name}</Typography>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                avatar={<Avatar>{student1.number}</Avatar>}
                label={student1.name}
                size="small"
              />
              {relation.type === RelationTypeConstants.CO_SEAT ? <GroupIcon fontSize="small" color="success" /> : <DoNotDisturbAltIcon fontSize="small" color="error" />}
              <Chip
                avatar={<Avatar>{student2.number}</Avatar>}
                label={student2.name}
                size="small"
              />
            </Box>
          }
        />
      </ListItem>
    );
  }, [students, handleDeleteRelation]);


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        関係性設定
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        生徒間の関係性（例: 一緒に座りたい、隣に座りたくない）を設定します。
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラー</AlertTitle>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* 左側: 生徒リストと選択エリア */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              生徒の選択
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              関係性を設定したい2人の生徒を選択してください。
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
              {sortedStudents.length === 0 ? (
                <ListItem><ListItemText secondary="生徒がいません。最初のステップで生徒を登録してください。" /></ListItem>
              ) : (
                sortedStudents.map((student) => (
                  // @ts-ignore
                  <ListItem
                    key={student.id}
                    button
                    onClick={() => handleStudentClick(student.id)}
                    selected={selectedStudentIds.includes(student.id)}
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
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                選択中: {getSelectedStudentNames || 'なし'}
              </Typography>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={() => setSelectedStudentIds([])}
                disabled={selectedStudentIds.length === 0}
              >
                選択解除
              </Button>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<GroupIcon />}
                onClick={() => handleAddRelation(RelationTypeConstants.CO_SEAT)}
                disabled={selectedStudentIds.length !== 2}
                sx={{ flexGrow: 1 }}
              >
                一緒に座りたい
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DoNotDisturbAltIcon />}
                onClick={() => handleAddRelation(RelationTypeConstants.NO_CO_SEAT)}
                disabled={selectedStudentIds.length !== 2}
                sx={{ flexGrow: 1 }}
              >
                一緒に座りたくない
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* 右側: 設定された関係性リスト */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                設定済み関係性
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ClearAllIcon />}
                onClick={handleClearAllRelations}
                disabled={editableRelationConfig.length === 0}
                size="small"
              >
                全クリア
              </Button>
            </Box>
            <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
              {editableRelationConfig.length === 0 ? (
                <ListItem><ListItemText secondary="まだ関係性は設定されていません。" /></ListItem>
              ) : (
                editableRelationConfig.map((rel, index) => renderRelation(rel, index))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

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
          // disabled={editableRelationConfig.length === 0 && currentRelationConfig.length === 0} // 保存する関係性が全くない場合は無効
        >
          関係性を確定し次へ
        </Button>
      </Box>
    </Box>
  );
};

export default RelationConfig;