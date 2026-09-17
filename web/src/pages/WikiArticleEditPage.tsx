import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { useArticle, useCategories, useTags } from '@/hooks/useWiki';
import { useCreateArticle, useUpdateArticle } from '@/hooks/useWikiMutations';
import { glass } from '@/theme';
import type { ApiErrorInfo } from '@/types/api';

const NO_CATEGORY = '';

/**
 * Shared create/edit form: with a `:slug` route param it edits that
 * article (saving a new revision); without one it creates a brand new
 * article. Any authenticated account can use this — see ArticleService's
 * doc comment for why there's no extra "Registered Editor" gate. Category
 * and tags are optional metadata (spec section "2. Article Management") —
 * tags can be picked from existing ones or typed freely, which creates a
 * brand new tag on save (see TagService's doc comment).
 */
export function WikiArticleEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const isEditing = Boolean(slug);
  const navigate = useNavigate();

  const articleQuery = useArticle(slug);
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle(slug ?? '');
  const categoriesQuery = useCategories();
  const tagsQuery = useTags();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isEditing && articleQuery.data) {
      setTitle(articleQuery.data.title);
      setContent(articleQuery.data.content);
      setSummary(articleQuery.data.summary ?? '');
      setCategoryId(articleQuery.data.categoryId ?? NO_CATEGORY);
      setTagNames(articleQuery.data.tags.map((t) => t.name));
      setFeaturedImageUrl(articleQuery.data.featuredImageUrl ?? '');
    }
  }, [isEditing, articleQuery.data]);

  if (isEditing && articleQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isEditing && (articleQuery.isError || !articleQuery.data)) {
    const info = articleQuery.error as ApiErrorInfo | undefined;
    return <Alert severity="error">{info?.message || 'Could not load this article.'}</Alert>;
  }

  const mutation = isEditing ? updateMutation : createMutation;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!isEditing && title.trim().length < 2) {
      setFormError('Title must be at least 2 characters.');
      return;
    }
    if (content.trim().length === 0) {
      setFormError('Article content cannot be empty.');
      return;
    }

    const sharedFields = {
      summary: summary.trim() || undefined,
      categoryId: categoryId || undefined,
      tagNames,
      featuredImageUrl: featuredImageUrl.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { content, editSummary: editSummary.trim() || undefined, ...sharedFields },
        {
          onSuccess: () => navigate(`/wiki/${slug}`),
          onError: (error) => setFormError((error as ApiErrorInfo).message || 'Could not save this edit.'),
        },
      );
    } else {
      createMutation.mutate(
        { title: title.trim(), content, editSummary: editSummary.trim() || undefined, ...sharedFields },
        {
          onSuccess: (created) => navigate(`/wiki/${created.slug}`),
          onError: (error) => setFormError((error as ApiErrorInfo).message || 'Could not create this article.'),
        },
      );
    }
  }

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
          {isEditing ? `Editing ${title || slug}` : 'New article'}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {isEditing ? 'Edit article' : 'New article'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}

          {!isEditing && (
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
          )}

          <TextField
            label="Summary (optional)"
            placeholder="A short blurb shown in listings and search results"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="category-label">Category (optional)</InputLabel>
              <Select
                labelId="category-label"
                label="Category (optional)"
                value={categoryId}
                onChange={(e: SelectChangeEvent) => setCategoryId(e.target.value)}
              >
                <MenuItem value={NO_CATEGORY}>
                  <em>None</em>
                </MenuItem>
                {(categoriesQuery.data ?? []).map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              freeSolo
              fullWidth
              options={(tagsQuery.data ?? []).map((t) => t.name)}
              value={tagNames}
              onChange={(_e, value) => setTagNames(value)}
              renderInput={(params) => <TextField {...params} label="Tags (optional)" placeholder="Type and press Enter" />}
            />
          </Stack>

          <TextField
            label="Featured image URL (optional)"
            placeholder="https://..."
            value={featuredImageUrl}
            onChange={(e) => setFeaturedImageUrl(e.target.value)}
            fullWidth
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Content (Markdown)
            </Typography>
            <Button size="small" onClick={() => setShowPreview((p) => !p)}>
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: showPreview ? 'row' : 'column' }} spacing={2}>
            <TextField
              value={content}
              onChange={(e) => setContent(e.target.value)}
              multiline
              minRows={16}
              fullWidth
              placeholder="# Heading&#10;&#10;Write the article here using Markdown — headings, **bold**, [links](https://...), lists, tables, etc."
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.9rem' } }}
            />
            {showPreview && (
              <Box
                sx={{
                  ...glass.surface,
                  borderRadius: 3,
                  p: 2,
                  flex: 1,
                  minHeight: 200,
                  overflow: 'auto',
                  '& h1': { fontSize: '1.5rem', fontWeight: 700, mt: 0 },
                  '& h2': { fontSize: '1.25rem', fontWeight: 700 },
                  '& p': { lineHeight: 1.7 },
                }}
              >
                {content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Preview will appear here.
                  </Typography>
                )}
              </Box>
            )}
          </Stack>

          <TextField
            label="Edit summary (optional)"
            placeholder="What did you change?"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEditing ? 'Save edit' : 'Create article'}
            </Button>
            <Button variant="text" disabled={mutation.isPending} onClick={() => navigate(isEditing ? `/wiki/${slug}` : '/wiki')}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default WikiArticleEditPage;
