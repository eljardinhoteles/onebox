import { Box, Stack, Container } from '@mantine/core';
import { Navbar } from './Navbar';

interface MainLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onAdd?: () => void;
}

export function MainLayout({ children, activeSection, onSectionChange, onAdd }: MainLayoutProps) {
  return (
    <Box className="h-screen w-full bg-[#f8fafc] overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

      <Stack gap={0} className="h-full relative z-10">
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

      <Navbar activeSection={activeSection} onSectionChange={onSectionChange} onAdd={onAdd} />
    </Box>
  );
}
