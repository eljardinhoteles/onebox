import { useState } from 'react';
import { TextInput, PasswordInput, Button, Stack, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';

interface RegisterFormProps {
    inviteEmail?: string;
}

export function RegisterForm({ inviteEmail }: RegisterFormProps) {
    const [email, setEmail] = useState(inviteEmail ?? '');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
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

                <PasswordInput
                    label="Contraseña"
                    placeholder="••••••••"
                    required
                    size="md"
                    radius="md"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
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
                    {inviteEmail ? 'Completar Registro y Unirme' : 'Registrarse'}
                </Button>
            </Stack>
        </form>
    );
}
