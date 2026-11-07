// The P2P workflow engine. One "case" is one PR carried all the way to closure.
// Every step is a pure mutation of the case object; the Redux slice calls
// applyStep() inside Immer, and the seed builder calls it on plain objects.

import {
  MGMT_THRESHOLD,
  STANDARD_TNC,
  SUPPLIERS,
  USERS,
  supplierById,
  termById,
  userById,
  partnerById,
} from '../data/masters';
import { DAY } from '../utils/format';

export const USD_RATE = 84;

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------
const S = (key, label, role, after, doc, tab) => ({ key, label, role, after, doc, tab });

const PR_STEPS = [
  S('PR_CREATE', 'Raise purchase requisition', 'ENG_CREATOR', 'PR Submitted', 'PR', 'pr'),
  S('PR_REVIEW', 'Engineering review', 'ENG_REVIEWER', 'PR Reviewed', 'PR', 'pr'),
  S('PR_ENG_APPROVE', 'Engineering approval', 'ENG_APPROVER', 'PR Eng-Approved', 'PR', 'pr'),
  S('PR_MGMT_APPROVE', 'Management approval', 'MGMT_APPROVER', 'PR Approved', 'PR', 'pr'),
  S('PR_ASSIGN', 'Assign buyer', 'CP_LEAD', 'Assigned to Buyer', 'PR', 'pr'),
];
const SOURCING_STEPS = [
  S('RFQ_PUBLISH', 'Create & publish RFQ', 'BUYER', 'RFQ Published', 'RFQ', 'sourcing'),
  S('QUOTE_SUBMIT', 'Supplier quotations', 'SUPPLIER_USER', 'Bids Received', 'QUOTATION', 'sourcing'),
  S('TBE_INTERNAL', 'TBE – internal engineering', 'ENG_APPROVER', 'TBE In Progress', 'TBE', 'tbe'),
  S('TBE_THIRD', 'TBE – third-party inspector', 'TECH_INSPECTOR', 'TBE Complete', 'TBE', 'tbe'),
  S('TBE_APPROVE', 'TBE approval', 'MGMT_APPROVER', 'TBE Approved', 'TBE', 'tbe'),
  S('CBE_RUN', 'Commercial evaluation (CBE)', 'BUYER', 'CBE Done', 'CBE', 'cbe'),
  S('QCS_SUBMIT', 'Prepare QCS & recommend award', 'BUYER', 'QCS Submitted', 'QCS', 'cbe'),
  S('QCS_APPROVE', 'QCS approval', 'CP_LEAD', 'QCS Approved', 'QCS', 'cbe'),
];
const PO_STEPS = [
  S('PO_DRAFT', 'Draft PO (+ LOI)', 'BUYER', 'PO In Approval', 'PO', 'po'),
  S('PO_FIN_REVIEW', 'Finance review – budget check', 'FIN_REVIEWER', 'PO Reviewed', 'PO', 'po'),
  S('PO_FIN_APPROVE', 'Finance approval – issue PO', 'FIN_APPROVER', 'PO Issued', 'PO', 'po'),
  S('PO_ACCEPT', 'Supplier accepts PO, uploads ABG/PBG', 'SUPPLIER_USER', 'PO Accepted', 'PO', 'po'),
];
const LOCAL_TAIL = [
  S('ADV_GOAHEAD', 'Request advance go-ahead', 'BUYER', 'Advance Go-ahead Requested', 'PAYMENT', 'finance'),
  S('ADV_REVIEW', 'Verify ABG & review advance', 'FIN_REVIEWER', 'Advance Reviewed', 'PAYMENT', 'finance'),
  S('ADV_PAY', 'Release advance payment', 'FIN_APPROVER', 'Advance Paid', 'PAYMENT', 'finance'),
  S('DISPATCH', 'Dispatch material + invoice', 'SUPPLIER_USER', 'Dispatched', 'SHIPMENT', 'logistics'),
  S('SHIP_TRACK', 'Transport & ETA tracking', 'LOGISTICS_USER', 'Delivered', 'SHIPMENT', 'logistics'),
];
const IMPORT_TAIL = [
  S('LC_OPEN', 'Open Letter of Credit', 'FIN_APPROVER', 'LC Opened', 'GUARANTEE', 'finance'),
  S('DISPATCH', 'Ship goods + shipping documents', 'SUPPLIER_USER', 'Shipped (docs submitted)', 'SHIPMENT', 'logistics'),
  S('DOC_PAY', 'Payment against shipping documents', 'FIN_APPROVER', 'Paid Against Documents', 'PAYMENT', 'finance'),
  S('SHIP_TRACK', 'Sea freight, customs & ETA tracking', 'LOGISTICS_USER', 'Delivered', 'SHIPMENT', 'logistics'),
];
const CLOSE_STEPS = [
  S('MRN_PREPARE', 'Prepare MRN', 'STORES_PREPARER', 'MRN Prepared', 'MRN', 'mrn'),
  S('MRN_REVIEW', 'Review MRN (QC)', 'STORES_REVIEWER', 'MRN Reviewed', 'MRN', 'mrn'),
  S('MRN_APPROVE', 'Approve MRN', 'STORES_APPROVER', 'Material Received', 'MRN', 'mrn'),
  S('BAL_REVIEW', '3-way match (PO · MRN · Invoice)', 'FIN_REVIEWER', 'Invoice Matched', 'PAYMENT', 'finance'),
  S('BAL_PAY', 'Release balance & close', 'FIN_APPROVER', 'Transaction Closed', 'PAYMENT', 'finance'),
];

export const getSteps = (c) => {
  const pr = PR_STEPS.filter((s) => s.key !== 'PR_MGMT_APPROVE' || (c.estimatedValue || 0) > MGMT_THRESHOLD);
  const hasAdvance = c.po
    ? c.payments.some((p) => p.type === 'ADVANCE')
    : (termById(c.rfq?.paymentTermId || 'pt-20-80')?.lines || []).some((l) => l.type === 'ADVANCE');
  const tail =
    c.purchaseType === 'IMPORT' ? IMPORT_TAIL : LOCAL_TAIL.filter((s) => hasAdvance || !s.key.startsWith('ADV_'));
  return [...pr, ...SOURCING_STEPS, ...PO_STEPS, ...tail, ...CLOSE_STEPS];
};

export const currentStep = (c) => {
  if (c.closed) return null;
  return getSteps(c).find((s) => !c.done.includes(s.key)) || null;
};

export const statusOf = (c) => {
  if (c.closed) return 'Transaction Closed';
  if (c.sentBack && !c.done.length) return 'Sent Back';
  if (!c.done.length) return 'Draft';
  const steps = getSteps(c);
  const last = [...steps].reverse().find((s) => c.done.includes(s.key));
  if (last?.key === 'RFQ_PUBLISH') {
    const n = c.quotes.length;
    return `RFQ Published (${n}/${c.rfq.invites.length} bids)`;
  }
  if (last?.key === 'QUOTE_SUBMIT') return `Bids Received (${c.quotes.length}/${c.rfq.invites.length})`;
  if (last?.key === 'DISPATCH' && c.shipment?.milestone && c.shipment.milestone !== 'DISPATCHED') {
    return c.shipment.milestone === 'IN_TRANSIT' ? 'In Transit' : `In Transit · ${MILESTONE_LABEL[c.shipment.milestone]}`;
  }
  return last?.after || 'Draft';
};

// Where the case sits, as a short stage name for lists
export const stageOf = (c) => {
  if (c.closed) return 'Closed';
  const s = currentStep(c);
  return s ? s.doc : 'Closed';
};

// Can this user act on the case's pending step?
export const canAct = (user, c, settings = {}) => {
  if (!user) return false;
  const step = currentStep(c);
  if (!step) return false;
  if (step.key === 'MRN_REVIEW' && settings.storesDirectApprove && user.role === 'STORES_APPROVER') return true;
  if (step.role !== user.role) return false;
  if (step.key === 'PR_CREATE') return c.requesterId === user.id;
  if (step.key === 'QUOTE_SUBMIT') return pendingSuppliers(c).includes(user.supplierId);
  if (step.key === 'PO_ACCEPT' || step.key === 'DISPATCH') return c.po?.supplierId === user.supplierId;
  if (step.key === 'SHIP_TRACK') return !c.shipment?.partnerId || c.shipment.partnerId === user.logisticsPartnerId;
  if (step.role === 'BUYER') return c.buyerId === user.id;
  return true;
};

export const pendingSuppliers = (c) =>
  (c.rfq?.invites || []).filter((sid) => !c.quotes.some((q) => q.supplierId === sid));

// Users who should be told that the step is waiting for them
export const recipientsFor = (c, step) => {
  if (!step) return [];
  if (step.key === 'QUOTE_SUBMIT') return USERS.filter((u) => pendingSuppliers(c).includes(u.supplierId)).map((u) => u.id);
  if (step.key === 'PO_ACCEPT' || step.key === 'DISPATCH') return USERS.filter((u) => u.supplierId === c.po?.supplierId).map((u) => u.id);
  if (step.key === 'PR_CREATE') return [c.requesterId];
  if (step.role === 'BUYER' && c.buyerId) return [c.buyerId];
  return USERS.filter((u) => u.role === step.role).map((u) => u.id);
};

// Supplier / logistics users see only part of a case
export const isExternal = (user) => ['SUPPLIER_USER', 'LOGISTICS_USER', 'TECH_INSPECTOR'].includes(user?.role);

// ---------------------------------------------------------------------------
// Bid templates: ratios against the PR estimate, so any PR produces believable
// bids. For the live PR (estimate ₹54 L for 3 sets) they give the plan's
// exact figures: Bharat ₹49.50 L (L1) ... Delta ₹54.65 L (L5), Crest sealed.
// ---------------------------------------------------------------------------
export const BID_TEMPLATES = {
  's-bharat': { priceFactor: 0.9, incoterm: 'EXW', freightFrac: 0.016667, dutyPct: 0, otherFrac: 0, deliveryWeeks: 6, subVendorId: 'sv-abb', tier: 'T2', score: 82, tnc: true, deviation: 'Delivery in 6 weeks from drawing approval.' },
  's-alpha': { priceFactor: 0.93333, incoterm: 'DDP', freightFrac: 0, dutyPct: 0, otherFrac: 0, deliveryWeeks: 5, subVendorId: null, tier: 'T1', score: 94, tnc: true, deviation: '' },
  's-eastline': { priceFactor: 0.95, incoterm: 'FOB', freightFrac: 0.011111, dutyPct: 0, otherFrac: 0, deliveryWeeks: 7, subVendorId: 'sv-cgl', tier: 'T2', score: 79, tnc: true, deviation: 'LD capped at 5%.' },
  's-fortune': { priceFactor: 0.97778, incoterm: 'DAP', freightFrac: 0, dutyPct: 0, otherFrac: 0, deliveryWeeks: 6, subVendorId: 'sv-siemens', tier: 'T1', score: 91, tnc: true, deviation: '' },
  's-delta': { priceFactor: 0.91, incoterm: 'CIF', freightFrac: 0, dutyPct: 10, otherFrac: 0.011111, deliveryWeeks: 10, subVendorId: null, tier: 'T1', score: 96, tnc: true, deviation: 'Payment through irrevocable LC at sight.' },
  's-crest': { priceFactor: 0.82778, incoterm: 'EXW', freightFrac: 0.014815, dutyPct: 0, otherFrac: 0, deliveryWeeks: 4, subVendorId: null, tier: 'T3', score: 46, tnc: false, deviation: 'Type test reports older than 5 years; creepage distance below spec.' },
};

const TBE_REMARKS = {
  T1: 'Fully compliant with specification and GTP. Type test reports valid.',
  T2: 'Compliant with minor deviations (delivery schedule / documentation). Acceptable.',
  T3: 'Major deviations from specification. Not acceptable.',
};

export const quoteTotals = (q) => {
  const subtotal = q.lines.reduce((a, l) => a + l.unitPriceInr * l.qty, 0);
  const duty = Math.round((subtotal * (q.dutyPct || 0)) / 100);
  const landed = subtotal + (q.freight || 0) + duty + (q.otherCharges || 0);
  return { subtotal, duty, landed };
};

export const buildQuote = (c, supplierId, override = {}, at = Date.now()) => {
  const t = BID_TEMPLATES[supplierId] || BID_TEMPLATES['s-alpha'];
  const sup = supplierById(supplierId);
  const isUsd = sup.currency === 'USD';
  const lines = c.lines.map((l) => {
    const raw = l.estUnitPrice * t.priceFactor;
    const unitPriceFx = isUsd ? Math.round(raw / USD_RATE / 10) * 10 : Math.round(raw / 100) * 100;
    return {
      lineNo: l.lineNo,
      itemId: l.itemId,
      qty: l.qty,
      unitPriceInr: isUsd ? unitPriceFx * USD_RATE : unitPriceFx,
      unitPriceFx,
    };
  });
  const q = {
    id: `q-${c.id}-${supplierId}`,
    quoteNo: `QT-${sup.code.slice(4)}-${String(c.rfq.eventNo).slice(-4)}`,
    supplierId,
    currency: sup.currency,
    fxRate: isUsd ? USD_RATE : 1,
    incoterm: t.incoterm,
    freight: Math.round((c.estimatedValue * t.freightFrac) / 1000) * 1000,
    dutyPct: t.dutyPct,
    otherCharges: Math.round((c.estimatedValue * t.otherFrac) / 1000) * 1000,
    deliveryWeeks: t.deliveryWeeks,
    validityDays: 90,
    tncAccepted: t.tnc,
    deviations: t.deviation,
    subVendorId: t.subVendorId,
    paymentTermsText: isUsd ? '100% by irrevocable LC at sight' : 'As per RFQ',
    attachments: [`${sup.name.split(' ')[0]}_Technical_Offer.pdf`, `${sup.name.split(' ')[0]}_GTP.pdf`],
    status: 'SUBMITTED',
    submittedAt: at,
    ...override,
  };
  if (override.lines) q.lines = override.lines;
  else q.lines = lines;
  q.landed = quoteTotals(q).landed;
  return q;
};

// ---------------------------------------------------------------------------
// Case factory
// ---------------------------------------------------------------------------
export const newCase = ({ id, requesterId, at }) => ({
  id,
  prNo: null,
  title: '',
  requesterId,
  department: 'Engineering',
  purpose: 'OWN_USE',
  customerId: null,
  deliveryLocation: 'Unit 2 – 132 kV Substation, Jamnagar',
  needByDate: at + 56 * DAY,
  justification: '',
  currency: 'INR',
  lines: [],
  attachments: [],
  estimatedValue: 0,
  purchaseType: 'LOCAL',
  buyerId: null,
  done: [],
  sentBack: null,
  closed: false,
  closedAt: null,
  createdAt: at,
  updatedAt: at,
  rfq: null,
  quotes: [],
  tbe: {},
  cbe: [],
  qcs: null,
  loi: null,
  po: null,
  guarantees: [],
  payments: [],
  shipment: null,
  invoice: null,
  mrn: null,
  approvals: [],
  comments: [],
});

// ---------------------------------------------------------------------------
// Shipment milestones
// ---------------------------------------------------------------------------
export const MILESTONE_LABEL = {
  DISPATCHED: 'Ready for pickup',
  BOOKED: 'Booked',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  AT_PORT: 'At port',
  CUSTOMS_CLEARANCE: 'Customs clearance',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};
export const milestonesFor = (mode) =>
  mode === 'SEA' || mode === 'AIR'
    ? ['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED']
    : ['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const isDelayed = (c) => c.shipment?.eta && c.po && c.shipment.eta > c.po.needByDate && c.shipment.milestone !== 'DELIVERED';

// ---------------------------------------------------------------------------
// Payment schedule / guarantees from purchase type
// ---------------------------------------------------------------------------
const buildFinance = (c) => {
  const total = c.po.total;
  const termId = c.purchaseType === 'IMPORT' ? 'pt-lc' : c.po.paymentTermId || 'pt-20-80';
  c.po.paymentTermId = termId;
  const tmpl = termById(termId);
  c.payments = tmpl.lines.map((l, i) => ({
    seq: i + 1,
    type: l.type,
    trigger: l.trigger,
    percent: l.percent,
    amount: Math.round((total * l.percent) / 100),
    dueDays: l.dueDays || 0,
    status: 'PENDING',
    utr: null,
    paidAt: null,
  }));
  const g = [];
  const adv = tmpl.lines.find((l) => l.type === 'ADVANCE');
  if (adv) g.push({ type: 'ABG', amount: Math.round((total * adv.percent) / 100), percent: adv.percent, status: 'PENDING' });
  if (c.purchaseType === 'IMPORT') g.push({ type: 'LC', amount: Math.round(total * 0.9), percent: 90, status: 'PENDING' });
  g.push({ type: 'PBG', amount: Math.round(total * 0.1), percent: 10, status: 'PENDING' });
  c.guarantees = g;
};

export const canTogglePurchaseType = (c) =>
  !!c.po && !c.done.some((k) => ['ADV_GOAHEAD', 'LC_OPEN', 'DISPATCH'].includes(k)) && !c.closed;

export const setPurchaseType = (c, type) => {
  c.purchaseType = type;
  if (c.po) {
    c.po.purchaseType = type;
    if (type === 'LOCAL' && c.po.paymentTermId === 'pt-lc') c.po.paymentTermId = 'pt-20-80';
    // remember supplier uploads so they survive switching back and forth
    c.gStash = c.gStash || {};
    c.guarantees.filter((g) => g.status !== 'PENDING').forEach((g) => (c.gStash[g.type] = g));
    buildFinance(c);
    c.guarantees = c.guarantees.map((g) => c.gStash[g.type] || g);
  }
};

const utr = () => `UTR${Math.floor(1e11 + Math.random() * 9e11)}`;

// ---------------------------------------------------------------------------
// applyStep: mutate case for one step. ctx = { user, at, settings, nextNo, log, notify, email }
// Returns false if the step is not complete yet (e.g. waiting for more bids).
// ---------------------------------------------------------------------------
export const applyStep = (c, key, payload = {}, ctx) => {
  const { user, at } = ctx;
  const stamp = (action, extra = {}) =>
    c.approvals.push({ stepKey: key, action, userId: user.id, role: user.role, at, comment: payload.comment || '', ...extra });

  switch (key) {
    case 'PR_CREATE': {
      Object.assign(c, {
        title: payload.title,
        purpose: payload.purpose,
        customerId: payload.customerId || null,
        deliveryLocation: payload.deliveryLocation,
        needByDate: payload.needByDate,
        justification: payload.justification,
        lines: payload.lines.map((l, i) => ({ ...l, lineNo: i + 1 })),
        attachments: payload.attachments || [],
      });
      c.estimatedValue = c.lines.reduce((a, l) => a + l.qty * l.estUnitPrice, 0);
      if (!c.prNo) c.prNo = c.nos?.pr || ctx.nextNo('PR');
      c.sentBack = null;
      const again = c.approvals.some((a) => a.stepKey === 'PR_CREATE');
      stamp(again ? 'RESUBMITTED' : 'SUBMITTED');
      ctx.log(c, again ? 'PR_RESUBMITTED' : 'PR_SUBMITTED', again ? `PR ${c.prNo} corrected and resubmitted` : `PR ${c.prNo} submitted – ${c.title}`);
      break;
    }
    case 'PR_REVIEW':
      stamp('REVIEWED');
      ctx.log(c, 'PR_REVIEWED', `PR reviewed by ${user.name}`);
      break;
    case 'PR_ENG_APPROVE':
      stamp('APPROVED');
      ctx.log(c, 'PR_ENG_APPROVED', `PR approved by Engineering Head${c.estimatedValue > MGMT_THRESHOLD ? ' – routed to Management (value above ₹10 lakh)' : ''}`);
      break;
    case 'PR_MGMT_APPROVE':
      stamp('APPROVED');
      ctx.log(c, 'PR_MGMT_APPROVED', `PR approved by Management`);
      break;
    case 'PR_ASSIGN':
      c.buyerId = payload.buyerId;
      stamp('ASSIGNED');
      ctx.log(c, 'PR_ASSIGNED', `PR assigned to buyer ${userById(payload.buyerId).name}`);
      break;

    case 'RFQ_PUBLISH': {
      c.rfq = {
        eventNo: c.nos?.rfq || ctx.nextNo('RFQ'),
        type: payload.type || 'RFQ',
        title: payload.title || c.title,
        tnc: payload.tnc || STANDARD_TNC,
        incoterm: payload.incoterm || 'EXW',
        freightBy: payload.freightBy || 'BUYER',
        paymentTermId: payload.paymentTermId || 'pt-20-80',
        bidDueDate: payload.bidDueDate || at + 7 * DAY,
        invites: payload.invites,
        publishedAt: at,
        pricesSealed: true,
      };
      stamp('PUBLISHED');
      ctx.log(c, 'RFQ_PUBLISHED', `${c.rfq.type} ${c.rfq.eventNo} published to ${payload.invites.length} suppliers`);
      payload.invites.forEach((sid) => ctx.email(supplierById(sid).email, `Invitation to bid – ${c.rfq.eventNo}`, c));
      // Other suppliers have already quoted in the demo; Bharat quotes live.
      const live = payload.liveSuppliers ?? ['s-bharat'];
      payload.invites
        .filter((sid) => !live.includes(sid))
        .forEach((sid, i) => {
          c.quotes.push(buildQuote(c, sid, {}, at + (i + 1) * 45000));
          ctx.log(c, 'QUOTE_SUBMITTED', `Quotation received from ${supplierById(sid).name}`, at + (i + 1) * 45000, userByRoleSupplier(sid));
        });
      if (pendingSuppliers(c).length === 0) {
        c.done.push('RFQ_PUBLISH');
        return 'AUTO_NEXT';
      }
      break;
    }
    case 'QUOTE_SUBMIT': {
      if (payload.supplierId) {
        const q = buildQuote(c, payload.supplierId, payload.quote || {}, at);
        c.quotes = c.quotes.filter((x) => x.supplierId !== payload.supplierId).concat(q);
        ctx.log(c, 'QUOTE_SUBMITTED', `Quotation ${q.quoteNo} submitted by ${supplierById(payload.supplierId).name} (price sealed)`);
      }
      if (pendingSuppliers(c).length > 0) return false;
      ctx.log(c, 'BIDS_CLOSED', `All ${c.quotes.length} bids received – bidding closed`);
      break;
    }
    case 'TBE_INTERNAL':
    case 'TBE_THIRD': {
      const slot = key === 'TBE_INTERNAL' ? 'internal' : 'third';
      c.quotes.forEach((q) => {
        const t = BID_TEMPLATES[q.supplierId] || BID_TEMPLATES['s-alpha'];
        const s = payload.scores?.[q.id] || {
          tier: t.tier,
          score: slot === 'third' ? Math.max(0, t.score - 2) : t.score,
          remarks: TBE_REMARKS[t.tier],
        };
        c.tbe[q.id] = c.tbe[q.id] || {};
        c.tbe[q.id][slot] = { ...s, result: s.tier === 'T3' ? 'FAIL' : 'PASS', evaluatorId: user.id, at };
      });
      stamp('EVALUATED');
      ctx.log(c, slot === 'internal' ? 'TBE_INTERNAL_DONE' : 'TBE_THIRD_DONE', `${slot === 'internal' ? 'Internal' : 'Third-party'} technical evaluation completed by ${user.name}`);
      break;
    }
    case 'TBE_APPROVE': {
      c.quotes.forEach((q) => {
        const e = c.tbe[q.id] || {};
        const fail = e.internal?.result === 'FAIL' || e.third?.result === 'FAIL';
        q.status = fail ? 'TECH_DISQUALIFIED' : 'TECH_QUALIFIED';
        q.finalTier = [e.internal?.tier, e.third?.tier].sort().pop() || 'T1';
      });
      stamp('APPROVED');
      const dq = c.quotes.filter((q) => q.status === 'TECH_DISQUALIFIED').map((q) => supplierById(q.supplierId).name);
      ctx.log(c, 'TBE_APPROVED', `TBE approved. ${c.quotes.length - dq.length} bids technically qualified${dq.length ? `; disqualified: ${dq.join(', ')}` : ''}`);
      break;
    }
    case 'CBE_RUN': {
      c.rfq.pricesSealed = false;
      const ranked = c.quotes
        .filter((q) => q.status === 'TECH_QUALIFIED')
        .map((q) => ({ quoteId: q.id, landed: quoteTotals(q).landed, tier: q.finalTier }))
        .sort((a, b) => a.landed - b.landed)
        .map((r, i) => ({ ...r, rank: i + 1 }));
      c.cbe = ranked;
      stamp('EVALUATED');
      ctx.log(c, 'PRICES_UNSEALED', `Prices unsealed for ${ranked.length} qualified bids. L1: ${supplierById(c.quotes.find((q) => q.id === ranked[0]?.quoteId)?.supplierId)?.name}`);
      break;
    }
    case 'QCS_SUBMIT': {
      const awardId = payload.awardQuoteId || c.cbe[0]?.quoteId;
      const award = c.cbe.find((r) => r.quoteId === awardId);
      const avg = c.cbe.reduce((a, r) => a + r.landed, 0) / (c.cbe.length || 1);
      c.qcs = {
        qcsNo: c.nos?.qcs || ctx.nextNo('QCS'),
        awardQuoteId: awardId,
        justification: payload.justification || '',
        savingsVsEstimate: c.estimatedValue - award.landed,
        savingsVsAverage: avg - award.landed,
        status: 'SUBMITTED',
        preparedBy: user.id,
        at,
      };
      stamp('PREPARED');
      ctx.log(c, 'QCS_SUBMITTED', `QCS ${c.qcs.qcsNo} prepared – award recommended to ${supplierById(c.quotes.find((q) => q.id === awardId).supplierId).name} (L${award.rank}/${award.tier})`);
      break;
    }
    case 'QCS_APPROVE':
      c.qcs.status = 'APPROVED';
      c.quotes.forEach((q) => {
        if (q.status === 'TECH_QUALIFIED') q.status = q.id === c.qcs.awardQuoteId ? 'AWARDED' : 'NOT_AWARDED';
      });
      stamp('APPROVED');
      ctx.log(c, 'QCS_APPROVED', `QCS ${c.qcs.qcsNo} approved by C&P Lead`);
      break;

    case 'PO_DRAFT': {
      const q = c.quotes.find((x) => x.id === c.qcs.awardQuoteId);
      const t = quoteTotals(q);
      const lines = q.lines.map((l) => ({ ...l, lineTotal: l.unitPriceInr * l.qty, receivedQty: 0 }));
      const extra = (q.freight || 0) + t.duty + (q.otherCharges || 0);
      c.po = {
        draftNo: c.nos?.dpo || ctx.nextNo('DPO'),
        poNo: null,
        version: 1,
        supplierId: q.supplierId,
        quoteId: q.id,
        incoterm: q.incoterm,
        currency: 'INR',
        lines,
        charges: extra,
        subtotal: t.subtotal,
        taxAmount: 0,
        total: t.landed,
        deliveryLocation: payload.deliveryLocation || c.deliveryLocation,
        needByDate: payload.needByDate || c.needByDate,
        tnc: c.rfq.tnc,
        paymentTermId: payload.paymentTermId || c.rfq.paymentTermId,
        status: 'IN_APPROVAL',
        issuedAt: null,
        acceptedAt: null,
      };
      c.purchaseType = payload.purchaseType || (supplierById(q.supplierId).type === 'IMPORT' ? 'IMPORT' : 'LOCAL');
      c.po.purchaseType = c.purchaseType;
      buildFinance(c);
      if (payload.sendLoi !== false) {
        c.loi = { loiNo: c.nos?.loi || ctx.nextNo('LOI'), amount: t.landed, issuedAt: at, supplierId: q.supplierId };
        ctx.log(c, 'LOI_SENT', `LOI ${c.loi.loiNo} sent to ${supplierById(q.supplierId).name}`);
        ctx.email(supplierById(q.supplierId).email, `Letter of Intent ${c.loi.loiNo}`, c);
      }
      stamp('PREPARED');
      ctx.log(c, 'PO_DRAFTED', `Draft PO ${c.po.draftNo} created from QCS and submitted for approval`);
      break;
    }
    case 'PO_FIN_REVIEW':
      stamp('REVIEWED', { comment: payload.comment || 'Budget available under CAPEX head 4120 – Substation Upgrades.' });
      ctx.log(c, 'PO_REVIEWED', `Finance review complete – budget check passed`);
      break;
    case 'PO_FIN_APPROVE':
      c.po.poNo = c.nos?.po || ctx.nextNo('PO');
      c.po.status = 'ISSUED';
      c.po.issuedAt = at;
      stamp('APPROVED');
      ctx.log(c, 'PO_ISSUED', `PO ${c.po.poNo} issued to ${supplierById(c.po.supplierId).name}`);
      ctx.email(supplierById(c.po.supplierId).email, `Purchase Order ${c.po.poNo}`, c);
      break;
    case 'PO_ACCEPT': {
      c.po.status = 'ACCEPTED';
      c.po.acceptedAt = at;
      const sup = supplierById(c.po.supplierId);
      c.guarantees.forEach((g) => {
        if (g.type === 'LC') return;
        const p = payload[g.type.toLowerCase()] || {};
        Object.assign(g, {
          referenceNo: p.referenceNo || `${g.type}/${sup.code.slice(4)}/${String(Math.floor(at / 1000)).slice(-5)}`,
          bankName: p.bankName || (sup.type === 'IMPORT' ? 'Deutsche Bank AG' : 'State Bank of India'),
          issueDate: at,
          expiryDate: p.expiryDate || at + (g.type === 'PBG' ? 455 : 120) * DAY,
          fileName: p.fileName || `${g.type}_${sup.name.split(' ')[0]}_scan.pdf`,
          status: 'RECEIVED',
        });
      });
      stamp('ACCEPTED');
      ctx.log(c, 'PO_ACCEPTED', `PO accepted by ${sup.name}; ${c.guarantees.filter((g) => g.status === 'RECEIVED').map((g) => g.type).join(' + ')} uploaded`);
      break;
    }

    case 'ADV_GOAHEAD': {
      const p = c.payments.find((x) => x.type === 'ADVANCE');
      if (p) p.status = 'GO_AHEAD_REQUESTED';
      const body = payload.comment || '@Karan Mehta go ahead for the 20% advance – ABG received and attached on the PO.';
      c.comments.push({ id: `cm-${at}`, authorId: user.id, body, at, internal: true });
      stamp('REQUESTED', { comment: body });
      ctx.log(c, 'ADVANCE_GOAHEAD', `Buyer requested go-ahead for advance payment`);
      break;
    }
    case 'ADV_REVIEW': {
      const p = c.payments.find((x) => x.type === 'ADVANCE');
      if (p) p.status = 'REVIEWED';
      const abg = c.guarantees.find((g) => g.type === 'ABG');
      if (abg) Object.assign(abg, { status: 'VERIFIED', verifiedBy: user.id, verifiedAt: at });
      const body = payload.comment || 'ABG verified with issuing bank. Forwarding advance for approval.';
      c.comments.push({ id: `cm-${at}`, authorId: user.id, body, at, internal: true });
      stamp('REVIEWED', { comment: body });
      ctx.log(c, 'ABG_VERIFIED', `ABG verified and advance reviewed by Finance`);
      break;
    }
    case 'ADV_PAY': {
      const p = c.payments.find((x) => x.type === 'ADVANCE');
      if (p) Object.assign(p, { status: 'PAID', utr: utr(), paidAt: at, approvedAt: at });
      stamp('APPROVED');
      ctx.log(c, 'ADVANCE_PAID', `Advance of ₹${(p.amount / 100000).toFixed(2)} lakh released – ${p.utr}`);
      ctx.email(supplierById(c.po.supplierId).email, `Payment advice – ${p.utr}`, c);
      break;
    }
    case 'LC_OPEN': {
      const lc = c.guarantees.find((g) => g.type === 'LC');
      Object.assign(lc, {
        referenceNo: payload.referenceNo || `LC/HDFC/${String(Math.floor(at / 1000)).slice(-6)}`,
        bankName: payload.bankName || 'HDFC Bank – Trade Finance',
        issueDate: at,
        expiryDate: at + 120 * DAY,
        fileName: 'LC_telecopy.pdf',
        status: 'VERIFIED',
      });
      stamp('APPROVED');
      ctx.log(c, 'LC_OPENED', `Letter of Credit ${lc.referenceNo} opened`);
      break;
    }
    case 'DISPATCH': {
      const imp = c.purchaseType === 'IMPORT';
      c.invoice = {
        invoiceNo: payload.invoiceNo || `INV/${supplierById(c.po.supplierId).code.slice(4)}/${String(Math.floor(at / 1000)).slice(-4)}`,
        invoiceDate: at,
        amount: c.po.total,
        match: 'PENDING',
        docs: imp ? ['Commercial Invoice', 'Bill of Lading', 'Packing List', 'Certificate of Origin'] : ['Tax Invoice', 'Packing List', 'Test Certificate'],
      };
      c.shipment = {
        shipmentNo: c.nos?.shp || ctx.nextNo('SHP'),
        partnerId: payload.partnerId || 'lp-swift',
        mode: imp ? 'SEA' : payload.mode || 'ROAD',
        origin: payload.origin || (imp ? 'Hamburg, DE' : `${supplierById(c.po.supplierId).city} works`),
        destination: c.po.deliveryLocation,
        trackingNo: null,
        transitDays: null,
        customsDays: imp ? 5 : 0,
        dispatchedAt: at,
        eta: null,
        milestone: 'DISPATCHED',
        events: [{ milestone: 'DISPATCHED', at, by: user.id, note: 'Material packed and ready for pickup', location: payload.origin || '' }],
      };
      stamp('DISPATCHED');
      ctx.log(c, 'DISPATCHED', `Material dispatched by supplier – invoice ${c.invoice.invoiceNo}`);
      break;
    }
    case 'DOC_PAY': {
      const p = c.payments.find((x) => x.type === 'AGAINST_DOCUMENTS');
      if (p) Object.assign(p, { status: 'PAID', utr: utr(), paidAt: at });
      stamp('APPROVED');
      ctx.log(c, 'DOCS_PAID', `Payment released against shipping documents under LC`);
      break;
    }
    case 'SHIP_TRACK': {
      // full auto-run (seed / fast-forward): book and deliver
      if (payload.auto) {
        const ms = milestonesFor(c.shipment.mode);
        c.shipment.trackingNo = c.shipment.trackingNo || (c.shipment.mode === 'SEA' ? 'MAEU-4471920' : 'SC-778213');
        c.shipment.transitDays = c.shipment.transitDays || (c.shipment.mode === 'SEA' ? 24 : 6);
        c.shipment.eta = c.shipment.dispatchedAt + (c.shipment.transitDays + c.shipment.customsDays) * DAY;
        ms.forEach((m, i) => c.shipment.events.push({ milestone: m, at: at - (ms.length - i) * 3600000, by: user.id, location: '', note: '' }));
        c.shipment.milestone = 'DELIVERED';
        c.shipment.deliveredAt = at;
      }
      if (c.shipment.milestone !== 'DELIVERED') return false;
      ctx.log(c, 'DELIVERED', `Shipment ${c.shipment.shipmentNo} delivered at ${c.po.deliveryLocation}`);
      break;
    }

    case 'MRN_PREPARE': {
      c.mrn = {
        mrnNo: c.nos?.mrn || ctx.nextNo('MRN'),
        storeLocation: payload.storeLocation || 'Main Store – Bay 4',
        remarks: payload.remarks || '',
        lines: c.po.lines.map((l, i) => {
          const p = payload.lines?.[i] || {};
          return {
            lineNo: l.lineNo,
            itemId: l.itemId,
            orderedQty: l.qty,
            receivedQty: p.receivedQty ?? l.qty,
            acceptedQty: p.acceptedQty ?? l.qty,
            rejectedQty: p.rejectedQty ?? 0,
            remarks: p.remarks || 'Visual + QC inspection OK',
          };
        }),
        status: 'PREPARED',
        at,
      };
      stamp('PREPARED');
      ctx.log(c, 'MRN_PREPARED', `MRN ${c.mrn.mrnNo} prepared against ${c.po.poNo}`);
      break;
    }
    case 'MRN_REVIEW':
      if (user.role === 'STORES_APPROVER') {
        // Direct approval – review skipped by configuration
        c.done.push('MRN_REVIEW');
        applyStep(c, 'MRN_APPROVE', { ...payload, direct: true }, { ...ctx, key: 'MRN_APPROVE' });
        c.done.push('MRN_APPROVE');
        return 'HANDLED';
      }
      c.mrn.status = 'REVIEWED';
      stamp('REVIEWED');
      ctx.log(c, 'MRN_REVIEWED', `MRN reviewed – QC accepted quantities confirmed`);
      break;
    case 'MRN_APPROVE':
      c.mrn.status = 'APPROVED';
      c.po.lines.forEach((l, i) => (l.receivedQty = c.mrn.lines[i]?.acceptedQty ?? l.qty));
      c.po.status = 'RECEIVED';
      stamp('APPROVED', payload.direct ? { comment: 'Direct approval (review step skipped as per configuration)' } : {});
      ctx.log(c, 'MRN_APPROVED', `MRN ${c.mrn.mrnNo} approved${payload.direct ? ' directly by Stores Manager' : ''} – material taken on stock`);
      break;
    case 'BAL_REVIEW': {
      const accepted = c.mrn.lines.reduce((a, l) => a + l.acceptedQty, 0);
      const ordered = c.po.lines.reduce((a, l) => a + l.qty, 0);
      c.invoice.match = accepted === ordered && c.invoice.amount === c.po.total ? 'MATCHED' : 'MISMATCH';
      const p = c.payments.find((x) => x.status === 'PENDING');
      if (p) p.status = 'REVIEWED';
      stamp('REVIEWED');
      ctx.log(c, 'THREE_WAY_MATCH', `3-way match ${c.invoice.match === 'MATCHED' ? 'passed' : 'failed'} (PO · MRN · Invoice)`);
      break;
    }
    case 'BAL_PAY': {
      c.payments.filter((x) => x.status !== 'PAID').forEach((p) => Object.assign(p, { status: 'PAID', utr: utr(), paidAt: at }));
      c.po.status = 'CLOSED';
      c.closed = true;
      c.closedAt = at;
      stamp('APPROVED');
      ctx.log(c, 'BALANCE_PAID', `Balance payment released`);
      ctx.log(c, 'TRANSACTION_CLOSED', `Transaction closed – ${c.prNo} / ${c.po.poNo}`);
      break;
    }
    default:
      return false;
  }
  return true;
};

function userByRoleSupplier(sid) {
  return USERS.find((u) => u.supplierId === sid);
}

// Sensible default payload for auto-running a step (seed + fast-forward)
export const defaultPayload = (c, key) => {
  switch (key) {
    case 'PR_CREATE': {
      const { title, purpose, customerId, deliveryLocation, needByDate, justification, lines, attachments } = c;
      return { title, purpose, customerId, deliveryLocation, needByDate, justification, lines, attachments };
    }
    case 'PR_ASSIGN':
      return { buyerId: 'u-neha' };
    case 'RFQ_PUBLISH':
      return { invites: SUPPLIERS.map((s) => s.id), liveSuppliers: [] };
    case 'QUOTE_SUBMIT':
      return { supplierId: pendingSuppliers(c)[0] };
    case 'SHIP_TRACK':
      return { auto: true };
    default:
      return {};
  }
};

// Who performs a step when auto-running
export const actorFor = (c, step) => {
  if (step.key === 'PR_CREATE') return userById(c.requesterId);
  if (step.key === 'QUOTE_SUBMIT') return USERS.find((u) => u.supplierId === pendingSuppliers(c)[0]);
  if (step.key === 'PO_ACCEPT' || step.key === 'DISPATCH') return USERS.find((u) => u.supplierId === c.po.supplierId);
  if (step.role === 'BUYER') return userById(c.buyerId || 'u-neha');
  if (step.key === 'SHIP_TRACK') return userById('u-swift');
  return USERS.find((u) => u.role === step.role);
};

export const partnerName = (id) => partnerById(id)?.name || '—';
