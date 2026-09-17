import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import { useArticles, useCanEditWiki, useCategories } from '@/hooks/useWiki';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppSelector } from '@/app/hooks';
import { glass } from '@/theme';
import type { ApiErrorInfo } from '@/types/api';
import type { ArticleStatus } from '@/types/domain';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_CATEGORIES = '';
const ALL_STATUSES = '';
const MINE_ONLY = 'mine';

const STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<ArticleStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
  REJECTED: 'error',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Browse/search entry point for the Oromo Wikipedia module's content layer.
 * Reads are public on the backend, but this page still lives inside the
 * authenticated shell for now — see the wiki-service README for that
 * scoping note. Filters (category/status/"my drafts") mirror the "Advanced
 * Search" requirements from spec section 11 — full-text search itself is
 * the plain title/summary search box, backed by wiki-service's standalone
 * Postgres FTS (see ArticleRepository.list's doc comment).
 */
export function WikiListPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [page, setPage] = useState(1);

  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { data: currentUser } = useCurrentUser();
  const canEdit = useCanEditWiki();
  const categoriesQuery = useCategories();

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const isMineOnly = statusFilter === MINE_ONLY;
  const articlesQuery = useArticles({
    search: search || undefined,
    categoryId: categoryId || undefined,
    status: !isMineOnly && statusFilter ? (statusFilter as ArticleStatus) : undefined,
    authorId: isMineOnly ? currentUser?.id : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
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
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/wiki/new">
            New article
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search articles"
          placeholder="Title or summary"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="wiki-category-filter-label">Category</InputLabel>
          <Select
            labelId="wiki-category-filter-label"
            label="Category"
            value={categoryId}
            onChange={(e: SelectChangeEvent) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value={ALL_CATEGORIES}>All categories</MenuItem>
            {(categoriesQuery.data ?? []).map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="wiki-status-filter-label">Status</InputLabel>
          <Select
            labelId="wiki-status-filter-label"
            label="Status"
            value={statusFilter}
            onChange={(e: SelectChangeEvent) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value={ALL_STATUSES}>All (visible to me)</MenuItem>
            {isAuthenticated && <MenuItem value={MINE_ONLY}>My articles</MenuItem>}
            {(Object.keys(STATUS_LABELS) as ArticleStatus[]).map((status) => (
              <MenuItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

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
          {search || categoryId || statusFilter ? 'No articles match these filters.' : 'No articles yet — be the first to create one.'}
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
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography component="span">{article.title}</Typography>
                      <Chip size="small" label={STATUS_LABELS[article.status]} color={STATUS_COLORS[article.status]} />
                    </Stack>
                  }
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
