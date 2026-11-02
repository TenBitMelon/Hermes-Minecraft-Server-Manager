import { spawn } from 'node:child_process';

const children = [];

function stop(signal = 'SIGTERM') {
  for (const child of children) child.kill(signal);
}

for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop(signal));

function run(command, args, env = process.env) {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  children.push(child);

  child.on('error', (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    stop();
    process.exitCode = signal ? 0 : code ?? 1;
  });

  return child;
}

try {
  const role = (process.env.HERMES_RUNTIME_ROLE || 'hybrid').toLowerCase();
  if (!['control', 'worker', 'hybrid'].includes(role)) throw new Error('Invalid HERMES_RUNTIME_ROLE.');

  process.env.HERMES_RUNTIME_ROLE = role;

  if (!['cloudflare', 'disabled'].includes(process.env.HERMES_DNS_MODE || 'cloudflare')) throw new Error('Invalid HERMES_DNS_MODE.');

  if (role !== 'worker') {
    if (!process.env.POCKETBASE_INTERNAL_ADMIN_EMAIL || !process.env.POCKETBASE_INTERNAL_ADMIN_PASSWORD) {
      throw new Error('Control/hybrid roles require internal PocketBase admin credentials.');
    }

    const database = run('./database/pocketbase', ['serve', '--http=0.0.0.0:8090']);
    let ready = false;

    for (let attempt = 0; attempt < 120 && database.exitCode === null; attempt++) {
      try {
        ready = (await fetch('http://127.0.0.1:8090/api/health')).ok;
      } catch {
        // PocketBase is still applying migrations or opening its listener.
      }

      if (ready) break;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('PocketBase did not become ready within 60 seconds.');
  }

  run('node', ['build'], { ...process.env, ORIGIN: process.env.PUBLIC_APP_ORIGIN });
} catch (error) {
  console.error(error.message);
  stop();
  process.exitCode = 1;
}
