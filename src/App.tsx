import { useEffect, useState, lazy, Suspense } from 'react'

import { AppLoader } from './components/ui/AppLoader'
import { supabase } from './lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import { AuthPage } from './components/AuthPage'

import { MainLayout } from './components/MainLayout'

// Lazy loading pages for better LCP
const CajasPage = lazy(() => import('./pages/CajasPage').then(m => ({ default: m.CajasPage })));
const CajaDetalle = lazy(() => import('./pages/CajaDetalle').then(m => ({ default: m.CajaDetalle })));
const ProveedoresPage = lazy(() => import('./pages/ProveedoresPage').then(m => ({ default: m.ProveedoresPage })));
const AjustesPage = lazy(() => import('./pages/AjustesPage').then(m => ({ default: m.AjustesPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));

import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconExclamationCircle } from '@tabler/icons-react';
import { useEmpresa } from './context/EmpresaContext';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

function CajasRoute({ opened, close }: { opened: boolean, close: () => void }) {
  const navigate = useNavigate();
  return <CajasPage opened={opened} close={close} onSelectCaja={(id) => navigate(`/cajas/${id}`)} />;
}

function CajaDetalleRoute({ setDetailOnAdd }: { setDetailOnAdd: (fn: (() => void) | undefined) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const cajaId = parseInt(id!);

  if (isNaN(cajaId)) return <AppLoader py={100} message="ID de caja inválido" withText={false} />;

  return <CajaDetalle cajaId={cajaId} setOnAdd={setDetailOnAdd} onBack={() => navigate('/cajas')} />;
}

export default function App() {
  const { empresa, loading: empresaLoading, isReadOnly, isSuperAdmin } = useEmpresa();
  const [authState, setAuthState] = useState({ session: null as Session | null, loading: true });
  const { session, loading } = authState;

  const navigate = useNavigate();
  const location = useLocation();

  const [detailOnAdd, setDetailOnAdd] = useState<(() => void) | undefined>();

  const [proveedoresModalOpened, { open: openProveedoresModal, close: closeProveedoresModal }] = useDisclosure(false);
  const [cajasModalOpened, { open: openCajasModal, close: closeCajasModal }] = useDisclosure(false);

  const isCajas = location.pathname.startsWith('/cajas');
  const isCajaDetail = location.pathname.match(/^\/cajas\/\d+$/);
  const isProveedores = location.pathname.startsWith('/proveedores');
  
  const queryParams = new URLSearchParams(location.search);
  const hasAuthParams = queryParams.has('invite') || queryParams.has('mode');
  const isLanding = (location.pathname === '/landing' || location.pathname === '/') && !hasAuthParams;

  useHotkeys([
    ['alt + 1', () => navigate('/cajas')],
    ['alt + 2', () => navigate('/proveedores')],
    ['alt + 3', () => navigate('/ajustes')],
    ['n', () => {
      if (!isReadOnly) {
        if (isCajas && !isCajaDetail) openCajasModal();
        if (isProveedores) openProveedoresModal();
      }
    }],
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(prev => ({ ...prev, session }));
    });

    let notificationSubscription: any = null;

    if (empresa?.id) {
      notificationSubscription = supabase
        .channel(`global:notificaciones:${empresa.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `empresa_id=eq.${empresa.id}`
        }, (payload: any) => {
          const notif = payload.new;
          const types: Record<string, { color: string; icon: React.ReactNode }> = {
            warning: { color: 'orange', icon: <IconAlertTriangle size={18} /> },
            error: { color: 'red', icon: <IconExclamationCircle size={18} /> },
            success: { color: 'teal', icon: <IconCheck size={18} /> }
          };
          const { color = 'blue', icon = <IconInfoCircle size={18} /> } = types[notif.tipo] || {};

          notifications.show({
            title: notif.titulo,
            message: notif.mensaje,
            color,
            icon,
            autoClose: 5000,
          });
        })
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (notificationSubscription) supabase.removeChannel(notificationSubscription);
    };
  }, [empresa?.id]);

  if (isLanding) {
    // Redirigir si ya tiene sesión activa
    if (session) {
      if (isSuperAdmin && !empresa) return <Navigate to="/admin" replace />;
      return <Navigate to="/cajas" replace />;
    }

    return (
      <MotionConfig reducedMotion="never">
        <Suspense fallback={<AppLoader fullScreen message="Cargando..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="/landing" element={<LandingPage />} />
          </Routes>
        </Suspense>
      </MotionConfig>
    );
  }

  const authToOnboardingTransition = (
    <AnimatePresence mode="wait">
      {!session && !loading ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          style={{ height: '100vh', width: '100%' }}
        >
          <AuthPage />
        </motion.div>
      ) : !empresaLoading && !empresa && !isSuperAdmin ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100vh', width: '100%' }}
        >
          <OnboardingPage />
        </motion.div>
      ) : (loading || (session && empresaLoading)) ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AppLoader fullScreen size="xl" message="Cargando..." />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!session || (session && !empresa && !isSuperAdmin)) {
    return (
      <MotionConfig reducedMotion="never">
        {authToOnboardingTransition}
      </MotionConfig>
    );
  }

  const handleFabAction = () => {
    if (isCajaDetail && detailOnAdd) detailOnAdd();
    else if (isCajas && !isCajaDetail) openCajasModal();
    else if (isProveedores) openProveedoresModal();
  };

  const showFab = !isReadOnly && ((isCajas && !isCajaDetail) || (isCajaDetail && !!detailOnAdd) || isProveedores);

  // Superadmin sin empresa: mostrar admin directamente
  const isAdminRoute = location.pathname === '/admin';
  if (isSuperAdmin && isAdminRoute) {
    return (
      <MotionConfig reducedMotion="never">
        <AdminPage />
      </MotionConfig>
    );
  }

  // Superadmin sin empresa: redirigir a admin si no hay empresa cargada
  if (!empresa && isSuperAdmin && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <MotionConfig reducedMotion="never">
      <MainLayout onAdd={showFab ? handleFabAction : undefined}>
        <Suspense fallback={<AppLoader py={100} message="Cargando sección..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/cajas" replace />} />
            <Route path="/cajas" element={<CajasRoute opened={cajasModalOpened} close={closeCajasModal} />} />
            <Route path="/cajas/:id" element={<CajaDetalleRoute setDetailOnAdd={setDetailOnAdd} />} />
            <Route path="/proveedores" element={<ProveedoresPage opened={proveedoresModalOpened} close={closeProveedoresModal} />} />
            <Route path="/ajustes" element={<AjustesPage />} />
            {isSuperAdmin && <Route path="/admin" element={<AdminPage />} />}
          </Routes>
        </Suspense>
      </MainLayout>
    </MotionConfig>
  )
}
