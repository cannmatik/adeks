'use client';

import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  if (!mode) {
    return (
      <IconButton disabled sx={{ color: 'text.secondary' }}>
        <Brightness4 />
      </IconButton>
    );
  }
  return (
    <Tooltip title={mode === 'dark' ? 'Açık tema' : 'Koyu tema'}>
      <IconButton
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        sx={{ color: 'text.secondary' }}
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
}
