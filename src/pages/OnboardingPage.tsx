
import { useState, useEffect } from 'react';
import { Container, Paper, Title, Text, Stack, Box, Divider, Button, LoadingOverlay, Group } from '@mantine/core';
import { IconPlus, IconLogout, IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

// Extracted Components
import { InvitationSection } from './onboarding/InvitationSection';
import { OnboardingWizard } from './onboarding/OnboardingWizard';

export function OnboardingPage() {
    const { refresh: refreshEmpresa, perfil } = useEmpresa();
    const [state, setState] = useState({
        invitations: [] as any[],
        loading: true,
        processing: false,
        showCreateWizard: false,
        activeStep: 0
    });

    const { invitations, loading, processing, showCreateWizard, activeStep } = state;

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
        validate: (values: any) => {
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
        setState(prev => ({ ...prev, loading: true }));
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('invitaciones')
                    .select('*, empresas(nombre)')
                    .eq('email', user.email)
                    .eq('status', 'pendiente');
                setState(prev => ({ ...prev, invitations: data || [], loading: false }));
            } else {
                setState(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error('Error fetching invitations:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleAcceptInvitation = async (inv: any) => {
        setState(prev => ({ ...prev, processing: true }));
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
            setState(prev => ({ ...prev, processing: false }));
        }
    };

    const handleCompleteOnboarding = async () => {
        setState(prev => ({ ...prev, processing: true }));
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

            // 2. Asociar como owner
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
            setState(prev => ({ ...prev, processing: false }));
        }
    };

    const nextStep = () => {
        if (form.validate().hasErrors) return;
        setState(prev => ({ ...prev, activeStep: (prev.activeStep < 3 ? prev.activeStep + 1 : prev.activeStep) }));
    };

    const prevStep = () => setState(prev => ({ ...prev, activeStep: (prev.activeStep > 0 ? prev.activeStep - 1 : prev.activeStep) }));

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

                        <InvitationSection invitations={invitations} handleAccept={handleAcceptInvitation} />

                        <Divider label="O también puedes" labelPosition="center" />

                        <Button
                            variant="light"
                            size="lg"
                            leftSection={<IconPlus size={20} />}
                            onClick={() => setState(prev => ({ ...prev, showCreateWizard: true }))}
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

                <OnboardingWizard
                    activeStep={activeStep}
                    setActiveStep={(step: any) => {
                        if (typeof step === 'function') {
                            setState(prev => ({ ...prev, activeStep: step(prev.activeStep) }));
                        } else {
                            setState(prev => ({ ...prev, activeStep: step }));
                        }
                    }}
                    form={form}
                />

                <Group justify="space-between" mt="xl">
                    <Button
                        variant="subtle"
                        color="gray"
                        onClick={activeStep === 0 ? () => setState(prev => ({ ...prev, showCreateWizard: false })) : prevStep}
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
