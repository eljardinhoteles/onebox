import { useState, useEffect } from 'react';
import {
    Container, Paper, Title, Text, Stack, Button, TextInput, Card,
    Group, LoadingOverlay, Avatar, Box, Stepper, NumberInput, Divider, ThemeIcon, Badge
} from '@mantine/core';
import { IconBuilding, IconLogout, IconPlus, IconMapPin, IconWallet, IconCheck, IconArrowRight, IconArrowLeft, IconCalendar } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';

export function OnboardingPage() {
    const { refresh: refreshEmpresa, perfil } = useEmpresa();
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    const [activeStep, setActiveStep] = useState(0);

    // Formulario para todo el wizard
    const form = useForm({
        initialValues: {
            empresa_nombre: '',
            empresa_ruc: '',
            sucursal_nombre: 'Central',
            sucursal_direccion: '',
            caja_abrir: true,
            caja_monto_inicial: 0,
            caja_responsable: '',
        },
        validate: (values) => {
            if (activeStep === 0) {
                return {
                    empresa_nombre: values.empresa_nombre.length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null,
                };
            }
            if (activeStep === 1) {
                return {
                    sucursal_nombre: values.sucursal_nombre.length < 2 ? 'Nombre de sucursal inválido' : null,
                };
            }
            return {};
        }
    });

    useEffect(() => {
        if (perfil && !form.values.caja_responsable) {
            form.setFieldValue('caja_responsable', `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim());
        }
    }, [perfil]);

    const fetchInvitations = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('invitaciones')
                    .select('*, empresas(nombre)')
                    .eq('email', user.email)
                    .eq('status', 'pendiente');
                setInvitations(data || []);
            }
        } catch (error) {
            console.error('Error fetching invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleAcceptInvitation = async (inv: any) => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error: joinError } = await supabase
                .from('empresa_usuarios')
                .insert({
                    empresa_id: inv.empresa_id,
                    user_id: user.id,
                    role: inv.role
                });
            if (joinError) throw joinError;

            await supabase
                .from('invitaciones')
                .update({ status: 'aceptada', accepted_at: new Date().toISOString() })
                .eq('id', inv.id);

            notifications.show({ title: '¡Bienvenido!', message: 'Te has unido a la empresa.', color: 'teal' });
            await refreshEmpresa();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteOnboarding = async () => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Crear empresa
            const { data: empresa, error: empError } = await supabase
                .from('empresas')
                .insert({
                    nombre: form.values.empresa_nombre,
                    ruc: form.values.empresa_ruc || null,
                    created_by: user.id
                })
                .select()
                .single();
            if (empError) throw empError;

            // 2. Asociar como owner (usando la función de default en DB o manual)
            // Nota: El trigger o políticas deberían manejar esto, pero nos aseguramos
            const { error: memberError } = await supabase
                .from('empresa_usuarios')
                .insert({
                    empresa_id: empresa.id,
                    user_id: user.id,
                    role: 'owner'
                });
            if (memberError) throw memberError;

            // 3. Crear Sucursal
            const { data: sucursal, error: sucError } = await supabase
                .from('sucursales')
                .insert({
                    nombre: form.values.sucursal_nombre,
                    direccion: form.values.sucursal_direccion || null,
                    empresa_id: empresa.id
                })
                .select()
                .single();
            if (sucError) throw sucError;

            // 4. Crear Caja (Opcional)
            if (form.values.caja_abrir) {
                const { error: cajaError } = await supabase
                    .from('cajas')
                    .insert({
                        monto_inicial: form.values.caja_monto_inicial,
                        responsable: form.values.caja_responsable || `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim(),
                        sucursal: sucursal.nombre,
                        estado: 'abierta',
                        fecha_apertura: new Date().toISOString(),
                        empresa_id: empresa.id
                    });
                if (cajaError) throw cajaError;
            }

            notifications.show({
                title: '¡Configuración Exitosa!',
                message: 'Tu empresa y entorno de trabajo están listos.',
                color: 'teal',
                icon: <IconCheck size={18} />
            });

            await refreshEmpresa();
        } catch (error: any) {
            notifications.show({ title: 'Error en configuración', message: error.message, color: 'red' });
        } finally {
            setProcessing(false);
        }
    };

    const nextStep = () => {
        if (form.validate().hasErrors) return;
        setActiveStep((current) => (current < 3 ? current + 1 : current));
    };

    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current));

    if (!showCreateWizard) {
        return (
            <Container size="sm" py={100}>
                <Paper withBorder shadow="md" p={30} radius="md" bg="white" style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loading || processing} overlayProps={{ blur: 1 }} />

                    <Stack gap="xl">
                        <Box ta="center">
                            <Title order={2}>Bienvenido a Caja2026</Title>
                            <Text c="dimmed" size="sm">Comencemos configurando tu espacio de trabajo.</Text>
                        </Box>

                        {invitationSection(invitations, handleAcceptInvitation)}

                        <Divider label="O también puedes" labelPosition="center" />

                        <Button
                            variant="light"
                            size="lg"
                            leftSection={<IconPlus size={20} />}
                            onClick={() => setShowCreateWizard(true)}
                            radius="md"
                        >
                            Crear mi propia Empresa
                        </Button>

                        <Button variant="subtle" color="red" leftSection={<IconLogout size={16} />} onClick={() => supabase.auth.signOut()}>
                            Cerrar Sesión
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    return (
        <Container size="md" py={60}>
            <Title order={2} ta="center" mb="xl">Configuración de Nueva Empresa</Title>
            <Paper withBorder shadow="md" p={40} radius="lg" style={{ position: 'relative' }}>
                <LoadingOverlay visible={processing} overlayProps={{ blur: 1 }} />

                <Stepper active={activeStep} onStepClick={setActiveStep} allowNextStepsSelect={false}>
                    <Stepper.Step
                        label="Empresa"
                        description="Identidad del comercio"
                        icon={<IconBuilding size={18} />}
                    >
                        <Stack gap="md" mt="xl">
                            <Text size="sm" c="dimmed">Ingresa los datos fiscales o comerciales de tu empresa.</Text>
                            <TextInput
                                label="Nombre de la Empresa"
                                placeholder="Ej: Mi Comercio S.A."
                                required
                                {...form.getInputProps('empresa_nombre')}
                            />
                            <TextInput
                                label="RUC / Identificación Fiscal"
                                placeholder="Ej: 1790000000001"
                                {...form.getInputProps('empresa_ruc')}
                            />
                        </Stack>
                    </Stepper.Step>

                    <Stepper.Step
                        label="Sucursal"
                        description="Ubicación física"
                        icon={<IconMapPin size={18} />}
                    >
                        <Stack gap="md" mt="xl">
                            <Text size="sm" c="dimmed">Crea tu primera sucursal o punto de venta.</Text>
                            <TextInput
                                label="Nombre de la Sucursal"
                                placeholder="Ej: Matriz, Sucursal Norte, etc."
                                required
                                {...form.getInputProps('sucursal_nombre')}
                            />
                            <TextInput
                                label="Dirección (Opcional)"
                                placeholder="Calle principal y número"
                                {...form.getInputProps('sucursal_direccion')}
                            />
                        </Stack>
                    </Stepper.Step>

                    <Stepper.Step
                        label="Caja Inicial"
                        description="Fondo de efectivo"
                        icon={<IconWallet size={18} />}
                    >
                        <Stack gap="md" mt="xl">
                            <Text size="sm" c="dimmed">Configura tu primera caja de efectivo para empezar a operar.</Text>
                            <Badge variant="light" color="blue" leftSection={<IconCalendar size={12} />} radius="sm">
                                Se abrirá con fecha de hoy: {dayjs().format('DD/MM/YYYY')}
                            </Badge>
                            <Group>
                                <Button
                                    variant={form.values.caja_abrir ? 'filled' : 'light'}
                                    onClick={() => form.setFieldValue('caja_abrir', true)}
                                >
                                    Abrir Caja ahora
                                </Button>
                                <Button
                                    variant={!form.values.caja_abrir ? 'filled' : 'light'}
                                    color="gray"
                                    onClick={() => form.setFieldValue('caja_abrir', false)}
                                >
                                    Omitir por ahora
                                </Button>
                            </Group>

                            {form.values.caja_abrir && (
                                <Card withBorder p="md" radius="md" bg="blue.0">
                                    <Stack gap="sm">
                                        <NumberInput
                                            label="Monto Inicial en Caja"
                                            placeholder="0.00"
                                            prefix="$"
                                            decimalScale={2}
                                            {...form.getInputProps('caja_monto_inicial')}
                                        />
                                        <TextInput
                                            label="Responsable de Caja"
                                            placeholder="Nombre del encargado"
                                            {...form.getInputProps('caja_responsable')}
                                        />
                                    </Stack>
                                </Card>
                            )}
                        </Stack>
                    </Stepper.Step>

                    <Stepper.Completed>
                        <Stack align="center" gap="md" mt="xl" py="lg">
                            <ThemeIcon size={60} radius="xl" color="teal" variant="light">
                                <IconCheck size={36} />
                            </ThemeIcon>
                            <Title order={3}>¡Todo listo!</Title>
                            <Text c="dimmed" ta="center">
                                Has configurado los datos básicos. Al confirmar, tu empresa será creada y podrás empezar a trabajar.
                            </Text>
                        </Stack>
                    </Stepper.Completed>
                </Stepper>

                <Group justify="space-between" mt="xl">
                    <Button
                        variant="subtle"
                        color="gray"
                        onClick={activeStep === 0 ? () => setShowCreateWizard(false) : prevStep}
                        leftSection={activeStep === 0 ? undefined : <IconArrowLeft size={16} />}
                    >
                        {activeStep === 0 ? 'Atrás' : 'Anterior'}
                    </Button>

                    {activeStep < 3 ? (
                        <Button onClick={nextStep} rightSection={<IconArrowRight size={16} />}>
                            Continuar
                        </Button>
                    ) : (
                        <Button
                            color="teal"
                            onClick={handleCompleteOnboarding}
                            leftSection={<IconCheck size={18} />}
                            loading={processing}
                        >
                            Confirmar y Empezar
                        </Button>
                    )}
                </Group>
            </Paper>
        </Container>
    );
}

function invitationSection(invitations: any[], handleAccept: (inv: any) => void) {
    if (invitations.length === 0) return null;

    return (
        <Stack gap="md">
            <Text fw={700}>Invitaciones Pendientes</Text>
            {invitations.map(inv => (
                <Card key={inv.id} withBorder p="md" radius="md" bg="gray.0">
                    <Group justify="space-between">
                        <Group gap="md">
                            <Avatar color="blue" radius="xl"><IconBuilding size={20} /></Avatar>
                            <Stack gap={0}>
                                <Text fw={600}>{inv.empresas?.nombre}</Text>
                                <Text size="xs" c="dimmed">Rol: {inv.role}</Text>
                            </Stack>
                        </Group>
                        <Button size="xs" onClick={() => handleAccept(inv)}>Aceptar</Button>
                    </Group>
                </Card>
            ))}
        </Stack>
    );
}

