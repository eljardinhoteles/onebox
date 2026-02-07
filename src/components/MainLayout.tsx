import { Box, Stack, Container } from '@mantine/core';
import { Navbar } from './Navbar';
import { DashboardHeader } from './DashboardHeader';

interface MainLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  headerActions?: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function MainLayout({ children, activeSection, onSectionChange, headerActions, title, subtitle, onBack }: MainLayoutProps) {
  return (
    <Box className="h-screen w-full bg-[#f8fafc] overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

      <Stack gap="xl" className="h-full relative z-10">
        <Container size="xl" w="95%" pt="md">
          <DashboardHeader title={title} subtitle={subtitle} actions={headerActions} onBack={onBack} />
        </Container>

        <Box
          className="flex-1 overflow-y-auto pb-32 px-1 custom-scrollbar"
        >
          {/* The user's requested change replaces the Container with a div and adds classes */}
          <Container size="xl" w="95%" pb={100}>
            {children}
          </Container>
        </Box>
      </Stack>

      <Navbar activeSection={activeSection} onSectionChange={onSectionChange} />

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </Box>
  );
}
