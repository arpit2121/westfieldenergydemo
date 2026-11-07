import { configureStore, createSlice, createSelector } from '@reduxjs/toolkit';
import { buildSeed } from '../data/seed';
import { createCase, fastForward, runStep, sendBack } from './engine';
import { currentStep, setPurchaseType, MILESTONE_LABEL, isDelayed } from './flow';
import { userById, USERS } from '../data/masters';
import { DAY } from '../utils/format';

const STORAGE_KEY = 'westfield-p2p-demo-v1';

const load = (k) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

// ---------------------------------------------------------------------------
// session: who is logged in
// ---------------------------------------------------------------------------
const session = createSlice({
  name: 'session',
  initialState: { userId: null },
  reducers: {
    login: (s, a) => {
      s.userId = a.payload;
    },
    logout: (s) => {
      s.userId = null;
    },
  },
});

// ---------------------------------------------------------------------------
// ui: toasts
// ---------------------------------------------------------------------------
const ui = createSlice({
  name: 'ui',
  initialState: { toast: null },
  reducers: {
    toast: (s, a) => {
      s.toast = { id: Date.now(), severity: 'success', ...(typeof a.payload === 'string' ? { message: a.payload } : a.payload) };
    },
    clearToast: (s) => {
      s.toast = null;
    },
  },
});

// ---------------------------------------------------------------------------
// p2p: every business document, audit, notifications, outbox
// ---------------------------------------------------------------------------
const p2p = createSlice({
  name: 'p2p',
  initialState: buildSeed,
  reducers: {
    resetDemo: () => buildSeed(),
    createPr: {
      reducer: (s, a) => {
        createCase(s, a.payload);
      },
      prepare: (p) => ({ payload: { id: `case-${Date.now().toString(36)}`, ...p } }),
    },
    updateDraft: (s, a) => {
      const { caseId, payload } = a.payload;
      const c = s.cases[caseId];
      Object.assign(c, payload, { lines: payload.lines.map((l, i) => ({ ...l, lineNo: i + 1 })) });
      c.estimatedValue = c.lines.reduce((x, l) => x + l.qty * l.estUnitPrice, 0);
    },
    advance: (s, a) => {
      runStep(s, a.payload);
    },
    sendBackCase: (s, a) => {
      sendBack(s, a.payload);
    },
    addComment: (s, a) => {
      const { caseId, userId, body, internal = true } = a.payload;
      const c = s.cases[caseId];
      c.comments.push({ id: `cm-${Date.now()}`, authorId: userId, body, at: Date.now(), internal });
      const mentioned = USERS.filter((u) => body.includes(`@${u.name}`)).map((u) => u.id);
      if (mentioned.length)
        s.notifications.unshift({ id: `n-${Date.now()}`, userIds: mentioned, title: `${userById(userId).name} mentioned you`, body: body.slice(0, 80), caseId, tab: 'discussion', at: Date.now(), readBy: [] });
    },
    togglePurchaseType: (s, a) => {
      const { caseId, type, userId } = a.payload;
      const c = s.cases[caseId];
      setPurchaseType(c, type);
      s.audit.unshift({ id: `a-${Date.now()}`, caseId, docNo: c.po?.poNo || c.po?.draftNo || c.prNo, prNo: c.prNo, action: 'PURCHASE_TYPE_CHANGED', message: `Purchase type set to ${type === 'IMPORT' ? 'Import (pay first, then ship)' : 'Local (deliver first, then pay)'}`, userId, at: Date.now() });
    },
    // Logistics: booking, milestones, ETA revisions
    shipmentUpdate: (s, a) => {
      const { caseId, userId, booking, milestone, revisedEta, location, note } = a.payload;
      const c = s.cases[caseId];
      const sh = c.shipment;
      const at = Date.now();
      const wasDelayed = isDelayed(c);
      if (booking) {
        Object.assign(sh, booking);
        sh.eta = sh.dispatchedAt + (Number(sh.transitDays) + (sh.customsDays || 0)) * DAY;
        sh.milestone = 'BOOKED';
        sh.events.push({ milestone: 'BOOKED', at, by: userId, location: sh.origin, note: `${sh.mode === 'SEA' ? 'BL' : 'LR'} ${sh.trackingNo}, ${sh.transitDays} days transit` });
        logAudit(s, c, 'SHIPMENT_BOOKED', `Shipment booked – ${sh.trackingNo}, ETA ${new Date(sh.eta).toDateString().slice(4)}`, userId, at);
      }
      if (milestone) {
        sh.milestone = milestone;
        if (milestone === 'DELIVERED') sh.deliveredAt = at;
        sh.events.push({ milestone, at, by: userId, location: location || '', note: note || '' });
        logAudit(s, c, 'MILESTONE', `Shipment ${MILESTONE_LABEL[milestone].toLowerCase()}${location ? ` – ${location}` : ''}`, userId, at);
      }
      if (revisedEta) {
        sh.eta = revisedEta;
        sh.events.push({ milestone: sh.milestone, at, by: userId, location: location || '', note: note || 'ETA revised', revisedEta });
        logAudit(s, c, 'ETA_REVISED', `ETA revised to ${new Date(revisedEta).toDateString().slice(4)}${note ? ` – ${note}` : ''}`, userId, at);
      }
      const delayed = isDelayed(c);
      if (delayed && !wasDelayed) {
        s.notifications.unshift({ id: `n-${at}`, userIds: [c.buyerId, 'u-ajay', 'u-rohan'].filter(Boolean), title: `Shipment delayed – ${c.po.poNo}`, body: `ETA is past the need-by date`, caseId, tab: 'logistics', at, readBy: [], severity: 'error' });
      }
      if (milestone === 'DELIVERED' && currentStep(c)?.key === 'SHIP_TRACK') runStep(s, { caseId, key: 'SHIP_TRACK', payload: {}, userId, at });
    },
    fastForwardCase: (s, a) => {
      const { caseId, untilKey } = a.payload;
      fastForward(s, caseId, untilKey, { start: Date.now(), stepMs: 1000 });
    },
    markRead: (s, a) => {
      const { userId, id } = a.payload;
      s.notifications.forEach((n) => {
        if ((!id || n.id === id) && n.userIds.includes(userId) && !n.readBy.includes(userId)) n.readBy.push(userId);
      });
    },
    setSetting: (s, a) => {
      Object.assign(s.settings, a.payload);
    },
  },
});

function logAudit(s, c, action, message, userId, at) {
  s.audit.unshift({ id: `a-${at}-${Math.random().toString(36).slice(2, 6)}`, caseId: c.id, docNo: c.po?.poNo || c.prNo, prNo: c.prNo, action, message, userId, at });
}

export const { login, logout } = session.actions;
export const { toast, clearToast } = ui.actions;
export const {
  resetDemo,
  createPr,
  updateDraft,
  advance,
  sendBackCase,
  addComment,
  togglePurchaseType,
  shipmentUpdate,
  fastForwardCase,
  markRead,
  setSetting,
} = p2p.actions;

const persisted = load(STORAGE_KEY);

export const store = configureStore({
  reducer: { session: session.reducer, ui: ui.reducer, p2p: p2p.reducer },
  preloadedState: persisted ? { session: persisted.session, p2p: persisted.p2p } : undefined,
  middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
});

const save = () => {
  try {
    const { session: se, p2p: p } = store.getState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ session: se, p2p: p }));
  } catch {
    /* storage unavailable – demo still works in memory */
  }
};
let t;
store.subscribe(() => {
  clearTimeout(t);
  t = setTimeout(save, 250);
});
if (typeof window !== 'undefined') window.addEventListener('beforeunload', save);

// ---------------------------------------------------------------------------
// selectors
// ---------------------------------------------------------------------------
export const selectUser = (st) => userById(st.session.userId);
export const selectCases = createSelector([(st) => st.p2p.order, (st) => st.p2p.cases], (order, cases) => order.map((id) => cases[id]));
export const selectCase = (id) => (st) => st.p2p.cases[id];
export const selectSettings = (st) => st.p2p.settings;
