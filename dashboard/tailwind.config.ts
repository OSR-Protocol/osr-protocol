import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        osr: {
          green: '#04FC00',
          'green-dim': '#04FC0033',
          'green-glow': '#04FC0066',
          black: '#000000',
          surface: '#0A0A0A',
          card: '#0D0D0D',
          'card-hover': '#1A1A1A',
          border: '#1A1A1A',
          'text-dim': '#666666',
          'text-muted': '#999999',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
