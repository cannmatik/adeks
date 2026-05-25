'use client';

import { useMemo } from 'react';
import { Box, Paper, Stack, Tooltip, Typography, useTheme, useMediaQuery } from '@mui/material';
import { CafeTable, RoomLite } from './TableCard';
import { CATEGORY_META } from '@/lib/categories';

interface Props {
  tables: CafeTable[];
  selectedIds?: Set<string>;
  onClickTable?: (t: CafeTable) => void;
  disabledIds?: Set<string>;
  floor?: string;
}

type Group = { room: RoomLite; tables: CafeTable[] };

function groupByRoom(tables: CafeTable[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tables) {
    if (!t.room) continue;
    let g = map.get(t.room.id);
    if (!g) {
      g = { room: t.room, tables: [] };
      map.set(t.room.id, g);
    }
    g.tables.push(t);
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.room.display_order ?? 0) - (b.room.display_order ?? 0),
  );
}

const TILE = 44;
const GAP = 8;

const BOOKING_COLORS: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  AVAILABLE: { bg: '#FFFFFF', fg: '#111', border: '', label: 'Müsait' },
  HOLD: { bg: '#FEF3C7', fg: '#92400E', border: '#F59E0B', label: 'Beklemede' },
  CONFIRMED: { bg: '#FEE2E2', fg: '#991B1B', border: '#EF4444', label: 'Rezerve' },
  IN_USE: { bg: '#E0E7FF', fg: '#3730A3', border: '#6366F1', label: 'Kullanımda' },
  MAINTENANCE: { bg: '#52525B', fg: '#FFF', border: '#3F3F46', label: 'Bakımda' },
};

export default function RoomLayout({ tables, selectedIds, onClickTable, disabledIds, floor }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const groups = useMemo(() => {
    const all = groupByRoom(tables);
    return floor && floor !== 'ALL' ? all.filter((g) => g.room.floor === floor) : all;
  }, [tables, floor]);

  const byFloor = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const g of groups) {
      const f = g.room.floor ?? '1';
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  if (groups.length === 0) return null;

  const sectionContent = (fgroups: Group[]) => (
    <Box
      sx={{
        display: 'flex',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        gap: 2,
        overflowX: isMobile ? 'auto' : undefined,
        pb: isMobile ? 1 : undefined,
        alignItems: 'flex-start',
      }}
    >
      {fgroups.map((g) => {
        const catMeta = g.room.category ? CATEGORY_META[g.room.category] : null;
        const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
        const short = catMeta?.short ?? g.room.name?.slice(0, 2).toUpperCase() ?? '??';
        const sectionLabel = catMeta ? `${short}${g.room.display_order + 1}` : (g.room.name ?? 'Oda');

        const innerMaxX = Math.max(0, ...g.tables.map((t) => t.position_x));
        const innerMaxY = Math.max(0, ...g.tables.map((t) => t.position_y));
        const innerW = (innerMaxX + 1) * TILE + innerMaxX * GAP;
        const innerH = (innerMaxY + 1) * TILE + innerMaxY * GAP;
        const padX = 20;
        const padY = 40;

        return (
          <Paper
            key={g.room.id}
            elevation={0}
            sx={{
              position: 'relative',
              borderRadius: 2.5,
              bgcolor: isDark ? '#16161C' : '#F8F8FA',
              border: `1.5px solid ${accent}35`,
              p: 0,
              flexShrink: 0,
              width: innerW + padX,
              minHeight: innerH + padY,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                borderColor: `${accent}60`,
                boxShadow: `0 4px 20px ${accent}18`,
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 10,
                px: 0.75,
                py: 0.2,
                borderRadius: 0.5,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: accent,
                bgcolor: isDark ? '#0E0E12' : '#FFFFFF',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: 'fit-content',
                maxWidth: 'calc(100% - 20px)',
              }}
            >
              {sectionLabel}
            </Box>

            <Box
              sx={{
                position: 'relative',
                width: innerW,
                height: innerH,
                mx: 'auto',
                mt: '28px',
                mb: '12px',
              }}
            >
              {g.tables.map((t) => (
                <TableTile
                  key={t.id}
                  table={t}
                  selected={!!selectedIds?.has(t.id)}
                  disabled={!!disabledIds?.has(t.id)}
                  onClick={onClickTable}
                  isDark={isDark}
                  sx={{
                    position: 'absolute',
                    left: t.position_x * (TILE + GAP),
                    top: t.position_y * (TILE + GAP),
                  }}
                />
              ))}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );

  if (floor && floor !== 'ALL') {
    return (
      <Stack spacing={2}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, md: 2.5 },
            bgcolor: isDark ? '#0E0E12' : theme.palette.background.paper,
            borderRadius: 3,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : theme.palette.divider}`,
            overflowX: 'auto',
          }}
        >
          {sectionContent(groups)}
        </Paper>
        <Legend isDark={isDark} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {byFloor.map(([f, fgroups]) => (
        <Box key={f}>
          <Typography
            variant="h6"
            sx={{
              mb: 1.5,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'text.primary',
            }}
          >
            {f}. Kat
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, md: 2.5 },
              bgcolor: isDark ? '#0E0E12' : theme.palette.background.paper,
              borderRadius: 3,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : theme.palette.divider}`,
              overflowX: 'auto',
            }}
          >
            {sectionContent(fgroups)}
          </Paper>
        </Box>
      ))}
      <Legend isDark={isDark} />
    </Stack>
  );
}

function TableTile({
  table,
  selected,
  disabled,
  onClick,
  isDark,
  sx,
}: {
  table: CafeTable;
  selected: boolean;
  disabled: boolean;
  onClick?: (t: CafeTable) => void;
  isDark: boolean;
  sx?: any;
}) {
  const meta = CATEGORY_META[table.category] ?? {
    label: table.category ?? 'Bilinmeyen',
    short: (table.category ?? '?').slice(0, 2),
    color: '#7E7E85',
    defaultRate: 0,
    description: '',
  };
  const booking = table.booking_status ?? 'AVAILABLE';
  const isAvailable = booking === 'AVAILABLE' && table.status !== 'MAINTENANCE';
  const clickable = !!onClick && !disabled && isAvailable;

  let bg = '#FFFFFF';
  let fg = '#111';
  let border = meta.color;
  let shadow = '0 1px 2px rgba(0,0,0,0.06)';

  if (booking === 'HOLD') {
    bg = isDark ? '#451A03' : '#FEF3C7';
    fg = isDark ? '#FCD34D' : '#92400E';
    border = '#F59E0B';
    shadow = '0 2px 8px rgba(245,158,11,0.25)';
  } else if (booking === 'CONFIRMED') {
    bg = isDark ? '#450A0A' : '#FEE2E2';
    fg = isDark ? '#FCA5A5' : '#991B1B';
    border = '#EF4444';
    shadow = '0 2px 8px rgba(239,68,68,0.25)';
  } else if (booking === 'IN_USE') {
    bg = isDark ? '#1E1B4B' : '#E0E7FF';
    fg = isDark ? '#A5B4FC' : '#3730A3';
    border = '#6366F1';
    shadow = '0 2px 8px rgba(99,102,241,0.25)';
  } else if (table.status === 'MAINTENANCE') {
    bg = isDark ? '#27272A' : '#E4E4E7';
    fg = isDark ? '#A1A1AA' : '#52525B';
    border = '#71717A';
    shadow = 'none';
  } else if (!isDark) {
    bg = '#FFFFFF';
    fg = '#111';
    border = meta.color;
  }

  if (selected) {
    bg = meta.color;
    fg = '#FFF';
    border = meta.color;
    shadow = `0 0 0 3px ${meta.color}44, 0 4px 14px ${meta.color}44`;
  }

  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ p: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Masa #{table.number} — {meta.label}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {BOOKING_COLORS[booking]?.label || 'Müsait'}
            {meta.defaultRate > 0 ? ` · ${meta.defaultRate} ₺/saat` : ''}
          </Typography>
          {table.session && (
            <>
              <Typography variant="caption" sx={{ display: 'block', color: '#6366F1', fontWeight: 600 }}>
                {table.session.kind === 'MEMBER' ? '👤 Üye' : '👤 Anonim'} {table.session.user_name ? `— ${table.session.user_name}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ⏱ {table.session.elapsed} · ~{table.session.estimated}
              </Typography>
            </>
          )}
        </Box>
      }
    >
      <Box
        onClick={() => clickable && onClick?.(table)}
        sx={{
          width: TILE,
          height: TILE,
          bgcolor: bg,
          color: fg,
          border: `2px solid ${border}`,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          cursor: clickable ? 'pointer' : 'default',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          opacity: disabled && !selected ? 0.4 : 1,
          boxShadow: shadow,
          '&:hover': clickable
            ? {
                transform: 'translateY(-2px) scale(1.06)',
                boxShadow: `0 6px 18px ${meta.color}55`,
                zIndex: 1,
              }
            : undefined,
          ...sx,
        }}
      >
        {table.number}
      </Box>
    </Tooltip>
  );
}

function Legend({ isDark }: { isDark: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
      <LegendDot color="#22C55E" label="Müsait" isDark={isDark} />
      <LegendDot color="#F59E0B" label="Beklemede" filled isDark={isDark} />
      <LegendDot color="#EF4444" label="Rezerve" filled isDark={isDark} />
      <LegendDot color="#6366F1" label="Kullanımda" filled isDark={isDark} />
      <LegendDot color="#71717A" label="Bakımda" filled isDark={isDark} />
    </Stack>
  );
}

function LegendDot({ color, label, filled, isDark }: { color: string; label: string; filled?: boolean; isDark: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: 0.5,
          bgcolor: filled ? color : isDark ? '#FFF' : '#FFF',
          border: `2px solid ${color}`,
          boxShadow: filled ? `0 0 0 1px ${color}44` : '0 0 0 1px rgba(0,0,0,0.06)',
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
    </Stack>
  );
}
