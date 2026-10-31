/** Check the static-hosting build and restore the normal same-origin build afterwards. */
import { spawnSync } from 'node:child_process';

const run = (command, args, env = process.env) =>
  spawnSync(command, args, { env, stdio: 'inherit' }).status ?? 1;
let status = 1;
try {
  const built = run('npm', ['run', 'build:client'], { ...process.env, VITE_BASE_PATH: '/global-scanner-pro/' });
  status = built || run('npx', ['playwright', 'test', '--config=playwright.build.config.js']);
} finally {
  const restored = run('npm', ['run', 'build:client'], { ...process.env, VITE_BASE_PATH: '' });
  process.exitCode = status || restored;
}
