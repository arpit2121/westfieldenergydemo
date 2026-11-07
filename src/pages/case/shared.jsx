import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import Stack from '../../components/Stack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Undo from '@mui/icons-material/Undo';
import { advance, sendBackCase, toast, selectUser, selectSettings } from '../../store';
import { canAct, currentStep } from '../../store/flow';
import { userById, ROLES } from '../../data/masters';
import { fmtDateTime } from '../../utils/format';
import { UserAvatar } from '../../components/common';

export function useCaseActions(c) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const step = currentStep(c);
  const mine = canAct(user, c, settings);
  const isMine = (key) => mine && (step?.key === key || (key === 'MRN_APPROVE' && step?.key === 'MRN_REVIEW' && user.role === 'STORES_APPROVER'));
  const act = (key, payload = {}, message) => {
    dispatch(advance({ caseId: c.id, key, payload, userId: user.id }));
    dispatch(toast(message || 'Saved – next approver notified'));
  };
  const back = (toKey, comment) => {
    dispatch(sendBackCase({ caseId: c.id, toKey, comment, userId: user.id }));
    dispatch(toast({ message: 'Sent back with your comment', severity: 'warning' }));
  };
  return { user, step, mine, isMine, act, back, settings, dispatch };
}

// The black-bordered box that tells the logged-in user it's their turn.
export function ActionBox({ title, subtitle, children, actions }) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderColor: '#111', borderWidth: 1.5, mb: 2, overflow: 'hidden' }}
      className="no-print"
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, bgcolor: '#111', color: '#fff' }}>
        <Box sx={{ width: 7, height: 7, borderRadius: 4, bgcolor: '#fff', animation: 'pulse 1.6s infinite', '@keyframes pulse': { '50%': { opacity: 0.25 } } }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>YOUR ACTION</Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>· {title}</Typography>
      </Stack>
      <Box sx={{ p: 2 }}>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {subtitle}
          </Typography>
        )}
        {children}
        {actions && (
          <Stack direction="row" spacing={1} sx={{ mt: children ? 2 : 0 }} justifyContent="flex-end">
            {actions}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

// Approve / send back with comment – used by every simple approval stage.
export function ApproveBox({ title, subtitle, onApprove, onSendBack, approveLabel = 'Approve', defaultComment = '', children, requireComment }) {
  const [comment, setComment] = useState(defaultComment);
  return (
    <ActionBox
      title={title}
      subtitle={subtitle}
      actions={
        <>
          {onSendBack && (
            <Button variant="outlined" startIcon={<Undo />} disabled={!comment.trim()} onClick={() => onSendBack(comment)}>
              Send back
            </Button>
          )}
          <Button variant="contained" startIcon={<CheckCircle />} disabled={requireComment && !comment.trim()} onClick={() => onApprove(comment)}>
            {approveLabel}
          </Button>
        </>
      }
    >
      {children}
      <TextField
        label="Comment"
        placeholder={onSendBack ? 'Required to send back; optional to approve' : 'Optional'}
        multiline
        minRows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={{ mt: children ? 2 : 0 }}
      />
    </ActionBox>
  );
}

const ACTION_LABEL = {
  SUBMITTED: 'Prepared by',
  RESUBMITTED: 'Resubmitted by',
  PREPARED: 'Prepared by',
  REVIEWED: 'Reviewed by',
  APPROVED: 'Approved by',
  ASSIGNED: 'Assigned by',
  PUBLISHED: 'Published by',
  EVALUATED: 'Evaluated by',
  ACCEPTED: 'Accepted by',
  REQUESTED: 'Requested by',
  DISPATCHED: 'Dispatched by',
  SENT_BACK: 'Sent back by',
};

// Prepared / Reviewed / Approved stamps for a set of steps
export function Stamps({ c, keys }) {
  const rows = c.approvals.filter((a) => keys.includes(a.stepKey));
  if (!rows.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.25 }}>
      {rows.map((a, i) => (
        <Box key={i} sx={{ border: '1px dashed', borderColor: a.action === 'SENT_BACK' ? 'error.main' : 'grey.400', borderRadius: 1, p: 1.25, bgcolor: '#fff' }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: a.action === 'SENT_BACK' ? 'error.main' : 'grey.500' }}>
            {(ACTION_LABEL[a.action] || a.action).toUpperCase()}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <UserAvatar userId={a.userId} size={22} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{userById(a.userId)?.name}</Typography>
              <Typography variant="caption" sx={{ lineHeight: 1.2 }} component="div">
                {ROLES[a.role]} · {fmtDateTime(a.at)}
              </Typography>
            </Box>
          </Stack>
          {a.comment && (
            <Typography variant="caption" component="div" sx={{ mt: 0.75, color: 'text.primary', fontStyle: 'italic' }}>
              “{a.comment}”
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Shown when a stage is waiting on someone else
export function WaitingNote({ c, keys }) {
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const step = currentStep(c);
  if (!step || !keys.includes(step.key) || canAct(user, c, settings)) return null;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, px: 1.5, py: 1, bgcolor: 'grey.100', borderRadius: 1 }} className="no-print">
      <ArrowForward sx={{ fontSize: 15, color: 'grey.600' }} />
      <Typography variant="body2">
        Waiting for <b>{ROLES[step.role]}</b> – {step.label}
      </Typography>
    </Stack>
  );
}
