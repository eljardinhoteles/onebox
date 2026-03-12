import { Box, Paper, Group, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import IconSvg from '../../../assets/Icon.svg';

export function LandingHeader() {
    const navigate = useNavigate();

    return (
        <Box className="floating-header-container">
            <Paper
                component="header"
                shadow="md"
                radius="xl"
                px="lg"
                py="sm"
                className="floating-header"
            >
                <Group justify="space-between">
                    <Group gap="xs">
                        <img src={IconSvg} alt="Mi Caja Chica" style={{ width: 28, height: 28 }} />
                        <Text fw={700} size="sm" c="blue.9">Mi Caja Chica</Text>
                    </Group>
                    <Button
                        variant="subtle"
                        color="gray"
                        radius="xl"
                        fw={600}
                        size="xs"
                        onClick={() => navigate('/cajas')}
                    >
                        Iniciar Sesión
                    </Button>
                </Group>
            </Paper>
        </Box>
    );
}
