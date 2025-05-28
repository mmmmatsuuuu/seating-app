// src/ControlPanel/ControlPanel.tsx
import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestoreIcon from '@mui/icons-material/Restore';

// ControlPanelProps は、親から渡されるコールバック関数を定義
interface ControlPanelProps {
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onSave, onLoad, onReset }) => {
  return (
    <> {/* Box でラップせず、フラグメントで返す */}
      <Tooltip title="現在の状態をブラウザに保存">
        <IconButton color="inherit" onClick={onSave} size="medium">
          <SaveIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="保存されたデータを読み込む">
        <IconButton color="inherit" onClick={onLoad} size="medium">
          <FolderOpenIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="全てのデータを初期化する">
        <IconButton color="inherit" onClick={onReset} size="medium">
          <RestoreIcon />
        </IconButton>
      </Tooltip>
    </>
  );
};

export default ControlPanel;