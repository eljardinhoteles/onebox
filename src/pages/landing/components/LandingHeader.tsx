import { Box, Paper, Group, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import IconSvg from '../../../assets/Icon.svg';

export function LandingHeader() {
    const navigate = useNavigate();

    return (
        <Box className="floating-header-container">
            <Paper
                component="header"
                shadow="md"
                radius="xl"
                px="md"
                py="xs"
                className="floating-header"
            >
                <Group justify="space-between">
                    <Group gap="xs">
                        <img src={IconSvg} alt="Mi Caja Chica" style={{ width: 32, height: 32 }} />
                        <Text fw={700} size="sm" c="blue.9">Mi Caja Chica</Text>
                    </Group>
                    <Button
                        variant="filled"
                        color="blue"
                        radius="xl"
                        fw={700}
                        size="sm"
                        rightSection={<IconArrowRight size={16} />}
                        onClick={() => navigate('/cajas?mode=login')}
                    >
                        Iniciar sesión
                    </Button>
                </Group>
            </Paper>
        </Box>
    );
}
