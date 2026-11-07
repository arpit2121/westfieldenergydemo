import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableRow, TableHead } from '@mui/material';
import Stack from '../components/Stack';
import { BarChart } from '@mui/x-charts/BarChart';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { selectCases, selectSettings, selectUser } from '../store';
import { canAct, currentStep, statusOf, isDelayed, MILESTONE_LABEL, pendingSuppliers } from '../store/flow';
import { ROLES, supplierById, userById, partnerById } from '../data/masters';
import { fmtLakh, fmtDate, daysBetween, timeAgo, DAY } from '../utils/format';
import { PageHeader, Panel, StatCard, StatusChip, Empty, Mono, Grid } from '../components/common';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Baseline spend (₹ lakh) for months before the seeded records
const BASELINE = [62, 48, 71, 55, 83, 66];

const SUPPLIER_EVENTS = ['RFQ_PUBLISHED', 'QUOTE_SUBMITTED', 'LOI_SENT', 'PO_ISSUED', 'PO_ACCEPTED', 'ADVANCE_PAID', 'DOCS_PAID', 'DISPATCHED', 'DELIVERED', 'MRN_APPROVED', 'BALANCE_PAID', 'TRANSACTION_CLOSED'];

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function TaskTable({ cases, user, settings, limit }) {
  const navigate = useNavigate();
  const tasks = cases.filter((c) => canAct(user, c, settings));
  if (!tasks.length) return <Empty title="No pending actions" hint="New work will appear here and in the notification bell." />;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Document</TableCell>
          <TableCell>Title</TableCell>
          <TableCell>Your action</TableCell>
          <TableCell>Waiting since</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {tasks.slice(0, limit).map((c) => {
          const s = currentStep(c);
          return (
            <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/case/${c.id}?tab=${s.tab}`)}>
              <TableCell>
                <Mono sx={{ fontWeight: 600 }}>{c.po?.poNo || c.po?.draftNo || c.rfq?.eventNo || c.prNo || 'Draft'}</Mono>
              </TableCell>
              <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</TableCell>
              <TableCell>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.label}</Typography>
              </TableCell>
              <TableCell>{timeAgo(c.updatedAt)}</TableCell>
              <TableCell align="right">
                <ArrowForward sx={{ fontSize: 15, color: 'grey.500' }} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RecentActivity({ filter }) {
  const audit = useSelector((s) => s.p2p.audit);
  const navigate = useNavigate();
  const rows = audit.filter(filter || (() => true)).slice(0, 9);
  return (
    <Box>
      {rows.map((a) => (
        <Stack key={a.id} direction="row" spacing={1.25} sx={{ px: 2, py: 0.9, borderBottom: '1px solid', borderColor: 'grey.100', cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }} onClick={() => navigate(`/case/${a.caseId}?tab=timeline`)}>
          <Box sx={{ width: 6, height: 6, borderRadius: 3, bgcolor: '#111', mt: 0.8, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 500 }} noWrap>
              {a.message}
            </Typography>
            <Typography variant="caption">
              {a.docNo} · {userById(a.userId)?.name} · {timeAgo(a.at)}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

function ShipmentsTable({ cases }) {
  const navigate = useNavigate();
  const rows = cases.filter((c) => c.shipment && c.shipment.milestone !== 'DELIVERED');
  if (!rows.length) return <Empty title="No shipments in transit" />;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>PO</TableCell>
          <TableCell>Supplier</TableCell>
          <TableCell>Partner</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>ETA</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((c) => {
          const d = isDelayed(c);
          const left = c.shipment.eta ? daysBetween(Date.now(), c.shipment.eta) : null;
          return (
            <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/case/${c.id}?tab=logistics`)}>
              <TableCell>
                <Mono>{c.po.poNo}</Mono>
              </TableCell>
              <TableCell>{supplierById(c.po.supplierId).name}</TableCell>
              <TableCell>{partnerById(c.shipment.partnerId)?.name}</TableCell>
              <TableCell>{MILESTONE_LABEL[c.shipment.milestone]}</TableCell>
              <TableCell>{c.shipment.eta ? `${fmtDate(c.shipment.eta)} · ${left} d` : 'Awaiting booking'}</TableCell>
              <TableCell>{c.shipment.eta && <StatusChip label={d ? 'Delayed' : 'On time'} />}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

const chartSx = { '& .MuiChartsAxis-tickLabel': { fontSize: '10.5px !important', fill: '#71717A !important' }, '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: '#E4E4E7 !important' } };

function InternalDashboard({ user, cases, settings }) {
  const navigate = useNavigate();
  const m = useMemo(() => {
    const now = Date.now();
    const pos = cases.filter((c) => c.po?.poNo);
    const openPrs = cases.filter((c) => c.prNo && !c.rfq && !c.closed);
    const openRfqs = cases.filter((c) => c.rfq && !c.done.includes('QCS_APPROVE'));
    const dueSoon = openRfqs.filter((c) => pendingSuppliers(c).length && c.rfq.bidDueDate - now < 3 * DAY);
    const transit = cases.filter((c) => c.shipment && c.shipment.milestone !== 'DELIVERED');
    const spendMonth = pos.filter((c) => now - c.po.issuedAt < 30 * DAY).reduce((a, c) => a + c.po.total, 0);
    const savings = cases.filter((c) => c.qcs?.status === 'APPROVED').reduce((a, c) => a + Math.max(0, c.qcs.savingsVsAverage || 0), 0);
    const byStatus = { 'In approval': 0, Issued: 0, 'In transit': 0, Received: 0, Closed: 0 };
    cases.forEach((c) => {
      if (!c.po) return;
      if (c.closed) byStatus.Closed++;
      else if (c.po.status === 'RECEIVED') byStatus.Received++;
      else if (c.shipment) byStatus['In transit']++;
      else if (c.po.poNo) byStatus.Issued++;
      else byStatus['In approval']++;
    });
    // spend by month for the last 6 months
    const d = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const md = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const actual = pos.filter((c) => {
        const t = new Date(c.po.issuedAt);
        return t.getMonth() === md.getMonth() && t.getFullYear() === md.getFullYear();
      });
      months.push({ label: MONTHS[md.getMonth()], value: Math.round(BASELINE[5 - i] + actual.reduce((a, c) => a + c.po.total, 0) / 100000) });
    }
    return { openPrs, openRfqs, dueSoon, transit, spendMonth, savings, byStatus, months, pos, delayed: transit.filter(isDelayed) };
  }, [cases]);

  return (
    <Box>
      <PageHeader
        overline={`${ROLES[user.role]} · ${user.designation}`}
        title={`${greet()}, ${user.name.split(' ')[0]}`}
        subtitle="Procurement overview across Westfield Energy"
        actions={
          user.role === 'ENG_CREATOR' && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => navigate('/prs/new')}>
              New requisition
            </Button>
          )
        }
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
        <StatCard label="Open requisitions" value={m.openPrs.length} hint="Awaiting approval or sourcing" onClick={() => navigate('/prs')} />
        <StatCard label="RFQs open" value={m.openRfqs.length} hint={`${m.dueSoon.length} closing in < 3 days`} onClick={() => navigate('/rfqs')} />
        <StatCard label="Purchase orders" value={m.pos.length} hint={`${m.pos.filter((c) => !c.closed).length} active`} onClick={() => navigate('/pos')} />
        <StatCard label="In transit" value={m.transit.length} hint={m.delayed.length ? `${m.delayed.length} delayed` : 'All on time'} tone={m.delayed.length ? 'error' : undefined} onClick={() => navigate('/shipments')} />
        <StatCard label="Spend · 30 days" value={fmtLakh(m.spendMonth)} hint="POs issued" />
        <StatCard label="Savings vs avg bid" value={fmtLakh(m.savings)} hint="Approved QCS awards" />
      </Box>

      <Grid cols="minmax(0, 1.6fr) minmax(0, 1fr)">
        <Box>
          <Panel title="My pending actions" pad={false} actions={<Button size="small" onClick={() => navigate('/tasks')}>View all</Button>}>
            <TaskTable cases={cases} user={user} settings={settings} limit={6} />
          </Panel>
          <Panel title="Shipments in transit" subtitle="ETA against need-by date" pad={false}>
            <ShipmentsTable cases={cases} />
          </Panel>
          <Grid cols="1fr 1fr">
            <Panel title="POs by status">
              <Box sx={chartSx}>
                <BarChart
                  height={200}
                  margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                  xAxis={[{ scaleType: 'band', data: Object.keys(m.byStatus), tickLabelStyle: { fontSize: 10 } }]}
                  yAxis={[{ tickMinStep: 1, width: 28 }]}
                  series={[{ data: Object.values(m.byStatus), color: '#111' }]}
                  borderRadius={2}
                  hideLegend
                />
              </Box>
            </Panel>
            <Panel title="Monthly spend (₹ lakh)">
              <Box sx={chartSx}>
                <BarChart
                  height={200}
                  margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                  xAxis={[{ scaleType: 'band', data: m.months.map((x) => x.label) }]}
                  yAxis={[{ width: 32 }]}
                  series={[{ data: m.months.map((x) => x.value), color: '#52525B' }]}
                  borderRadius={2}
                  hideLegend
                />
              </Box>
            </Panel>
          </Grid>
        </Box>
        <Box>
          <Panel title="Live pipeline" pad={false}>
            <Table size="small">
              <TableBody>
                {cases
                  .filter((c) => !c.closed)
                  .slice(0, 7)
                  .map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/case/${c.id}`)}>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Mono sx={{ fontWeight: 600 }}>{c.po?.poNo || c.rfq?.eventNo || c.prNo || 'Draft'}</Mono>
                        <Typography variant="caption" component="div" noWrap>
                          {c.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <StatusChip label={statusOf(c)} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel title="Recent activity" pad={false}>
            <RecentActivity />
          </Panel>
        </Box>
      </Grid>
    </Box>
  );
}

function SupplierDashboard({ user, cases, settings }) {
  const navigate = useNavigate();
  const sid = user.supplierId;
  const s = supplierById(sid);
  const invited = cases.filter((c) => c.rfq?.invites.includes(sid));
  const openRfqs = invited.filter((c) => pendingSuppliers(c).includes(sid));
  const bids = invited.filter((c) => c.quotes.some((q) => q.supplierId === sid));
  const pos = cases.filter((c) => c.po?.poNo && c.po.supplierId === sid);
  const ships = pos.filter((c) => c.shipment && c.shipment.milestone !== 'DELIVERED');
  const due = pos.flatMap((c) => c.payments.filter((p) => p.status !== 'PAID').map((p) => ({ ...p, c })));
  const received = pos.flatMap((c) => c.payments.filter((p) => p.status === 'PAID'));

  return (
    <Box>
      <PageHeader overline={`Supplier portal · ${s.code}`} title={s.name} subtitle={`Signed in as ${user.name} · Westfield Energy approved vendor · rating ${s.rating}/5`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 2 }}>
        <StatCard label="Open RFQs" value={openRfqs.length} hint="Awaiting your quotation" onClick={() => navigate('/portal/rfqs')} />
        <StatCard label="Bids submitted" value={bids.length} hint={`${bids.filter((c) => c.quotes.find((q) => q.supplierId === sid)?.status === 'AWARDED').length} awarded`} />
        <StatCard label="Purchase orders" value={pos.length} hint={fmtLakh(pos.reduce((a, c) => a + c.po.total, 0))} onClick={() => navigate('/pos')} />
        <StatCard label="Shipments" value={ships.length} hint="In progress" onClick={() => navigate('/shipments')} />
        <StatCard label="Payments due" value={fmtLakh(due.reduce((a, p) => a + p.amount, 0))} hint={`${fmtLakh(received.reduce((a, p) => a + p.amount, 0))} received`} onClick={() => navigate('/payments')} />
      </Box>
      <Grid cols="minmax(0,1.5fr) minmax(0,1fr)">
        <Box>
          <Panel title="Action required" pad={false}>
            <TaskTable cases={cases} user={user} settings={settings} />
          </Panel>
          <Panel title="Open RFQs" pad={false}>
            {openRfqs.length === 0 ? (
              <Empty title="No open RFQs" />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>RFQ</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Closes</TableCell>
                    <TableCell align="right">Countdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {openRfqs.map((c) => {
                    const left = c.rfq.bidDueDate - Date.now();
                    const d = Math.floor(left / DAY);
                    const h = Math.floor((left % DAY) / 3600000);
                    return (
                      <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/case/${c.id}?tab=sourcing`)}>
                        <TableCell>
                          <Mono sx={{ fontWeight: 600 }}>{c.rfq.eventNo}</Mono>
                        </TableCell>
                        <TableCell>{c.title}</TableCell>
                        <TableCell>{fmtDate(c.rfq.bidDueDate)}</TableCell>
                        <TableCell align="right">
                          <StatusChip label={left > 0 ? `${d}d ${h}h left` : 'Closed'} tone={d < 3 ? 'warning' : 'neutral'} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Panel>
          <Panel title="My purchase orders" pad={false}>
            {pos.length === 0 ? (
              <Empty title="No purchase orders yet" />
            ) : (
              <Table size="small">
                <TableBody>
                  {pos.map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/case/${c.id}?tab=po`)}>
                      <TableCell>
                        <Mono sx={{ fontWeight: 600 }}>{c.po.poNo}</Mono>
                      </TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell align="right">{fmtLakh(c.po.total)}</TableCell>
                      <TableCell align="right">
                        <StatusChip label={statusOf(c)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Box>
        <Box>
          <Panel title="Payments" pad={false}>
            {due.length + received.length === 0 ? (
              <Empty title="No payments yet" />
            ) : (
              <Table size="small">
                <TableBody>
                  {pos.flatMap((c) =>
                    c.payments.map((p) => (
                      <TableRow key={`${c.id}${p.seq}`}>
                        <TableCell>
                          <Mono>{c.po.poNo}</Mono>
                          <Typography variant="caption" component="div">
                            {p.type.replace(/_/g, ' ').toLowerCase()} · {p.percent}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{fmtLakh(p.amount)}</TableCell>
                        <TableCell align="right">
                          <StatusChip label={p.status === 'PAID' ? 'Paid' : 'Due'} />
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            )}
          </Panel>
          <Panel title="Recent activity" pad={false}>
            <RecentActivity
              filter={(a) =>
                invited.some((c) => c.id === a.caseId) &&
                SUPPLIER_EVENTS.includes(a.action) &&
                (a.action !== 'QUOTE_SUBMITTED' || userById(a.userId)?.supplierId === sid) &&
                (!['PO_ISSUED', 'PO_ACCEPTED', 'LOI_SENT', 'ADVANCE_PAID', 'DISPATCHED', 'DELIVERED', 'MRN_APPROVED', 'BALANCE_PAID', 'TRANSACTION_CLOSED', 'DOCS_PAID'].includes(a.action) || pos.some((c) => c.id === a.caseId))
              }
            />
          </Panel>
        </Box>
      </Grid>
    </Box>
  );
}

function LogisticsDashboard({ user, cases, settings }) {
  const mine = cases.filter((c) => c.shipment?.partnerId === user.logisticsPartnerId);
  const active = mine.filter((c) => c.shipment.milestone !== 'DELIVERED');
  return (
    <Box>
      <PageHeader overline="Logistics partner" title={partnerById(user.logisticsPartnerId).name} subtitle="Update pickups, milestones and ETAs for Westfield shipments" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <StatCard label="Active shipments" value={active.length} />
        <StatCard label="Awaiting booking" value={active.filter((c) => c.shipment.milestone === 'DISPATCHED').length} />
        <StatCard label="Delayed" value={active.filter(isDelayed).length} tone={active.some(isDelayed) ? 'error' : undefined} />
        <StatCard label="Delivered" value={mine.length - active.length} />
      </Box>
      <Panel title="Action required" pad={false}>
        <TaskTable cases={cases} user={user} settings={settings} />
      </Panel>
      <Panel title="Shipments" pad={false}>
        <ShipmentsTable cases={mine} />
      </Panel>
    </Box>
  );
}

export default function Dashboard() {
  const user = useSelector(selectUser);
  const cases = useSelector(selectCases);
  const settings = useSelector(selectSettings);
  if (user.role === 'SUPPLIER_USER') return <SupplierDashboard user={user} cases={cases} settings={settings} />;
  if (user.role === 'LOGISTICS_USER') return <LogisticsDashboard user={user} cases={cases} settings={settings} />;
  if (user.role === 'TECH_INSPECTOR')
    return (
      <Box>
        <PageHeader overline="Third-party inspection" title={`Welcome, ${user.name}`} subtitle="Technical evaluations assigned to you by Westfield Energy" />
        <Panel title="Action required" pad={false}>
          <TaskTable cases={cases} user={user} settings={settings} />
        </Panel>
      </Box>
    );
  return <InternalDashboard user={user} cases={cases} settings={settings} />;
}
