import { Stack, TextInput } from '@mantine/core';
import { AppModal } from '../../../components/ui/AppModal';
import { AppActionButtons } from '../../../components/ui/AppActionButtons';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';

interface ProfileEditModalProps {
    opened: boolean;
    onClose: () => void;
    userId: string;
    initialNombre: string;
    initialApellido: string;
    onSuccess: () => void;
}

export function ProfileEditModal({
    opened,
    onClose,
    userId,
    initialNombre,
    initialApellido,
    onSuccess
}: ProfileEditModalProps) {
    const [nombre, setNombre] = useState(initialNombre);
    const [apellido, setApellido] = useState(initialApellido);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase.from('perfiles').upsert({
            id: userId,
            nombre,
            apellido,
            updated_at: new Date().toISOString(),
        });

        setSaving(false);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            notifications.show({
                title: 'Perfil actualizado',
                message: 'Tus datos se han guardado.',
                color: 'teal'
            });
            onSuccess();
            onClose();
        }
    };

    return (
        <AppModal opened={opened} onClose={onClose} title="Editar Mi Perfil" loading={saving}>
            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <TextInput
                        label="Nombre"
                        placeholder="Juan"
                        radius="md"
                        value={nombre}
                        onChange={(e) => setNombre(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Apellido"
                        placeholder="Pérez"
                        radius="md"
                        value={apellido}
                        onChange={(e) => setApellido(e.currentTarget.value)}
                    />
                    <AppActionButtons
                        onCancel={onClose}
                        loading={saving}
                        submitLabel="Guardar"
                    />
                </Stack>
            </form>
        </AppModal>
    );
}
