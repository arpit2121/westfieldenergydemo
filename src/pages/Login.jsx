import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Checkbox, FormControlLabel, Divider, Alert } from '@mui/material';
import Stack from '../components/Stack';
import { login, toast } from '../store';
import { USERS, ROLES, TEAMS } from '../data/masters';
import { UserAvatar } from '../components/common';

const FLOW = ['Requisition', 'RFQ / RFX', 'Supplier bids', 'TBE · T1–T3', 'CBE · L1–L5', 'QCS', 'Purchase order', 'ABG · PBG · LC', 'Logistics & ETA', 'MRN', 'Payment', 'Closed'];

export default function Login() {
  const [email, setEmail] = useState('neha.kapoor@westfieldenergy.com');
  const [password, setPassword] = useState('demo@123');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const signIn = (e) => {
    e?.preventDefault();
    const u = USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || !password) {
      setError('Unknown user. Pick one of the demo accounts on the right.');
      return;
    }
    dispatch(login(u.id));
    dispatch(toast({ message: `Welcome, ${u.name}`, severity: 'info' }));
    navigate('/');
  };

  const teams = Object.keys(TEAMS);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '420px 1fr' }, bgcolor: '#fff' }}>
      {/* Brand panel */}
      <Box sx={{ bgcolor: '#0E0E0F', color: '#fff', p: 5, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box component="img" src="/westfieldlogo.jpeg" sx={{ width: 40, height: 40, borderRadius: 1 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, letterSpacing: 0.4, fontSize: 16 }}>WESTFIELD ENERGY</Typography>
            <Typography sx={{ color: '#8A8A93', fontSize: 11, letterSpacing: 1.4 }}>PROCURE-TO-PAY</Typography>
          </Box>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 600, lineHeight: 1.25, letterSpacing: -0.4 }}>
            One record from requisition to payment.
          </Typography>
          <Typography sx={{ color: '#A1A1AA', fontSize: 13, mt: 1.5, lineHeight: 1.6 }}>
            Engineering, Management, C&amp;P, Finance, Stores, Logistics and Suppliers working on the same document, with every approval stamped and traceable.
          </Typography>
          <Box sx={{ mt: 4, borderLeft: '1px solid #2A2A2E', pl: 2 }}>
            {FLOW.map((f, i) => (
              <Stack key={f} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.45 }}>
                <Typography sx={{ fontSize: 10, color: '#6B6B73', width: 18, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</Typography>
                <Typography sx={{ fontSize: 12, color: i === FLOW.length - 1 ? '#fff' : '#C4C4CC' }}>{f}</Typography>
              </Stack>
            ))}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 10.5, color: '#6B6B73' }}>© 2026 Westfield Energy · Demo environment with sample data</Typography>
      </Box>

      {/* Sign-in */}
      <Box sx={{ p: { xs: 3, md: 6 }, overflowY: 'auto', maxHeight: '100vh' }}>
        <Box sx={{ maxWidth: 820, mx: 'auto' }}>
          <Box component="form" onSubmit={signIn} sx={{ maxWidth: 360 }}>
            <Typography variant="h1">Sign in</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
              Use your Westfield account, or pick a demo user below.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Stack spacing={1.75}>
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Demo password for every user: demo@123" />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <FormControlLabel control={<Checkbox defaultChecked />} label="Keep me signed in" />
                <Typography variant="caption" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                  Forgot password?
                </Typography>
              </Stack>
              <Button type="submit" variant="contained" size="medium" sx={{ py: 1 }}>
                Sign in
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 4 }}>
            <Typography variant="caption">DEMO ACCOUNTS · ONE PER ROLE</Typography>
          </Divider>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
            {teams.map((t) => {
              const users = USERS.filter((u) => u.team === t);
              return (
                <Box key={t}>
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    {TEAMS[t]}
                  </Typography>
                  <Stack spacing={0.75}>
                    {users.map((u) => (
                      <Box
                        key={u.id}
                        onClick={() => {
                          dispatch(login(u.id));
                          navigate('/');
                        }}
                        sx={{
                          display: 'flex',
                          gap: 1.25,
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: email === u.email ? '#111' : 'grey.200',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { borderColor: '#111', bgcolor: 'grey.50' },
                        }}
                        onMouseEnter={() => setEmail(u.email)}
                      >
                        <UserAvatar userId={u.id} size={26} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }} noWrap>
                            {u.supplierId ? u.email.split('@')[1] : u.name}
                          </Typography>
                          <Typography variant="caption" noWrap component="div" sx={{ lineHeight: 1.3 }}>
                            {u.supplierId ? u.name : ROLES[u.role]}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
