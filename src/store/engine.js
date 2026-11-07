// Runs workflow steps against the whole demo state (cases + audit + notifications).
// Shared by the Redux reducers and the seed builder.
import { applyStep, currentStep, recipientsFor, defaultPayload, actorFor, newCase } from './flow';
import { userById } from '../data/masters';

let seq = 0;
const uid = (p) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const initialCounters = { PR: 147, RFQ: 58, QCS: 31, DPO: 231, PO: 231, LOI: 12, SHP: 405, MRN: 318 };

const makeCtx = (state, user, at) => ({
  user,
  at,
  settings: state.settings,
  nextNo: (type) => {
    const used = new Set(
      Object.values(state.cases).flatMap((c) => [
        c.prNo,
        c.rfq?.eventNo,
        c.po?.poNo,
        c.po?.draftNo,
        c.qcs?.qcsNo,
        c.loi?.loiNo,
        c.shipment?.shipmentNo,
        c.mrn?.mrnNo,
        ...Object.values(c.nos || {}),
      ]),
    );
    let no;
    do {
      no = `${type}-2026-${String(state.counters[type]++).padStart(4, '0')}`;
    } while (used.has(no));
    return no;
  },
  log: (c, action, message, when = at, actor = user) => {
    state.audit.unshift({
      id: uid('a'),
      caseId: c.id,
      docNo: c.po?.poNo || c.po?.draftNo || c.rfq?.eventNo || c.prNo,
      prNo: c.prNo,
      action,
      message,
      userId: actor?.id,
      at: when,
    });
  },
  email: (to, subject, c) => {
    state.outbox.unshift({ id: uid('m'), to, subject, caseId: c.id, at, from: user.email });
  },
});

const notifyNext = (state, c, at) => {
  const step = currentStep(c);
  if (!step) {
    if (c.closed) {
      const ids = [c.requesterId, c.buyerId, 'u-vikram', 'u-priya'].filter(Boolean);
      state.notifications.unshift({ id: uid('n'), userIds: ids, title: `${c.prNo} closed`, body: `Transaction closed – ${c.po?.poNo}`, caseId: c.id, tab: 'timeline', at, readBy: [] });
    }
    return;
  }
  const ids = recipientsFor(c, step);
  if (!ids.length) return;
  state.notifications.unshift({
    id: uid('n'),
    userIds: ids,
    title: `${step.label}`,
    body: `${c.po?.poNo || c.rfq?.eventNo || c.prNo} · ${c.title}`,
    caseId: c.id,
    tab: step.tab,
    at,
    readBy: [],
  });
};

export const runStep = (state, { caseId, key, payload = {}, userId, at = Date.now() }) => {
  const c = state.cases[caseId];
  if (!c) return false;
  const user = userById(userId);
  const ctx = makeCtx(state, user, at);
  const res = applyStep(c, key, payload, ctx);
  if (res === true && !c.done.includes(key)) c.done.push(key);
  if (res === 'AUTO_NEXT') {
    // RFQ published and every invited supplier already quoted
    applyStep(c, 'QUOTE_SUBMIT', {}, ctx);
    c.done.push('QUOTE_SUBMIT');
  }
  c.updatedAt = at;
  if (res) notifyNext(state, c, at);
  return res;
};

export const sendBack = (state, { caseId, toKey, comment, userId, at = Date.now() }) => {
  const c = state.cases[caseId];
  const user = userById(userId);
  const idx = c.done.indexOf(toKey);
  if (idx < 0) return;
  c.done = c.done.slice(0, idx);
  c.approvals.push({ stepKey: toKey, action: 'SENT_BACK', userId, role: user.role, at, comment });
  if (toKey === 'PR_CREATE') c.sentBack = { by: userId, comment, at };
  if (toKey === 'QCS_SUBMIT' && c.qcs) c.qcs.status = 'SENT_BACK';
  makeCtx(state, user, at).log(c, 'SENT_BACK', `Sent back by ${user.name}: “${comment}”`);
  c.updatedAt = at;
  notifyNext(state, c, at);
};

export const createCase = (state, { payload, userId, submit, at = Date.now(), nos, id }) => {
  const caseId = id || uid('case');
  const c = newCase({ id: caseId, requesterId: userId, at });
  if (nos) c.nos = nos;
  state.cases[caseId] = c;
  state.order.unshift(caseId);
  if (submit) runStep(state, { caseId, key: 'PR_CREATE', payload, userId, at });
  else {
    Object.assign(c, payload, { lines: payload.lines.map((l, i) => ({ ...l, lineNo: i + 1 })) });
    c.estimatedValue = c.lines.reduce((a, l) => a + l.qty * l.estUnitPrice, 0);
  }
  return caseId;
};

// Auto-run the case until `untilKey` is the pending step (or closed)
export const fastForward = (state, caseId, untilKey, { overrides = {}, start, stepMs = 3 * 3600000 } = {}) => {
  let guard = 0;
  let t = start || Date.now();
  while (guard++ < 60) {
    const c = state.cases[caseId];
    const step = currentStep(c);
    if (!step || step.key === untilKey) break;
    const actor = actorFor(c, step);
    const payload = { ...defaultPayload(c, step.key), ...(overrides[step.key] || {}) };
    runStep(state, { caseId, key: step.key, payload, userId: actor.id, at: t });
    t += stepMs;
  }
};
