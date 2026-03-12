import { useState, useRef } from 'react';
import { Paper, Group, ActionIcon, TextInput, Chip, ScrollArea, Tooltip } from '@mantine/core';
import { IconSearch, IconArrowLeft, IconX, IconRefresh } from '@tabler/icons-react';

interface FilterCount {
    value: string;
    label: string;
    count: number;
}

interface AdminFiltersProps {
    filter: string;
    setFilter: (f: string) => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    setCurrentPage: (p: number) => void;
    counts: FilterCount[];
    fetchComercios: () => void;
    loading: boolean;
}

export function AdminFilters({
    filter, setFilter, searchTerm, setSearchTerm, setCurrentPage,
    counts, fetchComercios, loading
}: AdminFiltersProps) {
    const [searchMode, setSearchMode] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
        <Paper withBorder radius="md" px="md" py="xs">
            <Group gap="sm" wrap="nowrap" align="center">
                {searchMode ? (
                    <>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="md"
                            color="gray"
                            flex="none"
                            onClick={() => {
                                setSearchMode(false);
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            title="Volver a filtros"
                        >
                            <IconArrowLeft size={17} />
                        </ActionIcon>

                        <TextInput
                            ref={searchInputRef}
                            placeholder="Buscar nombre o RUC..."
                            leftSection={<IconSearch size={15} />}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.currentTarget.value);
                                setCurrentPage(1);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setSearchMode(false);
                                    setSearchTerm('');
                                    setCurrentPage(1);
                                }
                            }}
                            radius="md"
                            size="sm"
                            flex={1}
                            autoFocus
                            rightSection={
                                searchTerm ? (
                                    <ActionIcon
                                        variant="transparent"
                                        size="sm"
                                        color="gray"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCurrentPage(1);
                                            searchInputRef.current?.focus();
                                        }}
                                    >
                                        <IconX size={14} />
                                    </ActionIcon>
                                ) : undefined
                            }
                        />
                    </>
                ) : (
                    <>
                        <Chip.Group
                            value={filter}
                            onChange={(value) => {
                                setFilter(value as string);
                                setCurrentPage(1);
                            }}
                        >
                            <ScrollArea flex={1} offsetScrollbars scrollbarSize={4}>
                                <Group gap="xs" wrap="nowrap" py={2}>
                                    {counts.map(c => (
                                        <Chip
                                            key={c.value}
                                            value={c.value}
                                            size="sm"
                                            radius="xl"
                                            variant="light"
                                        >
                                            {c.label} ({c.count})
                                        </Chip>
                                    ))}
                                </Group>
                            </ScrollArea>
                        </Chip.Group>

                        <ActionIcon
                            variant="light"
                            size="lg"
                            radius="md"
                            color="blue"
                            flex="none"
                            onClick={() => {
                                setSearchMode(true);
                                setTimeout(() => searchInputRef.current?.focus(), 100);
                            }}
                            title="Buscar"
                        >
                            <IconSearch size={17} />
                        </ActionIcon>
                    </>
                )}
            </Group>

            <Tooltip label="Recargar datos" position="left" withArrow>
                <ActionIcon
                    variant="filled"
                    color="blue"
                    size="xl"
                    radius="xl"
                    onClick={fetchComercios}
                    loading={loading}
                    style={{
                        position: 'fixed',
                        bottom: 30,
                        right: 30,
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    <IconRefresh size={22} />
                </ActionIcon>
            </Tooltip>
        </Paper>
    );
}
