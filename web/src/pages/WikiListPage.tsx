import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import { useArticles } from '@/hooks/useWiki';
import { glass } from '@/theme';
import type { ApiErrorInfo } from '@/types/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Browse/search entry point for the Oromo Wikipedia module's Phase 1
 * content layer. Reads are public on the backend, but this page still
 * lives inside the authenticated shell for now — see the wiki-service
 * README for that scoping note.
 */
export function WikiListPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const articlesQuery = useArticles({ search: search || undefined, page, pageSize: PAGE_SIZE });
  const totalPages = articlesQuery.data ? Math.max(1, Math.ceil(articlesQuery.data.total / PAGE_SIZE)) : 1;
  const errorMessage = articlesQuery.isError ? (articlesQuery.error as ApiErrorInfo).message : null;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link underline="hover" color="text.secondary" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon fontSize="small" />
          Home
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          Oromo Wikipedia
        </Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Oromo Wikipedia
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/wiki/new">
          New article
        </Button>
      </Stack>

      <TextField
        label="Search articles"
        placeholder="Title"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        size="small"
        sx={{ mb: 2, minWidth: 280 }}
      />

      {articlesQuery.isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {articlesQuery.data && articlesQuery.data.items.length === 0 && (
        <Alert severity="info">
          {search ? 'No articles match this search.' : 'No articles yet — be the first to create one.'}
        </Alert>
      )}

      {articlesQuery.data && articlesQuery.data.items.length > 0 && (
        <Box sx={{ ...glass.surface, borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {articlesQuery.data.items.map((article, i) => (
              <ListItemButton
                key={article.id}
                component={RouterLink}
                to={`/wiki/${article.slug}`}
                divider={i < articlesQuery.data!.items.length - 1}
              >
                <ArticleIcon sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText
                  primary={article.title}
                  secondary={`Last edited ${formatDate(article.updatedAt)}`}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} />
        </Box>
      )}
    </Box>
  );
}

export default WikiListPage;
