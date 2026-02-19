import { Stack, TextInput, Select } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import { AppModal } from '../../../components/ui/AppModal';
import { AppActionButtons } from '../../../components/ui/AppActionButtons';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

interface InviteModalProps {
    opened: boolean;
    onClose: () => void;
    empresaId: string;
    userId: string;
    onSuccess: () => void;
}

export function InviteModal({ opened, onClose, empresaId, userId, onSuccess }: InviteModalProps) {
    const form = useForm({
        initialValues: {
            email: '',
            role: 'operador',
        },
        validate: {
            email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email inválido'),
        }
    });

    const [inviting, setInviting] = useState(false);

    const handleSubmit = async (values: typeof form.values) => {
        setInviting(true);
        try {
            const { error } = await supabase.from('invitaciones').insert({
                empresa_id: empresaId,
                email: values.email.toLowerCase().trim(),
                role: values.role,
                invited_by: userId,
            });

            if (error) throw error;

            notifications.show({
                title: 'Invitación enviada',
                message: `Se envió invitación a ${values.email}`,
                color: 'teal'
            });

            form.reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setInviting(false);
        }
    };

    return (
        <AppModal
            opened={opened}
            onClose={() => {
                onClose();
                form.reset();
            }}
            title="Invitar Usuario"
            loading={inviting}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label="Email del usuario"
                        placeholder="usuario@empresa.com"
                        required
                        radius="md"
                        leftSection={<IconMail size={16} />}
                        {...form.getInputProps('email')}
                    />
                    <Select
                        label="Rol"
                        data={[
                            { value: 'operador', label: 'Operador — Solo registra transacciones' },
                            { value: 'admin', label: 'Admin — Gestión completa' },
                        ]}
                        radius="md"
                        {...form.getInputProps('role')}
                    />
                    <AppActionButtons
                        onCancel={() => {
                            onClose();
                            form.reset();
                        }}
                        loading={inviting}
                        submitLabel="Enviar Invitación"
                    />
                </Stack>
            </form>
        </AppModal>
    );
}
