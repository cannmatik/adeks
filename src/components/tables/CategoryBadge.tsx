'use client';

import { Chip } from '@mui/material';
import { CATEGORY_META, TableCategory } from '@/lib/categories';

export default function CategoryBadge({ category, size = 'small' }: { category: TableCategory; size?: 'small' | 'medium' }) {
  const meta = CATEGORY_META[category];
  return (
    <Chip
      label={meta.label.toUpperCase()}
      size={size}
      sx={{
        bgcolor: meta.color,
        color: '#000',
        fontWeight: 700,
        letterSpacing: '0.1em',
        boxShadow: `0 0 12px ${meta.color}55`,
      }}
    />
  );
}
