import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { CssBaseline } from '@mui/material'; // <-- MUI の CssBaseline をインポート

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssBaseline/>
    <App />
  </StrictMode>,
)
