// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app uses JSX inside .js files (CRA-era convention). Vitest 4 uses
  // oxc under the hood; this tells oxc to parse .js files as JSX so tests can
  // import from files like WizardShell.js that contain inline <svg>/JSX.
  oxc: {
    lang: 'jsx',
    jsx: { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' },
    include: /\.(js|jsx)$/,
    exclude: [],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
