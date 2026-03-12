import { Center, Loader, Stack, Text } from '@mantine/core';

interface AppLoaderProps {
    /** Variante: 'spinner' (por defecto) o 'bar' (barra de progreso en la parte superior) */
    variant?: 'spinner' | 'bar';
    /** Tamanño del loader: 'sm', 'md', 'lg', 'xl' */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Mensaje a mostrar, por defecto 'Cargando...' */
    message?: string | null;
    /** Si es true, el loader ocupará toda la pantalla (100vh) */
    fullScreen?: boolean;
    /** Si es true, añade padding vertical */
    py?: string | number;
    /** Si es false, no muestra el texto */
    withText?: boolean;
}

/**
 * Componente unificado para estados de carga en toda la aplicación.
 * Evita la confusión visual de ver un spinner y texto cargando de forma desordenada.
 */
export function AppLoader({ 
    variant = 'spinner',
    size = 'md', 
    message = 'Cargando...', 
    fullScreen = false, 
    py = 'xl',
    withText = true
}: AppLoaderProps) {
    if (variant === 'bar') {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
                <Loader size="xs" variant="bars" color="blue" w="100%" h={3} />
            </div>
        );
    }

    const loader = (
        <Stack align="center" justify="center" gap="sm" py={fullScreen ? 0 : py}>
            <Loader size={size} variant="bars" color="blue" />
            {withText && message && (
                <Text size={size === 'sm' ? 'xs' : 'sm'} fw={500} c="dimmed">
                    {message}
                </Text>
            )}
        </Stack>
    );

    if (fullScreen) {
        return (
            <Center h="100vh" w="100%">
                {loader}
            </Center>
        );
    }

    return loader;
}
