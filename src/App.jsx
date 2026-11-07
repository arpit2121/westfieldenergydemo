import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Snackbar } from '@mui/material';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrForm from './pages/PrForm';
import CaseDetail from './pages/case/CaseDetail';
import { Tasks, PrList, RfqList, Evaluations, PoList, Payments, Shipments, Mrns, PortalRfqs } from './pages/Lists';
import { Suppliers, Items, Workflow, Activity, Outbox, DemoControls } from './pages/Admin';
import { clearToast, selectUser, toast } from './store';

function Toasts() {
  const t = useSelector((s) => s.ui.toast);
  const dispatch = useDispatch();
  return (
    <Snackbar key={t?.id} open={!!t} autoHideDuration={3200} onClose={() => dispatch(clearToast())} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      {t ? (
        <Alert
          onClose={() => dispatch(clearToast())}
          severity={t.severity}
          variant="filled"
          sx={{ bgcolor: t.severity === 'error' ? 'error.main' : t.severity === 'warning' ? '#A15C07' : '#111', color: '#fff', fontSize: 12.5, alignItems: 'center', '& .MuiAlert-icon': { color: '#fff' } }}
        >
          {t.message}
        </Alert>
      ) : (
        <span />
      )}
    </Snackbar>
  );
}

// Show a mock "email sent" toast whenever the outbox grows
function OutboxWatcher() {
  const outbox = useSelector((s) => s.p2p.outbox);
  const dispatch = useDispatch();
  const latest = outbox[0];
  useEffect(() => {
    if (latest && Date.now() - latest.at < 1500) {
      const n = outbox.filter((m) => latest.at - m.at < 1000).length;
      const id = setTimeout(() => dispatch(toast({ message: `Email sent to ${latest.to}${n > 1 ? ` and ${n - 1} more` : ''} – “${latest.subject}”`, severity: 'info' })), 1400);
      return () => clearTimeout(id);
    }
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Protected({ children }) {
  const user = useSelector(selectUser);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="prs" element={<PrList />} />
          <Route path="prs/new" element={<PrForm />} />
          <Route path="prs/:id/edit" element={<PrForm />} />
          <Route path="rfqs" element={<RfqList />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="pos" element={<PoList />} />
          <Route path="payments" element={<Payments />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="mrns" element={<Mrns />} />
          <Route path="portal/rfqs" element={<PortalRfqs />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="items" element={<Items />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="activity" element={<Activity />} />
          <Route path="outbox" element={<Outbox />} />
          <Route path="demo" element={<DemoControls />} />
          <Route path="case/:id" element={<CaseDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toasts />
      <OutboxWatcher />
    </BrowserRouter>
  );
}
