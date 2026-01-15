/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "ui-primary": "var(--ui-color-primary)",
                "ui-primary-strong": "var(--ui-color-primary-strong)",
                "ui-primary-soft": "var(--ui-color-primary-soft)",
                "ui-background": "var(--ui-color-background)",
                "ui-surface": "var(--ui-color-surface)",
                "ui-surface-muted": "var(--ui-color-surface-muted)",
                "ui-text": "var(--ui-color-text)",
                "ui-muted": "var(--ui-color-muted)",
                "ui-border": "var(--ui-color-border)",
                "ui-success": "var(--ui-color-success)",
                "ui-danger": "var(--ui-color-danger)",
                "ui-warning": "var(--ui-color-warning)",
                "ui-info": "var(--ui-color-info)",
                "ui-inverse": "var(--ui-color-inverse)",
                "ui-overlay": "var(--ui-color-overlay)",
            },
            fontFamily: {
                sans: ['var(--ui-font-body)'],
                display: ['var(--ui-font-display)'],
            },
            borderRadius: {
                "ui-sm": "var(--ui-radius-sm)",
                "ui-md": "var(--ui-radius-md)",
                "ui-lg": "var(--ui-radius-lg)",
                "ui-xl": "var(--ui-radius-xl)",
            },
            boxShadow: {
                "ui-sm": "var(--ui-shadow-sm)",
                "ui-md": "var(--ui-shadow-md)",
                "ui-lg": "var(--ui-shadow-lg)",
            },
        },
    },
    plugins: [],
}
