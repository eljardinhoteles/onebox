import { Drawer, type DrawerProps, LoadingOverlay, ScrollArea, Stack } from '@mantine/core';

interface AppDrawerProps extends DrawerProps {
    loading?: boolean;
}

export function AppDrawer({ children, loading, ...props }: AppDrawerProps) {
    return (
        <Drawer
            position="right"
            padding="md"
            transitionProps={{ transition: 'slide-left', duration: 400 }}
            overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
            styles={{
                content: { display: 'flex', flexDirection: 'column' },
                body: { flex: 1, display: 'flex', flexDirection: 'column', gap: 'md', overflow: 'hidden' }
            }}
            {...props}
        >
            <LoadingOverlay visible={!!loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            <ScrollArea flex={1} mx="-md" px="md">
                <Stack gap="md" pb="xl">
                    {children}
                </Stack>
            </ScrollArea>
        </Drawer>
    );
}
