// Builds the demo's starting state: background transactions so dashboards and
// inboxes look lived-in. The live demo PR (PR-2026-0147) is raised by Ravi.
import { createCase, fastForward, initialCounters, runStep } from '../store/engine';
import { DAY } from '../utils/format';
import { MILESTONE_LABEL } from '../store/flow';

export const LIVE_PR_TEMPLATE = {
  title: '132 kV Transformer Bushing Set – Unit 2 Substation',
  purpose: 'OWN_USE',
  customerId: null,
  deliveryLocation: 'Unit 2 – 132 kV Substation, Jamnagar',
  justification: 'Replacement of aged bushings on 132/33 kV Transformer T2 flagged in the annual DGA and tan-delta test. Required before the pre-monsoon shutdown.',
  lines: [{ itemId: 'i-bushing', qty: 3, estUnitPrice: 1800000, specNotes: 'OIP, 132 kV, 800 A, IEC 60137, creepage 25 mm/kV' }],
  attachments: ['WE-SPEC-13208_Rev2.pdf', 'GTP_Bushing_132kV.xlsx'],
};

export const emptyState = () => ({
  cases: {},
  order: [],
  audit: [],
  notifications: [],
  outbox: [],
  counters: { ...initialCounters },
  settings: { storesDirectApprove: false },
  seededAt: Date.now(),
});

const pr = (title, itemId, qty, estUnitPrice, extra = {}) => ({
  title,
  purpose: 'OWN_USE',
  deliveryLocation: 'Unit 2 – 132 kV Substation, Jamnagar',
  justification: 'Planned maintenance requirement.',
  lines: [{ itemId, qty, estUnitPrice, specNotes: '' }],
  attachments: ['Spec_sheet.pdf'],
  ...extra,
});

const years = (n) => `2026-${String(n).padStart(4, '0')}`;
const nos = (prN, rfq, po, extra = {}) => ({
  pr: `PR-${years(prN)}`,
  rfq: `RFQ-${years(rfq)}`,
  qcs: `QCS-${years(rfq - 30)}`,
  dpo: `DPO-${years(po)}`,
  po: `PO-${years(po)}`,
  loi: `LOI-${years(po - 220 > 0 ? po - 220 : po)}`,
  shp: `SHP-${years(po + 170)}`,
  mrn: `MRN-${years(po + 90)}`,
  ...extra,
});

export const buildSeed = () => {
  const s = emptyState();
  const now = Date.now();

  // 1. Closed import PO – Delta Global, gas turbine spares, USD 42,000 via LC
  {
    const t0 = now - 78 * DAY;
    const id = createCase(s, {
      id: 'case-0089',
      payload: pr('Gas Turbine Combustion Liner Kit – GT-2 overhaul', 'i-turbine', 1, 3876923, { needByDate: t0 + 70 * DAY, justification: 'OEM spares for GT-2 major inspection.' }),
      userId: 'u-ravi',
      submit: true,
      at: t0,
      nos: nos(121, 44, 89),
    });
    fastForward(s, id, null, {
      start: t0 + 3600000,
      stepMs: 2.6 * DAY,
      overrides: {
        RFQ_PUBLISH: { invites: ['s-delta', 's-alpha', 's-fortune'], liveSuppliers: [], incoterm: 'CIF', paymentTermId: 'pt-lc' },
        QCS_SUBMIT: { awardQuoteId: 'q-case-0089-s-delta', justification: 'OEM-original liner kit mandated by GT warranty; only Delta Global is OEM-certified. Awarded on technical grounds (T1) over L1.' },
        PO_DRAFT: { purchaseType: 'IMPORT' },
      },
    });
  }

  // 2. Closed local PO – Bharat Electricals, current transformers
  {
    const t0 = now - 52 * DAY;
    const id = createCase(s, {
      id: 'case-0198',
      payload: pr('132 kV Current Transformers – Bay 3 extension', 'i-ct', 4, 620000, { needByDate: t0 + 50 * DAY }),
      userId: 'u-ravi',
      submit: true,
      at: t0,
      nos: nos(133, 49, 198),
    });
    fastForward(s, id, null, {
      start: t0 + 3600000,
      stepMs: 1.5 * DAY,
      overrides: { RFQ_PUBLISH: { invites: ['s-bharat', 's-alpha', 's-eastline', 's-fortune'], liveSuppliers: [] } },
    });
  }

  // 3. Alpha Power cable lugs – material received, awaiting balance payment
  {
    const t0 = now - 30 * DAY;
    const id = createCase(s, {
      id: 'case-0156',
      payload: pr('Copper Cable Lugs 630 sq mm', 'i-lugs', 200, 1714.29, { needByDate: t0 + 35 * DAY }),
      userId: 'u-ravi',
      submit: true,
      at: t0,
      nos: nos(138, 52, 156),
    });
    fastForward(s, id, 'BAL_REVIEW', {
      start: t0 + 3600000,
      stepMs: 1.05 * DAY,
      overrides: { RFQ_PUBLISH: { invites: ['s-alpha', 's-eastline', 's-fortune'], liveSuppliers: [], paymentTermId: 'pt-100-mrn' } },
    });
  }

  // 4. Fortune Grid gate valves – in transit with SwiftCargo
  {
    const t0 = now - 24 * DAY;
    const id = createCase(s, {
      id: 'case-0204',
      payload: pr('High Pressure Gate Valves 8" – Boiler feed line', 'i-valve', 8, 240000, { needByDate: now + 9 * DAY }),
      userId: 'u-ravi',
      submit: true,
      at: t0,
      nos: nos(141, 54, 204),
    });
    fastForward(s, id, 'SHIP_TRACK', {
      start: t0 + 3600000,
      stepMs: 1.15 * DAY,
      overrides: {
        RFQ_PUBLISH: { invites: ['s-fortune', 's-eastline', 's-alpha'], liveSuppliers: [] },
        QCS_SUBMIT: { awardQuoteId: 'q-case-0204-s-fortune', justification: 'Alpha (L1) cannot meet boiler shutdown window; Fortune T1 with 6-week delivery.' },
      },
    });
    const c = s.cases[id];
    const t = now - 2 * DAY;
    Object.assign(c.shipment, { trackingNo: 'SC-776040', transitDays: 5, eta: now + 3 * DAY, milestone: 'IN_TRANSIT' });
    c.shipment.events.push(
      { milestone: 'BOOKED', at: t, by: 'u-swift', location: 'Chennai', note: 'LR SC-776040, 5 days transit' },
      { milestone: 'PICKED_UP', at: t + 5 * 3600000, by: 'u-swift', location: 'Chennai', note: '' },
      { milestone: 'IN_TRANSIT', at: now - 20 * 3600000, by: 'u-swift', location: 'NH48 – Vadodara bypass', note: MILESTONE_LABEL.IN_TRANSIT },
    );
  }

  // 5. Open RFQ with bid due in 2 days (supplier countdown)
  {
    const t0 = now - 6 * DAY;
    const id = createCase(s, {
      id: 'case-0149',
      payload: pr('Numerical Protection Relays – Feeder panels', 'i-relay', 12, 145000, { needByDate: now + 40 * DAY }),
      userId: 'u-ravi',
      submit: true,
      at: t0,
      nos: nos(149, 61, 240),
    });
    fastForward(s, id, 'RFQ_PUBLISH', { start: t0 + 3600000, stepMs: 0.7 * DAY });
    runStep(s, {
      caseId: id,
      key: 'RFQ_PUBLISH',
      payload: { invites: ['s-bharat', 's-alpha', 's-eastline', 's-fortune'], liveSuppliers: ['s-bharat', 's-eastline'], bidDueDate: now + 2 * DAY, incoterm: 'DAP' },
      userId: 'u-neha',
      at: now - 2 * DAY,
    });
  }

  // 6–7. PRs waiting in Engineering review so inboxes are not empty
  [
    ['case-0152', 152, 'Transformer Oil – 2 kL drums (BDV > 70 kV)', 'i-ct', 2, 380000, 3],
    ['case-0155', 155, 'Spare 132 kV Current Transformer – Unit 1', 'i-ct', 1, 640000, 1],
  ].forEach(([cid, n, title, item, qty, price, ago]) => {
    createCase(s, { id: cid, payload: pr(title, item, qty, price, { needByDate: now + 45 * DAY }), userId: 'u-ravi', submit: true, at: now - ago * DAY, nos: { pr: `PR-${years(n)}` } });
  });

  // Order by recency, newest first
  s.order.sort((a, b) => s.cases[b].createdAt - s.cases[a].createdAt);
  s.audit.sort((a, b) => b.at - a.at);
  s.notifications.sort((a, b) => b.at - a.at);
  // Older notifications count as read so the bell shows only fresh items
  s.notifications.forEach((n) => {
    if (n.at < now - 1 * DAY) n.readBy = [...n.userIds];
  });
  s.outbox.sort((a, b) => b.at - a.at);
  return s;
};
