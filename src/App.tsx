import { useEffect, useState, useCallback } from 'react'
import { Center, Loader } from '@mantine/core'
import { supabase } from './lib/supabaseClient'
import { AuthPage } from './components/AuthPage'

import { MainLayout } from './components/MainLayout'
import { CajasPage } from './pages/CajasPage'
import { CajaDetalle } from './pages/CajaDetalle'
import { ProveedoresPage } from './pages/ProveedoresPage'
import { AjustesPage } from './pages/AjustesPage'

import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconExclamationCircle } from '@tabler/icons-react';
import { useEmpresa } from './context/EmpresaContext';
import { OnboardingPage } from './pages/OnboardingPage';
import { MotionConfig } from 'framer-motion';



interface ActiveSectionContentProps {
  activeSection: string;
  selectedCajaId: number | null;
  setSelectedCajaId: (id: number | null) => void;
  cajasModalOpened: boolean;
  closeCajasModal: () => void;
  proveedoresModalOpened: boolean;
  closeProveedoresModal: () => void;
  setDetailOnAdd: (fn: (() => void) | undefined) => void;
}

function ActiveSectionContent({
  activeSection,
  selectedCajaId,
  setSelectedCajaId,
  cajasModalOpened,
  closeCajasModal,
  proveedoresModalOpened,
  closeProveedoresModal,
  setDetailOnAdd
}: ActiveSectionContentProps) {
  switch (activeSection) {
    case 'cajas':
      return selectedCajaId
        ? <CajaDetalle cajaId={selectedCajaId} setOnAdd={setDetailOnAdd} onBack={() => setSelectedCajaId(null)} />
        : <CajasPage opened={cajasModalOpened} close={closeCajasModal} onSelectCaja={setSelectedCajaId} />;
    case 'proveedores': return <ProveedoresPage opened={proveedoresModalOpened} close={closeProveedoresModal} />;
    case 'ajustes': return <AjustesPage />;
    default: return null;
  }
}

export default function App() {
  const [authState, setAuthState] = useState({ session: null as any, loading: true });
  const [navState, setNavState] = useState({
    activeSection: 'cajas',
    selectedCajaId: null as number | null,
    detailOnAdd: undefined as (() => void) | undefined
  });

  const { session, loading } = authState;
  const { activeSection, selectedCajaId, detailOnAdd } = navState;

  const setActiveSection = useCallback((section: string) => setNavState(prev => ({ ...prev, activeSection: section })), []);
  const setSelectedCajaId = useCallback((id: number | null) => setNavState(prev => ({ ...prev, selectedCajaId: id })), []);
  const setDetailOnAdd = useCallback((fn: (() => void) | undefined) => setNavState(prev => ({ ...prev, detailOnAdd: fn })), []);

  const [proveedoresModalOpened, { open: openProveedoresModal, close: closeProveedoresModal }] = useDisclosure(false);
  const [cajasModalOpened, { open: openCajasModal, close: closeCajasModal }] = useDisclosure(false);

  // Hotkeys globales
  useHotkeys([
    ['alt + 1', () => setActiveSection('cajas')],
    ['alt + 2', () => setActiveSection('proveedores')],
    ['alt + 3', () => setActiveSection('ajustes')],
    ['n', () => {
      if (activeSection === 'cajas' && !selectedCajaId) openCajasModal();
      if (activeSection === 'proveedores') openProveedoresModal();
    }],
  ]);

  // PERSISTENCIA: Cargar estado inicial desde la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const cajaId = params.get('cajaId');

    const updates: Partial<typeof navState> = {};
    if (section && ['cajas', 'proveedores', 'ajustes'].includes(section)) updates.activeSection = section;
    if (cajaId) updates.selectedCajaId = parseInt(cajaId);

    if (Object.keys(updates).length > 0) {
      setNavState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // PERSISTENCIA: Sincronizar estado con la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('section', activeSection);
    if (selectedCajaId) params.set('cajaId', selectedCajaId.toString());
    else params.delete('cajaId');

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeSection, selectedCajaId]);

  // Limpiar caja seleccionada al cambiar de sección
  const handleSectionChange = (section: string) => {
    setNavState(prev => ({ ...prev, activeSection: section, selectedCajaId: null }));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(prev => ({ ...prev, session }));
    });

    const notificationSubscription = supabase
      .channel('global:notificaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload: any) => {
        const notif = payload.new;
        const types: Record<string, { color: string; icon: any }> = {
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

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    )
  }

  if (!session) {
    return <AuthPage />;
  }

  if (empresaLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!empresa) {
    return <OnboardingPage />;
  }

  // FAB contextual: dispara la acción de creación según la sección activa
  const handleFabAction = () => {
    if (activeSection === 'cajas' && selectedCajaId && detailOnAdd) detailOnAdd();
    else if (activeSection === 'cajas' && !selectedCajaId) openCajasModal();
    else if (activeSection === 'proveedores') openProveedoresModal();
  };

  // Mostrar FAB si hay acción disponible
  const showFab =
    (activeSection === 'cajas' && !selectedCajaId) ||
    (activeSection === 'cajas' && selectedCajaId && !!detailOnAdd) ||
    activeSection === 'proveedores';

  return (
    <MotionConfig reducedMotion="user">
      <MainLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onAdd={showFab ? handleFabAction : undefined}
      >
        <ActiveSectionContent
          activeSection={activeSection}
          selectedCajaId={selectedCajaId}
          setSelectedCajaId={setSelectedCajaId}
          cajasModalOpened={cajasModalOpened}
          closeCajasModal={closeCajasModal}
          proveedoresModalOpened={proveedoresModalOpened}
          closeProveedoresModal={closeProveedoresModal}
          setDetailOnAdd={setDetailOnAdd}
        />
      </MainLayout>
    </MotionConfig>
  )
}
