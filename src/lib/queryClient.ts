import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de caché por defecto
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
