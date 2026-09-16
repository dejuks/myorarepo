import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export function NotFoundPage() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
      textAlign="center"
      px={2}
    >
      <Typography variant="h3">404</Typography>
      <Typography variant="body1" color="text.secondary">
        We couldn&apos;t find that page.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained">
        Go to dashboard
      </Button>
    </Box>
  );
}

export default NotFoundPage;
