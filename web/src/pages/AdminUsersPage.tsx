import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useUsers } from '@/hooks/useUsers';
import { UserStatus } from '@/types/domain';
import { userStatusChipColor } from '@/utils/userStatus';
import type { ApiErrorInfo } from '@/types/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const usersQuery = useUsers({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  function handleStatusChange(event: SelectChangeEvent) {
    setStatus(event.target.value as UserStatus | '');
    setPage(1);
  }

  const totalPages = usersQuery.data ? Math.max(1, Math.ceil(usersQuery.data.total / PAGE_SIZE)) : 1;
  const errorMessage = usersQuery.isError ? (usersQuery.error as ApiErrorInfo).message : null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Users
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Search"
          placeholder="Name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ minWidth: 260 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select labelId="status-filter-label" label="Status" value={status} onChange={handleStatusChange}>
            <MenuItem value="">All statuses</MenuItem>
            {Object.values(UserStatus).map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {usersQuery.isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {usersQuery.data && usersQuery.data.items.length === 0 && (
        <Alert severity="info">No users match these filters.</Alert>
      )}

      {usersQuery.data && usersQuery.data.items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersQuery.data.items.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={user.status} color={userStatusChipColor(user.status)} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {user.roles.map((role) => (
                        <Chip key={role} size="small" variant="outlined" label={role} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} />
        </Box>
      )}
    </Box>
  );
}

export default AdminUsersPage;
