import { Stepper, Stack, Text, TextInput, Badge, Group, Button, Card, NumberInput, ThemeIcon, Title } from '@mantine/core';
import { IconBuilding, IconMapPin, IconWallet, IconCalendar, IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface OnboardingWizardProps {
    activeStep: number;
    setActiveStep: (step: number | ((prev: number) => number)) => void;
    form: any;
}

export function OnboardingWizard({ activeStep, setActiveStep, form }: OnboardingWizardProps) {
    return (
        <Stepper active={activeStep} onStepClick={setActiveStep} allowNextStepsSelect={false}>
            <Stepper.Step
                label="Empresa"
                description="Identidad del comercio"
                icon={<IconBuilding size={18} />}
            >
                <Stack gap="md" mt="xl">
                    <Text size="sm" c="dimmed">Ingresa los datos fiscales o comerciales de tu empresa.</Text>
                    <TextInput
                        label="Nombre de la Empresa"
                        placeholder="Ej: Mi Comercio S.A."
                        required
                        {...form.getInputProps('empresa_nombre')}
                    />
                    <TextInput
                        label="RUC / Identificación Fiscal"
                        placeholder="Ej: 1790000000001"
                        {...form.getInputProps('empresa_ruc')}
                    />
                </Stack>
            </Stepper.Step>

            <Stepper.Step
                label="Sucursal"
                description="Ubicación física"
                icon={<IconMapPin size={18} />}
            >
                <Stack gap="md" mt="xl">
                    <Text size="sm" c="dimmed">Crea tu primera sucursal o punto de venta.</Text>
                    <TextInput
                        label="Nombre de la Sucursal"
                        placeholder="Ej: Matriz, Sucursal Norte, etc."
                        required
                        {...form.getInputProps('sucursal_nombre')}
                    />
                    <TextInput
                        label="Dirección (Opcional)"
                        placeholder="Calle principal y número"
                        {...form.getInputProps('sucursal_direccion')}
                    />
                </Stack>
            </Stepper.Step>

            <Stepper.Step
                label="Caja Inicial"
                description="Fondo de efectivo"
                icon={<IconWallet size={18} />}
            >
                <Stack gap="md" mt="xl">
                    <Text size="sm" c="dimmed">Configura tu primera caja de efectivo para empezar a operar.</Text>
                    <Badge variant="light" color="blue" leftSection={<IconCalendar size={12} />} radius="sm">
                        Se abrirá con fecha de hoy: {dayjs().format('DD/MM/YYYY')}
                    </Badge>
                    <Group>
                        <Button
                            variant={form.values.caja_abrir ? 'filled' : 'light'}
                            onClick={() => form.setFieldValue('caja_abrir', true)}
                        >
                            Abrir Caja ahora
                        </Button>
                        <Button
                            variant={!form.values.caja_abrir ? 'filled' : 'light'}
                            color="gray"
                            onClick={() => form.setFieldValue('caja_abrir', false)}
                        >
                            Omitir por ahora
                        </Button>
                    </Group>

                    {form.values.caja_abrir && (
                        <Card withBorder p="md" radius="md" bg="blue.0">
                            <Stack gap="sm">
                                <NumberInput
                                    label="Monto Inicial en Caja"
                                    placeholder="0.00"
                                    prefix="$"
                                    decimalScale={2}
                                    {...form.getInputProps('caja_monto_inicial')}
                                />
                                <TextInput
                                    label="Responsable de Caja"
                                    placeholder="Nombre del encargado"
                                    {...form.getInputProps('caja_responsable')}
                                />
                            </Stack>
                        </Card>
                    )}
                </Stack>
            </Stepper.Step>

            <Stepper.Completed>
                <Stack align="center" gap="md" mt="xl" py="lg">
                    <ThemeIcon size={60} radius="xl" color="teal" variant="light">
                        <IconCheck size={36} />
                    </ThemeIcon>
                    <Title order={3}>¡Todo listo!</Title>
                    <Text c="dimmed" ta="center">
                        Has configurado los datos básicos. Al confirmar, tu empresa será creada y podrás empezar a trabajar.
                    </Text>
                </Stack>
            </Stepper.Completed>
        </Stepper>
    );
}
