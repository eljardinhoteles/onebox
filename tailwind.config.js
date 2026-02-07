/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#e5f4ff',
                    100: '#d1e7ff',
                    200: '#a2cdff',
                    300: '#70b1ff',
                    400: '#4a99ff',
                    500: '#338bff',
                    600: '#2784ff',
                    700: '#1b71e4',
                    800: '#0d65cd',
                    900: '#0057b6',
                },
            },
        },
    },
    plugins: [],
}
