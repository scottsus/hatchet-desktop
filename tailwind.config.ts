import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
    colors: {
      primary: '#ED7D31',
      bg: {
        gray: {
          1: '#262626',
          2: '#303030',
          3: '#434343',
          4: '#CBCBCB',
        },
      },
      text: {
        default: '#FFFFFF',
        muted: '#FFFFFFB2',
      },
      ...colors,
    },
  },
  plugins: [],
};
export default config;
