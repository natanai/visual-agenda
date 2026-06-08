import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubActions ? '/visual-agenda/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true
  }
});
