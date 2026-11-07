import { useState } from 'react';
import { Box, Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert } from '@mui/material';
import Stack from '../../components/Stack';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { Panel, TierChip, StatusChip, FileChip, Empty } from '../../components/common';
import { supplierById, SUB_VENDORS, userById } from '../../data/masters';
import { BID_TEMPLATES } from '../../store/flow';
import { useCaseActions, ActionBox, ApproveBox, Stamps, WaitingNote } from './shared';

const REMARKS = {
  T1: 'Fully compliant with specification and GTP. Type test reports valid.',
  T2: 'Compliant with minor deviations (delivery schedule / documentation). Acceptable.',
  T3: 'Major deviations from specification. Not acceptable.',
};

function ScoreSheet({ c, slot, onSubmit }) {
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      c.quotes.map((q) => {
        const t = BID_TEMPLATES[q.supplierId] || BID_TEMPLATES['s-alpha'];
        return [q.id, { tier: t.tier, score: slot === 'third' ? t.score - 2 : t.score, remarks: REMARKS[t.tier] }];
      }),
    ),
  );
  const upd = (id, k, v) => setRows({ ...rows, [id]: { ...rows[id], [k]: v, ...(k === 'tier' ? { remarks: REMARKS[v] } : {}) } });
  return (
    <ActionBox
      title={slot === 'internal' ? 'Internal technical evaluation' : 'Third-party technical evaluation'}
      subtitle="Score each bid against the specification. T3 bids are disqualified and their price is never opened."
      actions={
        <Button variant="contained" onClick={() => onSubmit(Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, { ...v, score: Number(v.score) }])))}>
          Submit evaluation
        </Button>
      }
    >
      <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableHead>
          <TableRow>
            <TableCell>Supplier</TableCell>
            <TableCell>Offer documents</TableCell>
            <TableCell sx={{ width: 110 }}>Tier</TableCell>
            <TableCell sx={{ width: 90 }}>Score</TableCell>
            <TableCell>Remarks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {c.quotes.map((q) => (
            <TableRow key={q.id}>
              <TableCell>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{supplierById(q.supplierId).name}</Typography>
                <Typography variant="caption">{q.deviations || 'No deviations'}</Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'normal' }}>{q.attachments?.slice(0, 1).map((a) => <FileChip key={a} name={a} />)}</TableCell>
              <TableCell>
                <TextField select value={rows[q.id].tier} onChange={(e) => upd(q.id, 'tier', e.target.value)}>
                  <MenuItem value="T1">T1</MenuItem>
                  <MenuItem value="T2">T2</MenuItem>
                  <MenuItem value="T3">T3</MenuItem>
                </TextField>
              </TableCell>
              <TableCell>
                <TextField type="number" value={rows[q.id].score} onChange={(e) => upd(q.id, 'score', e.target.value)} />
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}>
                <TextField value={rows[q.id].remarks} onChange={(e) => upd(q.id, 'remarks', e.target.value)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ActionBox>
  );
}

const Cell = ({ e }) =>
  e ? (
    <Stack spacing={0.4}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TierChip tier={e.tier} />
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{e.score}</Typography>
        <StatusChip label={e.result === 'PASS' ? 'Pass' : 'Fail'} />
      </Stack>
      <Typography variant="caption" sx={{ whiteSpace: 'normal', display: 'block', maxWidth: 260 }}>
        {e.remarks}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 10 }}>
        {userById(e.evaluatorId)?.name}
      </Typography>
    </Stack>
  ) : (
    <Typography variant="caption">Pending</Typography>
  );

export default function TbeTab({ c }) {
  const { isMine, act, back } = useCaseActions(c);
  if (!c.quotes.length || !c.done.includes('QUOTE_SUBMIT'))
    return (
      <Panel>
        <Empty title="Technical evaluation starts once all bids are in" hint={c.rfq ? `${c.quotes.length} of ${c.rfq.invites.length} bids received` : 'No RFQ yet'} />
      </Panel>
    );

  const approved = c.done.includes('TBE_APPROVE');
  return (
    <Box>
      {isMine('TBE_INTERNAL') && <ScoreSheet c={c} slot="internal" onSubmit={(scores) => act('TBE_INTERNAL', { scores }, 'Internal TBE submitted – sent to third-party inspector')} />}
      {isMine('TBE_THIRD') && <ScoreSheet c={c} slot="third" onSubmit={(scores) => act('TBE_THIRD', { scores }, 'Third-party TBE submitted – sent to Management')} />}
      {isMine('TBE_APPROVE') && (
        <ApproveBox
          title="Approve technically qualified list"
          subtitle="Once approved, prices of qualified bids are unsealed for commercial evaluation. Disqualified bids stay sealed."
          approveLabel="Approve TBE"
          onApprove={(comment) => act('TBE_APPROVE', { comment }, 'TBE approved – buyer can open prices')}
          onSendBack={(comment) => back('TBE_INTERNAL', comment)}
        />
      )}
      <WaitingNote c={c} keys={['TBE_INTERNAL', 'TBE_THIRD', 'TBE_APPROVE']} />

      <Alert icon={<LockOutlined fontSize="inherit" />} severity="info" sx={{ mb: 2, bgcolor: 'grey.100', color: 'text.primary', '& .MuiAlert-icon': { color: '#111' } }}>
        Commercial prices are hidden during technical evaluation so the technical team cannot be influenced by price.
      </Alert>

      <Panel title="Technical bid evaluation (TBE)" subtitle="Internal engineering and independent third-party inspector, side by side" pad={false}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Supplier</TableCell>
              <TableCell>Sub-vendor</TableCell>
              <TableCell>T&C</TableCell>
              <TableCell>Internal (Engineering)</TableCell>
              <TableCell>Third party (TÜV)</TableCell>
              <TableCell>Final</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {c.quotes.map((q) => {
              const e = c.tbe[q.id] || {};
              const dq = q.status === 'TECH_DISQUALIFIED';
              return (
                <TableRow key={q.id} sx={{ verticalAlign: 'top', bgcolor: dq ? 'rgba(180,35,24,0.03)' : undefined }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{supplierById(q.supplierId).name}</Typography>
                    <Typography variant="caption">{q.quoteNo}</Typography>
                  </TableCell>
                  <TableCell>{SUB_VENDORS.find((v) => v.id === q.subVendorId)?.name || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', maxWidth: 180 }}>
                    <Typography sx={{ fontSize: 12 }}>{q.tncAccepted ? 'Accepted' : 'Not accepted'}</Typography>
                    {q.deviations && <Typography variant="caption">{q.deviations}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Cell e={e.internal} />
                  </TableCell>
                  <TableCell>
                    <Cell e={e.third} />
                  </TableCell>
                  <TableCell>
                    {approved ? (
                      <Stack spacing={0.5}>
                        <TierChip tier={q.finalTier} long />
                        <StatusChip label={dq ? 'Disqualified' : 'Qualified'} />
                      </Stack>
                    ) : (
                      <Typography variant="caption">Awaiting approval</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
      <Panel title="TBE sign-off">
        <Stamps c={c} keys={['TBE_INTERNAL', 'TBE_THIRD', 'TBE_APPROVE']} />
      </Panel>
    </Box>
  );
}
