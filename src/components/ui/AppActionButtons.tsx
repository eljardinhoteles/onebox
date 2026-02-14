import { Button, Group, type GroupProps } from '@mantine/core';

interface AppActionButtonsProps extends GroupProps {
    onCancel: () => void;
    submitLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    color?: string;
    showSubmit?: boolean;
}

export function AppActionButtons({
    onCancel,
    submitLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    loading = false,
    color = 'blue',
    showSubmit = true,
    ...props
}: AppActionButtonsProps) {
    return (
        <Group justify="flex-end" mt="xl" {...props}>
            <Button variant="default" onClick={onCancel} disabled={loading}>
                {cancelLabel}
            </Button>
            {showSubmit && (
                <Button type="submit" color={color} loading={loading}>
                    {submitLabel}
                </Button>
            )}
        </Group>
    );
}
