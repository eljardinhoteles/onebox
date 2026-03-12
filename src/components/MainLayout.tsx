import { Box, Stack, Container, Alert, Text } from '@mantine/core';
import { Navbar } from './Navbar';
import { useEmpresa } from '../context/EmpresaContext';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  onAdd?: () => void;
}

export function MainLayout({ children, onAdd }: MainLayoutProps) {
  const { isReadOnly } = useEmpresa();
  const navigate = useNavigate();

  return (
    <Box className="h-screen w-full bg-[#f8fafc] overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

      <Stack gap={0} className="h-full relative z-10">
        {isReadOnly && (
          <Alert
            icon={<IconAlertTriangle size={18} />}
            color="red"
            variant="filled"
            radius={0}
            py={8}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/ajustes')}
          >
            <Text size="xs" fw={600}>Tu suscripción ha vencido. El sistema está en modo solo lectura. Toca aquí para suscribirte.</Text>
          </Alert>
        )}
        <Box
          className="flex-1 overflow-y-auto pb-32 custom-scrollbar"
          pt="xl"
          px={{ base: 'xs', sm: 'md' }}
        >
          <Container size="xl" w="100%" pb={100} p={0}>
            {children}
          </Container>
        </Box>
      </Stack>

      <Navbar onAdd={onAdd} />
    </Box>
  );
}

