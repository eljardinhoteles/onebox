import { useState, useEffect } from 'react';
import { Stack, Text, Group, Badge, Alert, Accordion, SimpleGrid, Paper } from '@mantine/core';
import { AppLoader } from '../../../components/ui/AppLoader';
import { IconAlertCircle, IconCashBanknote, IconUsers, IconBuildingStore } from '@tabler/icons-react';
import { supabase } from '../../../lib/supabaseClient';


interface DetailsLoaderProps {
    empresaId: string;
}

export function DetailsLoader({ empresaId }: DetailsLoaderProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        cajas: [] as any[],
        usuarios: [] as any[],
        sucursales: [] as any[]
    });

    useEffect(() => {
        let isMounted = true;
        
        async function fetchDetails() {
            setLoading(true);
            setError(null);
            
            try {
                // Fetch sucursales
                const { data: sucursales, error: sucError } = await supabase
                    .from('sucursales')
                    .select('*')
                    .eq('empresa_id', empresaId);
                
                if (sucError) throw sucError;

                // Fetch cajas
                const { data: cajas, error: cajError } = await supabase
                    .from('cajas')
                    .select('*')
                    .eq('empresa_id', empresaId);
                
                if (cajError) throw cajError;

                // Fetch usuarios
                const { data: usuarios, error: usuError } = await supabase
                    .from('empresa_usuarios')
                    .select('*, perfiles:user_id(nombre, email)')
                    .eq('empresa_id', empresaId);
                
                if (usuError) throw usuError;

                if (isMounted) {
                    setStats({
                        cajas: (cajas || []).map((c: any) => ({
                            ...c,
                            sucursales: { nombre: (sucursales || []).find((s: any) => s.id === c.sucursal_id)?.nombre }
                        })),
                        usuarios: usuarios || [],
                        sucursales: sucursales || []
                    });
                }
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDetails();
        
        return () => { isMounted = false; };
    }, [empresaId]);

    if (loading) {
        return <AppLoader message="Cargando detalles del comercio..." py={40} />;
    }

    if (error) {
        return (
            <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
                {error}
            </Alert>
        );
    }

    return (
        <Stack gap="md">
            <SimpleGrid cols={3} spacing="sm">
                <Paper withBorder p="sm" radius="md">
                    <Group justify="center" gap={4}>
                        <IconBuildingStore size={18} color="var(--mantine-color-blue-6)" />
                        <Text fw={700} ta="center">{stats.sucursales.length}</Text>
                    </Group>
                    <Text size="xs" c="dimmed" ta="center">Sucursales</Text>
                </Paper>
                
                <Paper withBorder p="sm" radius="md">
                    <Group justify="center" gap={4}>
                        <IconCashBanknote size={18} color="var(--mantine-color-teal-6)" />
                        <Text fw={700} ta="center">{stats.cajas.length}</Text>
                    </Group>
                    <Text size="xs" c="dimmed" ta="center">Cajas</Text>
                </Paper>

                <Paper withBorder p="sm" radius="md">
                    <Group justify="center" gap={4}>
                        <IconUsers size={18} color="var(--mantine-color-orange-6)" />
                        <Text fw={700} ta="center">{stats.usuarios.length}</Text>
                    </Group>
                    <Text size="xs" c="dimmed" ta="center">Usuarios</Text>
                </Paper>
            </SimpleGrid>

            <Accordion variant="separated" radius="md" defaultValue="sucursales">
                <Accordion.Item value="sucursales">
                    <Accordion.Control icon={<IconBuildingStore size={16} color="var(--mantine-color-blue-6)" />}>
                        <Text size="sm" fw={600}>Sucursales registradas</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                        {stats.sucursales.length === 0 ? (
                            <Text size="sm" c="dimmed">No hay sucursales.</Text>
                        ) : (
                            <Stack gap="xs">
                                {stats.sucursales.map(s => (
                                    <Group key={s.id} justify="space-between">
                                        <Text size="sm">{s.nombre}</Text>
                                        <Text size="xs" c="dimmed">{s.ciudad || 'Sin ciudad'}</Text>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="cajas">
                    <Accordion.Control icon={<IconCashBanknote size={16} color="var(--mantine-color-teal-6)" />}>
                        <Text size="sm" fw={600}>Cajas registradas</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                        {stats.cajas.length === 0 ? (
                            <Text size="sm" c="dimmed">No hay cajas.</Text>
                        ) : (
                            <Stack gap="xs">
                                {stats.cajas.map(c => (
                                    <Group key={c.id} justify="space-between">
                                        <div>
                                            <Text size="sm" fw={500}>{c.nombre}</Text>
                                            <Text size="xs" c="dimmed">{c.sucursales?.nombre}</Text>
                                        </div>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="usuarios">
                    <Accordion.Control icon={<IconUsers size={16} color="var(--mantine-color-orange-6)" />}>
                        <Text size="sm" fw={600}>Usuarios registrados</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                        {stats.usuarios.length === 0 ? (
                            <Text size="sm" c="dimmed">No hay usuarios.</Text>
                        ) : (
                            <Stack gap="xs">
                                {stats.usuarios.map(u => (
                                    <Group key={u.id} justify="space-between">
                                        <div>
                                            <Text size="sm" fw={500}>{u.perfiles?.nombre || 'Usuario'}</Text>
                                            <Text size="xs" c="dimmed">{u.perfiles?.email}</Text>
                                        </div>
                                        <Badge size="xs" variant="light" color={u.rol === 'admin' ? 'blue' : 'gray'}>
                                            {u.rol}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Stack>
    );
}
