import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 60 * 24, // 24 horas (considerado "stale" pero disponible en caché)
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 días (antes cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
