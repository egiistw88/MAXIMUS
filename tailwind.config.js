/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "maxim-yellow": "#FFD700",
                "maxim-dark": "#1F2937",
                "maxim-gray": "#6B7280",
                "maxim-bg": "#F3F4F6",
                "maxim-white": "#FFFFFF",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
