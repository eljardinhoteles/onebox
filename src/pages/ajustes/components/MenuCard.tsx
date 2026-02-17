import { Card, Stack, Text, Group, ActionIcon } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface MenuCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

export function MenuCard({ icon, title, description, onClick }: MenuCardProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        >
            <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                    {icon}
                    {hovered && (
                        <ActionIcon variant="transparent" color="blue" size="sm">
                            <IconChevronRight size={20} />
                        </ActionIcon>
                    )}
                </Group>
                <Stack gap={4}>
                    <Text fw={600} size="sm">{title}</Text>
                    <Text size="xs" c="dimmed">{description}</Text>
                </Stack>
            </Stack>
        </Card>
    );
}
