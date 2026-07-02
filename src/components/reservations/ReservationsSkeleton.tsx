'use client';

import { Box, Paper, Skeleton, Stack } from '@mui/material';

function SkeletonCard() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="rounded" width={104} height={26} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="circular" width={30} height={30} />
          <Skeleton variant="circular" width={30} height={30} />
          <Skeleton variant="circular" width={30} height={30} />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" width={72} height={30} />
        <Skeleton variant="rounded" width={88} height={30} />
      </Stack>
      <Skeleton variant="rounded" height={54} />
    </Paper>
  );
}

export default function ReservationsSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={170} height={22} sx={{ mb: 1 }} />
      <Stack spacing={2}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Stack>
    </Box>
  );
}
