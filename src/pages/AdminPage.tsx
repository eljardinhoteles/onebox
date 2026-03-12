import { useState } from 'react';
import { Container, Title, Text, Stack, Group, ActionIcon, Button, Alert, Drawer, ThemeIcon } from '@mantine/core';
import { IconSettings, IconLogout, IconAlertTriangle } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useAdminComercios } from './admin/hooks/useAdminComercios';
import { AdminMetrics } from './admin/components/AdminMetrics';
import { AdminFilters } from './admin/components/AdminFilters';
import { AdminTable } from './admin/components/AdminTable';
import { AdminConfigModal } from './admin/components/AdminConfigModal';
import { DetailsLoader } from './admin/components/DetailsLoader';
import type { Comercio } from './admin/types';

export function AdminPage() {
    const adminProps = useAdminComercios();
    const [configDrawerOpened, setConfigDrawerOpened] = useState(false);
    const [drawerOpened, setDrawerOpened] = useState(false);
    const [selectedComercio, setSelectedComercio] = useState<Comercio | null>(null);

    const openDetailsModal = (sub: Comercio) => {
        setSelectedComercio(sub);
        setDrawerOpened(true);
    };

    if (!adminProps.isSuperAdmin) {
        return (
            <Container size="sm" py={100}>
                <Alert icon={<IconAlertTriangle />} title="Acceso Denegado" color="red" variant="filled">
                    No tienes permisos para acceder a esta página.
                </Alert>
            </Container>
        );
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">

                {/* ── HEADER ── */}
                <Group justify="space-between" align="center">
                    <div>
                        <Title fw={800} order={2} lh={1.1}>Panel de Administración</Title>
                        <Text size="sm" c="dimmed" mt={2}>Control global de comercios y suscripciones</Text>
                    </div>
                    <Group gap="xs">
                        <ActionIcon
                            variant="light"
                            color="blue"
                            size="lg"
                            radius="md"
                            onClick={() => setConfigDrawerOpened(true)}
                            title="Configuración de plataforma"
                        >
                            <IconSettings size={18} />
                        </ActionIcon>
                        <Button
                            variant="light"
                            color="red"
                            size="sm"
                            leftSection={<IconLogout size={15} />}
                            onClick={() => supabase.auth.signOut()}
                            radius="md"
                        >
                            Cerrar sesión
                        </Button>
                    </Group>
                </Group>

                {/* ── MÉTRICAS FINANCIERAS ── */}
                <AdminMetrics financialTotals={adminProps.financialTotals} />

                {/* ── BARRA DE CONTROLES ── */}
                <AdminFilters 
                    filter={adminProps.filter}
                    setFilter={adminProps.setFilter}
                    searchTerm={adminProps.searchTerm}
                    setSearchTerm={adminProps.setSearchTerm}
                    setCurrentPage={adminProps.setCurrentPage}
                    counts={adminProps.counts}
                    fetchComercios={adminProps.fetchComercios}
                    loading={adminProps.loading}
                />

                {/* ── TABLA PRINCIPAL ── */}
                <AdminTable 
                    paginatedItems={adminProps.paginatedItems}
                    currentPage={adminProps.currentPage}
                    totalPages={adminProps.totalPages}
                    setCurrentPage={adminProps.setCurrentPage}
                    handleChangePlanClick={adminProps.handleChangePlanClick}
                    handleToggleFacturaEmitida={adminProps.handleToggleFacturaEmitida}
                    handleApproveUpgrade={adminProps.handleApproveUpgrade}
                    handleApproveClick={adminProps.handleApproveClick}
                    handleReject={adminProps.handleReject}
                    handleReactivate={adminProps.handleReactivate}
                    handleSuspend={adminProps.handleSuspend}
                    openDetailsModal={openDetailsModal}
                    handleDeleteComercio={adminProps.handleDeleteComercio}
                />

                {/* ── DRAWER DETALLES METRICAS ── */}
                <Drawer
                    opened={drawerOpened}
                    onClose={() => setDrawerOpened(false)}
                    title={
                        <Group gap="sm">
                            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                                <IconSettings size={20} />
                            </ThemeIcon>
                            <div>
                                <Text fw={700} lh={1.1}>Detalles del Comercio</Text>
                                <Text size="xs" c="dimmed">{selectedComercio?.empresa_nombre}</Text>
                            </div>
                        </Group>
                    }
                    position="right"
                    size="md"
                    padding="lg"
                >
                    {selectedComercio && (
                        <DetailsLoader 
                            key={adminProps.drawerVersion}
                            empresaId={selectedComercio.empresa_id} 
                        />
                    )}
                </Drawer>

                {/* ── MODAL CONFIGURACION GLOBAL ── */}
                <AdminConfigModal 
                    opened={configDrawerOpened} 
                    onClose={() => setConfigDrawerOpened(false)} 
                />

            </Stack>
        </Container>
    );
}
