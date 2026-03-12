import { Card, Group, Stack, Skeleton, Divider } from '@mantine/core';

export function ProveedorSkeleton() {
    return (
        <Card shadow="sm" radius="md" withBorder mb="sm">
            <Group justify="space-between" mb="xs">
                <Stack gap={4} style={{ flex: 1 }}>
                    <Skeleton height={18} width="70%" radius="xl" />
                    <Skeleton height={12} width="40%" radius="xl" opacity={0.6} />
                </Stack>
                <Group gap={4}>
                    <Skeleton height={32} width={32} radius="md" />
                    <Skeleton height={32} width={32} radius="md" />
                </Group>
            </Group>

            <Divider mb="xs" />

            <Stack gap="xs">
                <Group gap="xs">
                    <Skeleton height={14} width={80} radius="xl" />
                    <Skeleton height={14} width={100} radius="xl" />
                </Group>
                <Group gap="xs">
                    <Skeleton height={14} width={80} radius="xl" />
                    <Skeleton height={14} width={120} radius="xl" />
                </Group>
                <Stack gap={4}>
                    <Skeleton height={12} width={100} radius="xl" />
                    <Group gap={4}>
                        <Skeleton height={20} width={60} radius="sm" />
                        <Skeleton height={20} width={60} radius="sm" />
                    </Group>
                </Stack>
            </Stack>
        </Card>
    );
}
