import { JetBrains_Mono, Merriweather, Noto_Sans_Mono } from 'next/font/google';

const fontSans = Noto_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji',
  ],
});

const fontSerif = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
  preload: true,
  fallback: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
  fallback: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ],
});

export const fontVariableClassNames = `${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`;
export { fontSans, fontSerif, fontMono };
