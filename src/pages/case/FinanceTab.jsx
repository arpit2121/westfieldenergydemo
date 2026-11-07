import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import Stack from '../../components/Stack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import { Panel, StatusChip, Mono, Empty, FileChip } from '../../components/common';
import { fmtDate, fmtINR, fmtLakh } from '../../utils/format';
import { itemById } from '../../data/masters';
import { useCaseActions, ApproveBox, Stamps, WaitingNote } from './shared';

const G_LABEL = { ABG: 'Advance Bank Guarantee', PBG: 'Performance Bank Guarantee', LC: 'Letter of Credit' };
const P_LABEL = { ADVANCE: 'Advance', BALANCE: 'Balance', AGAINST_DOCUMENTS: 'Against shipping documents (LC)', RETENTION: 'Retention' };
const TRIGGER = { AGAINST_ABG: 'Against ABG', AFTER_MRN: 'After MRN', AGAINST_SHIPPING_DOCS: 'Against shipping docs', ON_PO_ACCEPTANCE: 'On PO acceptance' };
const P_STATUS = { PENDING: 'Pending', GO_AHEAD_REQUESTED: 'Go-ahead requested', REVIEWED: 'Reviewed', APPROVED: 'Approved', PAID: 'Paid' };
const G_STATUS = { PENDING: 'Awaiting', RECEIVED: 'Received', VERIFIED: 'Verified', RELEASED: 'Released' };

function ThreeWayMatch({ c }) {
  const ordered = c.po.lines.reduce((a, l) => a + l.qty, 0);
  const accepted = c.mrn?.lines.reduce((a, l) => a + l.acceptedQty, 0) ?? 0;
  const cols = [
    { k: 'Purchase order', no: c.po.poNo, qty: ordered, amt: c.po.total },
    { k: 'Material receipt (MRN)', no: c.mrn?.mrnNo, qty: accepted, amt: null },
    { k: 'Supplier invoice', no: c.invoice?.invoiceNo, qty: ordered, amt: c.invoice?.amount },
  ];
  const ok = accepted === ordered && c.invoice?.amount === c.po.total;
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        {cols.map((x) => (
          <Box key={x.k} sx={{ border: '1px solid', borderColor: ok ? 'success.main' : 'error.main', borderRadius: 1, p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle2">{x.k}</Typography>
              {ok ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} /> : <Cancel sx={{ fontSize: 16, color: 'error.main' }} />}
            </Stack>
            <Mono sx={{ fontSize: 12 }}>{x.no || '—'}</Mono>
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>Qty {x.qty}</Typography>
            <Typography sx={{ fontSize: 12 }}>{x.amt != null ? fmtINR(x.amt) : `${itemById(c.po.lines[0].itemId).internalPartNo} accepted`}</Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ mt: 1, fontSize: 12.5, fontWeight: 600, color: ok ? 'success.main' : 'error.main' }}>{ok ? '3-way match passed – quantities and amounts agree.' : 'Mismatch – check quantities.'}</Typography>
    </Box>
  );
}

export default function FinanceTab({ c }) {
  const { user, isMine, act } = useCaseActions(c);
  if (!c.po) return <Panel><Empty title="Payments start after the PO is created" /></Panel>;
  const supplier = user.role === 'SUPPLIER_USER';
  const adv = c.payments.find((p) => p.type === 'ADVANCE');
  const due = c.payments.find((p) => p.status !== 'PAID');

  return (
    <Box>
      {isMine('ADV_GOAHEAD') && (
        <ApproveBox
          title="Request go-ahead for advance payment"
          subtitle={`Posts to the internal discussion and asks Finance to release ${fmtLakh(adv?.amount)} (${adv?.percent}%) against the ABG.`}
          approveLabel="Send go-ahead"
          defaultComment="@Karan Mehta go ahead for the 20% advance – ABG received and attached on the PO."
          onApprove={(comment) => act('ADV_GOAHEAD', { comment }, 'Go-ahead posted to Finance')}
        />
      )}
      {isMine('ADV_REVIEW') && (
        <ApproveBox
          title="Verify ABG and review advance"
          subtitle="Confirm the Advance Bank Guarantee with the issuing bank before releasing money."
          approveLabel="ABG verified – forward"
          defaultComment="ABG verified with issuing bank. Forwarding advance for approval."
          onApprove={(comment) => act('ADV_REVIEW', { comment }, 'ABG verified – advance sent for approval')}
        />
      )}
      {isMine('ADV_PAY') && (
        <ApproveBox
          title={`Release advance – ${fmtLakh(adv?.amount)}`}
          subtitle="A bank reference (UTR) is generated and the supplier receives a payment advice."
          approveLabel="Release payment"
          onApprove={(comment) => act('ADV_PAY', { comment }, 'Advance released – UTR generated')}
        />
      )}
      {isMine('LC_OPEN') && (
        <ApproveBox
          title="Open Letter of Credit"
          subtitle={`Irrevocable LC at sight for ${fmtLakh(c.guarantees.find((g) => g.type === 'LC')?.amount)} in favour of the supplier.`}
          approveLabel="Open LC"
          onApprove={(comment) => act('LC_OPEN', { comment }, 'LC opened and advised to supplier bank')}
        />
      )}
      {isMine('DOC_PAY') && (
        <ApproveBox
          title="Pay against shipping documents"
          subtitle={`Documents received: ${c.invoice?.docs.join(', ')}.`}
          approveLabel="Release payment under LC"
          onApprove={(comment) => act('DOC_PAY', { comment }, 'Payment released against documents')}
        />
      )}
      {isMine('BAL_REVIEW') && (
        <ApproveBox title="3-way match" subtitle="PO, MRN and invoice are compared before the balance is released." approveLabel="Confirm match" onApprove={(comment) => act('BAL_REVIEW', { comment }, '3-way match confirmed – sent for payment release')}>
          <ThreeWayMatch c={c} />
        </ApproveBox>
      )}
      {isMine('BAL_PAY') && (
        <ApproveBox
          title={`Release balance – ${fmtLakh(due?.amount)} and close`}
          subtitle="Releasing the final payment closes the transaction."
          approveLabel="Release & close transaction"
          onApprove={(comment) => act('BAL_PAY', { comment }, 'Balance paid – transaction closed')}
        />
      )}
      {!supplier && <WaitingNote c={c} keys={['ADV_GOAHEAD', 'ADV_REVIEW', 'ADV_PAY', 'LC_OPEN', 'DOC_PAY', 'BAL_REVIEW', 'BAL_PAY']} />}

      <Panel title="Payment schedule" subtitle={`PO value ${fmtINR(c.po.total)}`} pad={false}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Milestone</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell align="right">%</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Bank ref (UTR)</TableCell>
              <TableCell>Paid on</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {c.payments.map((p) => (
              <TableRow key={p.seq}>
                <TableCell>{p.seq}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{P_LABEL[p.type]}</TableCell>
                <TableCell>
                  {TRIGGER[p.trigger]}
                  {p.dueDays ? ` + ${p.dueDays} days` : ''}
                </TableCell>
                <TableCell align="right">{p.percent}%</TableCell>
                <TableCell align="right">{fmtINR(p.amount)}</TableCell>
                <TableCell>
                  <StatusChip label={P_STATUS[p.status]} />
                </TableCell>
                <TableCell>
                  <Mono>{p.utr || '—'}</Mono>
                </TableCell>
                <TableCell>{fmtDate(p.paidAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Guarantees & instruments" subtitle="ABG / PBG / LC with uploaded bank copies" pad={false}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Instrument</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Valid till</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Copy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {c.guarantees.map((g) => (
              <TableRow key={g.type}>
                <TableCell>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{g.type}</Typography>
                  <Typography variant="caption">{G_LABEL[g.type]}</Typography>
                </TableCell>
                <TableCell>
                  <Mono>{g.referenceNo || '—'}</Mono>
                </TableCell>
                <TableCell>{g.bankName || '—'}</TableCell>
                <TableCell align="right">
                  {fmtINR(g.amount)} <Typography variant="caption">({g.percent}%)</Typography>
                </TableCell>
                <TableCell>{fmtDate(g.expiryDate)}</TableCell>
                <TableCell>
                  <StatusChip label={G_STATUS[g.status] || g.status} />
                </TableCell>
                <TableCell>{g.fileName ? <FileChip name={g.fileName} /> : '—'}</TableCell>
              </TableRow>
            ))}
            {c.loi && (
              <TableRow>
                <TableCell>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>LOI</Typography>
                  <Typography variant="caption">Letter of Intent</Typography>
                </TableCell>
                <TableCell>
                  <Mono>{c.loi.loiNo}</Mono>
                </TableCell>
                <TableCell>—</TableCell>
                <TableCell align="right">{fmtINR(c.loi.amount)}</TableCell>
                <TableCell>—</TableCell>
                <TableCell>
                  <StatusChip label="Issued" tone="success" />
                </TableCell>
                <TableCell>
                  <FileChip name={`${c.loi.loiNo}.pdf`} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      {c.invoice && (
        <Panel title="Invoice" actions={<StatusChip label={c.invoice.match === 'MATCHED' ? 'Matched' : c.invoice.match === 'MISMATCH' ? 'Mismatch' : 'Match pending'} />}>
          <Stack direction="row" spacing={4} sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="caption">Invoice no.</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                <Mono>{c.invoice.invoiceNo}</Mono>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption">Date</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(c.invoice.invoiceDate)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption">Amount</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{fmtINR(c.invoice.amount)}</Typography>
            </Box>
          </Stack>
          {c.invoice.docs.map((d) => (
            <FileChip key={d} name={`${d}.pdf`} />
          ))}
          {c.mrn?.status === 'APPROVED' && !supplier && (
            <Box sx={{ mt: 1.5 }}>
              <ThreeWayMatch c={c} />
            </Box>
          )}
        </Panel>
      )}
      {!supplier && (
        <Panel title="Finance approvals">
          <Stamps c={c} keys={['ADV_GOAHEAD', 'ADV_REVIEW', 'ADV_PAY', 'LC_OPEN', 'DOC_PAY', 'BAL_REVIEW', 'BAL_PAY']} />
        </Panel>
      )}
    </Box>
  );
}
