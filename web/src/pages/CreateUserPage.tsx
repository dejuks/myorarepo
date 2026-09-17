import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { CreateUserForm } from '@/components/CreateUserForm';

/**
 * Full-page version of the platform-wide "Create user" flow (Admin →
 * Users → Create user), so the form has the same working area as every
 * other full page instead of a small popup. Each module's own Roles
 * dashboard still opens the compact CreateUserDialog for the same action —
 * both render the shared CreateUserForm, just in different chrome.
 */
export function CreateUserPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link underline="hover" color="text.secondary" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon fontSize="small" />
          Home
        </Link>
        <Link underline="hover" color="text.secondary" component="button" onClick={() => navigate('/admin/users')} sx={{ verticalAlign: 'baseline' }}>
          Users
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          Create user
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Create a platform user
      </Typography>

      <CreateUserForm onCreated={(user) => navigate(`/admin/users/${user.id}`)} onCancel={() => navigate('/admin/users')} />
    </Box>
  );
}

export default CreateUserPage;
