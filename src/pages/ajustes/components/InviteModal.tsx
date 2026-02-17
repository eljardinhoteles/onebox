import { Stack, TextInput, Select } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import { AppModal } from '../../../components/ui/AppModal';
import { AppActionButtons } from '../../../components/ui/AppActionButtons';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';

interface InviteModalProps {
    opened: boolean;
    onClose: () => void;
    empresaId: string;
    userId: string;
    onSuccess: () => void;
}

export function InviteModal({ opened, onClose, empresaId, userId, onSuccess }: InviteModalProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('operador');
    const [inviting, setInviting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setInviting(true);
        try {
            const { error } = await supabase.from('invitaciones').insert({
                empresa_id: empresaId,
                email: email.toLowerCase().trim(),
                role: role,
                invited_by: userId,
            });

            if (error) throw error;

            notifications.show({
                title: 'Invitación enviada',
                message: `Se envió invitación a ${email}`,
                color: 'teal'
            });

            setEmail('');
            setRole('operador');
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
                setEmail('');
                setRole('operador');
            }}
            title="Invitar Usuario"
            loading={inviting}
        >
            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <TextInput
                        label="Email del usuario"
                        placeholder="usuario@empresa.com"
                        required
                        radius="md"
                        leftSection={<IconMail size={16} />}
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                    />
                    <Select
                        label="Rol"
                        data={[
                            { value: 'operador', label: 'Operador — Solo registra transacciones' },
                            { value: 'admin', label: 'Admin — Gestión completa' },
                        ]}
                        value={role}
                        onChange={(val) => setRole(val || 'operador')}
                        radius="md"
                    />
                    <AppActionButtons
                        onCancel={() => {
                            onClose();
                            setEmail('');
                            setRole('operador');
                        }}
                        loading={inviting}
                        submitLabel="Enviar Invitación"
                    />
                </Stack>
            </form>
        </AppModal>
    );
}
