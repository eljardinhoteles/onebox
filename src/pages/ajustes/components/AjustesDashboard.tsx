import { SimpleGrid } from '@mantine/core';
import { IconBuilding, IconBuildingStore, IconBuildingBank, IconListDetails, IconSettings, IconBell, IconHistory, IconUserCircle, IconInfoCircle, IconPackage, IconShieldCheck } from '@tabler/icons-react';
import { MenuCard } from './MenuCard';
import { useEmpresa } from '../../../context/EmpresaContext';
import { useNavigate } from 'react-router-dom';

interface AjustesDashboardProps {
    onNavigate: (tab: string) => void;
    onOpenNotifications: () => void;
}

export function AjustesDashboard({ onNavigate, onOpenNotifications }: AjustesDashboardProps) {
    const { isSuperAdmin } = useEmpresa();
    const navigate = useNavigate();

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            <MenuCard
                icon={<IconBuilding size={32} color="var(--mantine-color-indigo-6)" />}
                title="Equipo & Empresa"
                description="Editar razón social, RUC y gestionar equipo."
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
                icon={<IconPackage size={32} color="var(--mantine-color-teal-6)" />}
                title="Productos Recurrentes"
                description="Productos frecuentes para agilizar registro."
                onClick={() => onNavigate('productos')}
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
            <MenuCard
                icon={<IconUserCircle size={32} color="var(--mantine-color-indigo-6)" />}
                title="Mi Perfil"
                description="Editar nombre y apellido."
                onClick={() => onNavigate('perfil')}
            />
            <MenuCard
                icon={<IconInfoCircle size={32} color="var(--mantine-color-teal-6)" />}
                title="Suscripción & Info"
                description="Versión y estado del plan."
                onClick={() => onNavigate('about')}
            />
            {isSuperAdmin && (
                <MenuCard
                    icon={<IconShieldCheck size={32} color="var(--mantine-color-red-6)" />}
                    title="Panel Admin"
                    description="Gestión de suscripciones y plataforma."
                    onClick={() => navigate('/admin')}
                />
            )}
        </SimpleGrid>
    );
}
