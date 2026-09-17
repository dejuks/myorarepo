import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import { useArticle, useArticleRevisions, useRevision } from '@/hooks/useWiki';
import { glass } from '@/theme';
import type { ApiErrorInfo } from '@/types/api';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function WikiArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null);

  const articleQuery = useArticle(slug);
  const revisionsQuery = useArticleRevisions(historyOpen ? slug : undefined);
  const oldRevisionQuery = useRevision(slug, viewingRevisionId ?? undefined);

  if (!slug) return <Alert severity="error">No article slug in the URL.</Alert>;

  if (articleQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (articleQuery.isError || !articleQuery.data) {
    const info = articleQuery.error as ApiErrorInfo | undefined;
    return <Alert severity="error">{info?.message || 'Could not load this article.'}</Alert>;
  }

  const article = articleQuery.data;
  const viewingOld = Boolean(viewingRevisionId && oldRevisionQuery.data);
  const displayedContent = viewingOld ? oldRevisionQuery.data!.content : article.content;

  return (
    <Box maxWidth={900}>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link underline="hover" color="text.secondary" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon fontSize="small" />
          Home
        </Link>
        <Link underline="hover" color="text.secondary" component={RouterLink} to="/wiki">
          Oromo Wikipedia
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          {article.title}
        </Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {article.title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => {
              setHistoryOpen((open) => !open);
              setViewingRevisionId(null);
            }}
          >
            History
          </Button>
          <Button variant="contained" size="small" startIcon={<EditIcon />} component={RouterLink} to={`/wiki/${slug}/edit`}>
            Edit
          </Button>
        </Stack>
      </Stack>

      {viewingOld && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setViewingRevisionId(null)}>
          You're viewing a historical revision from {formatDate(oldRevisionQuery.data!.createdAt)}, not the current version.
        </Alert>
      )}

      <Box sx={{ ...glass.surface, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: historyOpen ? 2 : 0 }}>
        <Box
          sx={{
            '& h1': { fontSize: '1.75rem', fontWeight: 700, mt: 0 },
            '& h2': { fontSize: '1.4rem', fontWeight: 700, mt: 3 },
            '& h3': { fontSize: '1.15rem', fontWeight: 700, mt: 2 },
            '& p': { lineHeight: 1.7 },
            '& img': { maxWidth: '100%', borderRadius: 8 },
            '& table': { borderCollapse: 'collapse', width: '100%' },
            '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5 },
            '& blockquote': { borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, ml: 0, color: 'text.secondary' },
            '& code': { background: 'action.hover', px: 0.5, borderRadius: 0.5 },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Last edited {formatDate(article.revisionCreatedAt)}
          {article.editSummary ? ` — "${article.editSummary}"` : ''}
        </Typography>
      </Box>

      {historyOpen && (
        <Box sx={{ ...glass.surface, borderRadius: 3, overflow: 'hidden' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 0 }}>
            Edit history
          </Typography>
          {revisionsQuery.isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : revisionsQuery.data && revisionsQuery.data.items.length > 0 ? (
            <List disablePadding sx={{ mt: 1 }}>
              {revisionsQuery.data.items.map((revision, i) => (
                <ListItemButton
                  key={revision.id}
                  selected={revision.id === viewingRevisionId}
                  divider={i < revisionsQuery.data!.items.length - 1}
                  onClick={() => setViewingRevisionId(revision.id === viewingRevisionId ? null : revision.id)}
                >
                  <ListItemText
                    primary={formatDate(revision.createdAt)}
                    secondary={revision.editSummary || 'No edit summary'}
                  />
                  {revision.id === article.revisionId && <Chip size="small" label="Current" color="primary" variant="outlined" />}
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No history yet.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default WikiArticlePage;
