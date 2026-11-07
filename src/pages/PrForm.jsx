import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, IconButton, MenuItem, Radio, RadioGroup, FormControlLabel, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Stack from '../components/Stack';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import { PageHeader, Panel, FileChip, Grid, Mono } from '../components/common';
import { ITEMS, CUSTOMERS, MGMT_THRESHOLD, itemById, userById } from '../data/masters';
import { LIVE_PR_TEMPLATE } from '../data/seed';
import { advance, createPr, selectUser, toast, updateDraft } from '../store';
import { fmtINR, fmtLakh, toInputDate, fromInputDate, DAY } from '../utils/format';

export default function PrForm() {
  const { id } = useParams();
  const existing = useSelector((s) => (id ? s.p2p.cases[id] : null));
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const src = existing || { ...LIVE_PR_TEMPLATE, needByDate: Date.now() + 56 * DAY };
  const [f, setF] = useState({
    title: src.title,
    purpose: src.purpose,
    customerId: src.customerId || '',
    deliveryLocation: src.deliveryLocation,
    needByDate: toInputDate(src.needByDate),
    justification: src.justification,
    lines: src.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, estUnitPrice: l.estUnitPrice, specNotes: l.specNotes || '' })),
    attachments: src.attachments || [],
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setLine = (i, k, v) => setF({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: k === 'qty' || k === 'estUnitPrice' ? Number(v) : v } : l)) });
  const total = f.lines.reduce((a, l) => a + l.qty * l.estUnitPrice, 0);
  const payload = () => ({ ...f, needByDate: fromInputDate(f.needByDate), customerId: f.purpose === 'OWN_USE' ? null : f.customerId || null });
  const valid = f.title.trim() && f.lines.length && f.lines.every((l) => l.itemId && l.qty > 0);

  const submit = (asDraft) => {
    if (existing) {
      if (asDraft) dispatch(updateDraft({ caseId: existing.id, payload: payload() }));
      else dispatch(advance({ caseId: existing.id, key: 'PR_CREATE', payload: payload(), userId: user.id }));
      dispatch(toast(asDraft ? 'Draft saved' : `${existing.prNo || 'PR'} resubmitted for review`));
      navigate(`/case/${existing.id}?tab=pr`);
      return;
    }
    const action = createPr({ payload: payload(), userId: user.id, submit: !asDraft });
    dispatch(action);
    dispatch(toast(asDraft ? 'Draft saved' : 'Requisition submitted – Lead Engineer notified'));
    navigate(`/case/${action.payload.id}?tab=pr`);
  };

  return (
    <Box>
      <PageHeader
        overline={existing?.prNo || 'New'}
        title={existing ? 'Edit purchase requisition' : 'New purchase requisition'}
        subtitle={`Requested by ${userById(existing?.requesterId || user.id).name} · Engineering`}
        actions={
          <>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button variant="outlined" disabled={!valid} onClick={() => submit(true)}>
              Save draft
            </Button>
            <Button variant="contained" startIcon={<SendOutlined />} disabled={!valid} onClick={() => submit(false)}>
              {existing?.sentBack ? 'Resubmit' : 'Submit for review'}
            </Button>
          </>
        }
      />
      {existing?.sentBack && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Sent back by {userById(existing.sentBack.by).name}: “{existing.sentBack.comment}”
        </Alert>
      )}
      <Grid cols="minmax(0,1fr) 320px">
        <Box>
          <Panel title="General">
            <Stack spacing={1.75}>
              <TextField label="Title" value={f.title} onChange={set('title')} />
              <Box>
                <Typography variant="subtitle2">Purpose</Typography>
                <RadioGroup row value={f.purpose} onChange={set('purpose')}>
                  <FormControlLabel value="OWN_USE" control={<Radio />} label="Own use" />
                  <FormControlLabel value="FOR_CUSTOMER" control={<Radio />} label="On behalf of customer" />
                  <FormControlLabel value="FOR_THIRD_PARTY" control={<Radio />} label="For third party" />
                </RadioGroup>
              </Box>
              {f.purpose !== 'OWN_USE' && (
                <TextField select label="Customer / third party" value={f.customerId} onChange={set('customerId')}>
                  {CUSTOMERS.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 180px' }, gap: 1.5 }}>
                <TextField label="Delivery location" value={f.deliveryLocation} onChange={set('deliveryLocation')} />
                <TextField type="date" label="Need-by date" value={f.needByDate} onChange={set('needByDate')} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
              <TextField label="Justification" value={f.justification} onChange={set('justification')} multiline minRows={2} />
            </Stack>
          </Panel>
          <Panel
            title="Line items"
            pad={false}
            actions={
              <Button size="small" startIcon={<AddOutlined />} onClick={() => setF({ ...f, lines: [...f.lines, { itemId: '', qty: 1, estUnitPrice: 0, specNotes: '' }] })}>
                Add line
              </Button>
            }
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell sx={{ minWidth: 260 }}>Item (internal part no.)</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Qty</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Est. unit price (₹)</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Specification notes</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {f.lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <TextField select value={l.itemId} onChange={(e) => setLine(i, 'itemId', e.target.value)}>
                        {ITEMS.map((it) => (
                          <MenuItem key={it.id} value={it.id}>
                            <Mono sx={{ mr: 1 }}>{it.internalPartNo}</Mono> {it.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" value={l.estUnitPrice} onChange={(e) => setLine(i, 'estUnitPrice', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField value={l.specNotes} placeholder={itemById(l.itemId)?.description} onChange={(e) => setLine(i, 'specNotes', e.target.value)} />
                    </TableCell>
                    <TableCell align="right">{fmtINR(l.qty * l.estUnitPrice)}</TableCell>
                    <TableCell>
                      <IconButton disabled={f.lines.length === 1} onClick={() => setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })}>
                        <DeleteOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </Box>
        <Box>
          <Panel title="Summary">
            <Typography variant="caption">Estimated value</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{fmtLakh(total)}</Typography>
            <Typography variant="caption" component="div">
              {fmtINR(total)} excl. GST
            </Typography>
            <Alert severity={total > MGMT_THRESHOLD ? 'warning' : 'success'} sx={{ mt: 1.5 }}>
              {total > MGMT_THRESHOLD ? 'Above ₹10 lakh – Management approval will be added to the route.' : 'Within Engineering approval limit.'}
            </Alert>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
              Approval route
            </Typography>
            {['Lead Engineer – review', 'Engineering Head – approve', ...(total > MGMT_THRESHOLD ? ['GM Projects – approve'] : []), 'C&P Manager – assign buyer'].map((s, i) => (
              <Typography key={s} sx={{ fontSize: 12, py: 0.25 }}>
                {i + 1}. {s}
              </Typography>
            ))}
          </Panel>
          <Panel title="Attachments">
            {f.attachments.map((a) => (
              <FileChip key={a} name={a} />
            ))}
            <Button size="small" variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => setF({ ...f, attachments: [...f.attachments, `Drawing_Rev${f.attachments.length}.pdf`] })}>
              Upload
            </Button>
          </Panel>
        </Box>
      </Grid>
    </Box>
  );
}
