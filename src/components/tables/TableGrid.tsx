'use client';

import { Box } from '@mui/material';
import TableCard, { CafeTable } from './TableCard';

interface Props {
  tables: CafeTable[];
  onReserve?: (table: CafeTable) => void;
}

export default function TableGrid({ tables, onReserve }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2,
      }}
    >
      {tables.map((t) => (
        <TableCard key={t.id} table={t} onReserve={onReserve} />
      ))}
    </Box>
  );
}
