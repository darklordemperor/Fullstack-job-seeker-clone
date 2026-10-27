import { defineConfig } from 'vitest/config';
import { readdirSync } from 'node:fs';

// Exact-file thresholds prevent a well-tested rule from hiding a gap in another file.
// Vitest 4 supports perFile only globally, so enumerate the critical layers explicitly.
const businessThresholds = Object.fromEntries(['src/app/domain', 'src/app/application/use-cases'].flatMap(directory =>
  readdirSync(directory, { recursive: true }).map(String)
    .filter(file => file.endsWith('.ts') && !/\.(spec|model|port)\.ts$/.test(file))
    .map(file => [directory + '/' + file.replaceAll('\\', '/'), { statements: 90, branches: 90, functions: 90, lines: 90 }]),
));

export default defineConfig({
  test: {
    // Bound Angular/JSDOM workers to avoid CPU contention and timing flakes.
    maxWorkers: 2,
    coverage: {
      // Include patterns belong in angular.json so Angular also measures its virtual bundles.
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.model.ts', 'src/app/**/repositories/*.port.ts', 'src/app/**/*.routes.ts', 'src/app/app.config.ts'],
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        // Baseline floor for all included source, including files with no tests yet.
        statements: 68, branches: 70, functions: 50, lines: 68,
        ...businessThresholds,
      },
    },
  },
});
