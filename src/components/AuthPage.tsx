import { useState, useEffect } from 'react';
import {
    TextInput,
    PasswordInput,
    Paper,
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconLock, IconBuilding } from '@tabler/icons-react';

export function AuthPage() {
    const [type, setType] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState<any>(null);
    const [loadingInvite, setLoadingInvite] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invite = params.get('invite');
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
            } else {
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
            }
        } catch (err: any) {
            notifications.show({
                title: 'Error de acceso',
                message: err.message,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Center mih="100vh" bg="gray.0" px="sm">
            <Container size={420} w="100%">
                <Paper withBorder shadow="md" p={30} radius="md" bg="white">
                    <LoadingOverlay visible={loadingInvite} overlayProps={{ blur: 1 }} />
                    <Stack gap="xl">
                        <Box ta="center">
                            <Title order={1} fw={700} mb={4}>
                                {inviteData ? 'Aceptar Invitación' : 'Bienvenido'}
                            </Title>
                            <Text c="dimmed" size="sm">
                                {inviteData
                                    ? `Fuiste invitado a unirte a ${inviteData.empresas?.nombre}`
                                    : (type === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta')
                                }
                            </Text>
                        </Box>

                        {inviteData && (
                            <Card withBorder p="md" radius="md" bg="blue.0">
                                <Group gap="md">
                                    <Avatar size="md" color="blue" radius="xl"><IconBuilding size={20} /></Avatar>
                                    <Stack gap={0}>
                                        <Text fw={700} size="sm">{inviteData.empresas?.nombre}</Text>
                                        <Text size="xs" c="dimmed">Regístrate para unirte como {inviteData.role}</Text>
                                    </Stack>
                                </Group>
                            </Card>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
                            <Stack gap="md">
                                {!inviteData ? (
                                    <TextInput
                                        label="Correo electrónico"
                                        placeholder="nombre@empresa.com"
                                        required
                                        value={email}
                                        onChange={(event) => setEmail(event.currentTarget.value)}
                                    />
                                ) : (
                                    <TextInput
                                        label="Tu correo de invitación"
                                        value={inviteData.email}
                                        disabled
                                        variant="filled"
                                    />
                                )}

                                {type === 'register' && (
                                    <Group grow>
                                        <TextInput
                                            label="Nombre"
                                            placeholder="Juan"
                                            required
                                            value={nombre}
                                            onChange={(event) => setNombre(event.currentTarget.value)}
                                        />
                                        <TextInput
                                            label="Apellido"
                                            placeholder="Pérez"
                                            required
                                            value={apellido}
                                            onChange={(event) => setApellido(event.currentTarget.value)}
                                        />
                                    </Group>
                                )}

                                <PasswordInput
                                    label={type === 'register' ? "Crea tu contraseña" : "Contraseña"}
                                    placeholder={type === 'register' ? "Al menos 8 caracteres" : "Tu clave"}
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.currentTarget.value)}
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={loading}
                                    mt="md"
                                >
                                    {inviteData ? 'Crear Cuenta y Unirme' : (type === 'login' ? 'Iniciar sesión' : 'Registrarse')}
                                </Button>
                            </Stack>
                        </form>

                        {!inviteData && (
                            <Text ta="center" size="sm">
                                {type === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                                {' '}
                                <Text
                                    component="span"
                                    c="blue"
                                    fw={500}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setType(type === 'login' ? 'register' : 'login')}
                                >
                                    {type === 'login' ? 'Regístrate' : 'Inicia sesión'}
                                </Text>
                            </Text>
                        )}
                    </Stack>
                </Paper>
            </Container>
        </Center>
    );
}
