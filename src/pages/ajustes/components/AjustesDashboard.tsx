import { SimpleGrid } from '@mantine/core';
import { IconBuilding, IconBuildingStore, IconBuildingBank, IconListDetails, IconSettings, IconBell, IconHistory } from '@tabler/icons-react';
import { MenuCard } from './MenuCard';

interface AjustesDashboardProps {
    empresaNombre?: string;
    onNavigate: (tab: string) => void;
    onOpenNotifications: () => void;
}

export function AjustesDashboard({ empresaNombre, onNavigate, onOpenNotifications }: AjustesDashboardProps) {
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            <MenuCard
                icon={<IconBuilding size={32} color="var(--mantine-color-indigo-6)" />}
                title="Equipo & Empresa"
                description={empresaNombre || 'Perfil y gestión de equipo.'}
                onClick={() => onNavigate('empresa')}
            />
            <MenuCard
                icon={<IconBuildingStore size={32} color="var(--mantine-color-blue-6)" />}
                title="Sucursales"
                description="Ubicaciones físicas."
                onClick={() => onNavigate('sucursales')}
            />
            <MenuCard
                icon={<IconBuildingBank size={32} color="var(--mantine-color-violet-6)" />}
                title="Bancos"
                description="Cuentas bancarias."
                onClick={() => onNavigate('bancos')}
            />
            <MenuCard
                icon={<IconListDetails size={32} color="var(--mantine-color-cyan-6)" />}
                title="Regímenes"
                description="Gestión tributaria."
                onClick={() => onNavigate('regimenes')}
            />
            <MenuCard
                icon={<IconSettings size={32} color="var(--mantine-color-orange-6)" />}
                title="Configuración"
                description="Alertas y parámetros."
                onClick={() => onNavigate('config')}
            />
            <MenuCard
                icon={<IconBell size={32} color="var(--mantine-color-blue-6)" />}
                title="Notificaciones"
                description="Centro de avisos."
                onClick={onOpenNotifications}
            />
            <MenuCard
                icon={<IconHistory size={32} color="var(--mantine-color-gray-6)" />}
                title="Bitácora"
                description="Historial de auditoría."
                onClick={() => onNavigate('bitacora')}
            />
            <MenuCard
                icon={<IconBuildingBank size={32} color="var(--mantine-color-grape-6)" />}
                title="Historial Cierres"
                description="Reposiciones y cajas cerradas."
                onClick={() => onNavigate('history')}
            />
        </SimpleGrid>
    );
}
