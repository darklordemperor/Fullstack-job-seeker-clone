import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const backend = fileURLToPath(new URL('../../backend/', import.meta.url));
const database = process.env.TEST_DATABASE_URL ?? 'jdbc:postgresql://127.0.0.1:55437/jobsdb_test';
if (!/^jdbc:postgresql:\/\/[^/]+\/jobsdb_test(?:\?.*)?$/.test(database)) {
  throw new Error('E2E writes fixtures: TEST_DATABASE_URL must name the isolated jobsdb_test database.');
}
const windows = process.platform === 'win32';
const env = {
  ...process.env,
  SPRING_DATASOURCE_URL: database,
  SPRING_DATASOURCE_USERNAME: process.env.TEST_DATABASE_USER ?? 'jobsdb',
  SPRING_DATASOURCE_PASSWORD: process.env.TEST_DATABASE_PASSWORD ?? '',
  BACKEND_PORT: '8085',
  JWT_SECRET: 'e2e-test-key-only-not-for-production-at-least-sixty-four-characters',
  UPLOAD_DIR: resolve(backend, 'target/e2e-uploads'),
};
// This host's Windows Unix-domain selector fails; use the JDK's TCP fallback in this test process only.
if (windows) env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS ?? ''} -Djdk.net.unixdomain.tmpdir=${resolve(backend, 'target/no-unix-socket-directory').replaceAll('\\', '/')}`;
const child = spawn(windows ? 'mvnw.cmd' : './mvnw', ['--batch-mode', 'spring-boot:run'], {
  cwd: backend, env, stdio: 'inherit', shell: windows, windowsHide: true,
});
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
