import { SegmentedControl, Center, Paper } from '@mantine/core';
import {
    IconBox,
    IconUsers,
    IconSettings,
} from '@tabler/icons-react';

export function Navbar({ activeSection, onSectionChange }: { activeSection: string, onSectionChange: (s: string) => void }) {
    return (
        <div
            className="no-print"
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}
        >
            <Paper
                shadow="md"
                radius="xl"
                p={4}
                className="w-[90vw] max-w-[450px] sm:w-auto sm:min-w-[420px]"
            >
                <SegmentedControl
                    fullWidth
                    value={activeSection}
                    onChange={onSectionChange}
                    transitionDuration={250}
                    radius="xl"
                    size="md"
                    color="blue"
                    data={[
                        {
                            value: 'cajas',
                            label: (
                                <Center style={{ gap: 4 }} px={{ base: 2, xs: 'md' }} py={4}>
                                    <IconBox size={18} stroke={1.5} />
                                    <span className="font-medium text-[10px] sm:text-sm">Cajas</span>
                                </Center>
                            ),
                        },
                        {
                            value: 'proveedores',
                            label: (
                                <Center style={{ gap: 4 }} px={{ base: 2, xs: 'md' }} py={4}>
                                    <IconUsers size={18} stroke={1.5} />
                                    <span className="font-medium text-[10px] sm:text-sm">Proveedores</span>
                                </Center>
                            ),
                        },
                        {
                            value: 'ajustes',
                            label: (
                                <Center style={{ gap: 4 }} px={{ base: 2, xs: 'md' }} py={4}>
                                    <IconSettings size={18} stroke={1.5} />
                                    <span className="font-medium text-[10px] sm:text-sm">Ajustes</span>
                                </Center>
                            ),
                        },
                    ]}
                />
            </Paper>

        </div>
    );
}
