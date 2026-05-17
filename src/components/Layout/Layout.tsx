import React, { useState, useCallback, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, Container, Box, Button, ButtonGroup,
  Tooltip, IconButton, Menu, MenuItem, Snackbar, Alert, Collapse,
} from "@mui/material";
import { saveAppData, loadAppData, clearAppData } from "../../utils/localStorage";
import type { AppPersistedState } from "../../utils/localStorage";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestoreIcon from '@mui/icons-material/Restore';

import { useAppState } from "../../contexts/AppStateContext";
import type { AppPhase } from "../../contexts/AppStateContext";
import { AppPhaseTitles, AppPhaseIcons } from "../../constants";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    students,
    setStudents,
    seatMap,
    setSeatMap,
    appPhase,
    setAppPhase,
    rouletteState,
    setRouletteState,
    fixedSeatAssignments,
    setFixedSeatAssignments,
  } = useAppState();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'info' });
  // ルーレットフェーズ専用: ヘッダーの表示/非表示
  const [headerExpanded, setHeaderExpanded] = useState(false);

  const isRoulettePhase = appPhase === 'roulette';

  // ルーレットフェーズを離れたらヘッダーを閉じる
  useEffect(() => {
    if (!isRoulettePhase) setHeaderExpanded(false);
  }, [isRoulettePhase]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSaveData = useCallback(() => {
    try {
      const dataToSave: AppPersistedState = {
        students, seatMap, appPhase, rouletteState, fixedSeatAssignments,
      };
      saveAppData(dataToSave);
      showSnackbar('データを保存しました！', 'success');
    } catch {
      showSnackbar('データの保存に失敗しました。', 'error');
    } finally {
      handleCloseMenu();
    }
  }, [students, seatMap, appPhase, rouletteState, fixedSeatAssignments, showSnackbar]);

  const handleLoadData = useCallback(() => {
    handleCloseMenu();
    if (!window.confirm('現在のデータは失われますが、データを読み込みますか？')) return;
    try {
      const loadedData = loadAppData();
      if (loadedData) {
        setStudents(loadedData.students);
        setSeatMap(loadedData.seatMap);
        setAppPhase(loadedData.appPhase);
        setRouletteState(loadedData.rouletteState);
        setFixedSeatAssignments(loadedData.fixedSeatAssignments);
        showSnackbar('データを読み込みました！', 'success');
      } else {
        showSnackbar('保存されたデータがありません。', 'info');
      }
    } catch {
      showSnackbar('データの読み込みに失敗しました。データ形式が不正な可能性があります。', 'error');
    }
  }, [setStudents, setSeatMap, setAppPhase, setRouletteState, setFixedSeatAssignments, showSnackbar]);

  const handleResetData = useCallback(() => {
    handleCloseMenu();
    try {
      clearAppData();
      setStudents([]);
      setSeatMap([]);
      setAppPhase('input');
      setRouletteState({ isRunning: false, currentSelectedSeatId: null, currentAssigningStudent: null, winningHistory: [], isStopped: false });
      setFixedSeatAssignments([]);
      showSnackbar('全てのデータがリセットされました。', 'success');
    } catch {
      showSnackbar('データのリセットに失敗しました。', 'error');
    }
  }, [setStudents, setSeatMap, setAppPhase, setRouletteState, setFixedSeatAssignments, showSnackbar]);

  const appPhases: AppPhase[] = ['input', 'config', 'fixedSeat', 'roulette', 'chart', 'finished'];

  const toolbarContent = (
    <Toolbar>
      <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
        席替えアプリ
      </Typography>
      <ButtonGroup aria-label="phase navigation" sx={{ mr: 1 }}>
        {appPhases.map((phase) => {
          const IconComponent = AppPhaseIcons[phase];
          return (
            <Tooltip key={phase} title={AppPhaseTitles[phase]} placement="bottom">
              {/* span wrapper でdisabled時もTooltipを表示 */}
              <span>
                <Button
                  onClick={() => setAppPhase(phase)}
                  variant="contained"
                  disabled={isRoulettePhase && rouletteState.isRunning}
                >
                  <IconComponent
                    sx={{
                      filter: appPhase === phase ? 'drop-shadow(2px 2px 6px rgba(0, 0, 0, 1))' : 'none',
                      color: appPhase === phase ? 'white' : undefined,
                    }}
                  />
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </ButtonGroup>
      <Tooltip title="データ操作">
        <IconButton
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClickMenu}
          color="inherit"
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        MenuListProps={{ 'aria-labelledby': 'basic-button' }}
      >
        <MenuItem onClick={handleSaveData}><SaveIcon sx={{ mr: 1 }} /> データ保存</MenuItem>
        <MenuItem onClick={handleLoadData}><FolderOpenIcon sx={{ mr: 1 }} /> データ読み込み</MenuItem>
        <MenuItem onClick={handleResetData}><RestoreIcon sx={{ mr: 1 }} /> データリセット</MenuItem>
      </Menu>
    </Toolbar>
  );

  const snackbarEl = (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  // ルーレットフェーズ: ヘッダーは上端トリガー帯からのホバー/タップで展開
  if (isRoulettePhase) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Box
          sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200 }}
          onMouseEnter={() => setHeaderExpanded(true)}
          onMouseLeave={() => setHeaderExpanded(false)}
        >
          {/* 常時表示のトリガー帯。タッチデバイスでタップするとトグル */}
          <Box
            onClick={() => setHeaderExpanded(prev => !prev)}
            sx={{ height: 8, bgcolor: 'primary.main', cursor: 'pointer' }}
          />
          <Collapse in={headerExpanded}>
            <AppBar position="static">
              {toolbarContent}
            </AppBar>
          </Collapse>
        </Box>
        <Box sx={{ pt: '8px' }}>
          {children}
        </Box>
        {snackbarEl}
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        {toolbarContent}
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          {children}
        </Box>
      </Container>
      {snackbarEl}
    </Box>
  );
};

export default Layout;
