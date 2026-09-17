import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { glass } from '@/theme';

/**
 * Sits at the bottom of the scrollable main content area (not fixed to the
 * viewport) so it never overlaps content on short pages or long tables —
 * same frosted-glass treatment as the rest of the shell, just a lighter
 * touch (smaller radius, no heavy shadow) since it's a footer, not a card.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        ...glass.surface,
        mt: 4,
        px: { xs: 2, sm: 3 },
        py: 2,
        borderRadius: 3,
        boxShadow: 'none',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">
          © {year} ORA Platform. All rights reserved.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          v1.0.0
        </Typography>
      </Stack>
    </Box>
  );
}

export default Footer;
