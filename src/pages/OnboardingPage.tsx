import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Stack,
    Box,
    Divider,
    Button,
    LoadingOverlay,
    Group,
    Image,
    Center,
    Badge,
    Paper,
    ThemeIcon,
    UnstyledButton,
} from '@mantine/core';
import {
    IconPlus,
    IconLogout,
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconBrandWhatsapp,
    IconMail,
    IconBuilding,
    IconChevronRight,
} from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { usePlatformConfig } from '../hooks/usePlatformConfig';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

// Extracted Components
import { InvitationSection } from './onboarding/InvitationSection';
import { OnboardingWizard } from './onboarding/OnboardingWizard';

import logo from '../assets/Icon.svg';
import successImage from '../assets/onboarding_success_image.png';

export function OnboardingPage() {
    const navigate = useNavigate();
    const { refresh: refreshEmpresa, perfil, availableEmpresas, switchEmpresa } = useEmpresa();
    const { soporte } = usePlatformConfig();
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
            empresa_contacto: '',
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

            // Asegurar perfil del usuario
            await supabase.from('perfiles').upsert({
                id: user.id,
                email: user.email,
                nombre: user.user_metadata?.nombre || '',
                apellido: user.user_metadata?.apellido || ''
            }, { onConflict: 'id' });

            // Llamar a la función segura que bypasea RLS
            const { error: rpcError } = await supabase.rpc('aceptar_invitacion', {
                p_invitacion_id: Number(inv.id)
            });
            if (rpcError) throw rpcError;

            // Establecer como empresa activa
            localStorage.setItem('active_empresa_id', inv.empresa_id);

            notifications.show({ title: '¡Bienvenido!', message: 'Te has unido a la empresa.', color: 'teal' });
            await refreshEmpresa();
            navigate('/', { replace: true });
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

            // 0. Asegurar que el usuario tenga un perfil para evitar error 500 de foreign key
            await supabase.from('perfiles').upsert({
                id: user.id,
                email: user.email,
                nombre: user.user_metadata?.nombre || '',
                apellido: user.user_metadata?.apellido || ''
            }, { onConflict: 'id' });

            // 1. Crear empresa
            const { data: empresa, error: empError } = await supabase
                .from('empresas')
                .insert({
                    nombre: form.values.empresa_nombre,
                    ruc: form.values.empresa_ruc || null,
                    contacto_nombre: form.values.empresa_contacto || null,
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

            // 4. Crear suscripción trial (14 días)
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);
            await supabase.from('suscripciones').insert({
                empresa_id: empresa.id,
                plan: 'trial',
                estado: 'trial',
                fecha_fin: trialEnd.toISOString(),
            });

            // 5. Crear Caja (Opcional)
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

    const SidePanel = () => (
        <Box
            visibleFrom="md"
            style={{
                flex: '0 0 35%',
                position: 'relative',
                backgroundImage: `linear-gradient(rgba(35, 138, 229, 0.4), rgba(13, 13, 13, 0.9)), url(${successImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <Stack
                h="100%"
                justify="space-between"
                p={60}
                style={{ position: 'relative', zIndex: 10 }}
            >
                <Group gap="sm" align="center">
                    <Image src={logo} w={40} h={40} radius="md" />
                    <Text fw={700} size="xl" c="white" style={{ letterSpacing: '-0.5px' }}>
                        Mi Caja Chica
                    </Text>
                </Group>

                <Stack gap="xs">
                    <Badge color="blue.4" variant="filled" size="lg" radius="sm">¡Excelente!</Badge>
                    <Text fw={800} size="xl" c="white" style={{ fontSize: '2rem', lineHeight: 1.1, letterSpacing: '-1px' }}>
                        Tu equipo está listo para despegar.
                    </Text>
                    <Stack gap={0}>
                        <Text fw={500} c="gray.3" size="md">
                            Configura los últimos detalles y toma el control total de tu flujo de efectivo hoy mismo.
                        </Text>
                        
                        {(soporte?.whatsapp || soporte?.correo) && (
                            <Box mt="xl" pt="sm" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                <Text fw={700} c="white" size="sm" mb={4}>¿Necesitas ayuda?</Text>
                                <Group gap="md">
                                    {soporte.whatsapp && (
                                        <Button
                                            component="a"
                                            href={`https://wa.me/${soporte.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            variant="subtle"
                                            color="green.4"
                                            size="compact-sm"
                                            leftSection={<IconBrandWhatsapp size={16} />}
                                            style={{ paddingLeft: 0 }}
                                        >
                                            {soporte.whatsapp}
                                        </Button>
                                    )}
                                    {soporte.correo && (
                                        <Button
                                            component="a"
                                            href={`mailto:${soporte.correo}`}
                                            variant="subtle"
                                            color="blue.4"
                                            size="compact-sm"
                                            leftSection={<IconMail size={16} />}
                                            style={{ paddingLeft: 0 }}
                                        >
                                            {soporte.correo}
                                        </Button>
                                    )}
                                </Group>
                            </Box>
                        )}
                    </Stack>
                </Stack>
            </Stack>
        </Box>
    );

    return (
        <Group gap={0} mih="100vh" align="stretch" wrap="nowrap">
            {/* Panel Izquierdo: Contenido */}
            <Center p="xl" bg="white" style={{ flex: 1 }}>
                <Container size={!showCreateWizard ? 420 : 600} w="100%">
                    <LoadingOverlay visible={loading || processing} overlayProps={{ blur: 1 }} />

                    {!showCreateWizard ? (
                        <Stack gap={40}>
                            <Box>
                                <Title order={1} fw={800} size="h1" style={{ letterSpacing: '-1px' }}>
                                    Bienvenido
                                </Title>
                                <Text c="dimmed" size="md" fw={500} mt={4}>
                                    Comencemos configurando su panel de trabajo.
                                </Text>
                            </Box>

                            {availableEmpresas.length > 0 && (
                                <Stack gap="md">
                                    <Text fw={700} size="sm" c="dimmed" tt="uppercase" lts={1}>Tus Empresas</Text>
                                    <Stack gap="xs">
                                        {availableEmpresas.map((e) => (
                                            <UnstyledButton
                                                key={e.id}
                                                onClick={() => {
                                                    switchEmpresa(e.id);
                                                    navigate('/', { replace: true });
                                                }}
                                                w="100%"
                                                style={{ transition: 'all 0.2s ease' }}
                                            >
                                                <Paper
                                                    withBorder
                                                    p="md"
                                                    radius="md"
                                                    style={{
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            borderColor: 'var(--mantine-color-blue-4)',
                                                            backgroundColor: 'var(--mantine-color-blue-0)',
                                                            transform: 'translateY(-2px)'
                                                        }
                                                    }}
                                                >
                                                    <Group justify="space-between">
                                                        <Group gap="md">
                                                            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                                                                <IconBuilding size={20} />
                                                            </ThemeIcon>
                                                            <Stack gap={0}>
                                                                <Text fw={700} size="sm">{e.nombre}</Text>
                                                                <Text size="xs" c="dimmed" tt="capitalize">{e.role === 'owner' ? 'Propietario' : e.role === 'admin' ? 'Administrador' : 'Operador'}</Text>
                                                            </Stack>
                                                        </Group>
                                                        <IconChevronRight size={18} color="var(--mantine-color-gray-4)" />
                                                    </Group>
                                                </Paper>
                                            </UnstyledButton>
                                        ))}
                                    </Stack>
                                </Stack>
                            )}

                            {invitations.length > 0 && (
                                <Stack gap="md">
                                    <Divider label="Invitaciones Pendientes" labelPosition="center" />
                                    <InvitationSection invitations={invitations} handleAccept={handleAcceptInvitation} />
                                </Stack>
                            )}

                            <Divider label="O también puedes" labelPosition="center" />

                            <Button
                                variant="light"
                                size="lg"
                                leftSection={<IconPlus size={20} />}
                                onClick={() => setState(prev => ({ ...prev, showCreateWizard: true }))}
                                radius="md"
                                style={{ height: 56 }}
                            >
                                Crear mi propia Empresa
                            </Button>

                            <Button
                                variant="subtle"
                                color="red"
                                leftSection={<IconLogout size={16} />}
                                onClick={() => supabase.auth.signOut()}
                            >
                                Cerrar Sesión
                            </Button>
                        </Stack>
                    ) : (
                        <Stack gap={40}>
                            <Box>
                                <Title order={1} fw={800} size="h1" style={{ letterSpacing: '-1px' }}>
                                    Nueva Empresa
                                </Title>
                                <Text c="dimmed" size="md" fw={500} mt={4}>
                                    Sigue los pasos para configurar tu entorno.
                                </Text>
                            </Box>

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
                                    <Button
                                        onClick={nextStep}
                                        rightSection={<IconArrowRight size={16} />}
                                        size="md"
                                        radius="md"
                                        px="xl"
                                    >
                                        Continuar
                                    </Button>
                                ) : (
                                    <Button
                                        color="teal"
                                        onClick={handleCompleteOnboarding}
                                        leftSection={<IconCheck size={18} />}
                                        loading={processing}
                                        size="md"
                                        radius="md"
                                        px="xl"
                                    >
                                        Confirmar y Empezar
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    )}

                    {/* Mobile Support Footer */}
                    {(soporte?.whatsapp || soporte?.correo) && (
                        <Box hiddenFrom="md" mt={60} pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                            <Text fw={600} c="dimmed" size="xs" ta="center" mb={8}>¿Necesitas ayuda con tu registro?</Text>
                            <Group justify="center" gap="sm">
                                {soporte.whatsapp && (
                                    <Button
                                        component="a"
                                        href={`https://wa.me/${soporte.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        variant="subtle"
                                        color="green.7"
                                        size="xs"
                                        radius="xl"
                                        leftSection={<IconBrandWhatsapp size={14} />}
                                    >
                                        WhatsApp
                                    </Button>
                                )}
                                {soporte.correo && (
                                    <Button
                                        component="a"
                                        href={`mailto:${soporte.correo}`}
                                        variant="subtle"
                                        color="blue.7"
                                        size="xs"
                                        radius="xl"
                                        leftSection={<IconMail size={14} />}
                                    >
                                        Correo
                                    </Button>
                                )}
                            </Group>
                        </Box>
                    )}
                </Container>
            </Center>

            <SidePanel />
        </Group>
    );
}
