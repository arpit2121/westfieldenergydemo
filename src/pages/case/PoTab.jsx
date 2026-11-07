import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, Paper, Alert } from '@mui/material';
import Stack from '../../components/Stack';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { Panel, Field, FieldGrid, StatusChip, Mono, Empty, Grid } from '../../components/common';
import { supplierById, itemById, PAYMENT_TERM_TEMPLATES, termById, userById } from '../../data/masters';
import { canTogglePurchaseType, getSteps } from '../../store/flow';
import { fmtDate, fmtINR, fmtLakh, toInputDate, fromInputDate, DAY } from '../../utils/format';
import { togglePurchaseType, toast } from '../../store';
import { useCaseActions, ActionBox, ApproveBox, Stamps, WaitingNote } from './shared';

const PO_STATUS = { IN_APPROVAL: 'In approval', ISSUED: 'PO Issued', ACCEPTED: 'Accepted by supplier', RECEIVED: 'Material received', CLOSED: 'Closed' };

export function PurchaseTypeToggle({ c, user }) {
  const dispatch = useDispatch();
  const enabled = canTogglePurchaseType(c) && user.role !== 'SUPPLIER_USER';
  const tail = getSteps(c).filter((s) => ['ADV_GOAHEAD', 'ADV_REVIEW', 'ADV_PAY', 'LC_OPEN', 'DISPATCH', 'DOC_PAY', 'SHIP_TRACK', 'MRN_PREPARE', 'BAL_PAY'].includes(s.key));
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }} className="no-print">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="subtitle2">Purchase type</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={c.purchaseType}
            disabled={!enabled}
            onChange={(_, v) => {
              if (!v) return;
              dispatch(togglePurchaseType({ caseId: c.id, type: v, userId: user.id }));
              dispatch(toast({ message: v === 'IMPORT' ? 'Import: LC → pay against documents → ship → customs → MRN' : 'Local: deliver → MRN → pay', severity: 'info' }));
            }}
            sx={{ mt: 0.5, '& .MuiToggleButton-root': { px: 2, py: 0.4, fontSize: 12, textTransform: 'none' }, '& .Mui-selected': { bgcolor: '#111 !important', color: '#fff !important' } }}
          >
            <ToggleButton value="LOCAL">Local</ToggleButton>
            <ToggleButton value="IMPORT">Import</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
            {c.purchaseType === 'IMPORT' ? 'Pay first (LC / against documents), then ship' : 'Deliver first, then pay'} – remaining steps:
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            {tail.map((s, i) => (
              <Stack key={s.key} direction="row" alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    fontSize: 11,
                    px: 1,
                    py: 0.25,
                    border: '1px solid',
                    borderColor: c.done.includes(s.key) ? '#111' : 'grey.300',
                    bgcolor: c.done.includes(s.key) ? '#111' : '#fff',
                    color: c.done.includes(s.key) ? '#fff' : 'text.primary',
                    borderRadius: 0.5,
                    transition: 'all .3s',
                  }}
                >
                  {s.label.split(' – ')[0].replace(' + invoice', '')}
                </Box>
                {i < tail.length - 1 && <Typography variant="caption">→</Typography>}
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
      {!enabled && c.po && user.role !== 'SUPPLIER_USER' && (
        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
          Purchase type is locked once payment or shipment has started.
        </Typography>
      )}
    </Paper>
  );
}

function DraftPoForm({ c, onSubmit }) {
  const q = c.quotes.find((x) => x.id === c.qcs.awardQuoteId);
  const s = supplierById(q.supplierId);
  const [f, setF] = useState({
    purchaseType: s.type === 'IMPORT' ? 'IMPORT' : 'LOCAL',
    paymentTermId: s.type === 'IMPORT' ? 'pt-lc' : c.rfq.paymentTermId,
    needByDate: toInputDate(c.needByDate),
    deliveryLocation: c.deliveryLocation,
    sendLoi: true,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <ActionBox
      title="Create draft PO from approved QCS"
      subtitle={`Auto-filled from ${c.qcs.qcsNo}: ${s.name}, ${fmtLakh(q.landed)}, ${q.incoterm}. Review and submit for Finance approval.`}
      actions={
        <Button variant="contained" onClick={() => onSubmit({ ...f, needByDate: fromInputDate(f.needByDate) })}>
          Create draft PO & submit
        </Button>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '160px 1fr 170px' }, gap: 1.5 }}>
        <TextField select label="Purchase type" value={f.purchaseType} onChange={(e) => setF({ ...f, purchaseType: e.target.value, paymentTermId: e.target.value === 'IMPORT' ? 'pt-lc' : 'pt-20-80' })}>
          <MenuItem value="LOCAL">Local</MenuItem>
          <MenuItem value="IMPORT">Import</MenuItem>
        </TextField>
        <TextField select label="Payment terms" value={f.paymentTermId} onChange={set('paymentTermId')}>
          {PAYMENT_TERM_TEMPLATES.filter((t) => (f.purchaseType === 'IMPORT' ? t.id === 'pt-lc' : t.id !== 'pt-lc')).map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField type="date" label="Need-by date" value={f.needByDate} onChange={set('needByDate')} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>
      <TextField label="Delivery location" value={f.deliveryLocation} onChange={set('deliveryLocation')} sx={{ mt: 1.5 }} />
      <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
        <FormControlLabel control={<Checkbox checked={f.sendLoi} onChange={(e) => setF({ ...f, sendLoi: e.target.checked })} />} label="Send Letter of Intent (LOI) to supplier now" />
        <Typography variant="caption" sx={{ alignSelf: 'center' }}>
          PBG 10% of PO value will be requested on acceptance.
        </Typography>
      </Stack>
    </ActionBox>
  );
}

function AcceptPo({ c, onAccept }) {
  const abg = c.guarantees.find((g) => g.type === 'ABG');
  const [files, setFiles] = useState({});
  const need = c.guarantees.filter((g) => g.type !== 'LC');
  return (
    <ActionBox
      title="Accept purchase order"
      subtitle="Acknowledge the PO and upload the bank guarantees requested by Westfield (scan / telecopy)."
      actions={
        <Button variant="contained" disabled={need.some((g) => !files[g.type])} onClick={() => onAccept(Object.fromEntries(need.map((g) => [g.type.toLowerCase(), { fileName: files[g.type] }])))}>
          Accept PO
        </Button>
      }
    >
      <Stack spacing={1}>
        {need.map((g) => (
          <Stack key={g.type} direction="row" spacing={2} alignItems="center" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{g.type === 'ABG' ? 'Advance Bank Guarantee (ABG)' : 'Performance Bank Guarantee (PBG)'}</Typography>
              <Typography variant="caption">
                {fmtINR(g.amount)} · {g.percent}% of PO value {g.type === 'ABG' && abg ? '· secures the advance payment' : '· valid for warranty period'}
              </Typography>
            </Box>
            {files[g.type] ? (
              <StatusChip label={files[g.type]} tone="success" />
            ) : (
              <Button variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => setFiles({ ...files, [g.type]: `${g.type}_${supplierById(c.po.supplierId).name.split(' ')[0]}_scan.pdf` })}>
                Upload scan
              </Button>
            )}
          </Stack>
        ))}
      </Stack>
    </ActionBox>
  );
}

export function PoDocument({ c }) {
  const po = c.po;
  const s = supplierById(po.supplierId);
  return (
    <Panel
      title={po.poNo ? `Purchase Order ${po.poNo}` : `Draft PO ${po.draftNo}`}
      subtitle={po.poNo ? `Issued ${fmtDate(po.issuedAt)} · version ${po.version}` : 'Not yet issued'}
      actions={<StatusChip label={PO_STATUS[po.status] || po.status} />}
    >
      <Grid cols="1fr 1fr" sx={{ mb: 2 }}>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
          <Typography variant="subtitle2">Supplier</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>{s.name}</Typography>
          <Typography variant="caption" component="div">
            {s.code} · {s.city}, {s.country}
          </Typography>
          <Typography variant="caption" component="div">
            {s.gstin ? `GSTIN ${s.gstin}` : 'Foreign supplier'} · {s.email}
          </Typography>
        </Box>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
          <Typography variant="subtitle2">Ship to</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>Westfield Energy Ltd</Typography>
          <Typography variant="caption" component="div">
            {po.deliveryLocation}
          </Typography>
          <Typography variant="caption" component="div">
            Need by {fmtDate(po.needByDate)} · Incoterm {po.incoterm}
          </Typography>
        </Box>
      </Grid>
      <FieldGrid cols={5} sx={{ mb: 2 }}>
        <Field label="Reference PR" value={c.prNo} />
        <Field label="QCS" value={c.qcs?.qcsNo} />
        <Field label="LOI" value={c.loi ? `${c.loi.loiNo} · ${fmtDate(c.loi.issuedAt)}` : 'Not issued'} />
        <Field label="Purchase type" value={c.purchaseType === 'IMPORT' ? 'Import' : 'Local'} />
        <Field label="Payment terms" value={termById(po.paymentTermId)?.name} />
      </FieldGrid>
      <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Part no.</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Received</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {po.lines.map((l) => {
            const it = itemById(l.itemId);
            return (
              <TableRow key={l.lineNo}>
                <TableCell>{l.lineNo}</TableCell>
                <TableCell>
                  <Mono>{it.internalPartNo}</Mono>
                </TableCell>
                <TableCell>{it.name}</TableCell>
                <TableCell align="right">
                  {l.qty} {it.uom}
                </TableCell>
                <TableCell align="right">{fmtINR(l.unitPriceInr)}</TableCell>
                <TableCell align="right">{fmtINR(l.lineTotal)}</TableCell>
                <TableCell align="right">{l.receivedQty}</TableCell>
              </TableRow>
            );
          })}
          {po.charges > 0 && (
            <TableRow>
              <TableCell colSpan={5} align="right">
                Freight, duty & clearance
              </TableCell>
              <TableCell align="right">{fmtINR(po.charges)}</TableCell>
              <TableCell />
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>
              PO total (excl. GST)
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13 }}>
              {fmtINR(po.total)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Terms & conditions
        </Typography>
        <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-line', color: 'grey.700' }}>{po.tnc}</Typography>
      </Box>
    </Panel>
  );
}

export default function PoTab({ c }) {
  const { user, isMine, act, back } = useCaseActions(c);
  if (!c.po) {
    return isMine('PO_DRAFT') ? (
      <DraftPoForm c={c} onSubmit={(p) => act('PO_DRAFT', p, p.sendLoi ? 'Draft PO submitted to Finance · LOI emailed to supplier' : 'Draft PO submitted to Finance')} />
    ) : (
      <Panel>
        <Empty title="No purchase order yet" hint="The buyer creates the draft PO after the QCS is approved." />
      </Panel>
    );
  }
  return (
    <Box>
      {isMine('PO_FIN_REVIEW') && (
        <ApproveBox
          title="Finance review – budget check"
          approveLabel="Mark reviewed"
          defaultComment="Budget available under CAPEX head 4120 – Substation Upgrades."
          onApprove={(comment) => act('PO_FIN_REVIEW', { comment }, 'PO reviewed – sent to Finance Controller')}
          onSendBack={(comment) => back('PO_DRAFT', comment)}
        >
          <Stack direction="row" spacing={2}>
            {[
              ['Budget head', 'CAPEX 4120 · Substation Upgrades'],
              ['Available', '₹ 2.40 Cr'],
              ['This PO', fmtLakh(c.po.total)],
              ['Balance after PO', fmtLakh(24000000 - c.po.total)],
            ].map(([k, v]) => (
              <Box key={k} sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                <Typography variant="caption">{k}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{v}</Typography>
              </Box>
            ))}
          </Stack>
          <Alert severity="success" sx={{ mt: 1.5 }}>
            Budget check passed.
          </Alert>
        </ApproveBox>
      )}
      {isMine('PO_FIN_APPROVE') && (
        <ApproveBox
          title="Approve and issue purchase order"
          subtitle="On approval the PO number is generated and the PO is emailed to the supplier."
          approveLabel="Approve & issue PO"
          onApprove={(comment) => act('PO_FIN_APPROVE', { comment }, 'PO issued and emailed to supplier')}
          onSendBack={(comment) => back('PO_DRAFT', comment)}
        />
      )}
      {isMine('PO_ACCEPT') && <AcceptPo c={c} onAccept={(p) => act('PO_ACCEPT', p, 'PO accepted – guarantees uploaded')} />}
      <WaitingNote c={c} keys={['PO_FIN_REVIEW', 'PO_FIN_APPROVE', 'PO_ACCEPT']} />

      {user.role !== 'SUPPLIER_USER' && <PurchaseTypeToggle c={c} user={user} />}
      <PoDocument c={c} />
      <Panel title="PO approvals">
        <Stamps c={c} keys={['PO_DRAFT', 'PO_FIN_REVIEW', 'PO_FIN_APPROVE', 'PO_ACCEPT']} />
        {c.approvals.some((a) => a.stepKey === 'PO_FIN_APPROVE') && (
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            Issued by {userById(c.approvals.find((a) => a.stepKey === 'PO_FIN_APPROVE').userId).name} on {fmtDate(c.po.issuedAt)}. Delivery due within {Math.round((c.po.needByDate - c.po.issuedAt) / DAY)} days.
          </Typography>
        )}
      </Panel>
    </Box>
  );
}
