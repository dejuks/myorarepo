import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import type { Notification } from '@/types/domain';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(page, false),
    queryFn: () => listNotifications(page, PAGE_SIZE, false),
    staleTime: 10_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  function handleNotificationClick(notification: Notification) {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
  }

  const totalPages = notificationsQuery.data ? Math.max(1, Math.ceil(notificationsQuery.data.total / PAGE_SIZE)) : 1;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Notifications</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || !notificationsQuery.data?.items.length}
        >
          Mark all read
        </Button>
      </Stack>

      {notificationsQuery.isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {notificationsQuery.isError && <Alert severity="error">Could not load notifications.</Alert>}

      {notificationsQuery.data && notificationsQuery.data.items.length === 0 && (
        <Alert severity="info">You have no notifications yet.</Alert>
      )}

      {notificationsQuery.data && notificationsQuery.data.items.length > 0 && (
        <Paper variant="outlined">
          <List disablePadding>
            {notificationsQuery.data.items.map((notification, index) => (
              <ListItemButton
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                divider={index < notificationsQuery.data!.items.length - 1}
                alignItems="flex-start"
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1" fontWeight={notification.readAt ? 400 : 700}>
                        {notification.subject || notification.templateCode}
                      </Typography>
                      {!notification.readAt && <Chip size="small" color="secondary" label="Unread" />}
                    </Stack>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary" display="block">
                        {notification.body}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {formatDate(notification.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} />
        </Box>
      )}
    </Box>
  );
}

export default NotificationsPage;
