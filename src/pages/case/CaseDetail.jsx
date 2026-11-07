import { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import Stack from '../../components/Stack';
import Check from '@mui/icons-material/Check';
import ArrowBack from '@mui/icons-material/ArrowBack';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import { selectCase, selectSettings, selectUser } from '../../store';
import { canAct, currentStep, getSteps, isExternal, statusOf, isDelayed } from '../../store/flow';
import { ROLES, USERS, supplierById } from '../../data/masters';
import { fmtLakh, fmtDate } from '../../utils/format';
import { StatusChip, Empty } from '../../components/common';
import PrTab from './PrTab';
import SourcingTab from './SourcingTab';
import TbeTab from './TbeTab';
import CbeTab from './CbeTab';
import PoTab from './PoTab';
import FinanceTab from './FinanceTab';
import LogisticsTab from './LogisticsTab';
import MrnTab from './MrnTab';
import DiscussionTab from './DiscussionTab';
import TimelineTab from './TimelineTab';

const TABS = [
  { key: 'pr', label: 'Requisition', C: PrTab },
  { key: 'sourcing', label: 'RFQ & Bids', C: SourcingTab },
  { key: 'tbe', label: 'TBE', C: TbeTab },
  { key: 'cbe', label: 'CBE & QCS', C: CbeTab },
  { key: 'po', label: 'Purchase Order', C: PoTab },
  { key: 'finance', label: 'Payments & Guarantees', C: FinanceTab },
  { key: 'logistics', label: 'Shipment & ETA', C: LogisticsTab },
  { key: 'mrn', label: 'MRN', C: MrnTab },
  { key: 'discussion', label: 'Discussion', C: DiscussionTab },
  { key: 'timeline', label: 'Audit Timeline', C: TimelineTab },
];

const tabsFor = (user) => {
  if (user.role === 'SUPPLIER_USER') return ['sourcing', 'po', 'finance', 'logistics'];
  if (user.role === 'LOGISTICS_USER') return ['logistics'];
  if (user.role === 'TECH_INSPECTOR') return ['tbe'];
  return TABS.map((t) => t.key);
};

export default function CaseDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const c = useSelector(selectCase(id));
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const trackRef = useRef(null);

  const allowed = tabsFor(user);
  const step = c ? currentStep(c) : null;
  const defaultTab = step && allowed.includes(step.tab) ? step.tab : allowed[0];
  const tab = allowed.includes(params.get('tab')) ? params.get('tab') : defaultTab;

  useEffect(() => {
    const el = trackRef.current?.querySelector('[data-current="true"]');
    const box = trackRef.current;
    if (el && box) box.scrollLeft += el.getBoundingClientRect().left - box.getBoundingClientRect().left - 160;
  }, [step?.key]);

  if (!c) return <Empty title="Document not found" hint="It may have been removed by a demo reset." />;

  const steps = getSteps(c);
  const mine = canAct(user, c, settings);
  const status = statusOf(c);
  const pendingUsers = step ? USERS.filter((u) => u.role === step.role) : [];
  const external = isExternal(user);
  const T = TABS.find((t) => t.key === tab).C;
  const docNo = c.po?.poNo || c.po?.draftNo;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }} className="no-print">
        <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ color: 'grey.600', px: 0.5 }}>
          Back
        </Button>
      </Stack>

      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ p: 2, gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography variant="overline" color="text.secondary">
                {c.prNo}
                {c.rfq && ` · ${c.rfq.eventNo}`}
                {docNo && ` · ${docNo}`}
              </Typography>
              <StatusChip label={status} />
              {c.po && <StatusChip label={c.purchaseType === 'IMPORT' ? 'Import' : 'Local'} tone="outline" />}
              {isDelayed(c) && <StatusChip label="Delayed" tone="error" />}
            </Stack>
            <Typography variant="h2">{c.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {external
                ? `Westfield Energy · ${c.po ? `PO value ${fmtLakh(c.po.total)}` : `Bid due ${fmtDate(c.rfq?.bidDueDate)}`}`
                : `Estimate ${fmtLakh(c.estimatedValue)}${c.po ? ` · PO ${fmtLakh(c.po.total)} to ${supplierById(c.po.supplierId).name}` : ''} · Need by ${fmtDate(c.po?.needByDate || c.needByDate)}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start" className="no-print">
            <Button variant="outlined" startIcon={<PrintOutlined />} onClick={() => window.print()}>
              Print / PDF
            </Button>
          </Stack>
        </Stack>

        {/* Pending banner */}
        {!c.closed && step && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: mine ? '#111' : 'grey.50', color: mine ? '#fff' : 'text.primary' }}
            className="no-print"
          >
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, opacity: 0.7 }}>{mine ? 'ACTION REQUIRED' : 'PENDING WITH'}</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>
              {step.label} · {ROLES[step.role]}
              {!mine && !external && step.role !== 'SUPPLIER_USER' && pendingUsers.length > 0 && ` (${pendingUsers.map((u) => u.name).join(', ')})`}
            </Typography>
            {mine && tab !== step.tab && allowed.includes(step.tab) && (
              <Button size="small" variant="contained" sx={{ bgcolor: '#fff', color: '#111', '&:hover': { bgcolor: 'grey.200' } }} onClick={() => setParams({ tab: step.tab })}>
                Open task
              </Button>
            )}
          </Stack>
        )}
        {c.closed && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#111', color: '#fff' }}>
            <Check sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Transaction closed on {fmtDate(c.closedAt)}</Typography>
          </Stack>
        )}

        {/* Flow tracker */}
        {!external && (
          <Box ref={trackRef} sx={{ borderTop: '1px solid', borderColor: 'divider', overflowX: 'auto', px: 2, py: 1.5 }} className="no-print">
            <Stack direction="row" alignItems="center" sx={{ minWidth: 'max-content' }}>
              {steps.map((s, i) => {
                const done = c.done.includes(s.key);
                const cur = step?.key === s.key;
                return (
                  <Stack key={s.key} direction="row" alignItems="center" data-current={cur}>
                    <Tooltip title={`${s.label} · ${ROLES[s.role]}`}>
                      <Stack
                        alignItems="center"
                        sx={{ width: 74, cursor: allowed.includes(s.tab) ? 'pointer' : 'default' }}
                        onClick={() => allowed.includes(s.tab) && setParams({ tab: s.tab })}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: done ? '#111' : '#fff',
                            color: done ? '#fff' : cur ? '#111' : 'grey.400',
                            border: '1.5px solid',
                            borderColor: done || cur ? '#111' : 'grey.300',
                            boxShadow: cur ? '0 0 0 3px rgba(17,17,17,0.12)' : 'none',
                          }}
                        >
                          {done ? <Check sx={{ fontSize: 12 }} /> : i + 1}
                        </Box>
                        <Typography
                          sx={{ fontSize: 9.5, mt: 0.5, textAlign: 'center', lineHeight: 1.2, color: done || cur ? 'text.primary' : 'grey.500', fontWeight: cur ? 700 : 500, height: 23, overflow: 'hidden' }}
                        >
                          {s.label.replace(/\(.*\)/, '').replace(' – ', ' · ')}
                        </Typography>
                      </Stack>
                    </Tooltip>
                    {i < steps.length - 1 && <Box sx={{ width: 14, height: 1.5, bgcolor: done ? '#111' : 'grey.300', mb: 2.6 }} />}
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}

        <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" sx={{ borderTop: '1px solid', borderColor: 'divider', px: 1 }} className="no-print">
          {TABS.filter((t) => allowed.includes(t.key)).map((t) => {
            const flag = mine && step?.tab === t.key;
            return (
              <Tab
                key={t.key}
                value={t.key}
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <span>{t.label}</span>
                    {flag && <Box sx={{ width: 6, height: 6, borderRadius: 3, bgcolor: 'error.main' }} />}
                    {t.key === 'discussion' && c.comments.length > 0 && <Box sx={{ fontSize: 10, color: 'grey.500' }}>{c.comments.length}</Box>}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      <T c={c} />
    </Box>
  );
}
