import { useState, useEffect } from 'react';
import {
    TextInput,
    PasswordInput,
    Title,
    Text,
    Container,
    Button,
    Stack,
    Box,
    Center,
    LoadingOverlay,
    Card,
    Group,
    Avatar,
    Anchor,
    Image,
    Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import {
    IconLock, IconBuilding, IconCrown
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import logo from '../assets/Icon.svg';
import sideImage from '../assets/auth_side_image.png';

export function AuthPage() {
    const [type, setType] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState<any>(null);
    const [loadingInvite, setLoadingInvite] = useState(false);

    useEffect(() => {
        // Detectar si venimos de un enlace de recuperación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setType('reset');
            }
        });

        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const invite = params.get('invite');

        if (mode === 'register') {
            setType('register');
        } else if (mode === 'login') {
            setType('login');
        }

        if (invite) {
            setType('register');

            const fetchInvite = async () => {
                setLoadingInvite(true);
                try {
                    const { data, error } = await supabase
                        .from('invitaciones')
                        .select('*, empresas(nombre)')
                        .eq('id', invite)
                        .single();
                    if (data && !error) {
                        setInviteData(data);
                        setEmail(data.email);
                    }
                } catch (e) {
                    console.error('Error fetching invite:', e);
                } finally {
                    setLoadingInvite(false);
                }
            };
            fetchInvite();
        }

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async () => {
        setLoading(true);
        try {
            if (type === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                notifications.show({
                    title: '¡Bienvenido!',
                    message: 'Sesión iniciada correctamente',
                    color: 'blue',
                    icon: <IconLock size={16} />,
                });
            } else if (type === 'register') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            nombre,
                            apellido
                        }
                    }
                });
                if (error) throw error;
                notifications.show({
                    title: 'Registro completo',
                    message: 'Revisa tu correo para confirmar',
                    color: 'teal',
                    autoClose: 10000,
                });
            } else if (type === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                notifications.show({
                    title: 'Correo enviado',
                    message: 'Se ha enviado un enlace de recuperación a tu email',
                    color: 'blue',
                });
                setType('login');
            } else if (type === 'reset') {
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden');
                }
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                notifications.show({
                    title: 'Contraseña actualizada',
                    message: 'Tu contraseña ha sido cambiada con éxito. Ya puedes iniciar sesión.',
                    color: 'teal',
                });
                setType('login');
            }
        } catch (err: any) {
            notifications.show({
                title: 'Error',
                message: err.message,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (inviteData) return 'Bienvenido a bordo';
        if (type === 'login') return '¡Hola de nuevo!';
        if (type === 'register') return 'Crea tu cuenta';
        if (type === 'forgot') return 'Recuperar acceso';
        if (type === 'reset') return 'Nueva contraseña';
        return '';
    };

    const getDescription = () => {
        if (inviteData) return `Únete a ${inviteData.empresas?.nombre} para empezar.`;
        if (type === 'login') return 'Ingresa tus credenciales para acceder a tu panel.';
        if (type === 'register') return 'Regístrate y comienza a gestionar tus fondos hoy.';
        if (type === 'forgot') return 'Te enviaremos un enlace para restablecer tu contraseña.';
        if (type === 'reset') return 'Configura una contraseña segura para tu cuenta.';
        return '';
    };

    return (
        <Group gap={0} mih="100vh" align="stretch" wrap="nowrap">
            {/* Panel Izquierdo: Imagen e Identidad (30%) */}
            <Box
                visibleFrom="md"
                style={{
                    flex: '0 0 30%',
                    position: 'relative',
                    backgroundImage: `linear-gradient(rgba(35, 138, 229, 0.61), rgba(13, 13, 13, 1)), url(${sideImage})`,
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
                        <Text fw={700} size="xl" c="white" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                            “La herramienta perfecta para simplificar el flujo de dinero efectivo de nuestro equipo.”
                        </Text>
                        <Stack gap={0}>
                            <Text fw={700} c="white" size="lg">Equipo Operativo</Text>
                            <Text c="gray.4" size="sm">Departamento contable</Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Box>

            {/* Panel Derecho: Formulario (70%) */}
            <Center p="xl" bg="white" style={{ flex: 1 }}>
                <Container size={420} w="100%">
                    <LoadingOverlay visible={loadingInvite} overlayProps={{ blur: 1 }} />
                    <Stack gap={40}>
                        <Box>
                            {type === 'register' && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    mb="xl"
                                    p="md"
                                    bg="blue.0"
                                    style={{
                                        borderRadius: '12px',
                                        border: '1px solid var(--mantine-color-blue-2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <Center
                                        w={40}
                                        h={40}
                                        bg="blue.1"
                                        style={{ borderRadius: '8px', flexShrink: 0 }}
                                    >
                                        <IconCrown size={20} color="var(--mantine-color-blue-6)" />
                                    </Center>
                                    <Box>
                                        <Text fw={700} size="sm" c="blue.9">14 Días Gratis • Acceso Total</Text>
                                        <Text size="xs" c="blue.7">Prueba todas las funciones sin restricciones ni tarjeta de crédito.</Text>
                                    </Box>
                                </Box>
                            )}

                            <Title order={1} fw={800} size="h1" style={{ letterSpacing: '-1px' }}>
                                {getTitle()}
                            </Title>
                            <Text c="dimmed" size="md" fw={500} mt={4}>
                                {getDescription()}
                            </Text>
                        </Box>

                        {inviteData && (
                            <Card withBorder p="lg" radius="md" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
                                <Group gap="md">
                                    <Avatar size="md" color="blue" radius="xl" variant="filled">
                                        <IconBuilding size={20} />
                                    </Avatar>
                                    <Stack gap={0}>
                                        <Text fw={800} size="sm">{inviteData.empresas?.nombre}</Text>
                                        <Text size="xs" c="dimmed">Perfil asignado: {inviteData.role}</Text>
                                    </Stack>
                                </Group>
                            </Card>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
                            <Stack gap="md">
                                {type !== 'reset' && (
                                    <>
                                        {!inviteData ? (
                                            <TextInput
                                                label="Correo Electrónico"
                                                placeholder="usuario@correo.com"
                                                required
                                                size="md"
                                                radius="md"
                                                value={email}
                                                onChange={(event) => setEmail(event.currentTarget.value)}
                                            />
                                        ) : (
                                            <TextInput
                                                label="Correo de Invitación"
                                                value={inviteData.email}
                                                disabled
                                                size="md"
                                                radius="md"
                                                variant="filled"
                                            />
                                        )}
                                    </>
                                )}

                                {type === 'register' && (
                                    <Group grow gap="md">
                                        <TextInput
                                            label="Nombre"
                                            placeholder="Tu nombre"
                                            required
                                            size="md"
                                            radius="md"
                                            value={nombre}
                                            onChange={(event) => setNombre(event.currentTarget.value)}
                                        />
                                        <TextInput
                                            label="Apellido"
                                            placeholder="Tu apellido"
                                            required
                                            size="md"
                                            radius="md"
                                            value={apellido}
                                            onChange={(event) => setApellido(event.currentTarget.value)}
                                        />
                                    </Group>
                                )}

                                {(type === 'login' || type === 'register' || type === 'reset') && (
                                    <Stack gap={6}>
                                        <PasswordInput
                                            label={type === 'reset' ? "Nueva Contraseña" : "Contraseña"}
                                            placeholder="••••••••"
                                            required
                                            size="md"
                                            radius="md"
                                            value={password}
                                            onChange={(event) => setPassword(event.currentTarget.value)}
                                        />
                                        {type === 'reset' && (
                                            <PasswordInput
                                                label="Confirmar Contraseña"
                                                placeholder="••••••••"
                                                required
                                                size="md"
                                                radius="md"
                                                value={confirmPassword}
                                                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                                            />
                                        )}
                                        {type === 'login' && (
                                            <Anchor component="button" size="xs" fw={700} ta="right" onClick={() => setType('forgot')}>
                                                ¿Olvidaste tu contraseña?
                                            </Anchor>
                                        )}
                                    </Stack>
                                )}

                                {type === 'login' && (
                                    <Switch
                                        label="Recordar mis datos de acceso"
                                        size="sm"
                                        defaultChecked
                                    />
                                )}

                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={loading}
                                    size="md"
                                    radius="md"
                                    mt="md"
                                    color="blue"
                                    style={{ height: 48 }}
                                >
                                    {inviteData ? 'Completar Registro' : (
                                        type === 'login' ? 'Iniciar Sesión' :
                                        type === 'register' ? 'Registrarse' :
                                        type === 'forgot' ? 'Enviar Enlace' : 'Actualizar Contraseña'
                                    )}
                                </Button>
                            </Stack>
                        </form>

                        {!inviteData && (
                            <Stack align="center" gap="sm">
                                <Text ta="center" size="sm" c="dimmed">
                                    {(type === 'login' || type === 'forgot' || type === 'reset') ? '¿Aún no tienes una cuenta?' : '¿Ya eres usuario?'}
                                    {' '}
                                    <Anchor
                                        component="button"
                                        size="sm"
                                        fw={700}
                                        onClick={() => setType(type === 'register' ? 'login' : 'register')}
                                    >
                                        {(type === 'login' || type === 'forgot' || type === 'reset') ? 'Regístrate aquí' : 'Inicia Sesión'}
                                    </Anchor>
                                </Text>

                                {(type === 'forgot' || type === 'register') && (
                                    <Anchor component="button" size="sm" fw={700} onClick={() => setType('login')}>
                                        Volver al Login
                                    </Anchor>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </Container>
            </Center>
        </Group>
    );
}
