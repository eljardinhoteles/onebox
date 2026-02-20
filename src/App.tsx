import { useEffect, useState, lazy, Suspense } from 'react'
import { Center, Loader, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import { AuthPage } from './components/AuthPage'

import { MainLayout } from './components/MainLayout'
const CajasPage = lazy(() => import('./pages/CajasPage').then(module => ({ default: module.CajasPage })));
const CajaDetalle = lazy(() => import('./pages/CajaDetalle').then(module => ({ default: module.CajaDetalle })));
const ProveedoresPage = lazy(() => import('./pages/ProveedoresPage').then(module => ({ default: module.ProveedoresPage })));
const AjustesPage = lazy(() => import('./pages/AjustesPage').then(module => ({ default: module.AjustesPage })));

import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconExclamationCircle } from '@tabler/icons-react';
import { useEmpresa } from './context/EmpresaContext';
import { OnboardingPage } from './pages/OnboardingPage';
import { MotionConfig } from 'framer-motion';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

function CajasRoute({ opened, close }: { opened: boolean, close: () => void }) {
  const navigate = useNavigate();
  return <CajasPage opened={opened} close={close} onSelectCaja={(id) => navigate(`/cajas/${id}`)} />;
}

function CajaDetalleRoute({ setDetailOnAdd }: { setDetailOnAdd: (fn: (() => void) | undefined) => void }) {
  const { id } = useParams(); // URL parameter is actually "numero"
  const navigate = useNavigate();

  const numero = parseInt(id!);

  const { data: caja, isLoading, isError } = useQuery({
    queryKey: ['cajaByNumero', numero],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cajas')
        .select('id')
        .eq('numero', numero)
        // si hay duplicados (varias sucursales), priorizar la que está abierta, o la última
        .order('estado', { ascending: true })
        .order('id', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    retry: false
  });

  if (isLoading) return <Center h="100vh"><Loader /></Center>;
  if (isError || !caja) return <Center h="100vh"><Text c="red">Caja no encontrada</Text></Center>;

  return <CajaDetalle cajaId={caja.id} setOnAdd={setDetailOnAdd} onBack={() => navigate('/cajas')} />;
}

export default function App() {
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

  useHotkeys([
    ['alt + 1', () => navigate('/cajas')],
    ['alt + 2', () => navigate('/proveedores')],
    ['alt + 3', () => navigate('/ajustes')],
    ['n', () => {
      if (isCajas && !isCajaDetail) openCajasModal();
      if (isProveedores) openProveedoresModal();
    }],
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(prev => ({ ...prev, session }));
    });

    const notificationSubscription = supabase
      .channel('global:notificaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload: unknown) => {
        const notif = (payload as { new: Record<string, string> }).new;
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

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  const { empresa, loading: empresaLoading } = useEmpresa();

  if (loading || empresaLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    )
  }

  if (!session) return <AuthPage />;
  if (!empresa) return <OnboardingPage />;

  const handleFabAction = () => {
    if (isCajaDetail && detailOnAdd) detailOnAdd();
    else if (isCajas && !isCajaDetail) openCajasModal();
    else if (isProveedores) openProveedoresModal();
  };

  const showFab = (isCajas && !isCajaDetail) || (isCajaDetail && !!detailOnAdd) || isProveedores;

  return (
    <MotionConfig reducedMotion="user">
      <MainLayout onAdd={showFab ? handleFabAction : undefined}>
        <Suspense fallback={<Center h="100vh"><Loader /></Center>}>
          <Routes>
            <Route path="/" element={<Navigate to="/cajas" replace />} />
            <Route path="/cajas" element={<CajasRoute opened={cajasModalOpened} close={closeCajasModal} />} />
            <Route path="/cajas/:id" element={<CajaDetalleRoute setDetailOnAdd={setDetailOnAdd} />} />
            <Route path="/proveedores" element={<ProveedoresPage opened={proveedoresModalOpened} close={closeProveedoresModal} />} />
            <Route path="/ajustes" element={<AjustesPage />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </MotionConfig>
  )
}
