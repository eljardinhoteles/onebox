import { createTheme, type MantineColorsTuple } from '@mantine/core';

const myColor: MantineColorsTuple = [
    '#e5f4ff',
    '#d1e7ff',
    '#a2cdff',
    '#70b1ff',
    '#4a99ff',
    '#338bff',
    '#2784ff',
    '#1b71e4',
    '#0d65cd',
    '#0057b6'
];

export const theme = createTheme({
    primaryColor: 'blue',
    colors: {
        myColor,
    },
    fontFamily: 'Inter, sans-serif',
    defaultRadius: 'md',
});
