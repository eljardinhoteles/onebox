import { useState } from 'react';
import { TextInput, Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';

interface ForgotPasswordFormProps {
    onSuccess: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            notifications.show({
                title: 'Correo enviado',
                message: 'Se ha enviado un enlace de recuperación a tu email',
                color: 'blue',
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
                <TextInput
                    label="Correo Electrónico"
                    placeholder="usuario@correo.com"
                    required
                    size="md"
                    radius="md"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
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
                    Enviar Enlace
                </Button>
            </Stack>
        </form>
    );
}
