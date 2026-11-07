import { useSelector } from 'react-redux';
import { Box, Typography } from '@mui/material';
import Stack from '../../components/Stack';
import { Panel, UserAvatar } from '../../components/common';
import { userById, ROLES, TEAMS } from '../../data/masters';
import { fmtDateTime, fmtDate } from '../../utils/format';

export function ClosedStamp({ c }) {
  return (
    <Box
      sx={{
        display: 'inline-block',
        border: '3px double #111',
        px: 2.5,
        py: 1,
        transform: 'rotate(-4deg)',
        textAlign: 'center',
        my: 1,
      }}
    >
      <Typography sx={{ fontWeight: 800, letterSpacing: 2, fontSize: 16 }}>TRANSACTION CLOSED</Typography>
      <Typography sx={{ fontSize: 10.5, letterSpacing: 1 }}>
        {c.prNo} · {c.po?.poNo} · {fmtDate(c.closedAt)}
      </Typography>
    </Box>
  );
}

export default function TimelineTab({ c }) {
  const audit = useSelector((s) => s.p2p.audit);
  const rows = audit.filter((a) => a.caseId === c.id).slice().sort((a, b) => a.at - b.at);
  const teams = new Set(rows.map((r) => userById(r.userId)?.team).filter(Boolean));
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 300px' }, gap: 2, alignItems: 'start' }}>
      <Panel title="Audit timeline" subtitle="Who did what, and when – from requisition to closure" pad={false}>
        <Box sx={{ position: 'relative', py: 1 }}>
          {rows.map((r, i) => {
            const u = userById(r.userId);
            const last = i === rows.length - 1;
            return (
              <Stack key={r.id} direction="row" spacing={1.5} sx={{ px: 2, position: 'relative' }}>
                <Stack alignItems="center" sx={{ width: 26 }}>
                  <UserAvatar userId={r.userId} size={24} />
                  {!last && <Box sx={{ flex: 1, width: 1.5, bgcolor: 'grey.200', minHeight: 16 }} />}
                </Stack>
                <Box sx={{ flex: 1, pb: 1.75, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{r.message}</Typography>
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      {fmtDateTime(r.at)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption">
                    {u?.name} · {ROLES[u?.role]} · <span style={{ fontFamily: 'monospace' }}>{r.action}</span>
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Box>
        {c.closed && (
          <Box sx={{ textAlign: 'center', pb: 3 }}>
            <ClosedStamp c={c} />
          </Box>
        )}
      </Panel>
      <Panel title="Summary">
        <Stack spacing={1}>
          {[
            ['Events logged', rows.length],
            ['Teams involved', teams.size],
            ['Started', fmtDate(c.createdAt)],
            ['Closed', c.closed ? fmtDate(c.closedAt) : 'Open'],
            ['Cycle time', `${Math.max(1, Math.round(((c.closedAt || Date.now()) - c.createdAt) / 86400000))} days`],
          ].map(([k, v]) => (
            <Stack key={k} direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {k}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {v}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.75 }}>
          Teams
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {[...teams].map((t) => (
            <Box key={t} sx={{ fontSize: 11, border: '1px solid', borderColor: 'grey.300', borderRadius: 0.5, px: 0.75, py: 0.2 }}>
              {TEAMS[t]}
            </Box>
          ))}
        </Stack>
      </Panel>
    </Box>
  );
}
