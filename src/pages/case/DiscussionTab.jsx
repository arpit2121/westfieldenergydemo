import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Chip, TextField, Typography } from '@mui/material';
import Stack from '../../components/Stack';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { Panel, UserAvatar } from '../../components/common';
import { USERS, ROLES, userById } from '../../data/masters';
import { addComment, selectUser, toast } from '../../store';
import { fmtDateTime } from '../../utils/format';
import { isExternal } from '../../store/flow';

const render = (body) =>
  body.split(/(@[A-Z][a-z]+ [A-Z][a-z]+)/g).map((p, i) =>
    p.startsWith('@') && USERS.some((u) => `@${u.name}` === p) ? (
      <Box key={i} component="span" sx={{ fontWeight: 700, bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>
        {p}
      </Box>
    ) : (
      p
    ),
  );

export default function DiscussionTab({ c }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [body, setBody] = useState('');
  const team = USERS.filter((u) => !isExternal(u) && u.id !== user.id);

  const post = () => {
    if (!body.trim()) return;
    dispatch(addComment({ caseId: c.id, userId: user.id, body }));
    dispatch(toast('Comment posted'));
    setBody('');
  };

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Panel
        title="Internal discussion"
        subtitle={`${c.comments.length} messages on ${c.po?.poNo || c.prNo}`}
        actions={<Chip icon={<LockOutlined sx={{ fontSize: '14px !important' }} />} label="Internal – hidden from supplier" variant="outlined" />}
      >
        <Stack spacing={1.75} sx={{ mb: 2 }}>
          {c.comments.length === 0 && <Typography variant="caption">No messages yet. Use @name to notify a colleague.</Typography>}
          {c.comments.map((m) => {
            const u = userById(m.authorId);
            return (
              <Stack key={m.id} direction="row" spacing={1.25}>
                <UserAvatar userId={m.authorId} size={28} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{u.name}</Typography>
                    <Typography variant="caption">
                      {ROLES[u.role]} · {fmtDateTime(m.at)}
                    </Typography>
                  </Stack>
                  <Box sx={{ mt: 0.5, p: 1.25, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: 12.5 }}>{render(m.body)}</Box>
                </Box>
              </Stack>
            );
          })}
        </Stack>
        <TextField multiline minRows={2} placeholder="Write a message… type @ to mention" value={body} onChange={(e) => setBody(e.target.value)} />
        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }} alignItems="center">
          <Typography variant="caption" sx={{ mr: 0.5 }}>
            Mention:
          </Typography>
          {team.slice(0, 8).map((u) => (
            <Chip key={u.id} label={`@${u.name.split(' ')[0]}`} variant="outlined" onClick={() => setBody(`${body}${body && !body.endsWith(' ') ? ' ' : ''}@${u.name} `)} sx={{ cursor: 'pointer' }} />
          ))}
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={post} disabled={!body.trim()}>
            Post
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
