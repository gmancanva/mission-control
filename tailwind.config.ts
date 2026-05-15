import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontSize: {
      'xs':   ['12px', { lineHeight: '16px' }],
      'sm':   ['14px', { lineHeight: '20px' }],
      'base': ['16px', { lineHeight: '24px' }],
      'lg':   ['18px', { lineHeight: '28px' }],
      'xl':   ['20px', { lineHeight: '28px' }],
      '2xl':  ['24px', { lineHeight: '32px' }],
      '3xl':  ['30px', { lineHeight: '36px' }],
    },
    extend: {
      colors: {
        gray: {
          950: '#0a0a0f',
        },
      },
    },
  },
  plugins: [],
}
export default config
