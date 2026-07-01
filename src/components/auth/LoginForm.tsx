import { useState } from 'react';
import { TextInput, PasswordInput, Button, Stack, Anchor, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconLock } from '@tabler/icons-react';

interface LoginFormProps {
    inviteEmail?: string;
    onForgotPassword: () => void;
}

export function LoginForm({ inviteEmail, onForgotPassword }: LoginFormProps) {
    const [email, setEmail] = useState(inviteEmail ?? '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            notifications.show({
                title: '¡Bienvenido!',
                message: 'Sesión iniciada correctamente',
                color: 'blue',
                icon: <IconLock size={16} />,
            });
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

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <TextInput
                    label="Correo Electrónico"
                    placeholder="usuario@correo.com"
                    required
                    size="md"
                    radius="md"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                />
                {inviteEmail && email !== inviteEmail && (
                    <Text size="xs" color="orange" fw={500}>
                        Nota: Esta invitación fue enviada a {inviteEmail}
                    </Text>
                )}

                <Stack gap={6}>
                    <PasswordInput
                        label="Contraseña"
                        placeholder="••••••••"
                        required
                        size="md"
                        radius="md"
                        value={password}
                        onChange={(event) => setPassword(event.currentTarget.value)}
                    />
                    <Anchor component="button" type="button" size="xs" fw={700} ta="right" onClick={onForgotPassword}>
                        ¿Olvidaste tu contraseña?
                    </Anchor>
                </Stack>

                <Switch
                    label="Recordar mis datos de acceso"
                    size="sm"
                    defaultChecked
                />

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
                    {inviteEmail ? 'Iniciar Sesión y Unirme' : 'Iniciar Sesión'}
                </Button>
            </Stack>
        </form>
    );
}
