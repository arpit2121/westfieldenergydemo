import { Avatar, Box, Chip, Paper, Typography, Tooltip } from '@mui/material';
import Stack from './Stack';
import { userById, ROLES } from '../data/masters';
import { initials } from '../utils/format';

export function PageHeader({ title, subtitle, actions, overline }) {
  return (
    <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 2, gap: 2, flexWrap: 'wrap' }}>
      <Box>
        {overline && (
          <Typography variant="overline" color="text.secondary" component="div">
            {overline}
          </Typography>
        )}
        <Typography variant="h1">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center">
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

export function Panel({ title, subtitle, actions, children, sx, pad = true, id }) {
  return (
    <Paper variant="outlined" sx={{ mb: 2, ...sx }} id={id}>
      {(title || actions) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.1, borderBottom: '1px solid', borderColor: 'divider', minHeight: 42, gap: 1 }}
        >
          <Box>
            <Typography variant="h5">{title}</Typography>
            {subtitle && <Typography variant="caption">{subtitle}</Typography>}
          </Box>
          {actions && (
            <Stack direction="row" spacing={1} alignItems="center">
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      <Box sx={pad ? { p: 2 } : undefined}>{children}</Box>
    </Paper>
  );
}

const TONES = {
  dark: { bgcolor: '#111', color: '#fff', border: '1px solid #111' },
  success: { bgcolor: 'rgba(31,122,77,0.08)', color: '#1F7A4D', border: '1px solid rgba(31,122,77,0.3)' },
  warning: { bgcolor: 'rgba(161,92,7,0.08)', color: '#A15C07', border: '1px solid rgba(161,92,7,0.3)' },
  error: { bgcolor: 'rgba(180,35,24,0.07)', color: '#B42318', border: '1px solid rgba(180,35,24,0.3)' },
  neutral: { bgcolor: '#F4F4F5', color: '#3F3F46', border: '1px solid #E4E4E7' },
  outline: { bgcolor: '#fff', color: '#3F3F46', border: '1px solid #D4D4D8' },
};

export const toneFor = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('closed')) return 'dark';
  if (l.includes('sent back') || l.includes('reject') || l.includes('delay') || l.includes('disqualif') || l.includes('fail') || l.includes('mismatch') || l.includes('overdue')) return 'error';
  if (l.includes('transit') || l.includes('dispatch') || l.includes('shipped') || l.includes('due') || l.includes('go-ahead') || l.includes('awaiting')) return 'warning';
  if (l.includes('approved') || l.includes('issued') || l.includes('accepted') || l.includes('paid') || l.includes('received') || l.includes('verified') || l.includes('delivered') || l.includes('matched') || l.includes('awarded') || l.includes('qualified') || l.includes('on time') || l.includes('pass') || l.includes('opened')) return 'success';
  if (l.includes('draft')) return 'outline';
  return 'neutral';
};

export function StatusChip({ label, tone, sx }) {
  const t = TONES[tone || toneFor(label)];
  return <Chip label={label} sx={{ ...t, ...sx }} />;
}

const TIER = {
  T1: { ...TONES.success, label: 'T1' },
  T2: { ...TONES.warning, label: 'T2' },
  T3: { ...TONES.error, label: 'T3' },
};
const TIER_TEXT = { T1: 'T1 – Fully compliant', T2: 'T2 – Minor deviations', T3: 'T3 – Major deviations' };

export function TierChip({ tier, long }) {
  if (!tier) return <Typography variant="caption">—</Typography>;
  const t = TIER[tier];
  return (
    <Tooltip title={TIER_TEXT[tier]}>
      <Chip label={long ? TIER_TEXT[tier] : t.label} sx={{ bgcolor: t.bgcolor, color: t.color, border: t.border, fontWeight: 700 }} />
    </Tooltip>
  );
}

export function RankChip({ rank }) {
  if (!rank) return <Typography variant="caption">—</Typography>;
  const first = rank === 1;
  return (
    <Chip
      label={`L${rank}`}
      sx={{
        fontWeight: 700,
        minWidth: 34,
        bgcolor: first ? '#111' : '#fff',
        color: first ? '#fff' : '#111',
        border: '1px solid #111',
      }}
    />
  );
}

export function Field({ label, children, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" component="div" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body1" component="div" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
        {children ?? value ?? '—'}
      </Typography>
    </Box>
  );
}

export function FieldGrid({ children, cols = 4, sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: `repeat(${cols}, minmax(0,1fr))` },
        gap: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function Grid({ cols = '1fr 1fr', gap = 2, children, sx }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: cols }, gap, alignItems: 'start', ...sx }}>{children}</Box>;
}

export function StatCard({ label, value, hint, icon, onClick, tone }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 1.75,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s',
        '&:hover': onClick ? { borderColor: '#111' } : undefined,
        minWidth: 0,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="subtitle2">{label}</Typography>
        {icon && <Box sx={{ color: 'grey.400', display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>}
      </Stack>
      <Typography sx={{ fontSize: 22, fontWeight: 600, mt: 0.5, letterSpacing: -0.4, color: tone === 'error' ? 'error.main' : 'text.primary' }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" component="div" sx={{ mt: 0.25 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

export function UserAvatar({ userId, size = 24 }) {
  const u = userById(userId);
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: '#111', fontSize: size * 0.42 }}>{initials(u?.name || '?')}</Avatar>
  );
}

export function UserChip({ userId, showRole = true }) {
  const u = userById(userId);
  if (!u) return '—';
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <UserAvatar userId={userId} size={22} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }} noWrap>
          {u.name}
        </Typography>
        {showRole && (
          <Typography variant="caption" sx={{ lineHeight: 1.2 }} noWrap component="div">
            {u.designation} · {ROLES[u.role]}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export function Empty({ title = 'Nothing here yet', hint }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography variant="h5">{title}</Typography>
      {hint && (
        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

export function Mono({ children, sx }) {
  return (
    <Box component="span" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace', fontSize: '0.92em', ...sx }}>
      {children}
    </Box>
  );
}

export function FileChip({ name }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        mr: 0.75,
        mb: 0.75,
        px: 0.75,
        height: 22,
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 0.75,
        bgcolor: '#fff',
        fontSize: 11.5,
        cursor: 'pointer',
        maxWidth: '100%',
        '&:hover': { borderColor: '#111' },
      }}
    >
      <Box component="span" sx={{ fontSize: 8.5, fontWeight: 700, px: 0.4, lineHeight: '13px', border: '1px solid', borderRadius: 0.5, color: 'grey.600' }}>
        {(name.split('.').pop() || '').toUpperCase()}
      </Box>
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </Box>
    </Box>
  );
}
