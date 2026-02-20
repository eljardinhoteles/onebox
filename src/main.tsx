import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import 'dayjs/locale/es'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { theme } from './theme.ts'
import './index.css'
import App from './App.tsx'
import { NotificationProvider } from './context/NotificationContext.tsx'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('es')
dayjs.tz.setDefault('America/Bogota')

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient.ts'
import { EmpresaProvider } from './context/EmpresaContext.tsx'

import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import { Container, Title, Text, Button, Center, Stack } from '@mantine/core'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Container size="sm" pt={100}>
      <Center>
        <Stack align="center" gap="md">
          <Title order={2} c="red">¡Ups! Algo salió mal</Title>
          <Text c="dimmed" ta="center">
            Ha ocurrido un error inesperado. Hemos capturado el problema para que la aplicación no colapse por completo.
          </Text>
          <Text size="sm" color="red" ta="center" style={{ wordBreak: 'break-all' }}>
            {(error as Error).message}
          </Text>
          <Button onClick={resetErrorBoundary} color="blue" mt="md">
            Intentar Recargar
          </Button>
        </Stack>
      </Center>
    </Container>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications position="top-right" zIndex={2000} />
        <ModalsProvider>
          <NotificationProvider>
            <EmpresaProvider>
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.href = '/'}>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </ErrorBoundary>
            </EmpresaProvider>
          </NotificationProvider>
        </ModalsProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
