import { useState } from 'react';
import { Box, Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Paper } from '@mui/material';
import Stack from '../../components/Stack';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import StarRounded from '@mui/icons-material/StarRounded';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import { Panel, TierChip, RankChip, StatusChip, Empty, StatCard } from '../../components/common';
import { supplierById, SUB_VENDORS, termById } from '../../data/masters';
import { quoteTotals } from '../../store/flow';
import { fmtLakh, fmtUSD, fmtINR } from '../../utils/format';
import { useCaseActions, ActionBox, ApproveBox, Stamps, WaitingNote } from './shared';

export default function CbeTab({ c }) {
  const { isMine, act, back } = useCaseActions(c);
  const ranked = c.cbe.map((r) => ({ ...r, q: c.quotes.find((q) => q.id === r.quoteId) }));
  const l1 = ranked[0];
  const [awardSel, setAward] = useState(null);
  const award = awardSel || c.qcs?.awardQuoteId || l1?.quoteId || '';
  const awardRow = ranked.find((r) => r.quoteId === award);
  const needsJustification = awardRow && (awardRow.rank !== 1 || awardRow.tier !== 'T1');
  const [justSel, setJust] = useState(null);
  const just =
    justSel ??
    (c.qcs?.justification ||
      (l1 && l1.tier !== 'T1'
        ? `L1 bidder is ${l1.tier} (minor deviation on delivery schedule, technically acceptable). Award to L1 saves ${fmtLakh((ranked[1]?.landed || 0) - l1.landed)} against the best T1 bid.`
        : ''));

  if (!c.done.includes('TBE_APPROVE')) {
    return (
      <Panel>
        <Stack alignItems="center" sx={{ py: 5 }} spacing={1}>
          <LockOutlined sx={{ fontSize: 30, color: 'grey.400' }} />
          <Typography variant="h4">Prices are sealed</Typography>
          <Typography variant="caption">Commercial bids open only after Management approves the technical evaluation.</Typography>
        </Stack>
      </Panel>
    );
  }

  const disq = c.quotes.filter((q) => q.status === 'TECH_DISQUALIFIED');
  const avg = ranked.reduce((a, r) => a + r.landed, 0) / (ranked.length || 1);

  return (
    <Box>
      {isMine('CBE_RUN') && (
        <ActionBox
          title="Open prices and run commercial evaluation"
          subtitle={`${c.quotes.length - disq.length} technically qualified bids will be unsealed. Landed cost = unit price × qty + freight + import duty + clearance.`}
          actions={
            <Button variant="contained" startIcon={<LockOpenOutlined />} onClick={() => act('CBE_RUN', {}, 'Prices unsealed – bids ranked L1 to L' + (c.quotes.length - disq.length))}>
              Unseal prices & rank
            </Button>
          }
        />
      )}

      {c.cbe.length > 0 && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            <StatCard label="L1 landed cost" value={fmtLakh(l1.landed)} hint={supplierById(l1.q.supplierId).name} />
            <StatCard label="Estimate" value={fmtLakh(c.estimatedValue)} hint="From approved PR" />
            <StatCard label="Saving vs estimate" value={fmtLakh(c.estimatedValue - (awardRow?.landed ?? l1.landed))} hint={`${(((c.estimatedValue - (awardRow?.landed ?? l1.landed)) / c.estimatedValue) * 100).toFixed(1)}% below estimate`} />
            <StatCard label="Saving vs average bid" value={fmtLakh(avg - (awardRow?.landed ?? l1.landed))} hint={`Average of ${ranked.length} qualified bids`} />
          </Box>

          <Panel
            title="Commercial bid evaluation & quotation comparison statement"
            subtitle={`${c.qcs?.qcsNo || 'QCS draft'} · ${c.rfq.eventNo} · all amounts in INR, excluding GST`}
            pad={false}
            actions={
              <Button variant="outlined" startIcon={<PrintOutlined />} onClick={() => window.print()} className="no-print">
                Export QCS
              </Button>
            }
          >
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Tech tier</TableCell>
                    <TableCell>Incoterm</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Basic value</TableCell>
                    <TableCell align="right">Freight</TableCell>
                    <TableCell align="right">Duty</TableCell>
                    <TableCell align="right">Clearance</TableCell>
                    <TableCell align="right">Landed cost</TableCell>
                    <TableCell align="right">vs L1</TableCell>
                    <TableCell>Delivery</TableCell>
                    <TableCell>Payment terms</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranked.map((r) => {
                    const q = r.q;
                    const s = supplierById(q.supplierId);
                    const t = quoteTotals(q);
                    const isAward = r.quoteId === (c.qcs?.awardQuoteId || award);
                    const qty = q.lines.reduce((a, l) => a + l.qty, 0);
                    return (
                      <TableRow
                        key={r.quoteId}
                        sx={{
                          bgcolor: isAward ? 'rgba(17,17,17,0.04)' : undefined,
                          '& td': isAward ? { borderTop: '1.5px solid #111', borderBottom: '1.5px solid #111' } : undefined,
                          '& td:first-of-type': isAward ? { borderLeft: '3px solid #111' } : undefined,
                        }}
                      >
                        <TableCell>
                          <RankChip rank={r.rank} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.name}</Typography>
                            {isAward && <StarRounded sx={{ fontSize: 15 }} />}
                          </Stack>
                          <Typography variant="caption">
                            {s.type === 'IMPORT' ? `Import · ${s.country}` : `Local · ${s.city}`}
                            {q.subVendorId && ` · OEM ${SUB_VENDORS.find((v) => v.id === q.subVendorId)?.name.split(' (')[0]}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TierChip tier={r.tier} />
                        </TableCell>
                        <TableCell>{q.incoterm}</TableCell>
                        <TableCell align="right">
                          {fmtLakh(q.lines[0].unitPriceInr)}
                          {q.currency === 'USD' && (
                            <Typography variant="caption" component="div">
                              {fmtUSD(q.lines[0].unitPriceFx)} @ ₹{q.fxRate}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{qty}</TableCell>
                        <TableCell align="right">{fmtLakh(t.subtotal)}</TableCell>
                        <TableCell align="right">{q.freight ? fmtLakh(q.freight) : <Typography variant="caption">incl.</Typography>}</TableCell>
                        <TableCell align="right">{t.duty ? `${fmtLakh(t.duty)}` : '—'}</TableCell>
                        <TableCell align="right">{q.otherCharges ? fmtLakh(q.otherCharges) : '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12.5 }}>
                          {fmtLakh(r.landed)}
                        </TableCell>
                        <TableCell align="right">{r.rank === 1 ? '—' : `+${(((r.landed - l1.landed) / l1.landed) * 100).toFixed(1)}%`}</TableCell>
                        <TableCell>{q.deliveryWeeks} wks</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', minWidth: 210 }}>
                          <Typography variant="caption" sx={{ color: 'text.primary' }}>
                            {q.paymentTermsText === 'As per RFQ' ? termById(c.rfq.paymentTermId)?.name : q.paymentTermsText}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {disq.map((q) => (
                    <TableRow key={q.id} sx={{ '& td': { color: 'grey.500' } }}>
                      <TableCell>
                        <Typography variant="caption">—</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'grey.500', textDecoration: 'line-through' }}>{supplierById(q.supplierId).name}</Typography>
                        <Typography variant="caption">Disqualified at TBE</Typography>
                      </TableCell>
                      <TableCell>
                        <TierChip tier="T3" />
                      </TableCell>
                      <TableCell>{q.incoterm}</TableCell>
                      <TableCell colSpan={10}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <LockOutlined sx={{ fontSize: 13 }} />
                          <Typography variant="caption">Price not opened – bid failed technical evaluation</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Stack direction="row" spacing={2} sx={{ px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TierChip tier="T1" /> <Typography variant="caption">Fully compliant</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TierChip tier="T2" /> <Typography variant="caption">Minor deviations</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TierChip tier="T3" /> <Typography variant="caption">Major deviations (disqualified)</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <RankChip rank={1} /> <Typography variant="caption">Lowest landed cost</Typography>
              </Stack>
            </Stack>
          </Panel>
        </>
      )}

      {isMine('QCS_SUBMIT') && (
        <ActionBox
          title="Recommend award (QCS)"
          subtitle="The recommended bid is highlighted in the comparison above. A justification is required when the award is not L1 / T1."
          actions={
            <Button variant="contained" disabled={needsJustification && !just.trim()} onClick={() => act('QCS_SUBMIT', { awardQuoteId: award, justification: just }, 'QCS submitted to C&P Lead')}>
              Submit QCS for approval
            </Button>
          }
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 1.5 }}>
            <TextField select label="Recommended supplier" value={award} onChange={(e) => setAward(e.target.value)}>
              {ranked.map((r) => (
                <MenuItem key={r.quoteId} value={r.quoteId}>
                  L{r.rank} · {r.tier} · {supplierById(r.q.supplierId).name} – {fmtLakh(r.landed)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label={needsJustification ? 'Award justification (required)' : 'Award justification'} value={just} onChange={(e) => setJust(e.target.value)} multiline minRows={2} />
          </Box>
        </ActionBox>
      )}
      {isMine('QCS_APPROVE') && (
        <ApproveBox
          title="Approve QCS and award"
          subtitle={`Recommended: ${supplierById(c.quotes.find((q) => q.id === c.qcs.awardQuoteId).supplierId).name} at ${fmtLakh(awardRow?.landed)}.`}
          approveLabel="Approve award"
          onApprove={(comment) => act('QCS_APPROVE', { comment }, 'QCS approved – buyer can raise the PO')}
          onSendBack={(comment) => back('QCS_SUBMIT', comment)}
        />
      )}
      <WaitingNote c={c} keys={['CBE_RUN', 'QCS_SUBMIT', 'QCS_APPROVE']} />

      {c.qcs && (
        <Panel title={`Award recommendation · ${c.qcs.qcsNo}`} actions={<StatusChip label={c.qcs.status === 'APPROVED' ? 'QCS Approved' : c.qcs.status === 'SENT_BACK' ? 'Sent back' : 'Submitted'} />}>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
            <Typography sx={{ fontSize: 12.5 }}>
              Award to <b>{supplierById(c.quotes.find((q) => q.id === c.qcs.awardQuoteId).supplierId).name}</b> for <b>{fmtINR(awardRow?.landed)}</b> (L{awardRow?.rank} · {awardRow?.tier}).
            </Typography>
            {c.qcs.justification && (
              <Typography variant="caption" component="div" sx={{ mt: 0.5, color: 'text.primary' }}>
                Justification: {c.qcs.justification}
              </Typography>
            )}
          </Paper>
          <Stamps c={c} keys={['CBE_RUN', 'QCS_SUBMIT', 'QCS_APPROVE']} />
        </Panel>
      )}
      {!c.cbe.length && !isMine('CBE_RUN') && (
        <Panel>
          <Empty title="Waiting for the buyer to open prices" />
        </Panel>
      )}
    </Box>
  );
}
