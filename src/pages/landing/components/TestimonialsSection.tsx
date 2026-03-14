import { Box, Container, Title, Text, SimpleGrid, Paper, Group, Avatar, ThemeIcon, rem, Stack } from '@mantine/core';
import { IconQuote } from '@tabler/icons-react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        quote: "Dejé de adivinar en qué se gastaba el efectivo. Ahora tengo visibilidad total de cada centavo en tiempo real desde mi celular.",
        author: "Ricardo Mendoza",
        role: "Dueño de Negocio",
        company: "Logística del Norte",
        initials: "RM",
        color: "blue"
    },
    {
        quote: "Recuperé 10 horas de mi mes eliminando los errores de cálculo. Ya no tengo que estar revisando que las sumas en Excel coincidan con los tickets físicos.",
        author: "María Elena Pazos",
        role: "Administradora General",
        company: "Retail Group Ecuador",
        initials: "MP",
        color: "teal"
    },
    {
        quote: "Los cierres de mes pasaron de 5 días a 5 minutos. Tengo un registro ordenado y veraz de cada egreso y retención, listo para mi proceso contable.",
        author: "Lorena Ruiz",
        role: "Contadora",
        company: "Estudio Ruiz & Asoc.",
        initials: "LR",
        color: "violet"
    }
];

export function TestimonialsSection() {
    return (
        <Box py={100} bg="gray.0">
            <Container size="xl">
                <Box ta="center" mb={60}>
                    <Text size="sm" tt="uppercase" fw={700} c="blue.6" mb="xs" style={{ letterSpacing: '0.1em' }}>Testimonios</Text>
                    <Title order={2} fw={900} size={rem(36)} c="dark.9">Empresas que confían en nosotros</Title>
                </Box>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={40}>
                    {testimonials.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Paper p="xl" radius="md" withBorder shadow="sm" h="100%" pos="relative" bg="white">
                                <ThemeIcon 
                                    size={40} 
                                    radius="xl" 
                                    variant="light" 
                                    color="blue" 
                                    pos="absolute" 
                                    top={-20} 
                                    left={24}
                                >
                                    <IconQuote size={20} fill="currentColor" />
                                </ThemeIcon>
                                
                                <Stack gap="xl" h="100%" justify="space-between">
                                    <Text size="lg" fw={500} c="dark.8" lh={1.6}>
                                        "{item.quote}"
                                    </Text>
                                    
                                    <Group gap="md">
                                        <Avatar color={item.color} radius="xl" size="md">{item.initials}</Avatar>
                                        <div>
                                            <Text size="sm" fw={700} c="dark.9">{item.author}</Text>
                                            <Text size="xs" c="dimmed">{item.role} · {item.company}</Text>
                                        </div>
                                    </Group>
                                </Stack>
                            </Paper>
                        </motion.div>
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}
