import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Badge, Box, Divider, IconButton, InputBase, ListSubheader, Menu, MenuItem, Popover, Select, Tooltip, Typography, Button } from '@mui/material';
import Stack from '../components/Stack';
import DashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import InventoryOutlined from '@mui/icons-material/Inventory2Outlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import MailOutline from '@mui/icons-material/MailOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import { login, logout, markRead, resetDemo, selectCases, selectSettings, selectUser, toast } from '../store';
import { USERS, ROLES, TEAMS } from '../data/masters';
import { canAct } from '../store/flow';
import { UserAvatar } from '../components/common';
import { timeAgo } from '../utils/format';

const SIDEBAR = 216;

const NAV = [
  { section: 'Workspace' },
  { to: '/', label: 'Dashboard', icon: <DashboardOutlined />, end: true },
  { to: '/tasks', label: 'My Tasks', icon: <TaskAltOutlined />, badge: 'tasks' },
  { section: 'Procurement', internal: true },
  { to: '/prs', label: 'Requisitions', icon: <DescriptionOutlined />, internal: true },
  { to: '/rfqs', label: 'Sourcing (RFQ/RFX)', icon: <GavelOutlined />, internal: true },
  { to: '/evaluations', label: 'Bid Evaluation', icon: <FactCheckOutlined />, roles: ['TECH_INSPECTOR'], internal: true },
  { to: '/pos', label: 'Purchase Orders', icon: <ReceiptLongOutlined />, internal: true },
  { section: 'Fulfilment', internal: true },
  { to: '/payments', label: 'Payments & Guarantees', icon: <PaymentsOutlined />, internal: true },
  { to: '/shipments', label: 'Shipments', icon: <LocalShippingOutlined />, roles: ['LOGISTICS_USER'], internal: true },
  { to: '/mrns', label: 'Material Receipts', icon: <InventoryOutlined />, internal: true },
  { section: 'Supplier Portal', supplier: true },
  { to: '/portal/rfqs', label: 'RFQs & Bids', icon: <RequestQuoteOutlined />, supplier: true },
  { to: '/pos', label: 'Purchase Orders', icon: <ReceiptLongOutlined />, supplier: true },
  { to: '/shipments', label: 'Shipments', icon: <LocalShippingOutlined />, supplier: true },
  { to: '/payments', label: 'Payments', icon: <PaymentsOutlined />, supplier: true },
  { section: 'Administration', internal: true },
  { to: '/suppliers', label: 'Suppliers', icon: <StorefrontOutlined />, internal: true },
  { to: '/items', label: 'Item Master', icon: <CategoryOutlined />, internal: true },
  { to: '/workflow', label: 'Workflow Rules', icon: <AccountTreeOutlined />, internal: true },
  { to: '/activity', label: 'Audit Trail', icon: <HistoryOutlined />, internal: true },
  { to: '/outbox', label: 'Email Outbox', icon: <MailOutline />, internal: true },
];

const navFor = (user) => {
  const r = user.role;
  if (r === 'SUPPLIER_USER') return NAV.filter((n) => !n.internal);
  if (r === 'LOGISTICS_USER' || r === 'TECH_INSPECTOR') return NAV.filter((n) => (!n.internal && !n.supplier) || n.roles?.includes(r));
  return NAV.filter((n) => !n.supplier);
};

export default function AppShell() {
  const user = useSelector(selectUser);
  const cases = useSelector(selectCases);
  const settings = useSelector(selectSettings);
  const notifications = useSelector((s) => s.p2p.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [bellEl, setBellEl] = useState(null);
  const [menuEl, setMenuEl] = useState(null);

  const taskCount = useMemo(() => cases.filter((c) => canAct(user, c, settings)).length, [cases, user, settings]);
  const mine = useMemo(() => notifications.filter((n) => n.userIds.includes(user.id)).slice(0, 30), [notifications, user.id]);
  const unread = mine.filter((n) => !n.readBy.includes(user.id)).length;

  const switchUser = (id) => {
    dispatch(login(id));
    const u = USERS.find((x) => x.id === id);
    dispatch(toast({ message: `Signed in as ${u.name} – ${ROLES[u.role]}`, severity: 'info' }));
    if (location.pathname.startsWith('/case/')) return;
    navigate('/');
  };

  const grouped = Object.keys(TEAMS).map((t) => ({ team: t, users: USERS.filter((u) => u.team === t) }));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        className="no-print"
        component="nav"
        sx={{
          width: SIDEBAR,
          flexShrink: 0,
          bgcolor: '#0E0E0F',
          color: '#D4D4D8',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, height: 52, borderBottom: '1px solid #222' }}>
          <Box component="img" src="/westfieldlogo.jpeg" alt="Westfield Energy" sx={{ width: 28, height: 28, borderRadius: 0.75 }} />
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.1, letterSpacing: 0.2 }}>WESTFIELD</Typography>
            <Typography sx={{ color: '#8A8A93', fontSize: 9.5, letterSpacing: 1.6, lineHeight: 1.3 }}>ENERGY · P2P</Typography>
          </Box>
        </Stack>
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
          {navFor(user).map((n, i) =>
            n.section ? (
              <Typography key={`s${i}`} sx={{ px: 2, pt: 1.75, pb: 0.5, fontSize: 9.5, letterSpacing: 1.2, color: '#6B6B73', fontWeight: 600, textTransform: 'uppercase' }}>
                {n.section}
              </Typography>
            ) : (
              <Box
                key={n.to + n.label}
                component={NavLink}
                to={n.to}
                end={n.end}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mx: 1,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1,
                  color: '#B4B4BC',
                  textDecoration: 'none',
                  fontSize: 12.5,
                  '& svg': { fontSize: 17 },
                  '&:hover': { bgcolor: '#1B1B1D', color: '#fff' },
                  '&.active': { bgcolor: '#fff', color: '#0E0E0F', fontWeight: 600 },
                }}
              >
                {n.icon}
                <Box sx={{ flex: 1 }}>{n.label}</Box>
                {n.badge === 'tasks' && taskCount > 0 && (
                  <Box sx={{ fontSize: 10, fontWeight: 700, bgcolor: '#B42318', color: '#fff', borderRadius: 8, px: 0.75, lineHeight: '16px' }}>{taskCount}</Box>
                )}
              </Box>
            ),
          )}
        </Box>
        <Box sx={{ p: 1.5, borderTop: '1px solid #222' }}>
          <Typography sx={{ fontSize: 10, color: '#6B6B73' }}>Demo build · dummy data</Typography>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ flex: 1, ml: `${SIDEBAR}px`, minWidth: 0 }}>
        <Stack
          className="no-print"
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ height: 52, px: 2.5, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 10 }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, maxWidth: 380, bgcolor: 'grey.100', borderRadius: 1, px: 1.25, height: 30 }}>
            <SearchOutlined sx={{ fontSize: 16, color: 'grey.500' }} />
            <InputBase placeholder="Search PR, RFQ, PO, supplier…" sx={{ fontSize: 12.5, flex: 1 }} />
            <Typography variant="caption" sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 0.5, px: 0.5, fontSize: 10 }}>
              ⌘K
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />

          <Tooltip title="Switch demo user (no password needed)">
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                LOGIN AS
              </Typography>
              <Select
                value={user.id}
                onChange={(e) => switchUser(e.target.value)}
                sx={{ minWidth: 250, fontSize: 12, '& .MuiSelect-select': { py: '5px' } }}
                MenuProps={{ slotProps: { paper: { sx: { maxHeight: 460 } } } }}
                renderValue={(id) => {
                  const u = USERS.find((x) => x.id === id);
                  return `${u.name} – ${ROLES[u.role]}`;
                }}
              >
                {grouped.flatMap((g) => [
                  <ListSubheader key={g.team} sx={{ fontSize: 10, lineHeight: '26px', fontWeight: 700, letterSpacing: 0.8, color: 'grey.500' }}>
                    {TEAMS[g.team].toUpperCase()}
                  </ListSubheader>,
                  ...g.users.map((u) => (
                    <MenuItem key={u.id} value={u.id} sx={{ pl: 2.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>{u.name}</Typography>
                        <Typography variant="caption">{u.supplierId ? u.email : `${u.designation} · ${ROLES[u.role]}`}</Typography>
                      </Box>
                    </MenuItem>
                  )),
                ])}
              </Select>
            </Stack>
          </Tooltip>

          <IconButton onClick={(e) => setBellEl(e.currentTarget)}>
            <Badge badgeContent={unread} color="error">
              <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer', pl: 0.5 }} onClick={(e) => setMenuEl(e.currentTarget)}>
            <UserAvatar userId={user.id} size={28} />
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{user.name}</Typography>
              <Typography variant="caption" sx={{ lineHeight: 1.2 }} component="div">
                {ROLES[user.role]}
              </Typography>
            </Box>
            <KeyboardArrowDown sx={{ fontSize: 16, color: 'grey.500' }} />
          </Stack>
        </Stack>

        <Box sx={{ p: 2.5, maxWidth: 1480, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Notifications */}
      <Popover
        open={!!bellEl}
        anchorEl={bellEl}
        onClose={() => setBellEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 480, border: '1px solid', borderColor: 'divider', mt: 0.5 } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5">Notifications</Typography>
          <Button size="small" onClick={() => dispatch(markRead({ userId: user.id }))}>
            Mark all read
          </Button>
        </Stack>
        {mine.length === 0 && (
          <Typography variant="caption" component="div" sx={{ p: 3, textAlign: 'center' }}>
            You're all caught up.
          </Typography>
        )}
        {mine.map((n) => {
          const isUnread = !n.readBy.includes(user.id);
          return (
            <Box
              key={n.id}
              onClick={() => {
                dispatch(markRead({ userId: user.id, id: n.id }));
                setBellEl(null);
                navigate(`/case/${n.caseId}?tab=${n.tab || 'overview'}`);
              }}
              sx={{ px: 2, py: 1.1, borderBottom: '1px solid', borderColor: 'grey.100', cursor: 'pointer', bgcolor: isUnread ? 'grey.50' : '#fff', '&:hover': { bgcolor: 'grey.100' }, display: 'flex', gap: 1.25 }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: 3, mt: 0.8, flexShrink: 0, bgcolor: isUnread ? (n.severity === 'error' ? 'error.main' : '#111') : 'transparent' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: isUnread ? 600 : 500, color: n.severity === 'error' ? 'error.main' : 'text.primary' }}>{n.title}</Typography>
                <Typography variant="caption" component="div" noWrap>
                  {n.body}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10 }}>
                  {timeAgo(n.at)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Popover>

      {/* User menu */}
      <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)} slotProps={{ paper: { sx: { minWidth: 220, border: '1px solid', borderColor: 'divider' } } }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{user.name}</Typography>
          <Typography variant="caption">{user.email}</Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            navigate('/demo');
          }}
        >
          <TuneOutlined sx={{ fontSize: 16, mr: 1.25 }} /> Demo controls
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            if (window.confirm('Reset the demo to its starting data? All changes made in this browser will be lost.')) {
              dispatch(resetDemo());
              dispatch(toast('Demo data reset'));
              navigate('/');
            }
          }}
        >
          <RestartAltOutlined sx={{ fontSize: 16, mr: 1.25 }} /> Reset demo data
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            dispatch(logout());
            navigate('/login');
          }}
        >
          <LogoutOutlined sx={{ fontSize: 16, mr: 1.25 }} /> Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}
