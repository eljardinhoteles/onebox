import { useState, useEffect } from 'react';
import {
    Paper, Stack, Group, Title, Text, Badge, Divider,
    SimpleGrid, Button, Card, RingProgress, FileInput,
    Alert, Tooltip
} from '@mantine/core';
import { IconInfoCircle, IconUpload, IconCrown, IconCheck, IconClock, IconAlertTriangle, IconLifebuoy, IconBug } from '@tabler/icons-react';
import { useEmpresa } from '../../../context/EmpresaContext';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { usePlanesConfig } from '../../../hooks/usePlanesConfig';
import dayjs from 'dayjs';
import LogoIcon from '../../../assets/Icon.svg';

interface BankInfo {
    banco_datos: string;
}

export function AboutSection() {
    const { empresa, role, subscription, isReadOnly, daysRemaining, refreshSubscription } = useEmpresaWithDays();
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [comprobante, setComprobante] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'mensual' | 'anual' | null>(null);
    const [upgradeMode, setUpgradeMode] = useState(false);
    
    const { precios } = usePlanesConfig();
    const precioMensualAnual = Math.floor(precios.anual / 12);
    const ahorroAnual = (precios.mensual * 12) - precios.anual;

    useEffect(() => {
        supabase.from('platform_config').select('*').then(({ data }) => {
            if (data) {
                const config: any = {};
                data.forEach((row: any) => { config[row.key] = row.value; });
                setBankInfo(config as BankInfo);
            }
        });
    }, []);

    const handleUploadComprobante = async () => {
        if (!comprobante || !empresa || !selectedPlan) return;
        setUploading(true);

        try {
            const fileExt = comprobante.name.split('.').pop();
            const filePath = `${empresa.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('comprobantes')
                .upload(filePath, comprobante);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('comprobantes')
                .getPublicUrl(filePath);

            const isUpgrade = upgradeMode && subscription?.estado === 'activa';

            if (isUpgrade) {
                // Flujo upgrade: NO cambiar estado, solo marcar upgrade pendiente
                const { error } = await supabase
                    .from('suscripciones')
                    .update({
                        upgrade_pendiente: true,
                        upgrade_plan: selectedPlan,
                        upgrade_comprobante_url: publicUrl,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('empresa_id', empresa.id);

                if (error) throw error;

                notifications.show({
                    title: 'Solicitud de upgrade enviada',
                    message: 'Tu comprobante de upgrade fue recibido. Te notificaremos cuando sea aprobado. Tu acceso actual sigue activo.',
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
            } else {
                // Flujo pago nuevo/renovación: cambiar estado a pendiente_pago
                const { error: updateError } = await supabase
                    .from('suscripciones')
                    .upsert({
                        empresa_id: empresa.id,
                        plan: selectedPlan,
                        estado: 'pendiente_pago',
                        metodo_pago: 'transferencia',
                        comprobante_url: publicUrl,
                        fecha_fin: subscription?.fecha_fin || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'empresa_id' });

                if (updateError) throw updateError;

                notifications.show({
                    title: 'Comprobante enviado',
                    message: 'Tu pago está pendiente de aprobación. Te notificaremos cuando sea verificado.',
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
            }

            setComprobante(null);
            setSelectedPlan(null);
            setUpgradeMode(false);
            await refreshSubscription();
        } catch (err: any) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        } finally {
            setUploading(false);
        }
    };

    const estadoBadge = () => {
        if (!subscription) return <Badge color="gray">Sin suscripción</Badge>;
        const map: Record<string, { color: string; label: string }> = {
            trial: { color: 'blue', label: `Prueba Gratuita` },
            activa: { color: 'teal', label: 'Activa' },
            vencida: { color: 'red', label: 'Vencida' },
            pendiente_pago: { color: 'orange', label: 'Pendiente de Aprobación' },
        };
        const info = map[subscription.estado] || { color: 'gray', label: subscription.estado };
        return <Badge size="lg" color={info.color} variant="filled">{info.label}</Badge>;
    };

    const planLabel = () => {
        if (!subscription) return 'Ninguno';
        const map: Record<string, string> = {
            trial: 'Prueba Gratuita (14 días)',
            mensual: 'Plan Mensual',
            anual: 'Plan Anual',
        };
        return map[subscription.plan] || subscription.plan;
    };

    const isOwner = role === 'owner';

    return (
        <Stack gap="lg">
            {/* Estado actual */}
            <Paper withBorder p="xl" radius="lg">
                <Stack gap="xl">
                    <Group justify="space-between" align="flex-start">
                        <Group>
                            <img src={LogoIcon} alt="Mi Caja Chica Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                            <Stack gap={0}>
                                <Title order={3}>Mi Caja Chica</Title>
                                <Text size="sm" c="dimmed">Sistema Integral de Gestión de Cajas</Text>
                            </Stack>
                        </Group>
                        <Badge size="lg" variant="light" color="blue">v1.5.40 stable</Badge>
                    </Group>

                    <Divider />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="sm">
                        <Card withBorder radius="md" p="md" bg="gray.0">
                            <Stack gap="xs">
                                <Text fw={700} size="xs" c="dimmed" tt="uppercase">Tu Suscripción Actual</Text>
                                <Group gap="xs">
                                    {estadoBadge()}
                                    <Badge size="lg" color="gray" variant="outline">{planLabel()}</Badge>
                                </Group>
                                
                                {subscription && subscription.estado !== 'vencida' && (
                                    <Group gap={6} mt="sm">
                                        <IconClock size={16} color="var(--mantine-color-dimmed)" />
                                        <Text size="sm" c="dimmed" fw={500}>
                                            {daysRemaining > 0
                                                ? `Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`
                                                : 'Vencida'}
                                        </Text>
                                    </Group>
                                )}
                                {subscription?.fecha_fin && (
                                    <Text size="xs" c="dimmed">
                                        Fecha de vencimiento: <strong>{dayjs(subscription.fecha_fin).format('DD/MM/YYYY')}</strong>
                                    </Text>
                                )}
                            </Stack>
                        </Card>

                        <Stack gap="xs" align="center" justify="center">
                            {subscription && daysRemaining > 0 && (
                                <RingProgress
                                    size={100}
                                    thickness={8}
                                    roundCaps
                                    sections={[{
                                        value: subscription.plan === 'trial'
                                            ? (daysRemaining / 14) * 100
                                            : subscription.plan === 'mensual'
                                                ? (daysRemaining / 30) * 100
                                                : (daysRemaining / 365) * 100,
                                        color: daysRemaining <= 3 ? 'red' : daysRemaining <= 7 ? 'orange' : 'teal',
                                    }]}
                                    label={
                                        <Text ta="center" fw={700} size="lg">{daysRemaining}</Text>
                                    }
                                />
                            )}
                        </Stack>
                    </SimpleGrid>
                </Stack>
            </Paper>

            {/* Alerta de vencimiento */}
            {isReadOnly && (
                <Alert
                    icon={<IconAlertTriangle size={20} />}
                    title="Tu suscripción ha vencido"
                    color="red"
                    variant="filled"
                    radius="md"
                >
                    El sistema se encuentra en modo de solo lectura. Suscríbete a un plan para continuar usando todas las funciones.
                </Alert>
            )}

            {/* Alerta de pendiente */}
            {subscription?.estado === 'pendiente_pago' && (
                <Alert
                    icon={<IconClock size={20} />}
                    title="Pago en revisión"
                    color="orange"
                    variant="light"
                    radius="md"
                >
                    Tu comprobante de pago está siendo verificado. Te notificaremos cuando sea aprobado.
                </Alert>
            )}

            {/* Planes */}
            {isOwner && subscription?.estado !== 'activa' && (
                <Paper withBorder p="xl" radius="lg">
                    <Stack gap="lg">
                        <div>
                            <Title order={3}>Elige tu Plan</Title>
                            <Text size="sm" c="dimmed">Selecciona un plan para mantener tu acceso completo.</Text>
                        </div>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                            <Card
                                withBorder
                                padding="xl"
                                radius="lg"
                                onClick={() => setSelectedPlan('mensual')}
                                style={{
                                    cursor: 'pointer',
                                    borderColor: selectedPlan === 'mensual' ? 'var(--mantine-color-blue-6)' : undefined,
                                    borderWidth: selectedPlan === 'mensual' ? 2 : 1,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <Stack gap="md" align="center">
                                    <Badge variant="light" color="blue" size="lg">Mensual</Badge>
                                    <Group gap={2} align="baseline">
                                        <Text size="xl" fw={900} style={{ fontSize: 42 }}>${precios.mensual}</Text>
                                        <Text size="sm" c="dimmed">/mes</Text>
                                    </Group>
                                    <Stack gap={4} align="center">
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Hasta 20 usuarios</Text></Group>
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Hasta 20 sucursales</Text></Group>
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Acceso completo</Text></Group>
                                    </Stack>
                                    {selectedPlan === 'mensual' && (
                                        <Badge color="blue" variant="filled" size="sm">Seleccionado</Badge>
                                    )}
                                </Stack>
                            </Card>

                            <Card
                                withBorder
                                padding="xl"
                                radius="lg"
                                onClick={() => setSelectedPlan('anual')}
                                style={{
                                    cursor: 'pointer',
                                    borderColor: selectedPlan === 'anual' ? 'var(--mantine-color-teal-6)' : undefined,
                                    borderWidth: selectedPlan === 'anual' ? 2 : 1,
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                }}
                            >
                                <Badge
                                    color="teal"
                                    variant="filled"
                                    size="sm"
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                    leftSection={<IconCrown size={12} />}
                                >
                                    Ahorra ${ahorroAnual}
                                </Badge>
                                <Stack gap="md" align="center">
                                    <Badge variant="light" color="teal" size="lg">Anual</Badge>
                                    <Group gap={2} align="baseline">
                                        <Text size="xl" fw={900} style={{ fontSize: 42 }}>${precioMensualAnual}</Text>
                                        <Text size="sm" c="dimmed">/mes</Text>
                                    </Group>
                                    <Text size="xs" c="dimmed" fw={600}>${precios.anual} USD / año</Text>
                                    <Stack gap={4} align="center">
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Hasta 20 usuarios</Text></Group>
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Hasta 20 sucursales</Text></Group>
                                        <Group gap={4}><IconCheck size={14} color="var(--mantine-color-teal-6)" /><Text size="xs">Acceso completo</Text></Group>
                                    </Stack>
                                    {selectedPlan === 'anual' && (
                                        <Badge color="teal" variant="filled" size="sm">Seleccionado</Badge>
                                    )}
                                </Stack>
                            </Card>
                        </SimpleGrid>

                        {/* Datos bancarios y subir comprobante */}
                        {selectedPlan && (
                            <Stack gap="md">
                                <Divider label="Método de Pago" labelPosition="center" />

                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                    <Card withBorder p="md" radius="md" bg="blue.0" style={{ opacity: 1 }}>
                                        <Stack gap="xs">
                                            <Group justify="space-between">
                                                <Text size="sm" fw={700}>Transferencia Bancaria</Text>
                                                <Badge size="xs">Recomendado</Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed">Paga mediante transferencia y sube tu comprobante.</Text>
                                        </Stack>
                                    </Card>

                                    <Card withBorder p="md" radius="md" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                                        <Stack gap="xs">
                                            <Group justify="space-between">
                                                <Text size="sm" fw={700} c="dimmed">Tarjeta de Crédito</Text>
                                                <Badge size="xs" color="gray">Próximamente</Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed">Pagos automáticos con tarjeta (Visa/Mastercard).</Text>
                                        </Stack>
                                    </Card>
                                </SimpleGrid>

                                {bankInfo && bankInfo.banco_datos && (
                                    <Paper withBorder p="lg" radius="md" bg="blue.0">
                                        <Stack gap="xs">
                                            <Text fw={700} size="sm">Instrucciones de Pago</Text>
                                            <Text size="xs" style={{ whiteSpace: 'pre-line' }}>
                                                {bankInfo.banco_datos}
                                            </Text>
                                            <Text size="xs" c="blue.7" fw={700} mt="xs">
                                                Monto a transferir: ${selectedPlan === 'mensual' ? `${precios.mensual}.00` : `${precios.anual}.00`} USD
                                            </Text>
                                        </Stack>
                                    </Paper>
                                )}

                                <FileInput
                                    label="Subir Comprobante de Pago"
                                    description="Adjunta una imagen o PDF de tu transferencia"
                                    placeholder="Seleccionar archivo..."
                                    leftSection={<IconUpload size={16} />}
                                    accept="image/*,.pdf"
                                    value={comprobante}
                                    onChange={setComprobante}
                                    radius="md"
                                />

                                <Tooltip
                                    label="Selecciona un archivo para continuar"
                                    disabled={!!comprobante}
                                >
                                    <Button
                                        onClick={handleUploadComprobante}
                                        loading={uploading}
                                        disabled={!comprobante}
                                        leftSection={<IconUpload size={16} />}
                                        radius="md"
                                        size="md"
                                        fullWidth
                                    >
                                        Enviar Comprobante
                                    </Button>
                                </Tooltip>
                            </Stack>
                        )}
                    </Stack>
                </Paper>
            )}

            {/* Upgrade disponible - plan activo mensual */}
            {subscription?.estado === 'activa' && subscription.plan !== 'anual' && !subscription.upgrade_pendiente && isOwner && (
                <Paper withBorder p="xl" radius="md" bg="blue.0">
                    <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <IconCrown size={18} color="var(--mantine-color-blue-6)" />
                                <Text fw={700} size="sm">Mejora al Plan Anual</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Ahorra ${ahorroAnual} al año — Solo ${precioMensualAnual}/mes vs ${precios.mensual}/mes mensual.
                            </Text>
                        </Stack>
                        <Button
                            size="sm"
                            radius="md"
                            color="blue"
                            variant="light"
                            leftSection={<IconCrown size={15} />}
                            onClick={() => {
                                setUpgradeMode(true);
                                setSelectedPlan('anual');
                            }}
                        >
                            Solicitar Upgrade
                        </Button>
                    </Group>
                </Paper>
            )}

            {/* Upgrade pendiente */}
            {subscription?.upgrade_pendiente && (
                <Alert
                    icon={<IconClock size={20} />}
                    title="Upgrade en revisión"
                    color="blue"
                    variant="light"
                    radius="md"
                >
                    Solicitud de upgrade al plan <strong>{subscription.upgrade_plan}</strong> recibida.
                    Tu acceso actual sigue activo mientras aprobamos el cambio.
                </Alert>
            )}

            {/* Formulario subir comprobante de upgrade */}
            {upgradeMode && selectedPlan && subscription?.estado === 'activa' && (
                <Paper withBorder p="xl" radius="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Stack gap={2}>
                                <Text fw={700}>Upgrade → Plan Anual</Text>
                                <Text size="xs" c="dimmed">Sube tu comprobante de ${precios.anual} USD. Tu cuenta actual sigue activa.</Text>
                            </Stack>
                            <Button variant="subtle" color="gray" size="xs" onClick={() => { setUpgradeMode(false); setSelectedPlan(null); setComprobante(null); }}>
                                Cancelar
                            </Button>
                        </Group>

                        {bankInfo?.banco_datos && (
                            <Paper withBorder p="md" radius="md" bg="blue.0">
                                <Stack gap="xs">
                                    <Text fw={700} size="sm">Instrucciones de Pago — Upgrade Anual</Text>
                                    <Text size="xs" style={{ whiteSpace: 'pre-line' }}>{bankInfo.banco_datos}</Text>
                                    <Text size="xs" c="blue.7" fw={700} mt="xs">Monto: ${precios.anual}.00 USD</Text>
                                </Stack>
                            </Paper>
                        )}

                        <FileInput
                            label="Comprobante de pago del upgrade"
                            description="Adjunta imagen o PDF de la transferencia"
                            placeholder="Seleccionar archivo..."
                            leftSection={<IconUpload size={16} />}
                            accept="image/*,.pdf"
                            value={comprobante}
                            onChange={setComprobante}
                            radius="md"
                        />

                        <Button
                            onClick={handleUploadComprobante}
                            loading={uploading}
                            disabled={!comprobante}
                            leftSection={<IconUpload size={16} />}
                            radius="md"
                            color="blue"
                            fullWidth
                        >
                            Enviar Comprobante de Upgrade
                        </Button>
                    </Stack>
                </Paper>
            )}

            {/* Créditos */}
            <Paper withBorder p="xl" radius="lg">
                <Stack gap="xl">
                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Group gap="md">
                            <img src={LogoIcon} alt="Mi Caja Chica Logo" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'grayscale(100%) opacity(0.5)' }} />
                            <Stack gap={0}>
                                <Text fw={800} size="lg">Mi Caja Chica</Text>
                                <Text size="xs" c="dimmed">Desarrollado con ❤️ por Tere & Matt</Text>
                            </Stack>
                        </Group>
                        <Stack gap={2} align="flex-end">
                            <Text size="xs" fw={600} c="dimmed">Versión 1.5.40</Text>
                            <Text size="xs" c="dimmed">© {new Date().getFullYear()} Todos los derechos reservados.</Text>
                        </Stack>
                    </Group>

                    <Divider />

                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Text fw={600} size="sm" c="dimmed">¿Necesitas ayuda?</Text>
                        <Group gap="sm">
                            <Button variant="light" size="xs" radius="md" leftSection={<IconLifebuoy size={14} />}>
                                Documentación
                            </Button>
                            <Button variant="light" color="gray" size="xs" radius="md" leftSection={<IconBug size={14} />}>
                                Reportar Bug
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md" bg="blue.0">
                <Group gap="xs">
                    <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
                    <Text size="xs" fw={500} c="blue.8">
                        Este sistema utiliza tecnología de sincronización en tiempo real con Supabase.
                        Asegúrate de tener una conexión estable para garantizar la integridad de los datos.
                    </Text>
                </Group>
            </Paper>
        </Stack>
    );
}

/** Helper wrapper to get daysRemaining from context */
function useEmpresaWithDays() {
    const ctx = useEmpresa();
    const now = dayjs();
    const fechaFin = ctx.subscription ? dayjs(ctx.subscription.fecha_fin) : now;
    const daysRemaining = Math.max(0, fechaFin.diff(now, 'day'));
    return { ...ctx, daysRemaining };
}
