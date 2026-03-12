import React from 'react';
import { Group, ThemeIcon, Text, Paper } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

export function FeatureCheck({ children, white }: { children: React.ReactNode; white?: boolean }) {
    return (
        <Group gap="xs" wrap="nowrap" align="flex-start">
            <ThemeIcon
                size={22}
                radius="xl"
                color={white ? 'teal' : 'blue'}
                variant={white ? 'filled' : 'light'}
                mt={2}
                style={{ flexShrink: 0 }}
            >
                <IconCheck size={13} />
            </ThemeIcon>
            <Text
                size="sm"
                c={white ? 'rgba(255,255,255,0.9)' : 'dimmed'}
            >
                {children}
            </Text>
        </Group>
    );
}

export function ImgPlaceholder({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
    return (
        <Paper
            radius="md"
            withBorder
            className="feature-img-placeholder"
        >
            <Icon size={44} color="var(--mantine-color-gray-4)" />
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
        </Paper>
    );
}
