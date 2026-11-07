const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const fmtINR = (v) => (v == null || Number.isNaN(v) ? '—' : `₹ ${inr.format(Math.round(v))}`);
export const fmtLakh = (v) => (v == null || Number.isNaN(v) ? '—' : `₹ ${inr2.format(v / 100000)} L`);
export const fmtUSD = (v) => (v == null ? '—' : `$ ${usd.format(v)}`);
export const fmtNum = (v) => (v == null ? '—' : inr.format(v));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

export const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtDateTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${fmtDate(ts)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const toInputDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const fromInputDate = (s) => new Date(`${s}T12:00:00`).getTime();

export const DAY = 86400000;
export const daysBetween = (a, b) => Math.round((b - a) / DAY);

export const timeAgo = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
