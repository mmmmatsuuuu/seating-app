// src/Layout/Layout.tsx
import React, { useState, useCallback } from "react";
import { AppBar, Toolbar, Typography, Container, Box, Button, ButtonGroup, Tooltip, IconButton, Menu, MenuItem, Snackbar, Alert } from "@mui/material";
import { saveAppData, loadAppData, clearAppData } from "../../utils/localStorage";
import type { AppPersistedState } from "../../utils/localStorage";
import MoreVertIcon from '@mui/icons-material/MoreVert'; // メニューアイコン
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestoreIcon from '@mui/icons-material/Restore';

import { useAppState } from "../../contexts/AppStateContext";
import type { AppPhase } from "../../contexts/AppStateContext";
import { AppPhaseTitles, AppPhaseIcons } from "../../constants";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({children}) => {
  const { 
    students,
    setStudents,
    seatMap,
    setSeatMap,
    appPhase,
    setAppPhase,
    rouletteState,
    setRouletteState,
    relationConfig,
    setRelationConfig,
    fixedSeatAssignments,
    setFixedSeatAssignments,
  } = useAppState();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'info' });

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
        students,
        seatMap,
        appPhase,
        rouletteState,
        relationConfig,
        fixedSeatAssignments,
      };
      saveAppData(dataToSave);
      showSnackbar('データを保存しました！', 'success');
    } catch (error) {
      console.error('データの保存中にエラーが発生しました:', error);
      showSnackbar('データの保存に失敗しました。', 'error');
    } finally {
      handleCloseMenu();
    }
  }, [students, seatMap, appPhase, rouletteState, relationConfig, fixedSeatAssignments, showSnackbar]);

  const handleLoadData = useCallback(() => {
    handleCloseMenu();
    if (!window.confirm('現在のデータは失われますが、データを読み込みますか？')) {
      return;
    }
    try {
      const loadedData = loadAppData();
      if (loadedData) {
        setStudents(loadedData.students);
        setSeatMap(loadedData.seatMap);
        setAppPhase(loadedData.appPhase);
        setRouletteState(loadedData.rouletteState);
        setRelationConfig(loadedData.relationConfig);
        setFixedSeatAssignments(loadedData.fixedSeatAssignments);
        showSnackbar('データを読み込みました！', 'success');
      } else {
        showSnackbar('保存されたデータがありません。', 'info');
      }
    } catch (error) {
      showSnackbar('データの読み込みに失敗しました。データ形式が不正な可能性があります。', 'error');
    }
  }, [setStudents, setSeatMap, setAppPhase, setRouletteState, setRelationConfig, setFixedSeatAssignments, showSnackbar]);

  const handleResetData = useCallback(() => {
    handleCloseMenu();
    try {
      clearAppData();
      setStudents([]);
      setSeatMap([]);
      setAppPhase('input');
      setRouletteState({
        isRunning: false,
        currentSelectedSeatId: null,
        currentAssigningStudent: null,
        winningHistory: [],
        isStopped: false,
      });
      setRelationConfig([]);
      setFixedSeatAssignments([]);
      showSnackbar('全てのデータがリセットされました。', 'success');
    } catch (error) {
      showSnackbar('データのリセットに失敗しました。', 'error');
    }
  }, [setStudents, setSeatMap, setAppPhase, setRouletteState, setRelationConfig, setFixedSeatAssignments, showSnackbar]);


  const appPhases: AppPhase[] = [
    "input",
    "config",
    "fixedSeat",
    "roulette",
    "chart",
    "finished",
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            席替えアプリ
          </Typography>

          {/* フェーズナビゲーションボタン */}
          <ButtonGroup aria-label="phase navigation" sx={{ mr: 1 }}> {/* 右マージンを調整 */}
            {appPhases.map((phase) => {
              const IconComponent = AppPhaseIcons[phase]
              return (
                <Tooltip
                  key={phase}
                  title={AppPhaseTitles[phase]}
                  placement="bottom"
                >
                  <Button
                    onClick={() => {
                      setAppPhase(phase);
                    }}
                    variant="contained"
                  >
                    <IconComponent 
                      sx={{
                        filter: appPhase === phase ? 'drop-shadow(2px 2px 6px rgba(0, 0, 0, 1))' : 'none',
                        color: appPhase === phase ? 'white' : undefined,
                      }}
                    />
                  </Button>
                </Tooltip>
              )}
            )}
          </ButtonGroup>

          {/* メニューボタン */}
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
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            <MenuItem onClick={handleSaveData}>
              <SaveIcon sx={{ mr: 1 }} /> データ保存
            </MenuItem>
            <MenuItem onClick={handleLoadData}>
              <FolderOpenIcon sx={{ mr: 1 }} /> データ読み込み
            </MenuItem>
            <MenuItem onClick={handleResetData}>
              <RestoreIcon sx={{ mr: 1 }} /> データリセット
            </MenuItem>
          </Menu>
          
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          {children}
        </Box>
      </Container>

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
    </Box>
  );
}

export default Layout;