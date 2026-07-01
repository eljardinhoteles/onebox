import { useState, useEffect } from 'react';
import { Paper, UnstyledButton, Text, ActionIcon, Tooltip } from '@mantine/core';
import {
    IconReceipt2,
    IconUsers,
    IconSettings,
    IconPlus,
    IconBrandWhatsapp,
    IconTransfer,
    IconUserPlus
} from '@tabler/icons-react';
import { NotificationCenter } from './NotificationCenter';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
    { value: 'cajas', path: '/cajas', label: 'Cajas', icon: IconReceipt2, color: '#228be6' },
    { value: 'proveedores', path: '/proveedores', label: 'Proveedores', icon: IconUsers, color: '#228be6' },
    { value: 'ajustes', path: '/ajustes', label: 'Ajustes', icon: IconSettings, color: '#228be6' },
];

interface NavbarProps {
    onAdd?: () => void;
}

const handleWhatsappSoporte = () => {
    window.open('https://wa.me/593999999999?text=Hola,%20necesito%20soporte%20con%20Mi%20Caja%20Chica', '_blank');
};

export function Navbar({ onAdd }: NavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleShow = () => setIsVisible(true);
        const handleHide = () => setIsVisible(false);
        window.addEventListener('show-navbar', handleShow);
        window.addEventListener('hide-navbar', handleHide);
        return () => {
            window.removeEventListener('show-navbar', handleShow);
            window.removeEventListener('hide-navbar', handleHide);
        }
    }, []);

    const isAjustes = location.pathname.startsWith('/ajustes');

    let actionLabel = "Nueva Acción Rápida";
    let ActionIconComponent = IconPlus;
    let actionColor = "teal";
    let actionShadowRGB = "18, 184, 134";

    if (location.pathname === '/cajas' || location.pathname === '/cajas/') {
        actionLabel = "Crear Caja";
        actionColor = "cyan";
        actionShadowRGB = "21, 170, 191"; // Celeste (Mantine cyan)
    } else if (location.pathname.startsWith('/cajas/')) {
        actionLabel = "Nueva Transacción";
        ActionIconComponent = IconTransfer;
    } else if (location.pathname.startsWith('/proveedores')) {
        actionLabel = "Nuevo Proveedor";
        ActionIconComponent = IconUserPlus;
    }

    return (
        <div
            className="no-print"
            style={{
                position: 'fixed',
                bottom: isVisible ? '1rem' : '-100px',
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Notificaciones - sutil a la izquierda */}
            <NotificationCenter />

            {/* Navbar principal */}
            <Paper
                shadow="lg"
                radius={28}
                px={6}
                py={6}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = item.icon;

                        return (
                            <UnstyledButton
                                key={item.value}
                                onClick={() => navigate(item.path)}
                                className="navbar-tab"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isActive ? 6 : 0,
                                    padding: isActive ? '10px 18px' : '10px 14px',
                                    borderRadius: 22,
                                    backgroundColor: isActive ? item.color : 'transparent',
                                    color: isActive ? '#fff' : '#868e96',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <Icon
                                    size={20}
                                    stroke={isActive ? 2 : 1.5}
                                    className="navbar-tab-icon"
                                    style={{
                                        flexShrink: 0,
                                    }}
                                />
                                <Text
                                    size="sm"
                                    fw={600}
                                    className="navbar-tab-label"
                                    style={{
                                        maxWidth: isActive ? 120 : 0,
                                        opacity: isActive ? 1 : 0,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {item.label}
                                </Text>
                            </UnstyledButton>
                        );
                    })}
                </div>
            </Paper>

            {/* FAB - Botón flotante de creación rápida / Soporte */}
            {isAjustes ? (
                <Tooltip label="¿Necesitas ayuda? Escríbenos" position="top" withArrow color="green.7">
                    <ActionIcon
                        size={48}
                        radius={24}
                        variant="filled"
                        color="green"
                        onClick={handleWhatsappSoporte}
                        style={{
                            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(34, 197, 94, 0.4)';
                        }}
                    >
                        <IconBrandWhatsapp size={26} stroke={2} />
                    </ActionIcon>
                </Tooltip>
            ) : onAdd ? (
                <Tooltip label={actionLabel} position="top" withArrow color={`${actionColor}.7`}>
                    <ActionIcon
                        size={48}
                        radius={24}
                        variant="filled"
                        color={actionColor}
                        onClick={onAdd}
                        style={{
                            boxShadow: `0 4px 14px rgba(${actionShadowRGB}, 0.4)`,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = `0 6px 20px rgba(${actionShadowRGB}, 0.5)`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = `0 4px 14px rgba(${actionShadowRGB}, 0.4)`;
                        }}
                    >
                        <ActionIconComponent size={22} stroke={2.5} />
                    </ActionIcon>
                </Tooltip>
            ) : (
                <div id="global-fab-slot" />
            )}
        </div>
    );
}
