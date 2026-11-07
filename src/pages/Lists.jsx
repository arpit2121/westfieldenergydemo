import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Paper, Typography, Box } from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { selectCases, selectSettings, selectUser } from '../store';
import { canAct, currentStep, statusOf, isDelayed, MILESTONE_LABEL, pendingSuppliers, quoteTotals } from '../store/flow';
import { ROLES, supplierById, userById, itemById, partnerById } from '../data/masters';
import { fmtLakh, fmtDate, daysBetween, fmtINR } from '../utils/format';
import { PageHeader, StatusChip, Mono, TierChip, RankChip } from '../components/common';
import DataTable from '../components/DataTable';
import { TaskTable } from './Dashboard';

const docNo = (c) => c.po?.poNo || c.po?.draftNo || c.rfq?.eventNo || c.prNo || 'Draft';
const pendingWith = (c) => {
  const s = currentStep(c);
  return s ? ROLES[s.role] : '—';
};

const useData = () => {
  const user = useSelector(selectUser);
  const cases = useSelector(selectCases);
  const settings = useSelector(selectSettings);
  const navigate = useNavigate();
  const isSupplier = user.role === 'SUPPLIER_USER';
  const visible = isSupplier ? cases.filter((c) => c.rfq?.invites.includes(user.supplierId)) : cases;
  return { user, cases: visible, settings, navigate, isSupplier };
};

export function Tasks() {
  const { user, cases, settings } = useData();
  const n = cases.filter((c) => canAct(user, c, settings)).length;
  return (
    <Box>
      <PageHeader title="My Tasks" subtitle={`${n} document${n === 1 ? '' : 's'} waiting for you as ${ROLES[user.role]}`} />
      <Paper variant="outlined">
        <TaskTable cases={cases} user={user} settings={settings} />
      </Paper>
    </Box>
  );
}

export function PrList() {
  const { user, cases, settings, navigate } = useData();
  const prs = cases.filter((c) => c.prNo || c.requesterId === user.id);
  return (
    <Box>
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Engineering requests, approvals and buyer assignment"
        actions={
          user.role === 'ENG_CREATOR' && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => navigate('/prs/new')}>
              New requisition
            </Button>
          )
        }
      />
      <Paper variant="outlined">
        <DataTable
          rows={prs}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=pr`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'mine', label: 'My action', test: (c) => canAct(user, c, settings) },
            { value: 'approval', label: 'In approval', test: (c) => ['PR_REVIEW', 'PR_ENG_APPROVE', 'PR_MGMT_APPROVE', 'PR_ASSIGN', 'PR_CREATE'].includes(currentStep(c)?.key) },
            { value: 'sourcing', label: 'Sourcing', test: (c) => c.done.includes('PR_ASSIGN') && !c.po },
            { value: 'ordered', label: 'Ordered', test: (c) => !!c.po && !c.closed },
            { value: 'closed', label: 'Closed', test: (c) => c.closed },
          ]}
          columns={[
            { key: 'prNo', label: 'PR no.', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.prNo || 'Draft'}</Mono> },
            { key: 'title', label: 'Title', render: (c) => <Typography sx={{ fontSize: 12, maxWidth: 300 }} noWrap>{c.title}</Typography> },
            { key: 'item', label: 'Part no.', render: (c) => <Mono>{itemById(c.lines[0]?.itemId)?.internalPartNo}</Mono>, search: (c) => itemById(c.lines[0]?.itemId)?.internalPartNo },
            { key: 'requester', label: 'Requester', render: (c) => userById(c.requesterId)?.name, search: (c) => userById(c.requesterId)?.name },
            { key: 'value', label: 'Estimate', align: 'right', render: (c) => fmtLakh(c.estimatedValue) },
            { key: 'need', label: 'Need by', render: (c) => fmtDate(c.needByDate) },
            { key: 'status', label: 'Status', render: (c) => <StatusChip label={statusOf(c)} />, search: statusOf },
            { key: 'pending', label: 'Pending with', render: pendingWith },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function RfqList() {
  const { cases, navigate } = useData();
  const rows = cases.filter((c) => c.rfq);
  return (
    <Box>
      <PageHeader title="Sourcing Events" subtitle="RFQ / RFI / RFP, invited suppliers and bid status" />
      <Paper variant="outlined">
        <DataTable
          rows={rows}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=sourcing`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open for bids', test: (c) => pendingSuppliers(c).length > 0 },
            { value: 'eval', label: 'In evaluation', test: (c) => c.done.includes('QUOTE_SUBMIT') && !c.done.includes('QCS_APPROVE') },
            { value: 'awarded', label: 'Awarded', test: (c) => c.done.includes('QCS_APPROVE') },
          ]}
          columns={[
            { key: 'no', label: 'Event', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.rfq.eventNo}</Mono>, search: (c) => c.rfq.eventNo },
            { key: 'type', label: 'Type', render: (c) => c.rfq.type },
            { key: 'title', label: 'Title', render: (c) => <Typography sx={{ fontSize: 12, maxWidth: 280 }} noWrap>{c.title}</Typography> },
            { key: 'pr', label: 'PR', render: (c) => <Mono>{c.prNo}</Mono>, search: (c) => c.prNo },
            { key: 'buyer', label: 'Buyer', render: (c) => userById(c.buyerId)?.name },
            { key: 'due', label: 'Bid due', render: (c) => fmtDate(c.rfq.bidDueDate) },
            { key: 'bids', label: 'Bids', align: 'right', render: (c) => `${c.quotes.length} / ${c.rfq.invites.length}` },
            { key: 'price', label: 'Prices', render: (c) => (c.rfq.pricesSealed ? <LockOutlined sx={{ fontSize: 14, color: 'grey.500' }} /> : 'Open') },
            { key: 'status', label: 'Status', render: (c) => <StatusChip label={statusOf(c)} />, search: statusOf },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Evaluations() {
  const { cases, navigate } = useData();
  const rows = cases.filter((c) => c.done.includes('QUOTE_SUBMIT'));
  return (
    <Box>
      <PageHeader title="Bid Evaluation" subtitle="Technical (TBE · T1–T3) and commercial (CBE · L1–Ln) evaluation" />
      <Paper variant="outlined">
        <DataTable
          rows={rows}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=${c.done.includes('TBE_APPROVE') ? 'cbe' : 'tbe'}`)}
          columns={[
            { key: 'no', label: 'Event', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.rfq.eventNo}</Mono>, search: (c) => c.rfq.eventNo },
            { key: 'title', label: 'Title', render: (c) => <Typography sx={{ fontSize: 12, maxWidth: 260 }} noWrap>{c.title}</Typography> },
            { key: 'bids', label: 'Bids', align: 'right', render: (c) => c.quotes.length },
            { key: 'q', label: 'Qualified', align: 'right', render: (c) => (c.done.includes('TBE_APPROVE') ? c.quotes.filter((q) => q.status !== 'TECH_DISQUALIFIED').length : '—') },
            {
              key: 'l1',
              label: 'L1',
              render: (c) => {
                const r = c.cbe[0];
                if (!r) return '—';
                const q = c.quotes.find((x) => x.id === r.quoteId);
                return (
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <RankChip rank={1} /> <TierChip tier={r.tier} /> {supplierById(q.supplierId).name}
                  </Box>
                );
              },
            },
            { key: 'landed', label: 'L1 landed', align: 'right', render: (c) => (c.cbe[0] ? fmtLakh(c.cbe[0].landed) : <LockOutlined sx={{ fontSize: 14, color: 'grey.500' }} />) },
            { key: 'status', label: 'Status', render: (c) => <StatusChip label={statusOf(c)} />, search: statusOf },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function PoList() {
  const { user, cases, navigate, isSupplier } = useData();
  const rows = cases.filter((c) => c.po && (!isSupplier || (c.po.supplierId === user.supplierId && c.po.poNo)));
  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle={isSupplier ? 'Orders placed with you by Westfield Energy' : 'Draft and issued POs with delivery and payment status'} />
      <Paper variant="outlined">
        <DataTable
          rows={rows}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=po`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'approval', label: 'In approval', test: (c) => !c.po.poNo },
            { value: 'open', label: 'Open', test: (c) => c.po.poNo && !c.closed },
            { value: 'closed', label: 'Closed', test: (c) => c.closed },
          ]}
          columns={[
            { key: 'no', label: 'PO no.', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.po.poNo || c.po.draftNo}</Mono>, search: (c) => c.po.poNo || c.po.draftNo },
            { key: 'title', label: 'Title', render: (c) => <Typography sx={{ fontSize: 12, maxWidth: 260 }} noWrap>{c.title}</Typography> },
            { key: 'supplier', label: 'Supplier', render: (c) => supplierById(c.po.supplierId).name, search: (c) => supplierById(c.po.supplierId).name },
            { key: 'type', label: 'Type', render: (c) => (c.purchaseType === 'IMPORT' ? 'Import' : 'Local') },
            { key: 'value', label: 'Value', align: 'right', render: (c) => fmtLakh(c.po.total) },
            { key: 'issued', label: 'Issued', render: (c) => fmtDate(c.po.issuedAt) },
            { key: 'need', label: 'Need by', render: (c) => fmtDate(c.po.needByDate) },
            { key: 'status', label: 'Status', render: (c) => <StatusChip label={statusOf(c)} />, search: statusOf },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Payments() {
  const { user, cases, navigate, isSupplier } = useData();
  const pos = cases.filter((c) => c.po && (!isSupplier || (c.po.supplierId === user.supplierId && c.po.poNo)));
  const pays = pos.flatMap((c) => c.payments.map((p) => ({ ...p, id: `${c.id}-${p.seq}`, c })));
  const gs = pos.flatMap((c) => c.guarantees.map((g) => ({ ...g, id: `${c.id}-${g.type}`, c })));
  const P = { ADVANCE: 'Advance', BALANCE: 'Balance', AGAINST_DOCUMENTS: 'Against documents (LC)', RETENTION: 'Retention' };
  return (
    <Box>
      <PageHeader title={isSupplier ? 'Payments' : 'Payments & Guarantees'} subtitle="Advance, balance and LC payments with ABG / PBG / LC instruments" />
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <DataTable
          rows={pays}
          onRowClick={(r) => navigate(`/case/${r.c.id}?tab=finance`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'due', label: 'Due', test: (r) => r.status !== 'PAID' },
            { value: 'paid', label: 'Paid', test: (r) => r.status === 'PAID' },
          ]}
          columns={[
            { key: 'po', label: 'PO', render: (r) => <Mono sx={{ fontWeight: 600 }}>{r.c.po.poNo || r.c.po.draftNo}</Mono>, search: (r) => r.c.po.poNo },
            { key: 'sup', label: 'Supplier', render: (r) => supplierById(r.c.po.supplierId).name, search: (r) => supplierById(r.c.po.supplierId).name },
            { key: 'type', label: 'Milestone', render: (r) => P[r.type] },
            { key: 'pct', label: '%', align: 'right', render: (r) => `${r.percent}%` },
            { key: 'amt', label: 'Amount', align: 'right', render: (r) => fmtINR(r.amount) },
            { key: 'utr', label: 'UTR', render: (r) => <Mono>{r.utr || '—'}</Mono> },
            { key: 'paid', label: 'Paid on', render: (r) => fmtDate(r.paidAt) },
            { key: 'status', label: 'Status', render: (r) => <StatusChip label={r.status === 'PAID' ? 'Paid' : r.status === 'PENDING' ? 'Pending' : r.status.replace(/_/g, ' ').toLowerCase()} /> },
          ]}
        />
      </Paper>
      {!isSupplier && (
        <Paper variant="outlined">
          <Typography variant="h5" sx={{ px: 2, pt: 1.5 }}>
            Guarantees & instruments
          </Typography>
          <DataTable
            rows={gs}
            onRowClick={(r) => navigate(`/case/${r.c.id}?tab=finance`)}
            columns={[
              { key: 'type', label: 'Type', render: (r) => <b>{r.type}</b> },
              { key: 'po', label: 'PO', render: (r) => <Mono>{r.c.po.poNo || r.c.po.draftNo}</Mono> },
              { key: 'sup', label: 'Supplier', render: (r) => supplierById(r.c.po.supplierId).name },
              { key: 'ref', label: 'Reference', render: (r) => <Mono>{r.referenceNo || '—'}</Mono> },
              { key: 'bank', label: 'Bank', render: (r) => r.bankName || '—' },
              { key: 'amt', label: 'Amount', align: 'right', render: (r) => fmtINR(r.amount) },
              { key: 'exp', label: 'Valid till', render: (r) => fmtDate(r.expiryDate) },
              { key: 'status', label: 'Status', render: (r) => <StatusChip label={r.status === 'PENDING' ? 'Awaiting' : r.status[0] + r.status.slice(1).toLowerCase()} /> },
            ]}
          />
        </Paper>
      )}
    </Box>
  );
}

export function Shipments() {
  const { user, cases, navigate, isSupplier } = useData();
  let rows = cases.filter((c) => c.shipment);
  if (isSupplier) rows = rows.filter((c) => c.po.supplierId === user.supplierId);
  if (user.role === 'LOGISTICS_USER') rows = rows.filter((c) => c.shipment.partnerId === user.logisticsPartnerId);
  return (
    <Box>
      <PageHeader title="Shipments" subtitle="Transport documents, milestones and ETA against need-by date" />
      <Paper variant="outlined">
        <DataTable
          rows={rows}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=logistics`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'transit', label: 'In transit', test: (c) => c.shipment.milestone !== 'DELIVERED' },
            { value: 'delayed', label: 'Delayed', test: isDelayed },
            { value: 'delivered', label: 'Delivered', test: (c) => c.shipment.milestone === 'DELIVERED' },
          ]}
          columns={[
            { key: 'no', label: 'Shipment', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.shipment.shipmentNo}</Mono>, search: (c) => c.shipment.shipmentNo },
            { key: 'po', label: 'PO', render: (c) => <Mono>{c.po.poNo}</Mono>, search: (c) => c.po.poNo },
            { key: 'sup', label: 'Supplier', render: (c) => supplierById(c.po.supplierId).name },
            { key: 'partner', label: 'Partner', render: (c) => partnerById(c.shipment.partnerId)?.name },
            { key: 'mode', label: 'Mode', render: (c) => c.shipment.mode[0] + c.shipment.mode.slice(1).toLowerCase() },
            { key: 'trk', label: 'LR / BL / AWB', render: (c) => <Mono>{c.shipment.trackingNo || '—'}</Mono>, search: (c) => c.shipment.trackingNo },
            { key: 'ms', label: 'Milestone', render: (c) => MILESTONE_LABEL[c.shipment.milestone] },
            { key: 'eta', label: 'ETA', render: (c) => (c.shipment.milestone === 'DELIVERED' ? fmtDate(c.shipment.deliveredAt) : c.shipment.eta ? `${fmtDate(c.shipment.eta)} (${daysBetween(Date.now(), c.shipment.eta)} d)` : '—') },
            { key: 'need', label: 'Need by', render: (c) => fmtDate(c.po.needByDate) },
            { key: 'st', label: '', render: (c) => (c.shipment.milestone === 'DELIVERED' ? <StatusChip label="Delivered" /> : c.shipment.eta ? <StatusChip label={isDelayed(c) ? 'Delayed' : 'On time'} /> : <StatusChip label="Awaiting booking" tone="outline" />) },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function Mrns() {
  const { cases, navigate } = useData();
  const rows = cases.filter((c) => c.shipment?.milestone === 'DELIVERED');
  return (
    <Box>
      <PageHeader title="Material Receipts (MRN)" subtitle="Goods received against PO lines – prepared, reviewed and approved by Stores" />
      <Paper variant="outlined">
        <DataTable
          rows={rows}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=mrn`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending', test: (c) => !c.mrn || c.mrn.status !== 'APPROVED' },
            { value: 'approved', label: 'Approved', test: (c) => c.mrn?.status === 'APPROVED' },
          ]}
          columns={[
            { key: 'no', label: 'MRN', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.mrn?.mrnNo || 'To prepare'}</Mono>, search: (c) => c.mrn?.mrnNo },
            { key: 'po', label: 'PO', render: (c) => <Mono>{c.po.poNo}</Mono>, search: (c) => c.po.poNo },
            { key: 'item', label: 'Item', render: (c) => itemById(c.po.lines[0].itemId).name },
            { key: 'sup', label: 'Supplier', render: (c) => supplierById(c.po.supplierId).name },
            { key: 'rec', label: 'Received', render: (c) => fmtDate(c.shipment.deliveredAt) },
            { key: 'acc', label: 'Accepted', align: 'right', render: (c) => (c.mrn ? c.mrn.lines.reduce((a, l) => a + l.acceptedQty, 0) : '—') },
            { key: 'rej', label: 'Rejected', align: 'right', render: (c) => (c.mrn ? c.mrn.lines.reduce((a, l) => a + l.rejectedQty, 0) : '—') },
            { key: 'st', label: 'Status', render: (c) => <StatusChip label={!c.mrn ? 'Awaiting MRN' : c.mrn.status === 'APPROVED' ? 'Approved' : c.mrn.status === 'REVIEWED' ? 'Reviewed' : 'Prepared'} /> },
          ]}
        />
      </Paper>
    </Box>
  );
}

export function PortalRfqs() {
  const { user, cases, navigate } = useData();
  const sid = user.supplierId;
  return (
    <Box>
      <PageHeader title="RFQs & Bids" subtitle="Invitations from Westfield Energy and the status of your quotations" />
      <Paper variant="outlined">
        <DataTable
          rows={cases}
          onRowClick={(c) => navigate(`/case/${c.id}?tab=sourcing`)}
          filters={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Awaiting my quote', test: (c) => pendingSuppliers(c).includes(sid) },
            { value: 'sub', label: 'Submitted', test: (c) => c.quotes.some((q) => q.supplierId === sid) },
          ]}
          columns={[
            { key: 'no', label: 'RFQ', render: (c) => <Mono sx={{ fontWeight: 600 }}>{c.rfq.eventNo}</Mono>, search: (c) => c.rfq.eventNo },
            { key: 'title', label: 'Title', render: (c) => c.title },
            { key: 'inc', label: 'Incoterm', render: (c) => c.rfq.incoterm },
            { key: 'due', label: 'Bid due', render: (c) => fmtDate(c.rfq.bidDueDate) },
            {
              key: 'mine',
              label: 'My quote',
              render: (c) => {
                const q = c.quotes.find((x) => x.supplierId === sid);
                return q ? fmtLakh(quoteTotals(q).landed) : '—';
              },
            },
            {
              key: 'st',
              label: 'Status',
              render: (c) => {
                const q = c.quotes.find((x) => x.supplierId === sid);
                if (!q) return <StatusChip label={c.rfq.bidDueDate > Date.now() ? `Open · ${daysBetween(Date.now(), c.rfq.bidDueDate)} d left` : 'Closed'} tone="warning" />;
                return <StatusChip label={q.status === 'AWARDED' ? 'Awarded' : q.status === 'NOT_AWARDED' || q.status === 'TECH_DISQUALIFIED' ? 'Not awarded' : 'Under evaluation'} />;
              },
            },
          ]}
        />
      </Paper>
    </Box>
  );
}

export { docNo };
