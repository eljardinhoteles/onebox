import { useState } from 'react';
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconLock } from '@tabler/icons-react';

export function AuthPage() {
    const [type, setType] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
                const { error } = await supabase.auth.signUp({ email, password });
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
                    <Stack gap="xl">
                        <Box ta="center">
                            <Title order={1} fw={700} mb={4}>
                                Bienvenido
                            </Title>
                            <Text c="dimmed" size="sm">
                                {type === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
                            </Text>
                        </Box>

                        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
                            <Stack gap="md">
                                <TextInput
                                    label="Correo electrónico"
                                    placeholder="nombre@empresa.com"
                                    required
                                    value={email}
                                    onChange={(event) => setEmail(event.currentTarget.value)}
                                />
                                <PasswordInput
                                    label="Contraseña"
                                    placeholder="Tu clave"
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
                                    {type === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                                </Button>
                            </Stack>
                        </form>

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
                    </Stack>
                </Paper>
            </Container>
        </Center>
    );
}
