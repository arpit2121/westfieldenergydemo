import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { Panel, Field, FieldGrid, FileChip, Grid, UserChip, Mono } from '../../components/common';
import { itemById, customerById, USERS, MGMT_THRESHOLD, userById } from '../../data/masters';
import { fmtDate, fmtINR, fmtLakh, fmtNum } from '../../utils/format';
import { useCaseActions, ApproveBox, ActionBox, Stamps, WaitingNote } from './shared';

const PURPOSE = { OWN_USE: 'Own use', FOR_CUSTOMER: 'On behalf of customer', FOR_THIRD_PARTY: 'For third party' };

export default function PrTab({ c }) {
  const { isMine, act, back } = useCaseActions(c);
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState('u-neha');
  const overThreshold = c.estimatedValue > MGMT_THRESHOLD;

  return (
    <Grid cols="minmax(0,1fr) 340px">
      <Box>
        {c.sentBack && !c.done.length && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Sent back by <b>{userById(c.sentBack.by)?.name}</b>: “{c.sentBack.comment}”
          </Alert>
        )}

        {isMine('PR_CREATE') && (
          <ActionBox
            title={c.sentBack ? 'Update and resubmit the requisition' : 'Submit the requisition'}
            subtitle="Edit the lines or specification, then submit for engineering review."
            actions={
              <Button variant="contained" startIcon={<EditOutlined />} onClick={() => navigate(`/prs/${c.id}/edit`)}>
                Edit & resubmit
              </Button>
            }
          />
        )}
        {isMine('PR_REVIEW') && (
          <ApproveBox
            title="Engineering review"
            subtitle="Check specification, quantity and internal part number. Send back to the engineer if anything needs fixing."
            approveLabel="Mark reviewed"
            onApprove={(comment) => act('PR_REVIEW', { comment }, 'PR reviewed – sent to Engineering Head')}
            onSendBack={(comment) => back('PR_CREATE', comment)}
          />
        )}
        {isMine('PR_ENG_APPROVE') && (
          <ApproveBox
            title="Engineering approval"
            subtitle={overThreshold ? `Value ${fmtLakh(c.estimatedValue)} is above ₹10 lakh – after your approval it goes to Management.` : 'After approval the PR goes to C&P for buyer assignment.'}
            onApprove={(comment) => act('PR_ENG_APPROVE', { comment }, overThreshold ? 'Approved – routed to Management' : 'Approved – sent to C&P')}
            onSendBack={(comment) => back('PR_CREATE', comment)}
          />
        )}
        {isMine('PR_MGMT_APPROVE') && (
          <ApproveBox
            title="Management approval"
            subtitle={`Routed to you because the estimate (${fmtLakh(c.estimatedValue)}) exceeds the ₹10 lakh threshold.`}
            onApprove={(comment) => act('PR_MGMT_APPROVE', { comment }, 'PR approved – sent to C&P Lead')}
            onSendBack={(comment) => back('PR_CREATE', comment)}
          />
        )}
        {isMine('PR_ASSIGN') && (
          <ActionBox
            title="Assign a buyer"
            subtitle="The buyer will run sourcing (RFQ / RFX), evaluation and the purchase order."
            actions={
              <Button variant="contained" onClick={() => act('PR_ASSIGN', { buyerId: buyer }, `Assigned to ${userById(buyer).name}`)}>
                Assign
              </Button>
            }
          >
            <TextField select label="Buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} sx={{ maxWidth: 320 }}>
              {USERS.filter((u) => u.role === 'BUYER' || u.role === 'CP_LEAD').map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} – {u.designation}
                </MenuItem>
              ))}
            </TextField>
          </ActionBox>
        )}
        <WaitingNote c={c} keys={['PR_REVIEW', 'PR_ENG_APPROVE', 'PR_MGMT_APPROVE', 'PR_ASSIGN']} />

        <Panel title="Purchase requisition" subtitle={c.prNo || 'Draft'}>
          <FieldGrid cols={4}>
            <Field label="PR number">
              <Mono>{c.prNo || 'Draft'}</Mono>
            </Field>
            <Field label="Department" value={c.department} />
            <Field label="Purpose" value={PURPOSE[c.purpose]} />
            <Field label="Customer / third party" value={customerById(c.customerId)?.name || '—'} />
            <Field label="Estimated value" value={fmtINR(c.estimatedValue)} />
            <Field label="Need-by date" value={fmtDate(c.needByDate)} />
            <Field label="Raised on" value={fmtDate(c.createdAt)} />
            <Field label="Management approval" value={overThreshold ? 'Required (> ₹10 L)' : 'Not required'} />
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <Field label="Delivery location" value={c.deliveryLocation} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Field label="Justification" value={c.justification} />
          </Box>
        </Panel>

        <Panel title="Line items" pad={false}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Internal part no.</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>UoM</TableCell>
                <TableCell align="right">Est. unit price</TableCell>
                <TableCell align="right">Est. total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.lines.map((l) => {
                const it = itemById(l.itemId);
                return (
                  <TableRow key={l.lineNo}>
                    <TableCell>{l.lineNo}</TableCell>
                    <TableCell>
                      <Mono>{it.internalPartNo}</Mono>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'normal' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{it.name}</Typography>
                      <Typography variant="caption">{l.specNotes || it.description}</Typography>
                    </TableCell>
                    <TableCell align="right">{fmtNum(l.qty)}</TableCell>
                    <TableCell>{it.uom}</TableCell>
                    <TableCell align="right">{fmtINR(l.estUnitPrice)}</TableCell>
                    <TableCell align="right">{fmtINR(l.qty * l.estUnitPrice)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={6} align="right" sx={{ fontWeight: 600 }}>
                  Total estimate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtINR(c.estimatedValue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Approvals">
          <Stamps c={c} keys={['PR_CREATE', 'PR_REVIEW', 'PR_ENG_APPROVE', 'PR_MGMT_APPROVE', 'PR_ASSIGN']} />
          {!c.approvals.length && <Typography variant="caption">Not submitted yet.</Typography>}
        </Panel>
      </Box>

      <Box>
        <Panel title="Requester">
          <UserChip userId={c.requesterId} />
        </Panel>
        <Panel title="Assigned buyer">{c.buyerId ? <UserChip userId={c.buyerId} /> : <Typography variant="caption">Not assigned yet</Typography>}</Panel>
        <Panel title="Attachments">
          {c.attachments.length ? c.attachments.map((a) => <FileChip key={a} name={a} />) : <Typography variant="caption">No files</Typography>}
        </Panel>
      </Box>
    </Grid>
  );
}
