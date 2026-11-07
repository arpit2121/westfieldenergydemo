import { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Radio, RadioGroup, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Stack from '../../components/Stack';
import LockOutlined from '@mui/icons-material/LockOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { Panel, Field, FieldGrid, StatusChip, Mono, FileChip, Empty, Grid } from '../../components/common';
import { SUPPLIERS, INCOTERMS, PAYMENT_TERM_TEMPLATES, STANDARD_TNC, SUB_VENDORS, supplierById, termById, itemById } from '../../data/masters';
import { BID_TEMPLATES, USD_RATE, pendingSuppliers, quoteTotals } from '../../store/flow';
import { fmtDate, fmtDateTime, fmtINR, fmtLakh, fmtUSD, toInputDate, fromInputDate, DAY, daysBetween } from '../../utils/format';
import { useCaseActions, ActionBox, Stamps, WaitingNote } from './shared';
import { toast } from '../../store';

const TYPE_TEXT = {
  RFQ: 'RFQ – Request for Quotation. We know exactly what to buy (spec, qty, part no.).',
  RFI: 'RFI – Request for Information. Need is not yet defined; collect capabilities first.',
  RFP: 'RFP – Request for Proposal. Suppliers propose a solution and price.',
};

function RfqForm({ c, onPublish }) {
  const [f, setF] = useState({
    type: 'RFQ',
    title: c.title,
    incoterm: 'EXW',
    freightBy: 'BUYER',
    paymentTermId: 'pt-20-80',
    bidDueDate: toInputDate(Date.now() + 7 * DAY),
    tnc: STANDARD_TNC,
    invites: SUPPLIERS.map((s) => s.id),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (id) => setF({ ...f, invites: f.invites.includes(id) ? f.invites.filter((x) => x !== id) : [...f.invites, id] });

  return (
    <ActionBox
      title="Create sourcing event"
      subtitle="Pick the event type, attach terms, choose suppliers and publish. Suppliers are notified by email."
      actions={
        <Button variant="contained" startIcon={<SendOutlined />} disabled={!f.invites.length} onClick={() => onPublish({ ...f, bidDueDate: fromInputDate(f.bidDueDate) })}>
          Publish to {f.invites.length} suppliers
        </Button>
      }
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Event type
      </Typography>
      <RadioGroup row value={f.type} onChange={set('type')}>
        {['RFQ', 'RFI', 'RFP'].map((t) => (
          <FormControlLabel key={t} value={t} control={<Radio />} label={t === 'RFQ' ? 'RFQ' : `${t} (RFX)`} />
        ))}
      </RadioGroup>
      <Typography variant="caption" component="div" sx={{ mb: 2 }}>
        {TYPE_TEXT[f.type]}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
        <TextField label="Event title" value={f.title} onChange={set('title')} />
        <TextField select label="Incoterm (shipping term)" value={f.incoterm} onChange={set('incoterm')}>
          {INCOTERMS.map((i) => (
            <MenuItem key={i} value={i}>
              {i}
              {i === 'EXW' && ' – Ex-Works'}
              {i === 'DDP' && ' – Delivered Duty Paid'}
              {i === 'CIF' && ' – Cost, Insurance, Freight'}
              {i === 'FOB' && ' – Free on Board'}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Freight arranged by" value={f.freightBy} onChange={set('freightBy')}>
          <MenuItem value="BUYER">Westfield (buyer)</MenuItem>
          <MenuItem value="SUPPLIER">Supplier</MenuItem>
        </TextField>
        <TextField type="date" label="Bid due date" value={f.bidDueDate} onChange={set('bidDueDate')} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>
      <TextField select label="Payment terms template" value={f.paymentTermId} onChange={set('paymentTermId')} sx={{ mt: 1.5 }}>
        {PAYMENT_TERM_TEMPLATES.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField label="Terms & conditions (suppliers must accept or list deviations)" multiline minRows={4} value={f.tnc} onChange={set('tnc')} sx={{ mt: 1.5, '& textarea': { fontSize: 11.5 } }} />
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
        Invite suppliers
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
        {SUPPLIERS.map((s) => (
          <FormControlLabel
            key={s.id}
            control={<Checkbox checked={f.invites.includes(s.id)} onChange={() => toggle(s.id)} />}
            label={
              <span>
                {s.name} <Typography variant="caption">· {s.type === 'IMPORT' ? `Import (${s.country})` : s.city}</Typography>
              </span>
            }
          />
        ))}
      </Box>
    </ActionBox>
  );
}

function QuoteForm({ c, supplierId, onSubmit }) {
  const sup = supplierById(supplierId);
  const t = BID_TEMPLATES[supplierId];
  const usd = sup.currency === 'USD';
  const [lines, setLines] = useState(
    c.lines.map((l) => {
      const raw = l.estUnitPrice * t.priceFactor;
      return usd ? Math.round(raw / USD_RATE / 10) * 10 : Math.round(raw / 100) * 100;
    }),
  );
  const [f, setF] = useState({
    incoterm: t.incoterm,
    freight: Math.round((c.estimatedValue * t.freightFrac) / 1000) * 1000,
    deliveryWeeks: t.deliveryWeeks,
    validityDays: 90,
    subVendorId: t.subVendorId || '',
    tncAccepted: true,
    deviations: t.deviation,
    paymentTermsText: 'As per RFQ',
  });
  const [files, setFiles] = useState([`${sup.name.split(' ')[0]}_Technical_Offer.pdf`, `${sup.name.split(' ')[0]}_GTP.pdf`]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const subtotal = c.lines.reduce((a, l, i) => a + (usd ? lines[i] * USD_RATE : lines[i]) * l.qty, 0);
  const total = subtotal + Number(f.freight || 0);

  const submit = () =>
    onSubmit({
      supplierId,
      quote: {
        ...f,
        freight: Number(f.freight || 0),
        deliveryWeeks: Number(f.deliveryWeeks),
        subVendorId: f.subVendorId || null,
        attachments: files,
        lines: c.lines.map((l, i) => ({ lineNo: l.lineNo, itemId: l.itemId, qty: l.qty, unitPriceFx: Number(lines[i]), unitPriceInr: usd ? Number(lines[i]) * USD_RATE : Number(lines[i]) })),
      },
    });

  return (
    <ActionBox
      title={`Submit your quotation – ${c.rfq.eventNo}`}
      subtitle="Your price stays sealed until Westfield completes its technical evaluation."
      actions={
        <Button variant="contained" startIcon={<SendOutlined />} disabled={!f.tncAccepted && !f.deviations} onClick={submit}>
          Submit quotation
        </Button>
      }
    >
      <Table size="small" sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <TableHead>
          <TableRow>
            <TableCell>Part no.</TableCell>
            <TableCell>Item</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right" sx={{ width: 180 }}>
              Unit price ({sup.currency})
            </TableCell>
            <TableCell align="right">Line total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {c.lines.map((l, i) => (
            <TableRow key={l.lineNo}>
              <TableCell>
                <Mono>{itemById(l.itemId).internalPartNo}</Mono>
              </TableCell>
              <TableCell>{itemById(l.itemId).name}</TableCell>
              <TableCell align="right">{l.qty}</TableCell>
              <TableCell align="right">
                <TextField
                  type="number"
                  value={lines[i]}
                  onChange={(e) => setLines(lines.map((v, j) => (j === i ? e.target.value : v)))}
                  slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                />
              </TableCell>
              <TableCell align="right">{usd ? fmtUSD(lines[i] * l.qty) : fmtINR(lines[i] * l.qty)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        <TextField select label="Incoterm" value={f.incoterm} onChange={set('incoterm')}>
          {INCOTERMS.map((i) => (
            <MenuItem key={i} value={i}>
              {i}
            </MenuItem>
          ))}
        </TextField>
        <TextField type="number" label="Freight (INR)" value={f.freight} onChange={set('freight')} />
        <TextField type="number" label="Delivery (weeks)" value={f.deliveryWeeks} onChange={set('deliveryWeeks')} />
        <TextField type="number" label="Validity (days)" value={f.validityDays} onChange={set('validityDays')} />
        <TextField select label="Sub-vendor / OEM" value={f.subVendorId} onChange={set('subVendorId')}>
          <MenuItem value="">None – own manufacture</MenuItem>
          {SUB_VENDORS.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 120, overflowY: 'auto' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Westfield terms & conditions
        </Typography>
        <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-line' }}>{c.rfq.tnc}</Typography>
      </Box>
      <FormControlLabel control={<Checkbox checked={f.tncAccepted} onChange={(e) => setF({ ...f, tncAccepted: e.target.checked })} />} label="I accept the terms & conditions" sx={{ mt: 1 }} />
      <TextField label="Deviations / clarifications (if any)" value={f.deviations} onChange={set('deviations')} sx={{ mt: 1 }} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {files.map((x) => (
          <FileChip key={x} name={x} />
        ))}
        <Button size="small" variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => setFiles([...files, `Type_Test_Report_${files.length}.pdf`])} sx={{ mb: 0.75 }}>
          Upload document
        </Button>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Quoted total (INR, excl. GST): {fmtINR(total)}</Typography>
    </ActionBox>
  );
}

function RfqDetails({ c }) {
  const r = c.rfq;
  const left = daysBetween(Date.now(), r.bidDueDate);
  return (
    <Panel title={`${r.type} ${r.eventNo}`} subtitle={r.title} actions={<StatusChip label={pendingSuppliers(c).length ? `Open · ${left > 0 ? `${left} days left` : 'due today'}` : 'Bidding closed'} />}>
      <FieldGrid cols={4}>
        <Field label="Event type" value={r.type} />
        <Field label="Published" value={fmtDateTime(r.publishedAt)} />
        <Field label="Bid due" value={fmtDate(r.bidDueDate)} />
        <Field label="Incoterm" value={r.incoterm} />
        <Field label="Freight by" value={r.freightBy === 'BUYER' ? 'Westfield' : 'Supplier'} />
        <Field label="Payment terms" value={termById(r.paymentTermId)?.name} />
        <Field label="Invited suppliers" value={r.invites.length} />
        <Field label="Price visibility">
          {r.pricesSealed ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LockOutlined sx={{ fontSize: 14 }} /> <span>Sealed until TBE approval</span>
            </Stack>
          ) : (
            'Opened after TBE'
          )}
        </Field>
      </FieldGrid>
    </Panel>
  );
}

export default function SourcingTab({ c }) {
  const { user, isMine, act, dispatch } = useCaseActions(c);
  const supplierView = user.role === 'SUPPLIER_USER';

  if (!c.rfq) {
    return (
      <Box>
        {isMine('RFQ_PUBLISH') ? (
          <RfqForm c={c} onPublish={(p) => act('RFQ_PUBLISH', p, `${p.type} published – ${p.invites.length} suppliers notified by email`)} />
        ) : (
          <Panel>
            <Empty title="No sourcing event yet" hint="The assigned buyer creates the RFQ after the PR is approved." />
          </Panel>
        )}
      </Box>
    );
  }

  if (supplierView) {
    const sid = user.supplierId;
    if (!c.rfq.invites.includes(sid)) return <Alert severity="info">Your company is not invited to this event.</Alert>;
    const mineQ = c.quotes.find((q) => q.supplierId === sid);
    return (
      <Grid cols="minmax(0,1fr) 340px">
        <Box>
          {isMine('QUOTE_SUBMIT') && <QuoteForm c={c} supplierId={sid} onSubmit={(p) => act('QUOTE_SUBMIT', p, 'Quotation submitted – Westfield has been notified')} />}
          {mineQ && (
            <Panel title={`Your quotation ${mineQ.quoteNo}`} actions={<StatusChip label={mineQ.status === 'AWARDED' ? 'Awarded' : mineQ.status === 'NOT_AWARDED' ? 'Not awarded' : 'Submitted'} />}>
              <FieldGrid cols={4}>
                <Field label="Submitted" value={fmtDateTime(mineQ.submittedAt)} />
                <Field label="Incoterm" value={mineQ.incoterm} />
                <Field label="Delivery" value={`${mineQ.deliveryWeeks} weeks`} />
                <Field label="Total (INR)" value={fmtINR(quoteTotals(mineQ).landed)} />
                <Field label="T&C" value={mineQ.tncAccepted ? 'Accepted' : 'With deviations'} />
                <Field label="Sub-vendor" value={SUB_VENDORS.find((s) => s.id === mineQ.subVendorId)?.name || 'Own manufacture'} />
                <Field label="Validity" value={`${mineQ.validityDays} days`} />
              </FieldGrid>
              <Box sx={{ mt: 1.5 }}>{mineQ.attachments?.map((a) => <FileChip key={a} name={a} />)}</Box>
            </Panel>
          )}
          <RfqDetails c={c} />
        </Box>
        <Panel title="Line items" pad={false}>
          <Table size="small">
            <TableBody>
              {c.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell sx={{ whiteSpace: 'normal' }}>
                    <Mono>{itemById(l.itemId).internalPartNo}</Mono>
                    <Typography sx={{ fontSize: 12 }}>{itemById(l.itemId).name}</Typography>
                    <Typography variant="caption">{l.specNotes}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {l.qty} {itemById(l.itemId).uom}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </Grid>
    );
  }

  const pending = pendingSuppliers(c);
  return (
    <Box>
      <WaitingNote c={c} keys={['QUOTE_SUBMIT']} />
      <RfqDetails c={c} />
      <Panel
        title="Bids"
        subtitle={`${c.quotes.length} of ${c.rfq.invites.length} received`}
        pad={false}
        actions={
          pending.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => dispatch(toast({ message: `Reminder emailed to ${pending.map((s) => supplierById(s).name).join(', ')}`, severity: 'info' }))}
            >
              Send reminder
            </Button>
          )
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Supplier</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Incoterm</TableCell>
              <TableCell>Delivery</TableCell>
              <TableCell>T&C</TableCell>
              <TableCell>Sub-vendor</TableCell>
              <TableCell align="right">Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {c.rfq.invites.map((sid) => {
              const s = supplierById(sid);
              const q = c.quotes.find((x) => x.supplierId === sid);
              return (
                <TableRow key={sid}>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.name}</Typography>
                    <Typography variant="caption">{s.code}</Typography>
                  </TableCell>
                  <TableCell>{s.type === 'IMPORT' ? `Import · ${s.country}` : `Local · ${s.city}`}</TableCell>
                  <TableCell>{q ? <StatusChip label="Submitted" tone="success" /> : <StatusChip label="Invited" tone="outline" />}</TableCell>
                  <TableCell>{q ? fmtDateTime(q.submittedAt) : '—'}</TableCell>
                  <TableCell>{q?.incoterm || '—'}</TableCell>
                  <TableCell>{q ? `${q.deliveryWeeks} wks` : '—'}</TableCell>
                  <TableCell>{q ? (q.tncAccepted ? 'Accepted' : <Typography sx={{ fontSize: 12, color: 'error.main' }}>Deviations</Typography>) : '—'}</TableCell>
                  <TableCell>{q ? SUB_VENDORS.find((v) => v.id === q.subVendorId)?.name || '—' : '—'}</TableCell>
                  <TableCell align="right">
                    {!q ? (
                      '—'
                    ) : c.rfq.pricesSealed || q.status === 'TECH_DISQUALIFIED' ? (
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ color: 'grey.500' }}>
                        <LockOutlined sx={{ fontSize: 13 }} />
                        <span>Sealed</span>
                      </Stack>
                    ) : (
                      fmtLakh(quoteTotals(q).landed)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
      <Panel title="Sourcing approvals">
        <Stamps c={c} keys={['RFQ_PUBLISH']} />
      </Panel>
    </Box>
  );
}
