import { useEffect, useState } from 'react'
import { Center, Loader, Button } from '@mantine/core'
import { supabase } from './lib/supabaseClient'
import { AuthPage } from './components/AuthPage'

import { MainLayout } from './components/MainLayout'
import { CajasPage } from './pages/CajasPage'
import { CajaDetalle } from './pages/CajaDetalle'
import { ProveedoresPage } from './pages/ProveedoresPage'
import { AjustesPage } from './pages/AjustesPage'

import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconExclamationCircle } from '@tabler/icons-react';

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('cajas')
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);
  const [detailHeaderActions, setDetailHeaderActions] = useState<React.ReactNode>(null);
  const [proveedoresModalOpened, { open: openProveedoresModal, close: closeProveedoresModal }] = useDisclosure(false);
  const [cajasModalOpened, { open: openCajasModal, close: closeCajasModal }] = useDisclosure(false);

  // Limpiar caja seleccionada al cambiar de sección
  useEffect(() => {
    setSelectedCajaId(null);
    setDetailHeaderActions(null);
  }, [activeSection]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Listen for global notifications for Toasts
    const notificationSubscription = supabase
      .channel('global:notificaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload: any) => {
        const notif = payload.new;

        let color = 'blue';
        let icon = <IconInfoCircle size={18} />;

        if (notif.tipo === 'warning') { color = 'orange'; icon = <IconAlertTriangle size={18} />; }
        else if (notif.tipo === 'error') { color = 'red'; icon = <IconExclamationCircle size={18} />; }
        else if (notif.tipo === 'success') { color = 'teal'; icon = <IconCheck size={18} />; }

        notifications.show({
          title: notif.titulo,
          message: notif.mensaje,
          color: color,
          icon: icon,
          autoClose: 5000,
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(notificationSubscription);
    }
  }, [])

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

  const renderContent = () => {
    switch (activeSection) {
      case 'cajas':
        return selectedCajaId
          ? <CajaDetalle cajaId={selectedCajaId} setHeaderActions={setDetailHeaderActions} />
          : <CajasPage opened={cajasModalOpened} close={closeCajasModal} onSelectCaja={setSelectedCajaId} />;
      case 'proveedores': return <ProveedoresPage opened={proveedoresModalOpened} close={closeProveedoresModal} />;
      case 'ajustes': return <AjustesPage />;
      default: return null;
    }
  };

  const renderHeaderActions = () => {
    if (selectedCajaId) return detailHeaderActions;

    switch (activeSection) {
      case 'cajas':
        return <Button size="xs" radius="xl" color="blue" onClick={openCajasModal}>Nueva Caja</Button>;
      case 'proveedores':
        return <Button size="xs" radius="xl" color="green" onClick={openProveedoresModal}>Nuevo Proveedor</Button>;
      default:
        return null;
    }
  };

  const getSectionInfo = () => {
    if (selectedCajaId && activeSection === 'cajas') {
      return { title: 'Detalle de Caja', subtitle: `ID: ${selectedCajaId}` };
    }

    switch (activeSection) {
      case 'cajas': return { title: 'Cajas & Finanzas', subtitle: 'Control de aperturas y cierres de caja' };
      case 'proveedores': return { title: 'Proveedores', subtitle: 'Listado de contactos y regímenes tributarios' };
      case 'ajustes': return { title: 'Ajustes', subtitle: 'Configuración de sucursales, bancos y regímenes' };
      default: return { title: 'Sistema de Caja', subtitle: '' };
    }
  };

  const { title, subtitle } = getSectionInfo();

  return (
    <MainLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      headerActions={renderHeaderActions()}
      title={title}
      subtitle={subtitle}
      onBack={selectedCajaId ? () => setSelectedCajaId(null) : undefined}
    >
      {renderContent()}
    </MainLayout>
  )
}
