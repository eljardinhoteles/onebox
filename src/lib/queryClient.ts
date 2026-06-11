import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0, // Considerar datos obsoletos de inmediato para forzar refetch en segundo plano al montar/recargar
            gcTime: 1000 * 60 * 15, // Mantener en caché inactiva por 15 minutos (evita saturar localStorage)
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
