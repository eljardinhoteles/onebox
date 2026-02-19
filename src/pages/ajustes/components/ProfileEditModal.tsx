import { Stack, TextInput } from '@mantine/core';
import { AppModal } from '../../../components/ui/AppModal';
import { AppActionButtons } from '../../../components/ui/AppActionButtons';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

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
    const form = useForm({
        initialValues: {
            nombre: initialNombre,
            apellido: initialApellido,
        },
        validate: {
            nombre: (val) => (val ? null : 'Nombre es requerido'),
        }
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (values: typeof form.values) => {
        setSaving(true);

        const { error } = await supabase.from('perfiles').upsert({
            id: userId,
            nombre: values.nombre,
            apellido: values.apellido,
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
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label="Nombre"
                        placeholder="Juan"
                        radius="md"
                        {...form.getInputProps('nombre')}
                    />
                    <TextInput
                        label="Apellido"
                        placeholder="Pérez"
                        radius="md"
                        {...form.getInputProps('apellido')}
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
