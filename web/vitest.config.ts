import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      // A handful of tests drive several sequential userEvent.type() calls across
      // a multi-field form plus a mutation round trip (e.g. CreateUserDialog flows
      // in AdminUsersPage.test.tsx / ModuleRolesPage.test.tsx). The 5s Vitest
      // default is comfortably enough on a fast machine but can trip on a slower
      // one purely from wall-clock typing time, not a real hang — so give every
      // test more headroom rather than special-casing a few files.
      testTimeout: 15000,
    },
  }),
);
