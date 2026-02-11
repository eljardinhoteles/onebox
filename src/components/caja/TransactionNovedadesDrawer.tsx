import { useState } from 'react';
import { Drawer, Stack, Text, Timeline, Textarea, Button, Group, ScrollArea, Paper, Badge, LoadingOverlay, Divider, ActionIcon } from '@mantine/core';
import { IconMessage2, IconPlus, IconHistory, IconFileInvoice, IconEdit, IconTrash, IconCheck, IconLink, IconAlertTriangle } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

interface TransactionNovedadesDrawerProps {
    opened: boolean;
    onClose: () => void;
    transactionId: number | null;
    transactionDetail?: string;
}

export function TransactionNovedadesDrawer({ opened, onClose, transactionId, transactionDetail }: TransactionNovedadesDrawerProps) {
    const queryClient = useQueryClient();
    const [nota, setNota] = useState('');

    const { data: novedades = [], isLoading } = useQuery({
        queryKey: ['transaction_novedades', transactionId],
        queryFn: async () => {
            if (!transactionId) return [];

            // Buscamos registros donde el detalle contenga el transaccion_id
            const { data, error } = await supabase
                .from('bitacora')
                .select('*')
                .or(`detalle->>transaccion_id.eq.${transactionId},detalle->>main_transaccion_id.eq.${transactionId}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!transactionId
    });

    const addNotaMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('bitacora').insert({
                accion: 'ANOTACION_MANUAL',
                detalle: {
                    transaccion_id: transactionId,
                    nota: nota
                },
                user_id: user?.id,
                user_email: user?.email
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setNota('');
            queryClient.invalidateQueries({ queryKey: ['transaction_novedades', transactionId] });
            notifications.show({
                title: 'Nota añadida',
                message: 'La novedad ha sido registrada exitosamente.',
                color: 'teal',
                icon: <IconCheck size={16} />
            });
        }
    });

    const anularNotaMutation = useMutation({
        mutationFn: async (id: number) => {
            const { data: current, error: fetchError } = await supabase.from('bitacora').select('detalle').eq('id', id).single();
            if (fetchError) throw fetchError;

            // Aseguramos que el detalle sea un objeto y añadimos el flag anulado
            const nuevoDetalle = { ...(current?.detalle || {}), anulado: true };

            const { error: updateError } = await supabase
                .from('bitacora')
                .update({ detalle: nuevoDetalle })
                .eq('id', id);

            if (updateError) throw updateError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction_novedades', transactionId] });
            notifications.show({
                title: 'Nota anulada',
                message: 'La anotación se mantiene en el historial pero ha sido marcada como anulada.',
                color: 'orange',
                icon: <IconAlertTriangle size={16} />
            });
        },
        onError: (error: any) => {
            console.error('Error al anular nota:', error);
            notifications.show({
                title: 'Error al anular',
                message: 'No tienes permisos para modificar este registro o el servidor rechazó el cambio.',
                color: 'red',
                icon: <IconAlertTriangle size={16} />
            });
        }
    });

    const getIcon = (accion: string) => {
        switch (accion) {
            case 'CREAR_GASTO': return <IconPlus size={12} />;
            case 'EDITAR_GASTO': return <IconEdit size={12} />;
            case 'ELIMINAR_GASTO': return <IconTrash size={12} />;
            case 'CREAR_RETENCION':
            case 'EDITAR_RETENCION': return <IconFileInvoice size={12} />;
            case 'LEGALIZACION_GASTOS': return <IconLink size={12} />;
            case 'ANOTACION_MANUAL': return <IconMessage2 size={12} />;
            default: return <IconHistory size={12} />;
        }
    };

    const getColor = (accion: string) => {
        switch (accion) {
            case 'CREAR_GASTO': return 'blue';
            case 'ANOTACION_MANUAL': return 'grape';
            case 'CREAR_RETENCION':
            case 'EDITAR_RETENCION': return 'orange';
            case 'ELIMINAR_RETENCION': return 'red';
            case 'LEGALIZACION_GASTOS': return 'teal';
            default: return 'gray';
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<Text fw={700} size="lg">Historial y Novedades</Text>}
            position="right"
            size="md"
        >
            <Stack gap="md" pos="relative" h="100%">
                <LoadingOverlay visible={isLoading} overlayProps={{ blur: 1 }} />

                {transactionDetail && (
                    <Paper withBorder p="xs" radius="md" bg="gray.0">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Transacción</Text>
                        <Text size="sm" fw={600}>{transactionDetail}</Text>
                    </Paper>
                )}

                <Divider label="Nueva Novedad" labelPosition="center" />

                <Stack gap="xs">
                    <Textarea
                        placeholder="Escribe una observación o novedad sobre esta transacción..."
                        minRows={3}
                        value={nota}
                        onChange={(e) => setNota(e.currentTarget.value)}
                        radius="md"
                    />
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => addNotaMutation.mutate()}
                        disabled={!nota.trim()}
                        loading={addNotaMutation.isPending}
                        color="grape"
                        fullWidth
                        radius="md"
                    >
                        Añadir Nota
                    </Button>
                </Stack>

                <Divider label="Línea de Tiempo" labelPosition="center" mt="sm" />

                <ScrollArea offsetScrollbars style={{ flex: 1 }}>
                    {novedades.length === 0 ? (
                        <Text ta="center" py="xl" c="dimmed" size="sm">No hay registros para esta transacción.</Text>
                    ) : (
                        <Timeline active={novedades.length} bulletSize={24} lineWidth={2} mt="md" px="lg">
                            {novedades.map((n) => {
                                const detalleObj = typeof n.detalle === 'string' ? JSON.parse(n.detalle) : n.detalle;
                                const isAnulado = detalleObj?.anulado === true;
                                return (
                                    <Timeline.Item
                                        key={n.id}
                                        bullet={getIcon(n.accion)}
                                        color={isAnulado ? 'gray.4' : getColor(n.accion)}
                                        opacity={isAnulado ? 0.5 : 1}
                                        title={
                                            <Group justify="space-between" align="center" gap="xs">
                                                <Badge
                                                    variant={isAnulado ? 'outline' : 'light'}
                                                    color={isAnulado ? 'gray' : getColor(n.accion)}
                                                    size="xs"
                                                    mb={4}
                                                >
                                                    {n.accion.replace(/_/g, ' ')} {isAnulado && ' - ANULADO'}
                                                </Badge>

                                                {n.accion === 'ANOTACION_MANUAL' && !isAnulado && (
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        size="xs"
                                                        onClick={() => anularNotaMutation.mutate(n.id)}
                                                        loading={anularNotaMutation.isPending && anularNotaMutation.variables === n.id}
                                                        title="Anular nota"
                                                    >
                                                        <IconTrash size={12} />
                                                    </ActionIcon>
                                                )}
                                            </Group>
                                        }
                                    >
                                        <Stack gap={4}>
                                            {n.accion === 'ANOTACION_MANUAL' ? (
                                                <Text
                                                    size="md"
                                                    fw={600}
                                                    style={{
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: 1.4,
                                                        textDecoration: isAnulado ? 'line-through' : 'none',
                                                        color: isAnulado ? '#adb5bd' : 'inherit',
                                                        fontStyle: isAnulado ? 'italic' : 'normal',
                                                        opacity: isAnulado ? 0.7 : 1
                                                    }}
                                                >
                                                    {detalleObj?.nota}
                                                </Text>
                                            ) : (
                                                <Text size="sm" fw={500} c={isAnulado ? 'dimmed' : 'gray.8'}>
                                                    {n.accion === 'CREAR_GASTO' ? 'Se registró el gasto inicial' :
                                                        n.accion === 'EDITAR_GASTO' ? 'Se modificaron los datos del gasto' :
                                                            n.accion === 'CREAR_RETENCION' ? `Se emitió la retención ${detalleObj?.numero_retencion}` :
                                                                n.accion === 'EDITAR_RETENCION' ? `Se actualizó la retención ${detalleObj?.numero_retencion}` :
                                                                    n.accion === 'ELIMINAR_RETENCION' ? `Se eliminó la retención ${detalleObj?.numero_retencion}` :
                                                                        n.accion === 'LEGALIZACION_GASTOS' ? 'Se agrupó este gasto en una legalización' :
                                                                            'Registro automático del sistema'}
                                                </Text>
                                            )}

                                            <Group gap={6} mt={2}>
                                                <Text size="xs" c="dimmed">
                                                    {dayjs(n.created_at).locale('es').format('DD/MM/YYYY HH:mm')}
                                                </Text>
                                                <Text size="xs" c="dimmed">•</Text>
                                                <Text size="xs" c={isAnulado ? 'dimmed' : 'cyan.8'} fw={500}>
                                                    {n.user_email?.split('@')[0] || 'Sistema'}
                                                </Text>
                                            </Group>
                                        </Stack>
                                    </Timeline.Item>
                                );
                            })}
                        </Timeline>
                    )}
                </ScrollArea>

                <Button variant="light" color="gray" fullWidth onClick={onClose} mt="auto">
                    Cerrar
                </Button>
            </Stack>
        </Drawer>
    );
}
