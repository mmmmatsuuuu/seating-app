import React, { useCallback, useMemo } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Typography,
  Box,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Student } from '../../types/Student';

/**
 * StudentList コンポーネントが受け取るPropsの型定義です。
 */
interface StudentListProps {
  /**
   * 表示する生徒のリストです。
   */
  students: Student[];
  /**
   * 現在選択されている生徒のIDの配列です。
   */
  selectedStudentIds?: string[];
  /**
   * 生徒がクリックされたときに呼び出されるコールバック関数です。
   * クリックされた生徒のIDを引数として受け取ります。
   * これが設定されていない場合、生徒は選択できません。
   */
  onStudentClick?: (studentId: string) => void;
  /**
   * リストのタイトルです。
   */
  title?: string;
  /**
   * リストが空の場合に表示するメッセージです。
   */
  emptyMessage?: string;
  /**
   * リストの最大高さです。指定がない場合は高さは制限されません。
   */
  maxHeight?: number | string;
  /**
   * リスト全体のカスタムスタイルを適用します。
   */
  sx?: SxProps<Theme>;

  /**
   *　表示する生徒の情報のタイプを指定します。
   * 'minimal' の場合は生徒の名前と番号のみ表示。
   * 'default' の場合は名前、番号、ふりがな、その他の情報を表示します。
   */
  type?: 'minimal' | 'default';
}

/**
 * 生徒の一覧を表示し、選択可能なオプションを提供する再利用可能なコンポーネントです。
 */
const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentIds = [],
  onStudentClick,
  title,
  emptyMessage = '生徒がいません。',
  maxHeight,
  sx,
  type = 'default', // デフォルトは 'default' タイプ
}) => {
  // 生徒リストを番号順にソート (常にソートされた状態で表示)
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => Number(a.number) - Number(b.number));
  }, [students]);

  // ListItem のクリックハンドラ
  const handleClick = useCallback(
    (studentId: string) => {
      if (onStudentClick) {
        onStudentClick(studentId);
      }
    },
    [onStudentClick]
  );

  return (
    <Box sx={sx}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      <List
        sx={{
          border: '1px solid #eee',
          borderRadius: 1,
          maxHeight: maxHeight,
          overflow: maxHeight ? 'auto' : 'visible', // maxHeightが設定されていればスクロール可能に
        }}
      >
        {sortedStudents.length === 0 ? (
          <ListItem>
            <ListItemText secondary={emptyMessage} sx={{ textAlign: 'center', py: 2 }} />
          </ListItem>
        ) : (
          sortedStudents.map((student) => (
            // @ts-ignore
            <ListItem
              key={student.id}
              // onStudentClick が設定されている場合のみボタンとして機能させる
              button={!!onStudentClick}
              onClick={onStudentClick ? () => handleClick(student.id) : undefined}
              selected={selectedStudentIds.includes(student.id)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.primary.light + ' !important',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.primary.light,
                  },
                },
                cursor: onStudentClick ? 'pointer' : 'default', // クリック可能ならポインター
              }}
            >
              <ListItemIcon>
                <Avatar>{student.number}</Avatar>
              </ListItemIcon>
              <ListItemText
                primary={`${student.name}`}
              />
              {type === 'default' && student.kana && 
                <ListItemText
                  secondary={`(${student.kana})`}
                  sx={{ ml: 2, color: 'text.secondary' }}
                />
              }
              {type === 'default' && student.info1 && 
                <ListItemText
                  secondary={`(${student.info1})`}
                  sx={{ ml: 2, color: 'text.secondary' }}
                />
              }
              {type === 'default' && student.info2 && 
                <ListItemText
                  secondary={`(${student.info2})`}
                  sx={{ ml: 2, color: 'text.secondary' }}
                />
              }
              {type === 'default' && student.info3 && 
                <ListItemText
                  secondary={`(${student.info3})`}
                  sx={{ ml: 2, color: 'text.secondary' }}
                />
              }
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};

export default StudentList;