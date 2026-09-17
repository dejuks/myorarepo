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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined';
import { useArticle, useArticleRevisions, useArticleReviews, useIsWikiModerator, useRevision } from '@/hooks/useWiki';
import {
  useArchiveArticle,
  usePublishArticle,
  useReviewArticle,
  useStartArticleReview,
  useSubmitArticleForReview,
} from '@/hooks/useWikiMutations';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppSelector } from '@/app/hooks';
import { glass } from '@/theme';
import type { ApiErrorInfo } from '@/types/api';
import type { ArticleStatus, ReviewDecision } from '@/types/domain';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted for review',
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

const DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
  REQUEST_CHANGES: 'Request changes',
};

export function WikiArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [decision, setDecision] = useState<ReviewDecision>('APPROVE');
  const [reviewComment, setReviewComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { data: currentUser } = useCurrentUser();
  const isModerator = useIsWikiModerator();

  const articleQuery = useArticle(slug);
  const revisionsQuery = useArticleRevisions(historyOpen ? slug : undefined);
  const oldRevisionQuery = useRevision(slug, viewingRevisionId ?? undefined);
  const reviewsQuery = useArticleReviews(slug);

  const submitMutation = useSubmitArticleForReview(slug ?? '');
  const startReviewMutation = useStartArticleReview(slug ?? '');
  const reviewMutation = useReviewArticle(slug ?? '');
  const publishMutation = usePublishArticle(slug ?? '');
  const archiveMutation = useArchiveArticle(slug ?? '');

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

  const isOwner = Boolean(currentUser && currentUser.id === article.createdBy);
  const canSubmit = isAuthenticated && (isOwner || isModerator) && (article.status === 'DRAFT' || article.status === 'REJECTED');
  const canStartReview = isModerator && article.status === 'SUBMITTED';
  const canDecide = isModerator && article.status === 'UNDER_REVIEW';
  const canPublish = isModerator && article.status === 'APPROVED';
  const canArchive = isModerator && article.status === 'PUBLISHED';
  const hasWorkflowActions = canSubmit || canStartReview || canDecide || canPublish || canArchive;

  function runAction(mutate: () => void) {
    setActionError(null);
    mutate();
  }

  function handleSubmitReview() {
    setActionError(null);
    reviewMutation.mutate(
      { decision, comment: reviewComment.trim() || undefined },
      {
        onSuccess: () => {
          setReviewDialogOpen(false);
          setReviewComment('');
          setDecision('APPROVE');
        },
        onError: (error) => setActionError((error as ApiErrorInfo).message || 'Could not record this review decision.'),
      },
    );
  }

  const anyActionPending =
    submitMutation.isPending || startReviewMutation.isPending || publishMutation.isPending || archiveMutation.isPending;

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

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {article.title}
          </Typography>
          <Chip size="small" label={STATUS_LABELS[article.status]} color={STATUS_COLORS[article.status]} />
        </Stack>
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

      {article.summary && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {article.summary}
        </Typography>
      )}

      {hasWorkflowActions && (
        <Box sx={{ ...glass.surface, borderRadius: 3, p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Workflow
          </Typography>
          {actionError && (
            <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canSubmit && (
              <Button
                size="small"
                variant="contained"
                disabled={anyActionPending}
                onClick={() =>
                  runAction(() =>
                    submitMutation.mutate(undefined, {
                      onError: (error) => setActionError((error as ApiErrorInfo).message || 'Could not submit this article for review.'),
                    }),
                  )
                }
              >
                Submit for review
              </Button>
            )}
            {canStartReview && (
              <Button
                size="small"
                variant="contained"
                disabled={anyActionPending}
                onClick={() =>
                  runAction(() =>
                    startReviewMutation.mutate(undefined, {
                      onError: (error) => setActionError((error as ApiErrorInfo).message || 'Could not start review.'),
                    }),
                  )
                }
              >
                Start review
              </Button>
            )}
            {canDecide && (
              <Button
                size="small"
                variant="contained"
                startIcon={<RateReviewIcon />}
                disabled={reviewMutation.isPending}
                onClick={() => setReviewDialogOpen(true)}
              >
                Record decision
              </Button>
            )}
            {canPublish && (
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={anyActionPending}
                onClick={() =>
                  runAction(() =>
                    publishMutation.mutate(undefined, {
                      onError: (error) => setActionError((error as ApiErrorInfo).message || 'Could not publish this article.'),
                    }),
                  )
                }
              >
                Publish
              </Button>
            )}
            {canArchive && (
              <Button
                size="small"
                variant="outlined"
                disabled={anyActionPending}
                onClick={() =>
                  runAction(() =>
                    archiveMutation.mutate(undefined, {
                      onError: (error) => setActionError((error as ApiErrorInfo).message || 'Could not archive this article.'),
                    }),
                  )
                }
              >
                Archive
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {viewingOld && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setViewingRevisionId(null)}>
          You're viewing a historical revision from {formatDate(oldRevisionQuery.data!.createdAt)}, not the current version.
        </Alert>
      )}

      <Box sx={{ ...glass.surface, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: historyOpen || reviewsQuery.data?.length ? 2 : 0 }}>
        {article.tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {article.tags.map((tag) => (
              <Chip key={tag.id} size="small" variant="outlined" label={tag.name} />
            ))}
          </Stack>
        )}
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

      {isAuthenticated && (reviewsQuery.data?.length ?? 0) > 0 && (
        <Box sx={{ ...glass.surface, borderRadius: 3, overflow: 'hidden', mb: historyOpen ? 2 : 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 0 }}>
            Review history
          </Typography>
          <List disablePadding sx={{ mt: 1 }}>
            {reviewsQuery.data!.map((review, i) => (
              <ListItem key={review.id} divider={i < reviewsQuery.data!.length - 1}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={DECISION_LABELS[review.decision]}
                        color={review.decision === 'APPROVE' ? 'success' : review.decision === 'REJECT' ? 'error' : 'warning'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(review.createdAt)}
                      </Typography>
                    </Stack>
                  }
                  secondary={review.comment || 'No comment'}
                  secondaryTypographyProps={{ sx: { mt: 0.5 } }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

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

      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record review decision</DialogTitle>
        <DialogContent>
          <FormControl sx={{ mt: 1 }}>
            <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value as ReviewDecision)}>
              <FormControlLabel value="APPROVE" control={<Radio />} label="Approve" />
              <FormControlLabel value="REJECT" control={<Radio />} label="Reject" />
              <FormControlLabel value="REQUEST_CHANGES" control={<Radio />} label="Request changes" />
            </RadioGroup>
          </FormControl>
          <TextField
            label="Comment (optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewMutation.isPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmitReview} disabled={reviewMutation.isPending}>
            {reviewMutation.isPending ? 'Saving…' : 'Submit decision'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WikiArticlePage;
