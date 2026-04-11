import { Group, Avatar, Title, Text, Paper, ActionIcon, Tooltip, Stack, UnstyledButton, Badge, Divider, Menu } from '@mantine/core';
import { IconLogout, IconSelector, IconBuilding } from '@tabler/icons-react';
import { supabase } from '../../lib/supabaseClient';
import { useEmpresa } from '../../context/EmpresaContext';

interface AjustesHeaderProps {
    user: any;
    empresa: any;
    onEditProfile: () => void;
}

export function AjustesHeader({ user, empresa, onEditProfile }: AjustesHeaderProps) {
    const { perfil, availableEmpresas, switchEmpresa } = useEmpresa();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <Paper withBorder p="md" radius="lg" bg="white" shadow="xs">
            <Group justify="space-between" align="center" wrap="nowrap">
                {/* Sección Empresa: Identidad de la organización */}
                <Group wrap="nowrap" gap="sm" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar
                        size="md"
                        radius="md"
                        color="blue"
                        variant="light"
                        visibleFrom="xs"
                    >
                        {empresa?.nombre?.[0] || 'E'}
                    </Avatar>

                    <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <Menu shadow="md" width={240} position="bottom-start" radius="md">
                            <Menu.Target>
                                <UnstyledButton 
                                    style={{ 
                                        padding: '2px 4px', 
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s ease',
                                        cursor: availableEmpresas.length > 1 ? 'pointer' : 'default',
                                        '&:hover': availableEmpresas.length > 1 ? { backgroundColor: 'var(--mantine-color-gray-0)' } : {}
                                    }}
                                >
                                    <Group gap={6} wrap="nowrap">
                                        <Title
                                            order={3}
                                            size="h4"
                                            fw={700}
                                            style={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {empresa?.nombre || 'Mi Empresa'}
                                        </Title>
                                        {availableEmpresas.length > 1 && <IconSelector size={16} color="var(--mantine-color-dimmed)" />}
                                    </Group>
                                </UnstyledButton>
                            </Menu.Target>

                            {availableEmpresas.length > 1 && (
                                <Menu.Dropdown>
                                    <Menu.Label>Mis Empresas ({availableEmpresas.length})</Menu.Label>
                                    <Divider mb={5} />
                                    {availableEmpresas.map((e) => (
                                        <Menu.Item
                                            key={e.id}
                                            leftSection={<IconBuilding size={16} color={e.id === empresa.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dimmed)'} />}
                                            onClick={() => switchEmpresa(e.id)}
                                            p="xs"
                                        >
                                            <Stack gap={0}>
                                                <Text size="sm" fw={e.id === empresa.id ? 700 : 400} c={e.id === empresa.id ? 'blue' : 'dark'}>
                                                    {e.nombre}
                                                </Text>
                                                <Text size="xs" c="dimmed" tt="capitalize" lts={0}>{e.role === 'owner' ? 'Propietario' : e.role === 'admin' ? 'Admin' : 'Operador'}</Text>
                                            </Stack>
                                        </Menu.Item>
                                    ))}
                                </Menu.Dropdown>
                            )}
                        </Menu>
                        <Group gap={6} wrap="nowrap">
                            <Badge variant="dot" color="blue" size="xs">VINCULADA</Badge>
                            <Text size="xs" c="dimmed" truncate visibleFrom="sm">
                                {empresa?.ruc}
                            </Text>
                        </Group>
                    </Stack>
                </Group>

                {/* Sección Usuario: Perfil y Acciones */}
                <Group gap="md" wrap="nowrap">
                    <Divider orientation="vertical" h={32} visibleFrom="sm" />

                    <Group gap="sm" wrap="nowrap">
                        <UnstyledButton
                            onClick={onEditProfile}
                            style={{
                                padding: '4px',
                                borderRadius: '8px',
                                transition: 'background-color 0.2s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <Group gap="xs" wrap="nowrap">
                                <Stack gap={0} align="flex-end" visibleFrom="md">
                                    <Text size="sm" fw={700} ta="right" truncate maw={120}>
                                        {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}` : 'Sin nombre'}
                                    </Text>
                                    <Text size="xs" c="dimmed" ta="right" maw={150} truncate>
                                        {user?.email}
                                    </Text>
                                </Stack>
                                <Avatar
                                    size="md"
                                    radius="xl"
                                    color="indigo"
                                    variant="filled"
                                >
                                    {perfil?.nombre?.[0] || user?.email?.[0]}
                                </Avatar>
                            </Group>
                        </UnstyledButton>

                        <Tooltip label="Cerrar Sesión" openDelay={500}>
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="lg"
                                radius="md"
                                onClick={handleLogout}
                            >
                                <IconLogout size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Group>
        </Paper>
    );
}
