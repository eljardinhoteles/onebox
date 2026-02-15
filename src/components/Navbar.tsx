import { Paper, UnstyledButton, Text, ActionIcon } from '@mantine/core';
import {
    IconReceipt2,
    IconUsers,
    IconSettings,
    IconPlus,
} from '@tabler/icons-react';
import { NotificationCenter } from './NotificationCenter';

const NAV_ITEMS = [
    { value: 'cajas', label: 'Cajas', icon: IconReceipt2, color: '#228be6' },
    { value: 'proveedores', label: 'Proveedores', icon: IconUsers, color: '#228be6' },
    { value: 'ajustes', label: 'Ajustes', icon: IconSettings, color: '#228be6' },
];

interface NavbarProps {
    activeSection: string;
    onSectionChange: (s: string) => void;
    onAdd?: () => void;
}

export function Navbar({ activeSection, onSectionChange, onAdd }: NavbarProps) {
    return (
        <div
            className="no-print"
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
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
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeSection === item.value;
                        const Icon = item.icon;

                        return (
                            <UnstyledButton
                                key={item.value}
                                onClick={() => onSectionChange(item.value)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isActive ? 6 : 0,
                                    padding: isActive ? '10px 18px' : '10px 14px',
                                    borderRadius: 22,
                                    backgroundColor: isActive ? item.color : 'transparent',
                                    color: isActive ? '#fff' : '#868e96',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <Icon
                                    size={20}
                                    stroke={isActive ? 2 : 1.5}
                                    style={{
                                        flexShrink: 0,
                                        transition: 'stroke-width 0.2s ease',
                                    }}
                                />
                                <Text
                                    size="sm"
                                    fw={600}
                                    style={{
                                        maxWidth: isActive ? 120 : 0,
                                        opacity: isActive ? 1 : 0,
                                        overflow: 'hidden',
                                        transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                                    }}
                                >
                                    {item.label}
                                </Text>
                            </UnstyledButton>
                        );
                    })}
                </div>
            </Paper>

            {/* FAB - Botón flotante de creación rápida */}
            {onAdd && (
                <ActionIcon
                    size={48}
                    radius={24}
                    variant="filled"
                    color="teal"
                    onClick={onAdd}
                    style={{
                        boxShadow: '0 4px 14px rgba(18, 184, 134, 0.4)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(18, 184, 134, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(18, 184, 134, 0.4)';
                    }}
                >
                    <IconPlus size={22} stroke={2.5} />
                </ActionIcon>
            )}
        </div>
    );
}
