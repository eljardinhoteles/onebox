import { useState } from 'react';
import { PasswordInput, Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';

interface ResetPasswordFormProps {
    onSuccess: () => void;
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
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
            onSuccess();
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
                <PasswordInput
                    label="Nueva Contraseña"
                    placeholder="••••••••"
                    required
                    size="md"
                    radius="md"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                />
                <PasswordInput
                    label="Confirmar Contraseña"
                    placeholder="••••••••"
                    required
                    size="md"
                    radius="md"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.currentTarget.value)}
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
                    Actualizar Contraseña
                </Button>
            </Stack>
        </form>
    );
}
