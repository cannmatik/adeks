'use client';

import { Chip } from '@mui/material';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

export default function CategoryBadge({ category, size = 'small' }: { category: TableCategory; size?: 'small' | 'medium' }) {
  const { categoryMeta } = useCategories();
  const meta = categoryMeta[category] ?? {
    label: category,
    color: '#C0C0C0',
  };
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
