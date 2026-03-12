import { Card, Skeleton, Group, Stack, Divider } from '@mantine/core';

export function CajaCardSkeleton() {
    return (
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                        <Skeleton height={20} width={120} radius="xl" />
                        <Skeleton height={12} width={80} radius="xl" opacity={0.6} />
                    </Stack>
                    <Skeleton height={32} width={100} radius="xl" />
                </Group>

                <Group grow gap="lg">
                    <Stack gap={4}>
                        <Skeleton height={10} width="40%" radius="xl" />
                        <Skeleton height={24} width="70%" radius="md" />
                    </Stack>
                    <Stack gap={4}>
                        <Skeleton height={10} width="40%" radius="xl" />
                        <Skeleton height={24} width="70%" radius="md" />
                    </Stack>
                </Group>

                <Divider />

                <Stack gap="xs">
                    <Group justify="space-between">
                        <Skeleton height={10} width={100} radius="xl" />
                        <Skeleton height={10} width={80} radius="xl" />
                    </Group>
                    <Skeleton height={8} width="100%" radius="xl" />
                </Stack>

                <Group justify="space-between" align="center" mt="sm">
                    <Group gap="xs">
                        <Skeleton height={28} width={28} radius="xl" />
                        <Skeleton height={12} width={100} radius="xl" />
                    </Group>
                    <Skeleton height={32} width={32} radius="md" />
                </Group>
            </Stack>
        </Card>
    );
}
