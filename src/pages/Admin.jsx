import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Button, MenuItem, Paper, Switch, TextField, Typography, Alert } from '@mui/material';
import Stack from '../components/Stack';
import { PageHeader, Panel, Mono, StatusChip } from '../components/common';
import DataTable from '../components/DataTable';
import { SUPPLIERS, ITEMS, WORKFLOW_CONFIG, ROLES, userById, LOGISTICS_PARTNERS } from '../data/masters';
import { LIVE_PR_TEMPLATE } from '../data/seed';
import { createPr, fastForwardCase, resetDemo, selectCases, selectSettings, setSetting, toast } from '../store';
import { getSteps, currentStep, statusOf } from '../store/flow';
import { fmtDateTime, fmtLakh, DAY } from '../utils/format';

export function Suppliers() {
  const cases = useSelector(selectCases);
  return (
    <Box>
      <PageHeader title="Suppliers" subtitle="Approved vendor list with sub-vendors (OEMs) declared on bids" />
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <DataTable
          rows={SUPPLIERS}
          columns={[
            { key: 'code', label: 'Code', render: (s) => <Mono>{s.code}</Mono> },
            { key: 'name', label: 'Supplier', render: (s) => <b>{s.name}</b> },
            { key: 'type', label: 'Type', render: (s) => (s.type === 'IMPORT' ? 'Import' : 'Local') },
            { key: 'city', label: 'Location', render: (s) => `${s.city}, ${s.country}` },
            { key: 'cur', label: 'Currency', render: (s) => s.currency },
            { key: 'gstin', label: 'GSTIN', render: (s) => <Mono>{s.gstin || '—'}</Mono> },
            { key: 'email', label: 'Contact' },
            { key: 'rating', label: 'Rating', align: 'right', render: (s) => `${s.rating} / 5` },
            { key: 'po', label: 'POs', align: 'right', render: (s) => cases.filter((c) => c.po?.poNo && c.po.supplierId === s.id).length },
          ]}
        />
      </Paper>
      <Panel title="Logistics partners" pad={false}>
        <DataTable
          searchable={false}
          rows={LOGISTICS_PARTNERS}
          columns={[
            { key: 'name', label: 'Partner', render: (p) => <b>{p.name}</b> },
            { key: 't', label: 'Type', render: (p) => (p.isThirdParty ? 'Third party' : 'In-house') },
            { key: 'email', label: 'Contact' },
          ]}
        />
      </Panel>
    </Box>
  );
}

export function Items() {
  return (
    <Box>
      <PageHeader title="Item Master" subtitle="Internal part numbers carried on PR, RFQ, PO and MRN" />
      <Paper variant="outlined">
        <DataTable
          rows={ITEMS}
          columns={[
            { key: 'internalPartNo', label: 'Internal part no.', render: (i) => <Mono sx={{ fontWeight: 600 }}>{i.internalPartNo}</Mono> },
            { key: 'name', label: 'Description', render: (i) => <b>{i.name}</b> },
            { key: 'category', label: 'Category' },
            { key: 'uom', label: 'UoM' },
            { key: 'hsnCode', label: 'HSN' },
            { key: 'description', label: 'Specification', render: (i) => <Typography sx={{ fontSize: 12, maxWidth: 340 }} noWrap>{i.description}</Typography> },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Workflow() {
  const settings = useSelector(selectSettings);
  const dispatch = useDispatch();
  return (
    <Box>
      <PageHeader title="Workflow Rules" subtitle="Approval chain per document. Changing an approver or a threshold is a configuration change, not code." />
      <Panel title="Stores – direct approval" subtitle="Allow the Stores Manager to approve an MRN without the supervisor's review">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            checked={settings.storesDirectApprove}
            onChange={(e) => {
              dispatch(setSetting({ storesDirectApprove: e.target.checked }));
              dispatch(toast(e.target.checked ? 'Stores Manager can now approve MRNs directly' : 'MRN review step is mandatory again'));
            }}
          />
          <Typography variant="body2">{settings.storesDirectApprove ? 'Enabled – review step can be skipped' : 'Disabled – Prepare → Review → Approve'}</Typography>
        </Stack>
      </Panel>
      <Paper variant="outlined">
        <DataTable
          rows={WORKFLOW_CONFIG.map((w, i) => ({ ...w, id: i }))}
          filters={[
            { value: 'all', label: 'All' },
            ...['PR', 'TBE', 'QCS', 'PO', 'PAYMENT', 'MRN'].map((d) => ({ value: d, label: d, test: (w) => w.docType === d })),
          ]}
          columns={[
            { key: 'docType', label: 'Document', render: (w) => <b>{w.docType}</b> },
            { key: 'step', label: 'Step', align: 'right' },
            { key: 'name', label: 'Stage' },
            { key: 'role', label: 'Role', render: (w) => ROLES[w.role] },
            { key: 'min', label: 'Applies from', render: (w) => (w.minAmount ? `≥ ${fmtLakh(w.minAmount)}` : 'All values') },
            { key: 'skip', label: 'Can skip', render: (w) => (w.canSkip ? (settings.storesDirectApprove ? <StatusChip label="Skippable" tone="warning" /> : 'Configurable') : '—') },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Activity() {
  const audit = useSelector((s) => s.p2p.audit);
  const navigate = useNavigate();
  return (
    <Box>
      <PageHeader title="Audit Trail" subtitle="Every status change across all documents" />
      <Paper variant="outlined">
        <DataTable
          rows={audit}
          onRowClick={(a) => navigate(`/case/${a.caseId}?tab=timeline`)}
          columns={[
            { key: 'at', label: 'When', render: (a) => fmtDateTime(a.at) },
            { key: 'docNo', label: 'Document', render: (a) => <Mono sx={{ fontWeight: 600 }}>{a.docNo}</Mono> },
            { key: 'action', label: 'Event', render: (a) => <Mono>{a.action}</Mono> },
            { key: 'message', label: 'Details', render: (a) => <Typography sx={{ fontSize: 12, maxWidth: 420 }} noWrap>{a.message}</Typography> },
            { key: 'user', label: 'By', render: (a) => userById(a.userId)?.name, search: (a) => userById(a.userId)?.name },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Outbox() {
  const outbox = useSelector((s) => s.p2p.outbox);
  return (
    <Box>
      <PageHeader title="Email Outbox" subtitle="Notifications that would be emailed in production (mocked in the demo)" />
      <Paper variant="outlined">
        <DataTable
          rows={outbox}
          columns={[
            { key: 'at', label: 'Sent', render: (m) => fmtDateTime(m.at) },
            { key: 'to', label: 'To' },
            { key: 'subject', label: 'Subject', render: (m) => <b>{m.subject}</b> },
            { key: 'from', label: 'From' },
            { key: 'st', label: 'Status', render: () => <StatusChip label="Delivered" tone="success" /> },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function DemoControls() {
  const cases = useSelector(selectCases);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = cases.filter((c) => !c.closed);
  const [caseId, setCaseId] = useState(open[0]?.id || '');
  const c = cases.find((x) => x.id === caseId);
  const steps = c ? getSteps(c).filter((s) => !c.done.includes(s.key)) : [];
  const [until, setUntil] = useState('');

  const newLive = (untilKey) => {
    const a = createPr({ payload: { ...LIVE_PR_TEMPLATE, needByDate: Date.now() + 56 * DAY }, userId: 'u-ravi', submit: true });
    dispatch(a);
    if (untilKey) dispatch(fastForwardCase({ caseId: a.payload.id, untilKey }));
    dispatch(toast('Demo transaction created'));
    navigate(`/case/${a.payload.id}`);
  };

  return (
    <Box sx={{ maxWidth: 900 }}>
      <PageHeader title="Demo Controls" subtitle="Presenter tools – jump a transaction forward if time is short, or start clean" />
      <Panel title="Start a fresh bushing-set transaction" subtitle="Creates a new PR for the 132 kV Transformer Bushing Set, raised by Ravi Kumar">
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Button variant="outlined" onClick={() => newLive(null)}>
            PR submitted
          </Button>
          <Button variant="outlined" onClick={() => newLive('RFQ_PUBLISH')}>
            PR approved
          </Button>
          <Button variant="outlined" onClick={() => newLive('CBE_RUN')}>
            TBE approved
          </Button>
          <Button variant="outlined" onClick={() => newLive('PO_DRAFT')}>
            QCS approved
          </Button>
          <Button variant="outlined" onClick={() => newLive('PO_ACCEPT')}>
            PO issued
          </Button>
          <Button variant="outlined" onClick={() => newLive('SHIP_TRACK')}>
            Dispatched
          </Button>
          <Button variant="outlined" onClick={() => newLive('MRN_PREPARE')}>
            Delivered
          </Button>
        </Stack>
      </Panel>
      <Panel title="Fast-forward an open transaction" subtitle="Runs each step with default values as the right user, stamping the audit trail">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' }, gap: 1.5, alignItems: 'center' }}>
          <TextField select label="Transaction" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {open.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.prNo || 'Draft'} · {x.title.slice(0, 40)} · {statusOf(x)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Stop when this step is pending" value={until} onChange={(e) => setUntil(e.target.value)}>
            {steps.slice(1).map((s) => (
              <MenuItem key={s.key} value={s.key}>
                {s.label} ({ROLES[s.role]})
              </MenuItem>
            ))}
            <MenuItem value="__close">Run to closure</MenuItem>
          </TextField>
          <Button
            variant="contained"
            disabled={!c || !until || !currentStep(c)}
            onClick={() => {
              dispatch(fastForwardCase({ caseId, untilKey: until === '__close' ? null : until }));
              dispatch(toast('Transaction advanced'));
              setUntil('');
            }}
          >
            Advance
          </Button>
        </Box>
      </Panel>
      <Panel title="Reset">
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Restores the original sample data. Everything created in this browser is removed.
        </Alert>
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            dispatch(resetDemo());
            dispatch(toast('Demo data reset'));
            navigate('/');
          }}
        >
          Reset demo data
        </Button>
      </Panel>
    </Box>
  );
}
