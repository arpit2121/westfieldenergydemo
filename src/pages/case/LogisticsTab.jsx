import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, MenuItem, Paper, TextField, Typography, Alert } from '@mui/material';
import Stack from '../../components/Stack';
import Check from '@mui/icons-material/Check';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import { Panel, StatusChip, Mono, Empty, Grid, Field, FieldGrid } from '../../components/common';
import { LOGISTICS_PARTNERS, partnerById, userById, supplierById } from '../../data/masters';
import { MILESTONE_LABEL, milestonesFor, isDelayed } from '../../store/flow';
import { fmtDate, fmtDateTime, daysBetween, toInputDate, fromInputDate, DAY } from '../../utils/format';
import { shipmentUpdate, toast } from '../../store';
import { useCaseActions, ActionBox, WaitingNote } from './shared';

export function EtaCard({ c, compact }) {
  const sh = c.shipment;
  const needBy = c.po.needByDate;
  const delivered = sh.milestone === 'DELIVERED';
  const delayed = isDelayed(c);
  const left = sh.eta ? daysBetween(Date.now(), sh.eta) : null;
  const buffer = sh.eta ? daysBetween(sh.eta, needBy) : null;
  return (
    <Paper
      variant="outlined"
      sx={{ p: compact ? 1.5 : 2, borderColor: delayed ? 'error.main' : delivered ? 'success.main' : '#111', borderWidth: compact ? 1 : 1.5, mb: compact ? 0 : 2 }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="subtitle2">{delivered ? 'Delivered' : 'Estimated arrival'}</Typography>
          <Typography sx={{ fontSize: compact ? 18 : 26, fontWeight: 700, letterSpacing: -0.5, color: delayed ? 'error.main' : 'text.primary', mt: 0.25 }}>
            {delivered ? fmtDate(sh.deliveredAt) : !sh.eta ? 'Awaiting booking' : left > 0 ? `Arriving in ${left} day${left === 1 ? '' : 's'}` : left === 0 ? 'Arriving today' : `${-left} days overdue`}
          </Typography>
          {sh.eta && !delivered && (
            <Typography variant="caption" component="div">
              ETA {fmtDate(sh.eta)} · need-by {fmtDate(needBy)}
            </Typography>
          )}
        </Box>
        <Stack alignItems="flex-end" spacing={0.5}>
          {sh.eta && <StatusChip label={delivered ? 'Delivered' : delayed ? 'Delayed' : 'On time'} />}
          {sh.eta && !delivered && (
            <Typography variant="caption" sx={{ color: delayed ? 'error.main' : 'text.secondary' }}>
              {buffer >= 0 ? `${buffer} days buffer` : `${-buffer} days past need-by`}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function Milestones({ c }) {
  const sh = c.shipment;
  const ms = milestonesFor(sh.mode);
  const idx = ms.indexOf(sh.milestone);
  return (
    <Stack direction="row" alignItems="flex-start" sx={{ overflowX: 'auto', py: 1 }}>
      {ms.map((m, i) => {
        const done = i <= idx;
        const ev = [...sh.events].reverse().find((e) => e.milestone === m);
        return (
          <Stack key={m} direction="row" alignItems="flex-start" sx={{ flex: 1, minWidth: 100 }}>
            <Stack alignItems="center" sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  bgcolor: done ? '#111' : '#fff',
                  border: '1.5px solid',
                  borderColor: done ? '#111' : 'grey.300',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: i === idx && m !== 'DELIVERED' ? '0 0 0 4px rgba(17,17,17,.12)' : 'none',
                }}
              >
                {done ? <Check sx={{ fontSize: 14 }} /> : null}
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: i === idx ? 700 : 500, mt: 0.5, color: done ? 'text.primary' : 'grey.500', textAlign: 'center' }}>{MILESTONE_LABEL[m]}</Typography>
              <Typography variant="caption" sx={{ fontSize: 10, textAlign: 'center' }}>
                {ev ? fmtDateTime(ev.at) : ''}
              </Typography>
            </Stack>
            {i < ms.length - 1 && <Box sx={{ flex: 1, height: 1.5, mt: 1.5, bgcolor: i < idx ? '#111' : 'grey.300', minWidth: 20 }} />}
          </Stack>
        );
      })}
    </Stack>
  );
}

function DispatchForm({ c, onDispatch }) {
  const imp = c.purchaseType === 'IMPORT';
  const sup = supplierById(c.po.supplierId);
  const [f, setF] = useState({ partnerId: 'lp-swift', mode: imp ? 'SEA' : 'ROAD', origin: imp ? 'Hamburg, DE' : `${sup.city} works`, invoiceNo: `INV/${sup.code.slice(4)}/2026/0${Math.floor(Math.random() * 900 + 100)}` });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <ActionBox
      title={imp ? 'Ship goods and submit shipping documents' : 'Dispatch material'}
      subtitle={imp ? 'Upload commercial invoice, bill of lading and packing list for payment under LC.' : 'Upload the tax invoice and packing list. The logistics partner is notified to book the pickup.'}
      actions={
        <Button variant="contained" startIcon={<LocalShippingOutlined />} onClick={() => onDispatch(f)}>
          Mark dispatched
        </Button>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <TextField label="Invoice no." value={f.invoiceNo} onChange={set('invoiceNo')} />
        <TextField select label="Logistics partner" value={f.partnerId} onChange={set('partnerId')}>
          {LOGISTICS_PARTNERS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} {p.isThirdParty ? '(3rd party)' : '(in-house)'}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Mode" value={f.mode} onChange={set('mode')} disabled={imp}>
          {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER'].map((m) => (
            <MenuItem key={m} value={m}>
              {m[0] + m.slice(1).toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Origin" value={f.origin} onChange={set('origin')} />
      </Box>
    </ActionBox>
  );
}

function LogisticsActions({ c, user }) {
  const dispatch = useDispatch();
  const sh = c.shipment;
  const ms = milestonesFor(sh.mode);
  const next = ms[ms.indexOf(sh.milestone) + 1];
  const [booking, setBooking] = useState({ trackingNo: sh.mode === 'SEA' ? 'MAEU-4471920' : 'SC-778213', transitDays: sh.mode === 'SEA' ? 24 : 6 });
  const [loc, setLoc] = useState('');
  const [eta, setEta] = useState(toInputDate((sh.eta || Date.now()) + 7 * DAY));
  const [reason, setReason] = useState('Road closure on NH-48; rerouted via Udaipur');
  const upd = (p, msg) => {
    dispatch(shipmentUpdate({ caseId: c.id, userId: user.id, ...p }));
    dispatch(toast(msg));
  };

  if (sh.milestone === 'DISPATCHED') {
    return (
      <ActionBox
        title="Book shipment"
        subtitle={`Enter the ${sh.mode === 'SEA' ? 'bill of lading (BL)' : sh.mode === 'AIR' ? 'airway bill (AWB)' : 'lorry receipt (LR)'} number and transit time. ETA is calculated automatically${sh.customsDays ? ` (+${sh.customsDays} days customs)` : ''}.`}
        actions={
          <Button variant="contained" onClick={() => upd({ booking: { trackingNo: booking.trackingNo, transitDays: Number(booking.transitDays) } }, 'Shipment booked – ETA shared with Westfield')}>
            Confirm booking
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
          <TextField label={sh.mode === 'SEA' ? 'BL number' : sh.mode === 'AIR' ? 'AWB number' : 'LR number'} value={booking.trackingNo} onChange={(e) => setBooking({ ...booking, trackingNo: e.target.value })} />
          <TextField type="number" label="Transit days" value={booking.transitDays} onChange={(e) => setBooking({ ...booking, transitDays: e.target.value })} />
          <TextField label="Calculated ETA" disabled value={fmtDate(sh.dispatchedAt + (Number(booking.transitDays || 0) + (sh.customsDays || 0)) * DAY)} />
        </Box>
      </ActionBox>
    );
  }
  if (sh.milestone === 'DELIVERED') return null;
  return (
    <Grid cols="1fr 1fr">
      <ActionBox
        title={`Update milestone → ${MILESTONE_LABEL[next]}`}
        actions={
          <Button variant="contained" onClick={() => upd({ milestone: next, location: loc }, next === 'DELIVERED' ? 'Delivered – Stores notified to prepare MRN' : `Milestone updated: ${MILESTONE_LABEL[next]}`)}>
            Mark {MILESTONE_LABEL[next].toLowerCase()}
          </Button>
        }
      >
        <TextField label="Current location (optional)" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Ahmedabad hub" />
      </ActionBox>
      <ActionBox
        title="Revise ETA"
        actions={
          <Button variant="outlined" startIcon={<ScheduleOutlined />} onClick={() => upd({ revisedEta: fromInputDate(eta), note: reason }, 'ETA revised – Buyer and Stores notified')}>
            Update ETA
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 1.5 }}>
          <TextField type="date" label="New ETA" value={eta} onChange={(e) => setEta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" onClick={() => setEta(toInputDate(c.po.needByDate + 5 * DAY))}>
            Push past need-by
          </Button>
          <Button size="small" onClick={() => setEta(toInputDate(Date.now() + 4 * DAY))}>
            Back on schedule
          </Button>
        </Stack>
      </ActionBox>
    </Grid>
  );
}

export default function LogisticsTab({ c }) {
  const { user, isMine, act } = useCaseActions(c);
  if (!c.po) return <Panel><Empty title="No shipment yet" /></Panel>;

  if (!c.shipment) {
    return (
      <Box>
        {isMine('DISPATCH') ? (
          <DispatchForm c={c} onDispatch={(p) => act('DISPATCH', p, 'Dispatched – logistics partner notified')} />
        ) : (
          <>
            <WaitingNote c={c} keys={['DISPATCH']} />
            <Panel>
              <Empty title="Not dispatched yet" hint={c.purchaseType === 'IMPORT' ? 'Import: LC opens first, then the supplier ships.' : c.payments.some((p) => p.type === 'ADVANCE') ? 'Supplier dispatches after the advance is paid.' : 'Supplier dispatches after accepting the PO.'} />
            </Panel>
          </>
        )}
      </Box>
    );
  }
  const sh = c.shipment;
  const delayed = isDelayed(c);
  return (
    <Box>
      {delayed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          ETA {fmtDate(sh.eta)} is later than the need-by date {fmtDate(c.po.needByDate)}. Buyer and Stores have been notified.
        </Alert>
      )}
      {isMine('SHIP_TRACK') && <LogisticsActions c={c} user={user} />}
      {!isMine('SHIP_TRACK') && <WaitingNote c={c} keys={['SHIP_TRACK']} />}
      <Grid cols="minmax(0,1fr) 360px">
        <Box>
          <Panel title={`Shipment ${sh.shipmentNo}`} subtitle={`${partnerById(sh.partnerId)?.name} · ${sh.mode.toLowerCase()}`}>
            <Milestones c={c} />
            <FieldGrid cols={4} sx={{ mt: 2 }}>
              <Field label={sh.mode === 'SEA' ? 'BL no.' : sh.mode === 'AIR' ? 'AWB no.' : 'LR no.'}>
                <Mono>{sh.trackingNo || '—'}</Mono>
              </Field>
              <Field label="Transit days" value={sh.transitDays ? `${sh.transitDays}${sh.customsDays ? ` + ${sh.customsDays} customs` : ''}` : '—'} />
              <Field label="From" value={sh.origin} />
              <Field label="To" value={sh.destination} />
              <Field label="Dispatched" value={fmtDateTime(sh.dispatchedAt)} />
              <Field label="Current status" value={MILESTONE_LABEL[sh.milestone]} />
              <Field label="Invoice" value={c.invoice?.invoiceNo} />
              <Field label="Partner type" value={partnerById(sh.partnerId)?.isThirdParty ? 'Third party' : 'In-house'} />
            </FieldGrid>
          </Panel>
          <Panel title="Tracking history" pad={false}>
            {[...sh.events].reverse().map((e, i) => (
              <Stack key={i} direction="row" spacing={1.5} sx={{ px: 2, py: 1.1, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: 4, bgcolor: i === 0 ? '#111' : 'grey.400', mt: 0.6 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                    {e.revisedEta ? `ETA revised to ${fmtDate(e.revisedEta)}` : MILESTONE_LABEL[e.milestone]}
                    {e.location ? ` · ${e.location}` : ''}
                  </Typography>
                  {e.note && <Typography variant="caption" component="div">{e.note}</Typography>}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" component="div">
                    {fmtDateTime(e.at)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10 }}>
                    {userById(e.by)?.name}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Panel>
        </Box>
        <Box>
          <EtaCard c={c} />
          <Panel title="Need-by vs ETA">
            <Stack spacing={1}>
              {[
                ['PO issued', c.po.issuedAt],
                ['Dispatched', sh.dispatchedAt],
                ['ETA', sh.eta],
                ['Need-by', c.po.needByDate],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {k}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: k === 'ETA' && delayed ? 'error.main' : 'text.primary' }}>
                    {fmtDate(v)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Panel>
        </Box>
      </Grid>
    </Box>
  );
}
