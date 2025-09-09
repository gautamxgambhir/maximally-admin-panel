/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'press-start': ['Press Start 2P', 'cursive'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Maximally brand colors
        'maximally-red': '#dc2626',
        'maximally-blue': '#3b82f6',
        'maximally-black': '#000000',
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#3b82f6',
        background: '#ffffff',
        foreground: '#111827',
        primary: {
          DEFAULT: '#111827',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f3f4f6',
          foreground: '#111827',
        },
        destructive: {
          DEFAULT: '#dc2626',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f9fafb',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT: '#f3f4f6',
          foreground: '#111827',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#111827',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#111827',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
