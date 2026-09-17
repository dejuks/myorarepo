import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { glass } from '@/theme';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  /** Small helper line under the value, e.g. "+3 this week". */
  caption?: ReactNode;
}

/** A single glass KPI tile — mirrors the "Total Assets / New Assets / Asset Value" tiles on the reference dashboard. */
export function StatCard({ label, value, icon, loading, caption }: StatCardProps) {
  return (
    <Box
      sx={{
        ...glass.surface,
        borderRadius: 3,
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              background: (t) => alpha(t.palette.primary.main, 0.1),
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Box>
  );
}

export default StatCard;
