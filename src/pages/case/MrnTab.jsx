import { useState } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert } from '@mui/material';
import { Panel, StatusChip, Mono, Empty, FieldGrid, Field } from '../../components/common';
import { itemById } from '../../data/masters';
import { fmtDate } from '../../utils/format';
import { useCaseActions, ActionBox, ApproveBox, Stamps, WaitingNote } from './shared';

function PrepareMrn({ c, onSubmit }) {
  const [rows, setRows] = useState(c.po.lines.map((l) => ({ receivedQty: l.qty, acceptedQty: l.qty, rejectedQty: 0, remarks: 'Visual + QC inspection OK' })));
  const [store, setStore] = useState('Main Store – Bay 4');
  const upd = (i, k, v) =>
    setRows(
      rows.map((r, j) => {
        if (j !== i) return r;
        const n = { ...r, [k]: k === 'remarks' ? v : Number(v) };
        if (k === 'acceptedQty') n.rejectedQty = Math.max(0, n.receivedQty - n.acceptedQty);
        if (k === 'receivedQty') n.acceptedQty = Math.min(n.acceptedQty, n.receivedQty);
        return n;
      }),
    );
  return (
    <ActionBox
      title="Prepare Material Receipt Note"
      subtitle={`Record what arrived against ${c.po.poNo}. Rejected quantity is flagged to the buyer.`}
      actions={
        <Button variant="contained" onClick={() => onSubmit({ lines: rows, storeLocation: store })}>
          Submit MRN for review
        </Button>
      }
    >
      <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
        <TableHead>
          <TableRow>
            <TableCell>Part no.</TableCell>
            <TableCell>Item</TableCell>
            <TableCell align="right">Ordered</TableCell>
            <TableCell sx={{ width: 100 }}>Received</TableCell>
            <TableCell sx={{ width: 100 }}>Accepted</TableCell>
            <TableCell align="right">Rejected</TableCell>
            <TableCell>Remarks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {c.po.lines.map((l, i) => (
            <TableRow key={l.lineNo}>
              <TableCell>
                <Mono>{itemById(l.itemId).internalPartNo}</Mono>
              </TableCell>
              <TableCell>{itemById(l.itemId).name}</TableCell>
              <TableCell align="right">{l.qty}</TableCell>
              <TableCell>
                <TextField type="number" value={rows[i].receivedQty} onChange={(e) => upd(i, 'receivedQty', e.target.value)} />
              </TableCell>
              <TableCell>
                <TextField type="number" value={rows[i].acceptedQty} onChange={(e) => upd(i, 'acceptedQty', e.target.value)} />
              </TableCell>
              <TableCell align="right" sx={{ color: rows[i].rejectedQty ? 'error.main' : undefined, fontWeight: 600 }}>
                {rows[i].rejectedQty}
              </TableCell>
              <TableCell sx={{ minWidth: 200 }}>
                <TextField value={rows[i].remarks} onChange={(e) => upd(i, 'remarks', e.target.value)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TextField label="Store location" value={store} onChange={(e) => setStore(e.target.value)} sx={{ maxWidth: 320 }} />
    </ActionBox>
  );
}

export default function MrnTab({ c }) {
  const { user, isMine, act, back, settings, step } = useCaseActions(c);
  const direct = step?.key === 'MRN_REVIEW' && user.role === 'STORES_APPROVER' && settings.storesDirectApprove;

  if (!c.shipment || c.shipment.milestone !== 'DELIVERED') {
    return (
      <Panel>
        <Empty title="MRN is raised once the material is delivered" hint={c.shipment ? `Shipment status: ${c.shipment.milestone.replace(/_/g, ' ').toLowerCase()}` : 'Not shipped yet'} />
      </Panel>
    );
  }
  return (
    <Box>
      {isMine('MRN_PREPARE') && <PrepareMrn c={c} onSubmit={(p) => act('MRN_PREPARE', p, 'MRN prepared – sent to Stores Supervisor')} />}
      {isMine('MRN_REVIEW') && !direct && (
        <ApproveBox
          title="Review MRN (quality check)"
          approveLabel="Mark reviewed"
          onApprove={(comment) => act('MRN_REVIEW', { comment }, 'MRN reviewed – sent to Stores Manager')}
          onSendBack={(comment) => back('MRN_PREPARE', comment)}
        />
      )}
      {direct && (
        <ApproveBox
          title="Approve MRN directly"
          subtitle="Workflow rule allows the Stores Manager to approve without the review step."
          approveLabel="Approve directly"
          onApprove={(comment) => act('MRN_REVIEW', { comment }, 'MRN approved directly – Finance notified')}
        />
      )}
      {isMine('MRN_APPROVE') && step?.key === 'MRN_APPROVE' && (
        <ApproveBox
          title="Approve MRN"
          approveLabel="Approve MRN"
          onApprove={(comment) => act('MRN_APPROVE', { comment }, 'MRN approved – stock updated, Finance notified')}
          onSendBack={(comment) => back('MRN_PREPARE', comment)}
        />
      )}
      {!direct && <WaitingNote c={c} keys={['MRN_PREPARE', 'MRN_REVIEW', 'MRN_APPROVE']} />}
      {step?.key === 'MRN_REVIEW' && user.role === 'STORES_APPROVER' && !settings.storesDirectApprove && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Direct approval is switched off. Turn it on under Workflow Rules to approve without the supervisor’s review.
        </Alert>
      )}

      {c.mrn ? (
        <Panel title={`Material Receipt Note ${c.mrn.mrnNo}`} subtitle={`Against ${c.po.poNo} · ${c.shipment.shipmentNo}`} actions={<StatusChip label={c.mrn.status === 'APPROVED' ? 'Approved' : c.mrn.status === 'REVIEWED' ? 'Reviewed' : 'Prepared'} />}>
          <FieldGrid cols={4} sx={{ mb: 2 }}>
            <Field label="Received on" value={fmtDate(c.shipment.deliveredAt)} />
            <Field label="Store location" value={c.mrn.storeLocation} />
            <Field label="Invoice" value={c.invoice?.invoiceNo} />
            <Field label="Transport doc" value={c.shipment.trackingNo} />
          </FieldGrid>
          <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
            <TableHead>
              <TableRow>
                <TableCell>Part no.</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Ordered</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Accepted</TableCell>
                <TableCell align="right">Rejected</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.mrn.lines.map((l) => (
                <TableRow key={l.lineNo}>
                  <TableCell>
                    <Mono>{itemById(l.itemId).internalPartNo}</Mono>
                  </TableCell>
                  <TableCell>{itemById(l.itemId).name}</TableCell>
                  <TableCell align="right">{l.orderedQty}</TableCell>
                  <TableCell align="right">{l.receivedQty}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {l.acceptedQty}
                  </TableCell>
                  <TableCell align="right" sx={{ color: l.rejectedQty ? 'error.main' : undefined }}>
                    {l.rejectedQty}
                  </TableCell>
                  <TableCell>{l.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Prepared · Reviewed · Approved
          </Typography>
          <Stamps c={c} keys={['MRN_PREPARE', 'MRN_REVIEW', 'MRN_APPROVE']} />
        </Panel>
      ) : (
        !isMine('MRN_PREPARE') && (
          <Panel>
            <Empty title="Delivered – MRN not prepared yet" />
          </Panel>
        )
      )}
    </Box>
  );
}
