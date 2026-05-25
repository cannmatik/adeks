'use client';

import { createTheme } from '@mui/material/styles';

// ADEKS marka renkleri — siyah / kırmızı / beyaz (dark-first)
export const brand = {
  red: '#E11D2A',
  redDeep: '#8B0F18',
  redSoft: '#FF4C58',
  black: '#0A0A0B',
  blackSoft: '#141416',
  blackElev: '#1B1B1F',
  white: '#F5F5F7',
  whiteSoft: '#D4D4D7',
  whiteMuted: '#8A8A91',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  // Kategori renkleri (referans için — categories.ts kullanır)
  silver: '#C0C0C0',
  gold: '#C9A227',
  platinum: '#5B6DAD',
  elite: '#6B1BBA',
  render: '#00D4FF',
} as const;

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    dark: {
      palette: {
        primary: {
          main: brand.red,
          dark: brand.redDeep,
          light: brand.redSoft,
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: brand.white,
          dark: brand.whiteSoft,
          light: '#FFFFFF',
          contrastText: brand.black,
        },
        error: { main: '#F87171', dark: '#991B1B', light: '#FCA5A5', contrastText: '#fff' },
        warning: { main: '#F59E0B', dark: '#92400E', light: '#FCD34D', contrastText: '#000' },
        info: { main: brand.whiteMuted, dark: '#52525B', light: brand.whiteSoft, contrastText: '#000' },
        success: { main: '#10B981', dark: '#065F46', light: '#6EE7B7', contrastText: '#fff' },
        background: { default: brand.black, paper: brand.blackSoft },
        text: { primary: brand.white, secondary: brand.whiteMuted, disabled: '#5A5A60' },
        divider: brand.border,
      },
    },
    light: {
      palette: {
        primary: { main: brand.red, dark: brand.redDeep, light: brand.redSoft, contrastText: '#fff' },
        secondary: { main: brand.black, dark: '#000', light: brand.blackElev, contrastText: '#fff' },
        error: { main: '#DC2626', dark: '#991B1B', light: '#EF4444', contrastText: '#fff' },
        warning: { main: '#D97706', dark: '#92400E', light: '#F59E0B', contrastText: '#000' },
        info: { main: '#52525B', dark: '#27272A', light: '#A1A1AA', contrastText: '#fff' },
        success: { main: '#059669', dark: '#065F46', light: '#10B981', contrastText: '#fff' },
        background: { default: '#FAFAFA', paper: '#FFFFFF' },
        text: { primary: brand.black, secondary: '#52525B', disabled: '#A1A1AA' },
        divider: 'rgba(0,0,0,0.08)',
      },
    },
  },
  typography: {
    fontFamily: 'var(--font-montserrat),"Inter","Roboto","Helvetica","Arial",sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em', fontSize: 'clamp(2.5rem, 6vw, 4rem)' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { letterSpacing: '0.18em', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(1200px 600px at 50% -100px, rgba(225,29,42,0.10), transparent), radial-gradient(900px 500px at 100% 0%, rgba(225,29,42,0.05), transparent)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 14,
          border: '1px solid var(--mui-palette-divider)',
          backgroundImage: 'none',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 4px 24px rgba(0,0,0,0.5)'
              : '0 4px 24px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 10px 36px rgba(225,29,42,0.18)'
                : '0 10px 36px rgba(0,0,0,0.12)',
            borderColor:
              theme.palette.mode === 'dark'
                ? 'rgba(225,29,42,0.35)'
                : 'rgba(225,29,42,0.25)',
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          borderRadius: 8,
          paddingInline: 18,
          fontWeight: 700,
          textTransform: 'none',
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            background: `linear-gradient(135deg, ${brand.red} 0%, ${brand.redDeep} 100%)`,
            color: '#FFFFFF',
            '&:hover': {
              boxShadow: '0 8px 24px rgba(225,29,42,0.45)',
              background: `linear-gradient(135deg, ${brand.redSoft} 0%, ${brand.red} 100%)`,
            },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5 },
          }),
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(0,0,0,0.03)',
            '& fieldset': {
              borderColor:
                theme.palette.mode === 'dark' ? brand.border : 'rgba(0,0,0,0.12)',
            },
            '&:hover fieldset': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
              borderColor: theme.palette.primary.main,
            },
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600 },
        outlined: { borderWidth: 1.5 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          marginBottom: 2,
          paddingInline: 12,
          '&.Mui-selected': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(225,29,42,0.14)'
                : 'rgba(225,29,42,0.10)',
            color: theme.palette.primary.light,
            '& .MuiListItemIcon-root': { color: theme.palette.primary.light },
            '&:hover': {
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(225,29,42,0.20)'
                  : 'rgba(225,29,42,0.16)',
            },
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backdropFilter: 'blur(10px)',
          backgroundColor:
            theme.palette.mode === 'dark'
              ? 'rgba(10,10,11,0.8)'
              : 'rgba(255,255,255,0.85)',
          borderBottom: '1px solid var(--mui-palette-divider)',
          color: 'inherit',
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: theme.palette.text.secondary,
            borderBottom: '1px solid var(--mui-palette-divider)',
            backgroundColor:
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'transparent',
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 6, fontSize: 12, paddingInline: 10 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
  },
});
